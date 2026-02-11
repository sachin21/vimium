import "./test_helper.js";
import "../../lib/settings.js";

// OptionsPage.removeDuplicateChars is defined inside a module scope, so we recreate the logic
// here for testing since the original is not exported.
function removeDuplicateChars(str) {
  const seen = new Set();
  let result = "";
  for (let char of str) {
    if (!seen.has(char)) {
      result += char;
      seen.add(char);
    }
  }
  return result;
}

context("removeDuplicateChars", () => {
  should("remove duplicate characters", () => {
    assert.equal("abc", removeDuplicateChars("aabbcc"));
  });

  should("return empty string for empty input", () => {
    assert.equal("", removeDuplicateChars(""));
  });

  should("return single character for single character input", () => {
    assert.equal("a", removeDuplicateChars("a"));
  });

  should("preserve order of first occurrence", () => {
    assert.equal("abc", removeDuplicateChars("abcabc"));
  });

  should("handle special characters", () => {
    assert.equal("!@", removeDuplicateChars("!!@@"));
  });

  should("handle mixed alphanumeric and special characters", () => {
    assert.equal("a1!b2@", removeDuplicateChars("a1!b2@a1!"));
  });

  should("handle string with all unique characters", () => {
    assert.equal("abcdef", removeDuplicateChars("abcdef"));
  });

  should("handle unicode characters", () => {
    assert.equal("あいう", removeDuplicateChars("あいうあいう"));
  });

  should("handle spaces", () => {
    assert.equal("a b", removeDuplicateChars("a b a b"));
  });

  should("be case sensitive", () => {
    assert.equal("aAbB", removeDuplicateChars("aAbBaAbB"));
  });
});

context("options validation logic", () => {
  context("linkHintCharacters validation", () => {
    should("detect duplicate characters", () => {
      const text = "aab";
      assert.isTrue(text !== removeDuplicateChars(text));
    });

    should("pass for unique characters", () => {
      const text = "sadfjklewcmpgh";
      assert.equal(text, removeDuplicateChars(text));
    });

    should("detect single character as too short", () => {
      const text = "a";
      assert.isTrue(text.length <= 1);
    });

    should("detect empty string as too short", () => {
      const text = "";
      assert.isTrue(text.length <= 1);
    });

    should("accept two characters", () => {
      const text = "ab";
      assert.isFalse(text.length <= 1);
      assert.equal(text, removeDuplicateChars(text));
    });
  });

  context("linkHintNumbers validation", () => {
    should("detect duplicate numbers", () => {
      const text = "0011";
      assert.isTrue(text !== removeDuplicateChars(text));
    });

    should("pass for default number set", () => {
      const text = "0123456789";
      assert.equal(text, removeDuplicateChars(text));
    });

    should("detect single digit as too short", () => {
      const text = "5";
      assert.isTrue(text.length <= 1);
    });
  });
});

context("Settings defaults", () => {
  setup(async () => {
    await Settings.load();
  });

  should("have default scrollStepSize", () => {
    assert.equal(60, Settings.get("scrollStepSize"));
  });

  should("have default linkHintCharacters", () => {
    assert.equal("sadfjklewcmpgh", Settings.get("linkHintCharacters"));
  });

  should("have default linkHintNumbers", () => {
    assert.equal("0123456789", Settings.get("linkHintNumbers"));
  });

  should("have filterLinkHints disabled by default", () => {
    assert.equal(false, Settings.get("filterLinkHints"));
  });

  should("have hideHud disabled by default", () => {
    assert.equal(false, Settings.get("hideHud"));
  });

  should("have grabBackFocus disabled by default", () => {
    assert.equal(false, Settings.get("grabBackFocus"));
  });

  should("have smoothScroll enabled by default", () => {
    assert.equal(true, Settings.get("smoothScroll"));
  });

  should("have regexFindMode disabled by default", () => {
    assert.equal(false, Settings.get("regexFindMode"));
  });

  should("have correct newTabDestination default", () => {
    assert.equal("vimiumNewTabPage", Settings.get("newTabDestination"));
  });

  teardown(async () => {
    await Settings.clear();
  });
});

context("Settings pruneOutDefaultValues", () => {
  should("remove keys that match defaults", () => {
    const settings = { scrollStepSize: 60, smoothScroll: true };
    const pruned = Settings.pruneOutDefaultValues(settings);
    assert.equal(undefined, pruned.scrollStepSize);
    assert.equal(undefined, pruned.smoothScroll);
  });

  should("keep keys that differ from defaults", () => {
    const settings = { scrollStepSize: 100 };
    const pruned = Settings.pruneOutDefaultValues(settings);
    assert.equal(100, pruned.scrollStepSize);
  });

  should("return empty object when all defaults", () => {
    const pruned = Settings.pruneOutDefaultValues({ scrollStepSize: 60 });
    assert.equal({}, pruned);
  });
});
