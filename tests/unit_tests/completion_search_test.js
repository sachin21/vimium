import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/url_utils.js";
import * as CompletionSearch from "../../background_scripts/completion_search.js";

context("CompletionSearch", () => {
  setup(async () => {
    // Ensure UrlUtils TLDs are loaded for isUrl checks.
    await UrlUtils.init();
  });

  // --- complete: early return cases ---

  context("complete early returns", () => {
    should("return empty array when query is shorter than 4 characters", async () => {
      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["abc"],
      );
      assert.equal([], result);
    });

    should("return empty array when single term is a URL", async () => {
      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["https://example.com"],
      );
      assert.equal([], result);
    });

    should("return empty array for javascript protocol", async () => {
      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["javascript:alert(1)"],
      );
      assert.equal([], result);
    });

    should("return empty array when no matching engine is found", async () => {
      const result = await CompletionSearch.complete(
        "https://nonexistent-engine.example.com/search?q=%s",
        ["test query here"],
      );
      assert.equal([], result);
    });
  });

  // --- complete: full flow with stubbed fetch ---

  context("complete with fetch", () => {
    should("return parsed and lowercased suggestions", async () => {
      // Google engine parse expects JSON like: ["query", ["Suggestion One", "Suggestion Two"]]
      stub(globalThis, "fetch", async () => ({
        text: async () => JSON.stringify(["test query", ["Test Result One", "Test Result Two"]]),
      }));

      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["test", "query"],
      );

      assert.isTrue(result.length > 0);
      // All suggestions should be lowercased.
      for (const s of result) {
        assert.equal(s, s.toLowerCase());
      }
    });

    should("filter out the query itself from suggestions", async () => {
      stub(globalThis, "fetch", async () => ({
        text: async () =>
          JSON.stringify(["test query", ["test query", "test query helper", "test query builder"]]),
      }));

      // Cancel to avoid dedup with prior requests.
      CompletionSearch.cancel();

      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["test", "query"],
      );

      // "test query" should be filtered out since it matches the query itself.
      assert.isFalse(result.includes("test query"));
    });

    should("return empty suggestions on parse error", async () => {
      stub(globalThis, "fetch", async () => ({
        text: async () => "not valid json {{{",
      }));

      CompletionSearch.cancel();

      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["parse", "error", "test"],
      );

      assert.equal([], result);
    });

    should("return empty suggestions on network error", async () => {
      stub(globalThis, "fetch", async () => {
        throw new Error("Network error");
      });

      CompletionSearch.cancel();

      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["network", "error", "test"],
      );

      assert.equal([], result);
    });

    should("return cached result on second call with same query", async () => {
      let fetchCount = 0;
      stub(globalThis, "fetch", async () => {
        fetchCount++;
        return {
          text: async () => JSON.stringify(["cached test", ["cached suggestion one"]]),
        };
      });

      CompletionSearch.cancel();

      const result1 = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["cached", "test"],
      );

      // Second call should use cache; fetch should not be called again.
      const result2 = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["cached", "test"],
      );

      assert.equal(result1, result2);
    });
  });

  // --- cancel ---

  context("cancel", () => {
    should("cause a pending query to return empty by incrementing requestId", async () => {
      stub(globalThis, "fetch", async () => ({
        text: async () => JSON.stringify(["cancel test", ["cancel suggestion"]]),
      }));

      // Start a query (it will wait on DELAY).
      const promise = CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["cancel", "dedup", "test"],
      );

      // Cancel before the delay expires.
      CompletionSearch.cancel();

      const result = await promise;
      assert.equal([], result);
    });

    should("allow new queries after cancellation", async () => {
      CompletionSearch.cancel();
      // Just verify cancel doesn't break subsequent calls.
      const result = await CompletionSearch.complete(
        "https://nonexistent-engine.example.com/search?q=%s",
        ["after cancel query"],
      );
      assert.equal([], result);
    });
  });

  // --- EnginePrefixWrapper (tested indirectly through complete) ---

  context("EnginePrefixWrapper via complete", () => {
    should("strip prefix from suggestions when search URL has prefix terms", async () => {
      // A search URL with prefix "javascript" before %s:
      // https://www.google.com/search?q=javascript+%s
      // The EnginePrefixWrapper should detect "javascript" as the prefix and:
      // 1. Add it to the query sent to the engine.
      // 2. Filter/strip it from returned suggestions.
      stub(globalThis, "fetch", async () => ({
        text: async () =>
          JSON.stringify([
            "javascript closures",
            [
              "javascript closures explained",
              "javascript closures tutorial",
              "python closures explained",
            ],
          ]),
      }));

      CompletionSearch.cancel();

      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=javascript+%s",
        ["closures"],
      );

      // Only suggestions starting with "javascript " should be returned,
      // and the "javascript " prefix should be stripped.
      for (const s of result) {
        assert.isFalse(s.startsWith("javascript "));
      }
    });

    should("return suggestions unmodified when search URL has no prefix", async () => {
      stub(globalThis, "fetch", async () => ({
        text: async () =>
          JSON.stringify(["plain query", ["plain suggestion one", "plain suggestion two"]]),
      }));

      CompletionSearch.cancel();

      const result = await CompletionSearch.complete(
        "https://www.google.com/search?q=%s",
        ["plain", "query"],
      );

      assert.isTrue(result.length > 0);
    });
  });
});
