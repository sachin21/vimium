import "./test_helper.js";
import "../../lib/settings.js";
import { patternToRegExp } from "../../background_scripts/exclusions.js";

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
    const result = generateDefaultPattern("chrome-extension://abcdef/options.html");
    assert.equal("chrome-extension://abcdef/options.html*", result);
  });
});

context("patternToRegExp (exported from exclusions.js)", () => {
  should("convert wildcard to match any characters", () => {
    const matcher = patternToRegExp("https://example.com/*");
    assert.isTrue("https://example.com/anything".search(matcher) >= 0);
    assert.isTrue("https://example.com/".search(matcher) >= 0);
  });

  should("not match different domain", () => {
    const matcher = patternToRegExp("https://example.com/*");
    assert.isFalse("https://other.com/anything".search(matcher) >= 0);
  });

  should("match https? as regex quantifier (zero or one s)", () => {
    const matcher = patternToRegExp("https?://example.com/*");
    assert.isTrue("https://example.com/foo".search(matcher) >= 0);
    assert.isTrue("http://example.com/foo".search(matcher) >= 0);
  });

  should("anchor pattern to start and end", () => {
    const matcher = patternToRegExp("https://example.com/*");
    assert.isFalse("XXXhttps://example.com/page".search(matcher) >= 0);
  });

  should("match default Gmail exclusion pattern", () => {
    const matcher = patternToRegExp("https?://mail.google.com/*");
    assert.isTrue("https://mail.google.com/mail/u/0".search(matcher) >= 0);
    assert.isTrue("http://mail.google.com/mail/u/0".search(matcher) >= 0);
    assert.isFalse("https://calendar.google.com/".search(matcher) >= 0);
  });

  should("match pattern without wildcards as full regex", () => {
    const matcher = patternToRegExp("https://example\\.com/exact");
    assert.isTrue("https://example.com/exact".search(matcher) >= 0);
    assert.isFalse("https://example.com/exact/more".search(matcher) >= 0);
  });

  should("handle multiple wildcards", () => {
    const matcher = patternToRegExp("http*://*/path/*");
    assert.isTrue("https://example.com/path/to/page".search(matcher) >= 0);
    assert.isTrue("http://localhost/path/file".search(matcher) >= 0);
    assert.isFalse("https://example.com/other/page".search(matcher) >= 0);
  });

  should("handle leading wildcard", () => {
    const matcher = patternToRegExp("*://example.com/*");
    assert.isTrue("https://example.com/page".search(matcher) >= 0);
    assert.isTrue("ftp://example.com/file".search(matcher) >= 0);
  });

  should("not be vulnerable to ReDoS from many wildcards", () => {
    // This pattern with many wildcards should complete quickly (not exponential backtracking).
    const matcher = patternToRegExp("*a*a*a*a*a*b");
    const start = Date.now();
    const input = "a".repeat(100);
    input.search(matcher);
    const elapsed = Date.now() - start;
    // Should complete in well under 1 second (no catastrophic backtracking).
    assert.isTrue(elapsed < 1000);
  });
});
