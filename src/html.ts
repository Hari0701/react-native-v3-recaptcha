/** Embeds a string as a JavaScript string literal that is safe inside an inline <script>. */
export const toScriptLiteral = (value: string): string =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c") // a literal "</script>" would end the script block early
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/** JS that (re)runs the reCAPTCHA check; the page defines window.__execute. */
export const EXECUTE_SNIPPET = "window.__execute && window.__execute(); true;";

/**
 * The page the hidden WebView loads. It posts one JSON message per attempt:
 *   { type: "token", token } on success, { type: "error", message } on failure.
 */
export const buildHtml = (siteKey: string, action: string): string => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>
      function post(message) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
      function fail(e) {
        post({ type: "error", message: String((e && e.message) || e) });
      }
      window.__execute = function () {
        try {
          grecaptcha.ready(function () {
            grecaptcha
              .execute(${toScriptLiteral(siteKey)}, { action: ${toScriptLiteral(action)} })
              .then(function (token) { post({ type: "token", token: token }); }, fail);
          });
        } catch (e) {
          fail(e);
        }
      };
      window.onload = window.__execute;
    </script>
    <script
      src="https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}"
      onerror="fail('Failed to load the reCAPTCHA script')"
    ></script>
  </head>
  <body></body>
</html>`;

export type WebViewMessage = { type: "token"; token: string } | { type: "error"; message: string };

/** Parses a message from the page; returns null for anything we don't recognise. */
export const parseMessage = (raw: string): WebViewMessage | null => {
  try {
    const data = JSON.parse(raw);
    if (data && data.type === "token" && typeof data.token === "string") return data;
    if (data && data.type === "error") return { type: "error", message: String(data.message) };
  } catch {
    // not JSON
  }
  return null;
};

/** Action names Google's docs describe: letters, digits, slashes and underscores. */
export const isValidAction = (action: string): boolean => /^[A-Za-z0-9/_]+$/.test(action);
