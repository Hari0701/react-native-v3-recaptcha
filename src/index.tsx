import * as React from "react";
import ReCaptchaComponent, { IProps } from "./ReCaptchaComponent";

export type { IProps };
export type IState = {};

class ReCaptchaV3 extends React.PureComponent<IProps, IState> {
  private _captchaRef: ReCaptchaComponent | null = null;

  /** Requests a fresh token; it arrives through onReceiveToken (or onError). */
  public refreshToken = () => {
    this._captchaRef?.refreshToken();
  };

  /** Promise version: resolves with a token, or rejects with the error. Never hangs (see timeoutMs). */
  public getToken = (): Promise<string> => {
    if (!this._captchaRef) return Promise.reject(new Error("reCAPTCHA component is not mounted"));
    return this._captchaRef.getToken();
  };

  render() {
    return <ReCaptchaComponent ref={(ref) => (this._captchaRef = ref)} {...this.props} />;
  }
}

export default ReCaptchaV3;
