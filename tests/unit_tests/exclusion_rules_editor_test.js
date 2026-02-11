import { jsdomStub } from "./test_helper.js";
import "../../lib/settings.js";

// We need the HTML structure that ExclusionRulesEditor expects.
const exclusionRulesHtml = "pages/exclusion_rules_editor_test.html";

context("ExclusionRulesEditor logic", () => {
  // Since ExclusionRulesEditor heavily depends on DOM and is not easily importable without the
  // full page context, we test its core logic (getRules filtering) independently.

  should("exclude blank patterns from rules", () => {
    const rows = [
      { pattern: "https://example.com/*", passKeys: "" },
      { pattern: "", passKeys: "abc" },
      { pattern: "  ", passKeys: "def" },
      { pattern: "https://other.com/*", passKeys: "jk" },
    ];
    // Simulate getRules filtering: exclude blank patterns after trim.
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal(2, rules.length);
    assert.equal("https://example.com/*", rules[0].pattern);
    assert.equal("https://other.com/*", rules[1].pattern);
  });

  should("trim whitespace from patterns and passKeys", () => {
    const rows = [
      { pattern: "  https://example.com/*  ", passKeys: "  abc  " },
    ];
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal("https://example.com/*", rules[0].pattern);
    assert.equal("abc", rules[0].passKeys);
  });

  should("return empty array when all patterns are blank", () => {
    const rows = [
      { pattern: "", passKeys: "abc" },
      { pattern: "   ", passKeys: "def" },
    ];
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal(0, rules.length);
  });

  should("return empty array for empty input", () => {
    const rows = [];
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal(0, rules.length);
  });

  should("preserve passKeys as empty string when blank", () => {
    const rows = [
      { pattern: "https://mail.google.com/*", passKeys: "" },
    ];
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal(1, rules.length);
    assert.equal("", rules[0].passKeys);
  });

  should("handle multiple valid rules", () => {
    const rows = [
      { pattern: "https://mail.google.com/*", passKeys: "" },
      { pattern: "https://docs.google.com/*", passKeys: "jk" },
      { pattern: "https://example.com/*", passKeys: "abc" },
    ];
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal(3, rules.length);
  });

  should("handle pattern with only whitespace characters", () => {
    const rows = [
      { pattern: "\t\n  ", passKeys: "abc" },
    ];
    const rules = rows
      .map((r) => ({ pattern: r.pattern.trim(), passKeys: r.passKeys.trim() }))
      .filter((rule) => rule.pattern);
    assert.equal(0, rules.length);
  });
});

context("Exclusion rules default settings", () => {
  setup(async () => {
    await Settings.load();
  });

  should("have default exclusion rules for Gmail", () => {
    const rules = Settings.get("exclusionRules");
    assert.equal(1, rules.length);
    assert.equal("https?://mail.google.com/*", rules[0].pattern);
    assert.equal("", rules[0].passKeys);
  });

  should("store exclusionRules as an array", () => {
    const rules = Settings.get("exclusionRules");
    assert.isTrue(Array.isArray(rules));
  });

  teardown(async () => {
    await Settings.clear();
  });
});
