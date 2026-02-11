import "./test_helper.js";
import "../../lib/find_mode_history.js";

// -- refreshRawQueryList() tests --

context("FindModeHistory.refreshRawQueryList", () => {
  should("add query to empty list", () => {
    const result = FindModeHistory.refreshRawQueryList("query", []);
    assert.equal(["query"], result);
  });

  should("add new query to front of list", () => {
    const result = FindModeHistory.refreshRawQueryList("new", ["old1", "old2"]);
    assert.equal("new", result[0]);
    assert.equal("old1", result[1]);
    assert.equal("old2", result[2]);
  });

  should("deduplicate by moving existing query to front", () => {
    const result = FindModeHistory.refreshRawQueryList("old2", ["old1", "old2", "old3"]);
    assert.equal(["old2", "old1", "old3"], result);
  });

  should("slice list to max+1 entries", () => {
    const longList = Array.from({ length: 55 }, (_, i) => `query${i}`);
    const result = FindModeHistory.refreshRawQueryList("new", longList);
    assert.equal(FindModeHistory.max + 1, result.length);
    assert.equal("new", result[0]);
  });

  should("handle special characters in query", () => {
    const result = FindModeHistory.refreshRawQueryList("foo.*bar[0]", ["existing"]);
    assert.equal("foo.*bar[0]", result[0]);
    assert.equal("existing", result[1]);
  });

  should("not duplicate when query already at front", () => {
    const result = FindModeHistory.refreshRawQueryList("first", ["first", "second"]);
    assert.equal(["first", "second"], result);
  });
});

// -- getQuery() tests --

context("FindModeHistory.getQuery", () => {
  setup(() => {
    FindModeHistory.rawQueryList = ["alpha", "beta", "gamma"];
  });

  teardown(() => {
    FindModeHistory.rawQueryList = null;
  });

  should("return first item when index is null", () => {
    assert.equal("alpha", FindModeHistory.getQuery(null));
  });

  should("return item at specific index", () => {
    assert.equal("beta", FindModeHistory.getQuery(1));
    assert.equal("gamma", FindModeHistory.getQuery(2));
  });

  should("return empty string for out of range index", () => {
    assert.equal("", FindModeHistory.getQuery(100));
  });

  should("return first item when index is undefined", () => {
    assert.equal("alpha", FindModeHistory.getQuery());
  });
});

// -- saveQuery() tests --

context("FindModeHistory.saveQuery", () => {
  setup(() => {
    FindModeHistory.rawQueryList = ["existing"];
    FindModeHistory.key = "findModeRawQueryList";
    FindModeHistory.isIncognitoMode = false;
    chrome.storage.session.store = {};
  });

  teardown(() => {
    FindModeHistory.rawQueryList = null;
    FindModeHistory.key = "findModeRawQueryList";
    chrome.storage.session.store = {};
  });

  should("save new query and update storage", async () => {
    await FindModeHistory.saveQuery("newQuery");
    assert.equal("newQuery", FindModeHistory.rawQueryList[0]);
    assert.equal("existing", FindModeHistory.rawQueryList[1]);
    const stored = await chrome.storage.session.get("findModeRawQueryList");
    assert.equal("newQuery", stored.findModeRawQueryList[0]);
  });

  should("not save empty query", async () => {
    await FindModeHistory.saveQuery("");
    assert.equal(1, FindModeHistory.rawQueryList.length);
    assert.equal("existing", FindModeHistory.rawQueryList[0]);
  });

  should("propagate to incognito storage when incognito list exists", async () => {
    FindModeHistory.isIncognitoMode = false;
    await chrome.storage.session.set({
      findModeRawQueryListIncognito: ["incogQuery"],
    });
    await FindModeHistory.saveQuery("newQuery");
    const result = await chrome.storage.session.get("findModeRawQueryListIncognito");
    assert.equal("newQuery", result.findModeRawQueryListIncognito[0]);
  });
});

// -- init() tests --

context("FindModeHistory.init", () => {
  setup(() => {
    FindModeHistory.rawQueryList = null;
    FindModeHistory.key = "findModeRawQueryList";
    chrome.storage.session.store = {};
  });

  teardown(() => {
    FindModeHistory.rawQueryList = null;
    FindModeHistory.key = "findModeRawQueryList";
    chrome.storage.session.store = {};
  });

  should("load rawQueryList from storage in normal mode", async () => {
    stub(chrome.extension, "inIncognitoContext", false);
    // Write directly to store to avoid triggering onChanged listeners from prior init() calls.
    chrome.storage.session.store.findModeRawQueryList = ["q1", "q2"];
    await FindModeHistory.init();
    assert.equal(["q1", "q2"], FindModeHistory.rawQueryList);
  });

  should("initialize empty list when storage is empty", async () => {
    stub(chrome.extension, "inIncognitoContext", false);
    await FindModeHistory.init();
    assert.equal([], FindModeHistory.rawQueryList);
  });

  should("use incognito key and copy from non-incognito in incognito mode", async () => {
    stub(chrome.extension, "inIncognitoContext", true);
    // Write directly to store to avoid triggering onChanged listeners from prior init() calls.
    chrome.storage.session.store.findModeRawQueryList = ["normal1", "normal2"];
    await FindModeHistory.init();
    assert.equal("findModeRawQueryListIncognito", FindModeHistory.key);
    assert.equal(["normal1", "normal2"], FindModeHistory.rawQueryList);
  });
});
