# Changelog

## 1.1.0

Backwards compatible: existing code keeps working unchanged.

### Added
- `getToken()` returns a `Promise<string>` that resolves with a token or rejects with the error. Calls made while an attempt is running share it, so a double tap can't start overlapping reCAPTCHA runs.
- `retries` prop: extra attempts after a failure before reporting it (default 0).
- In development builds, a console warning if `action` contains characters Google's docs don't list (letters, digits, `/`, `_`). It only warns; nothing is blocked.
- `onError` prop, called when a token can't be obtained (script load failure, reCAPTCHA error, WebView load error, or timeout). Before this, failures were silent.
- `timeoutMs` prop (default 15000 ms, `0` to disable).
- README with install, usage, props and notes on tokens and domains.
- Unit tests for the generated page and message parsing, and a CI workflow.

### Fixed
- `siteKey` and `action` are now escaped when embedded in the page, so quotes or `</script>` in them can no longer break it.
- Only the first result of each attempt is reported, so a failed attempt can't also deliver a late token or a second error.

### Changed
- `onReceiveToken` is now optional, so you can use `getToken()` alone.
- Build output is no longer committed to git and no longer contains a duplicate `dist/src` copy; it is built automatically on publish and on `npm install` from git.
- Peer dependency ranges are now `react >=17`, `react-native >=0.64`, `react-native-webview >=11` instead of `*`. Only recent versions have been tested.
- `package.json` repository links now use the `Hari0701` casing.

## 1.0.7 and earlier

Initial fork of `react-native-recaptchav3` for modern `react-native-webview`.
