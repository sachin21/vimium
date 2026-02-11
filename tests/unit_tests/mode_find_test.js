import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/keyboard_utils.js";
import "../../lib/handler_stack.js";
import "../../content_scripts/mode.js";
import "../../content_scripts/mode_find.js";

// Helpers for DOM stubs needed by FindMode.
const stubDOMForFindMode = () => {
  stub(globalThis, "Node", { TEXT_NODE: 3, ELEMENT_NODE: 1 });
  stub(globalThis, "Range", { START_TO_START: 0 });
  stub(globalThis, "getSelection", () => ({
    type: "None",
    rangeCount: 0,
    removeAllRanges: () => {},
    addRange: () => {},
    anchorNode: null,
    isCollapsed: true,
    collapseToStart: () => {},
    getRangeAt: () => null,
  }));
  stub(globalThis, "document", {
    body: {
      nodeType: 1,
      checkVisibility: () => true,
      childNodes: [],
      classList: { add: () => {}, remove: () => {} },
    },
    activeElement: null,
    createRange: () => ({
      setStart: () => {},
      setEnd: () => {},
      compareBoundaryPoints: () => 0,
      getBoundingClientRect: () => ({ top: 0, bottom: 0 }),
    }),
    removeEventListener: () => {},
    addEventListener: () => {},
    getSelection: () => ({ anchorNode: null }),
    querySelector: () => null,
  });
  stub(globalThis, "HUD", {
    show: () => {},
    hide: () => {},
    showFindMode: () => {},
    unfocusIfFocused: () => {},
  });
  stub(globalThis, "DomUtils", {
    isEditable: () => false,
    isSelectable: () => false,
    isDOMDescendant: () => false,
    isSelected: () => false,
    simulateSelect: () => {},
    consumeKeyup: () => {},
    suppressEvent: () => {},
    suppressPropagation: () => {},
  });
  stub(globalThis, "Marks", { setPreviousPosition: () => {} });
  stub(globalThis, "FindModeHistory", { getQuery: () => "", saveQuery: () => {} });
  stub(globalThis, "InsertMode", { suppressEvent: () => true });
  stub(Settings, "get", (key) => {
    if (key === "regexFindMode") return false;
    if (key === "ignoreKeyboardLayout") return false;
    return null;
  });
};

// ---- Tests for FindMode.updateQuery ----

context("FindMode.updateQuery", () => {
  setup(() => {
    stubDOMForFindMode();
    FindMode.query = { rawQuery: "" };
  });

  should("parse a plain text query", () => {
    FindMode.updateQuery("hello");
    assert.equal("hello", FindMode.query.parsedQuery);
    assert.equal(false, FindMode.query.isRegex);
  });

  should("enable regex mode with \\r escape", () => {
    FindMode.updateQuery("test\\r");
    assert.equal(true, FindMode.query.isRegex);
    assert.equal("test", FindMode.query.parsedQuery);
  });

  should("disable regex mode with \\R escape", () => {
    // First enable regex mode, then disable it.
    FindMode.updateQuery("test\\r");
    assert.equal(true, FindMode.query.isRegex);
    FindMode.updateQuery("test\\R");
    assert.equal(false, FindMode.query.isRegex);
    assert.equal("test", FindMode.query.parsedQuery);
  });

  should("not treat double backslash as escape sequence", () => {
    FindMode.updateQuery("test\\\\r");
    assert.equal(false, FindMode.query.isRegex);
    assert.equal("test\\\\r", FindMode.query.parsedQuery);
  });

  should("set ignoreCase to true for lowercase query (smartcase)", () => {
    FindMode.updateQuery("hello");
    assert.equal(true, FindMode.query.ignoreCase);
  });

  should("set ignoreCase to false when query has uppercase (smartcase)", () => {
    FindMode.updateQuery("Hello");
    assert.equal(false, FindMode.query.ignoreCase);
  });

  should("use default regex mode from settings", () => {
    stub(Settings, "get", (key) => {
      if (key === "regexFindMode") return true;
      return null;
    });
    FindMode.updateQuery("test");
    assert.equal(true, FindMode.query.isRegex);
  });

  should("override settings regex mode with \\R escape", () => {
    stub(Settings, "get", (key) => {
      if (key === "regexFindMode") return true;
      return null;
    });
    FindMode.updateQuery("test\\R");
    assert.equal(false, FindMode.query.isRegex);
  });

  should("not throw on invalid regex pattern", () => {
    // Enable regex mode, then use an invalid regex.
    FindMode.updateQuery("[invalid\\r");
    // Should not throw; the function returns early on SyntaxError.
    assert.equal(true, FindMode.query.isRegex);
  });

  should("store the raw query", () => {
    FindMode.updateQuery("hello world");
    assert.equal("hello world", FindMode.query.rawQuery);
  });

  should("handle empty query", () => {
    FindMode.updateQuery("");
    assert.equal("", FindMode.query.parsedQuery);
    assert.equal("", FindMode.query.rawQuery);
  });
});

// ---- Tests for FindMode.getQueryFromRegexMatches ----

