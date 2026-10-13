# react-native-v3-recaptcha

Invisible [Google reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3) for React Native. It runs reCAPTCHA in a hidden `react-native-webview` and hands you a token to send to your backend.

This is a maintained fork of `react-native-recaptchav3`, updated to work with current `react-native-webview` versions. See [LICENSE](LICENSE) for the original copyright.

## Install

```sh
npm install react-native-v3-recaptcha react-native-webview
```

`react-native-webview` is a peer dependency, so install it in your app and follow its native setup (`pod install` on iOS).

## Usage

```tsx
import React, { useRef } from "react";
import { Button } from "react-native";
import ReCaptchaV3 from "react-native-v3-recaptcha";

export function LoginScreen() {
  const captcha = useRef<ReCaptchaV3>(null);

  return (
    <>
      <ReCaptchaV3
        ref={captcha}
        siteKey="YOUR_SITE_KEY"
        captchaDomain="https://your-registered-domain.com"
        action="login"
        onReceiveToken={(token) => {
          // send `token` to your backend and verify it there
        }}
        onError={(error) => console.warn("reCAPTCHA failed:", error.message)}
      />
      <Button title="Log in" onPress={() => captcha.current?.refreshToken()} />
    </>
  );
}
```

A token is requested once when the component mounts. Call `refreshToken()` whenever you need a new one, for example right before submitting a form.

### Promise style

If you'd rather `await` a token than use callbacks, use `getToken()`. It resolves with a token or rejects with the error, and it never hangs, because of the timeout.

```tsx
const onSubmit = async () => {
  try {
    const token = await captcha.current!.getToken();
    await api.login({ ...form, captchaToken: token });
  } catch (error) {
    // couldn't get a token: decide whether to block the request or send it without one
  }
};
```

If `getToken()` is called while an attempt is already running (for example a double tap), the calls share that attempt instead of starting overlapping ones. With `getToken()` you don't need `onReceiveToken`.

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `siteKey` | `string` | yes | Your reCAPTCHA v3 **site** key (not the secret key). |
| `captchaDomain` | `string` | yes | A URL on a domain registered for the site key, e.g. `https://example.com`. |
| `action` | `string` | yes | The action name, e.g. `login`. Shows up in the reCAPTCHA admin console. |
| `onReceiveToken` | `(token: string) => void` | no | Called with each new token. Optional if you only use `getToken()`. |
| `onError` | `(error: Error) => void` | no | Called if a token can't be obtained: script failed to load, reCAPTCHA returned an error, or it timed out. |
| `timeoutMs` | `number` | no | Give up and report an error after this long. Default `15000`. `0` disables the timeout. |
| `retries` | `number` | no | Extra attempts after a failure before reporting it. Default `0`. Each retry gets its own `timeoutMs`. |

Each attempt (the first one, and each `refreshToken()` or `getToken()`) ends with exactly one result: a token or an error.

## Methods

| Method | Description |
|---|---|
| `refreshToken()` | Starts a new attempt. The result arrives through `onReceiveToken` or `onError`. |
| `getToken()` | Returns a `Promise<string>` for the current or a new attempt. |

## Things to know

- **Verify tokens on your server.** A token only proves something once your backend checks it with Google's `siteverify` API using your **secret** key. Never put the secret key in the app.
- **Tokens expire after about 2 minutes** and can be used once. Request a fresh one close to when you need it.
- **`captchaDomain` must be registered** in the reCAPTCHA admin console for your site key, or Google will reject the request. This is the most common setup problem, and it now shows up through `onError`.
- **The WebView needs network access.** With no connection you get `onError`, not a hang.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. Original work copyright First NZ Capital Securities Ltd; see [LICENSE](LICENSE).
