import test from "node:test";
import assert from "node:assert/strict";
import { buildHtml, isValidAction, parseMessage, toScriptLiteral } from "./html";

test("toScriptLiteral quotes and escapes", () => {
  assert.equal(toScriptLiteral("login"), '"login"');
  assert.equal(toScriptLiteral("a'b\"c"), JSON.stringify("a'b\"c"));
});

test("toScriptLiteral cannot close the script block or break the line", () => {
  const out = toScriptLiteral("</script><script>alert(1)</script> ");
  assert.ok(!out.includes("</script>"));
  assert.ok(!out.includes(" "));
});

test("buildHtml keeps hostile input inside string literals", () => {
  const html = buildHtml("key'; alert(1); '", "act\"ion</script>");
  assert.ok(!html.includes("act\"ion</script>"));
  assert.ok(html.includes(toScriptLiteral("key'; alert(1); '")));
  assert.ok(html.includes("render=key'%3B%20alert(1)%3B%20'"));
});

test("buildHtml reports a script load failure", () => {
  assert.ok(buildHtml("k", "a").includes("onerror="));
});

test("parseMessage understands token and error messages", () => {
  assert.deepEqual(parseMessage('{"type":"token","token":"abc"}'), { type: "token", token: "abc" });
  assert.deepEqual(parseMessage('{"type":"error","message":"boom"}'), { type: "error", message: "boom" });
});

test("parseMessage ignores anything else", () => {
  assert.equal(parseMessage("not json"), null);
  assert.equal(parseMessage('{"type":"other"}'), null);
  assert.equal(parseMessage('{"type":"token","token":5}'), null);
});

test("isValidAction accepts documented characters only", () => {
  assert.equal(isValidAction("login"), true);
  assert.equal(isValidAction("checkout/step_2"), true);
  assert.equal(isValidAction("bad action!"), false);
  assert.equal(isValidAction(""), false);
});
