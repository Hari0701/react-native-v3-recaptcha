export type SessionOptions = { timeoutMs: number; retries: number };

export type SessionHooks = {
  /** Ask the page to run reCAPTCHA again (inject on iOS, reload on Android). */
  run: () => void;
  onToken?: (token: string) => void;
  onError?: (error: Error) => void;
};

type Waiter = { resolve: (token: string) => void; reject: (error: Error) => void };

/**
 * Tracks one token attempt at a time.
 *
 * - An attempt ends exactly once: with a token, or with an error after any retries.
 * - Callers of `get()` while an attempt is running share it, so two quick taps can't
 *   trigger overlapping reCAPTCHA executions.
 * - A timer turns "nothing ever came back" into an error.
 *
 * Plain TypeScript with no React Native imports, so it can be unit tested in Node.
 */
export class TokenSession {
  private settled = true;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retriesLeft = 0;
  private waiters: Waiter[] = [];

  constructor(
    private hooks: SessionHooks,
    private options: () => SessionOptions,
  ) {}

  /** True while an attempt is in flight. */
  get active(): boolean {
    return !this.settled;
  }

  /**
   * Starts a fresh attempt. Pass `run: false` when the page is already loading on its own
   * (first mount); otherwise the page is asked to run again.
   */
  begin(run: boolean): void {
    this.retriesLeft = Math.max(0, this.options().retries);
    this.settled = false;
    this.arm();
    if (run) this.hooks.run();
  }

  /** Promise API: joins the attempt in flight, or starts a new one. */
  get(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      if (this.settled) this.begin(true);
    });
  }

  succeed(token: string): void {
    if (this.settled) return;
    this.finish();
    this.hooks.onToken?.(token);
    this.drain((w) => w.resolve(token));
  }

  fail(error: Error): void {
    if (this.settled) return;
    if (this.retriesLeft > 0) {
      this.retriesLeft -= 1;
      this.arm();
      this.hooks.run();
      return;
    }
    this.finish();
    this.hooks.onError?.(error);
    this.drain((w) => w.reject(error));
  }

  /** Call on unmount: stops the timer and rejects anyone still waiting. */
  dispose(): void {
    const wasActive = !this.settled;
    this.finish();
    if (wasActive) this.drain((w) => w.reject(new Error("reCAPTCHA component was unmounted")));
  }

  private finish() {
    this.settled = true;
    this.clearTimer();
  }

  private drain(fn: (w: Waiter) => void) {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach(fn);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private arm() {
    this.clearTimer();
    const ms = this.options().timeoutMs;
    if (ms > 0) {
      this.timer = setTimeout(() => this.fail(new Error(`reCAPTCHA timed out after ${ms}ms`)), ms);
    }
  }
}