context("FindMode.getQueryFromRegexMatches", () => {
  setup(() => {
    stubDOMForFindMode();
  });

  should("return the match at the active indices", () => {
    FindMode.query = {
      regexMatches: [["match1", "match2"], ["match3"]],
      activeRegexIndices: [0, 0],
    };
    assert.equal("match1", FindMode.getQueryFromRegexMatches());
  });

  should("return the correct match at non-zero indices", () => {
    FindMode.query = {
      regexMatches: [["match1", "match2"], ["match3"]],
      activeRegexIndices: [0, 1],
    };
    assert.equal("match2", FindMode.getQueryFromRegexMatches());
  });

  should("return the match from the second row", () => {
    FindMode.query = {
      regexMatches: [["match1", "match2"], ["match3"]],
      activeRegexIndices: [1, 0],
    };
    assert.equal("match3", FindMode.getQueryFromRegexMatches());
  });

  should("return empty string when regexMatches is empty", () => {
    FindMode.query = {
      regexMatches: [],
      activeRegexIndices: [0, 0],
    };
    assert.equal("", FindMode.getQueryFromRegexMatches());
  });

  should("return empty string when regexMatches is null", () => {
    FindMode.query = {
      regexMatches: null,
      activeRegexIndices: [0, 0],
    };
    assert.equal("", FindMode.getQueryFromRegexMatches());
  });
});

// ---- Tests for FindMode.getNextQueryFromRegexMatches ----

context("FindMode.getNextQueryFromRegexMatches", () => {
  setup(() => {
    stubDOMForFindMode();
  });

  should("advance forward within the same row", () => {
    FindMode.query = {
      regexMatches: [["a", "b", "c"], ["d"]],
      activeRegexIndices: [0, 0],
    };
    const result = FindMode.getNextQueryFromRegexMatches(false);
    assert.equal("b", result);
    assert.equal(0, FindMode.query.activeRegexIndices[0]);
    assert.equal(1, FindMode.query.activeRegexIndices[1]);
  });

  should("wrap forward to the next row", () => {
    FindMode.query = {
      regexMatches: [["a", "b"], ["c"]],
      activeRegexIndices: [0, 1],
    };
    const result = FindMode.getNextQueryFromRegexMatches(false);
    assert.equal("c", result);
    assert.equal(1, FindMode.query.activeRegexIndices[0]);
    assert.equal(0, FindMode.query.activeRegexIndices[1]);
  });

  should("wrap forward from last row to first row", () => {
    FindMode.query = {
      regexMatches: [["a", "b"], ["c"]],
      activeRegexIndices: [1, 0],
    };
    const result = FindMode.getNextQueryFromRegexMatches(false);
    assert.equal("a", result);
    assert.equal(0, FindMode.query.activeRegexIndices[0]);
    assert.equal(0, FindMode.query.activeRegexIndices[1]);
  });

  should("navigate backward within the same row", () => {
    FindMode.query = {
      regexMatches: [["a", "b", "c"], ["d"]],
      activeRegexIndices: [0, 2],
    };
    const result = FindMode.getNextQueryFromRegexMatches(true);
    assert.equal("b", result);
    assert.equal(0, FindMode.query.activeRegexIndices[0]);
    assert.equal(1, FindMode.query.activeRegexIndices[1]);
  });

  should("wrap backward to the previous row", () => {
    FindMode.query = {
      regexMatches: [["a", "b"], ["c"]],
      activeRegexIndices: [1, 0],
    };
    const result = FindMode.getNextQueryFromRegexMatches(true);
    assert.equal("b", result);
    assert.equal(0, FindMode.query.activeRegexIndices[0]);
    assert.equal(1, FindMode.query.activeRegexIndices[1]);
  });

  should("wrap backward from first row to last row", () => {
    FindMode.query = {
      regexMatches: [["a", "b"], ["c"]],
      activeRegexIndices: [0, 0],
    };
    const result = FindMode.getNextQueryFromRegexMatches(true);
    assert.equal("c", result);
    assert.equal(1, FindMode.query.activeRegexIndices[0]);
    assert.equal(0, FindMode.query.activeRegexIndices[1]);
  });

  should("return empty string when regexMatches is empty", () => {
    FindMode.query = {
      regexMatches: [],
      activeRegexIndices: [0, 0],
    };
    assert.equal("", FindMode.getNextQueryFromRegexMatches(false));
  });

  should("return empty string when regexMatches is null", () => {
    FindMode.query = {
      regexMatches: null,
      activeRegexIndices: [0, 0],
    };
    assert.equal("", FindMode.getNextQueryFromRegexMatches(true));
  });
});

// ---- Tests for FindMode.getQuery ----

context("FindMode.getQuery", () => {
  setup(() => {
    stubDOMForFindMode();
  });

  should("return undefined when query is not set", () => {
    FindMode.query = null;
    assert.equal(undefined, FindMode.getQuery(false));
  });

  should("call getNextQueryFromRegexMatches for the result", () => {
    FindMode.query = {
      rawQuery: "test",
      regexMatches: [["test"]],
      activeRegexIndices: [0, 0],
    };
    stub(FindModeHistory, "getQuery", () => "test");
    // Forward query.
    const result = FindMode.getQuery(false);
    // getNextQueryFromRegexMatches advances the index, wrapping around [0,0] -> [0,0] for single match.
    assert.equal("test", result);
  });
});
