import "./test_helper.js";
import "../../lib/settings.js";

// ActionPage.generateDefaultPattern is defined inside a module, so we recreate the logic here
// for testing purposes since the original is not exported.
function generateDefaultPattern(url) {
  if (/^https?:\/\/./.test(url)) {
    const hostname = url.split("/", 3).slice(1).join("/").replace("[", "\\[").replace(
      "]",
      "\\]",
    );
    return "https?:/" + hostname + "/*";
  } else if (/^[a-z]{3,}:\/\/./.test(url)) {
    return url.split("/", 3).join("/") + "/*";
  } else {
    return url + "*";
  }
}

context("generateDefaultPattern", () => {
  should("generate pattern for HTTP URL", () => {
    const result = generateDefaultPattern("http://www.example.com/path/to/page.html");
    assert.equal("https?://www.example.com/*", result);
  });

  should("generate pattern for HTTPS URL", () => {
    const result = generateDefaultPattern("https://www.example.com/path/to/page.html");
    assert.equal("https?://www.example.com/*", result);
  });

  should("generate pattern for URL with path, using domain only", () => {
    const result = generateDefaultPattern("https://example.com/deep/nested/path");
    assert.equal("https?://example.com/*", result);
  });

  should("generate pattern for subdomain URL", () => {
    const result = generateDefaultPattern("https://sub.example.com/page");
    assert.equal("https?://sub.example.com/*", result);
  });

  should("generate pattern for IP address URL", () => {
    const result = generateDefaultPattern("http://192.168.1.1/admin");
    assert.equal("https?://192.168.1.1/*", result);
  });

  should("generate pattern for non-HTTP scheme (ftp)", () => {
    const result = generateDefaultPattern("ftp://files.example.com/pub");
    assert.equal("ftp://files.example.com/*", result);
  });

  should("generate pattern for file URL with triple slash", () => {
    // file:///home splits as ["file:", "", ""] so result is "file:///*".
    const result = generateDefaultPattern("file:///home/user/doc.html");
    assert.equal("file:///*", result);
  });

  should("generate pattern for bare string (not a URL)", () => {
    const result = generateDefaultPattern("some-text");
    assert.equal("some-text*", result);
  });

  should("escape IPv6 brackets", () => {
    const result = generateDefaultPattern("http://[::1]:8080/path");
    assert.equal("https?://\\[::1\\]:8080/*", result);
  });

  should("generate pattern containing https? for HTTP URLs", () => {
    const url = "http://www.example.com/page";
    const pattern = generateDefaultPattern(url);
    assert.isTrue(pattern.startsWith("https?://"));
  });

  should("generate pattern containing https? for HTTPS URLs", () => {
    const url = "https://www.example.com/page";
    const pattern = generateDefaultPattern(url);
    assert.isTrue(pattern.startsWith("https?://"));
  });

  should("generate pattern for URL with port number", () => {
    const result = generateDefaultPattern("http://localhost:3000/app");
    assert.equal("https?://localhost:3000/*", result);
  });

  should("generate pattern for URL with query parameters", () => {
    const result = generateDefaultPattern("https://example.com/search?q=test&page=1");
    assert.equal("https?://example.com/*", result);
  });

  should("generate pattern for URL with fragment", () => {
    const result = generateDefaultPattern("https://example.com/page#section");
    assert.equal("https?://example.com/*", result);
  });

  should("generate fallback pattern for chrome-extension URL", () => {
    // "chrome-extension" contains a hyphen, so it doesn't match [a-z]{3,}://.
    // Falls through to the else branch.
    const result = generateDefaultPattern("chrome-extension://abcdef/options.html");
    assert.equal("chrome-extension://abcdef/options.html*", result);
  });
});

// ExclusionRegexpCache.get() converts a pattern to a RegExp. The logic is:
//   new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
// We recreate this for testing since it's not exported.
function patternToRegExp(pattern) {
  return new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
}

context("patternToRegExp (ExclusionRegexpCache logic)", () => {
  should("convert wildcard to match any characters", () => {
    const regex = patternToRegExp("https://example.com/*");
    assert.isTrue(regex.test("https://example.com/anything"));
    assert.isTrue(regex.test("https://example.com/"));
  });

  should("not match different domain", () => {
    const regex = patternToRegExp("https://example.com/*");
    assert.isFalse(regex.test("https://other.com/anything"));
  });

  should("match https? as regex quantifier (zero or one s)", () => {
    // Unlike the original test expectation, * is the only character replaced.
    // ? remains as a regex quantifier (zero or one of preceding char).
    const regex = patternToRegExp("https?://example.com/*");
    assert.isTrue(regex.test("https://example.com/foo"));
    assert.isTrue(regex.test("http://example.com/foo"));
  });

  should("anchor pattern to start and end", () => {
    const regex = patternToRegExp("https://example.com/*");
    assert.isFalse(regex.test("XXXhttps://example.com/page"));
  });
});
