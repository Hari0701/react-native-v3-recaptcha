import test from "node:test";
import assert from "node:assert/strict";
import { TokenSession } from "./session";

const make = (opts: { timeoutMs?: number; retries?: number } = {}) => {
  const log = { runs: 0, tokens: [] as string[], errors: [] as string[] };
  const session = new TokenSession(
    { run: () => void log.runs++, onToken: (t) => log.tokens.push(t), onError: (e) => log.errors.push(e.message) },
    () => ({ timeoutMs: opts.timeoutMs ?? 1000, retries: opts.retries ?? 0 }),
  );
  return { session, log };
};

test("an attempt reports its token once, later messages are ignored", () => {
  const { session, log } = make();
  session.begin(false);
  session.succeed("a");
  session.succeed("b");
  session.fail(new Error("late"));
  assert.deepEqual(log.tokens, ["a"]);
  assert.deepEqual(log.errors, []);
});

test("an attempt reports an error once, a later token is ignored", () => {
  const { session, log } = make();
  session.begin(false);
  session.fail(new Error("boom"));
  session.succeed("late");
  session.fail(new Error("again"));
  assert.deepEqual(log.errors, ["boom"]);
  assert.deepEqual(log.tokens, []);
});

test("a timeout becomes an error", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { session, log } = make({ timeoutMs: 500 });
  session.begin(false);
  t.mock.timers.tick(499);
  assert.deepEqual(log.errors, []);
  t.mock.timers.tick(1);
  assert.deepEqual(log.errors, ["reCAPTCHA timed out after 500ms"]);
});

test("timeoutMs 0 never times out", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { session, log } = make({ timeoutMs: 0 });
  session.begin(false);
  t.mock.timers.tick(10 * 60 * 1000);
  assert.deepEqual(log.errors, []);
  assert.equal(session.active, true);
});

test("a token cancels the timeout", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { session, log } = make({ timeoutMs: 500 });
  session.begin(false);
  session.succeed("ok");
  t.mock.timers.tick(5000);
  assert.deepEqual(log.errors, []);
});

test("retries re-run the page before reporting an error", () => {
  const { session, log } = make({ retries: 2 });
  session.begin(false);
  session.fail(new Error("1"));
  session.fail(new Error("2"));
  assert.equal(log.runs, 2);
  assert.deepEqual(log.errors, []);
  session.fail(new Error("3"));
  assert.deepEqual(log.errors, ["3"]);
  assert.equal(log.runs, 2);
});

test("a retry can still succeed", () => {
  const { session, log } = make({ retries: 1 });
  session.begin(false);
  session.fail(new Error("transient"));
  session.succeed("good");
  assert.deepEqual(log.tokens, ["good"]);
  assert.deepEqual(log.errors, []);
});

test("get() starts an attempt when idle and resolves with the token", async () => {
  const { session, log } = make();
  const p = session.get();
  assert.equal(log.runs, 1);
  session.succeed("tok");
  assert.equal(await p, "tok");
});

test("get() calls during an attempt share it", async () => {
  const { session, log } = make();
  session.begin(false); // the first attempt, already running
  const a = session.get();
  const b = session.get();
  assert.equal(log.runs, 0, "must not start another attempt");
  session.succeed("shared");
  assert.deepEqual(await Promise.all([a, b]), ["shared", "shared"]);
});

test("get() rejects when the attempt fails", async () => {
  const { session } = make();
  const p = session.get();
  session.fail(new Error("nope"));
  await assert.rejects(p, /nope/);
});

test("dispose stops the timer and rejects waiters", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { session, log } = make({ timeoutMs: 500 });
  const p = session.get();
  session.dispose();
  await assert.rejects(p, /unmounted/);
  t.mock.timers.tick(5000);
  assert.deepEqual(log.errors, []);
});
