import * as React from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { platform } from "./constants";
import { EXECUTE_SNIPPET, buildHtml, isValidAction, parseMessage } from "./html";
import { TokenSession } from "./session";

export const DEFAULT_TIMEOUT_MS = 15000;

export type IProps = {
  captchaDomain: string;
  siteKey: string;
  action: string;
  /** Called with each new token. Optional if you only use `getToken()`. */
  onReceiveToken?: (captchaToken: string) => void;
  /** Called when a token could not be obtained (load failure, reCAPTCHA error, or timeout). */
  onError?: (error: Error) => void;
  /** Give up and report an error after this many ms. Default 15000. Use 0 to disable. */
  timeoutMs?: number;
  /** Extra attempts after a failure before reporting it. Default 0. */
  retries?: number;
};

class ReCaptchaComponent extends React.PureComponent<IProps> {
  private webViewRef: WebView | null = null;

  private session = new TokenSession(
    {
      run: () => this.runInPage(),
      onToken: (token) => this.props.onReceiveToken?.(token),
      onError: (error) => this.props.onError?.(error),
    },
    () => ({ timeoutMs: this.props.timeoutMs ?? DEFAULT_TIMEOUT_MS, retries: this.props.retries ?? 0 }),
  );

  componentDidMount() {
    if (__DEV__ && !isValidAction(this.props.action)) {
      console.warn(
        `[react-native-v3-recaptcha] action "${this.props.action}" contains characters Google's docs don't list ` +
          "(letters, digits, '/' and '_'). reCAPTCHA may reject it.",
      );
    }
    this.session.begin(false); // the WebView starts loading by itself
  }

  componentWillUnmount() {
    this.session.dispose();
  }

  private runInPage() {
    if (!this.webViewRef) return;
    if (platform.isIOS) {
      this.webViewRef.injectJavaScript(EXECUTE_SNIPPET);
    } else if (platform.isAndroid) {
      this.webViewRef.reload();
    }
  }

  /** Requests a fresh token; it arrives through onReceiveToken (or onError). */
  public refreshToken() {
    if (!this.webViewRef) return;
    this.session.begin(true);
  }

  /**
   * Resolves with a token or rejects with the error. Calls made while an attempt is already
   * running share its result instead of starting another.
   */
  public getToken(): Promise<string> {
    return this.session.get();
  }

  render() {
    return (
      <View style={{ height: 0, width: 0, flex: 0 }}>
        <WebView
          ref={(ref) => (this.webViewRef = ref)}
          javaScriptEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          source={{
            html: buildHtml(this.props.siteKey, this.props.action),
            baseUrl: this.props.captchaDomain,
          }}
          onMessage={(e) => {
            const message = parseMessage(e.nativeEvent.data);
            if (!message) return;
            if (message.type === "token") this.session.succeed(message.token);
            else this.session.fail(new Error(message.message));
          }}
          onError={(e) => this.session.fail(new Error(e.nativeEvent.description || "WebView failed to load"))}
        />
      </View>
    );
  }
}

export default ReCaptchaComponent;
