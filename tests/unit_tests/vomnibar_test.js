import "./test_helper.js";
import "../../lib/types.js";
import "../../content_scripts/vomnibar.js";

context("Vomnibar", () => {
  let lastShowArgs, lastShowOpts, initCalled, helpDialogAborted;

  setup(() => {
    initCalled = false;
    helpDialogAborted = false;
    lastShowArgs = null;
    lastShowOpts = null;

    stub(
      globalThis,
      "UIComponent",
      class {
        constructor() {}
        load() {}
        show(args, opts) {
          lastShowArgs = args;
          lastShowOpts = opts;
        }
      },
    );
    stub(globalThis, "HelpDialog", { abort: () => helpDialogAborted = true });
    stub(globalThis, "Utils", {
      getCurrentVersion: () => "1.0",
      assertType: () => {},
    });
    stub(globalThis, "location", { href: "http://example.com" });

    // Reset vomnibarUI so init() creates a fresh one each time.
    Vomnibar.vomnibarUI = null;
  });

  should("activate with omni completer and newTab false", () => {
    Vomnibar.activate(0, { options: {} });
    assert.equal("omni", lastShowArgs.completer);
    assert.equal(undefined, lastShowArgs.newTab);
  });

  should("activateInNewTab with omni completer and newTab true", () => {
    Vomnibar.activateInNewTab(0, { options: {} });
    assert.equal("omni", lastShowArgs.completer);
    assert.equal(true, lastShowArgs.newTab);
  });

  should("activateTabSelection with tabs completer", () => {
    Vomnibar.activateTabSelection(0);
    assert.equal("tabs", lastShowArgs.completer);
    assert.equal(true, lastShowArgs.selectFirst);
  });

  should("activateBookmarks with bookmarks completer and no newTab", () => {
    Vomnibar.activateBookmarks(0, { options: {} });
    assert.equal("bookmarks", lastShowArgs.completer);
    assert.equal(true, lastShowArgs.selectFirst);
    assert.equal(undefined, lastShowArgs.newTab);
  });

  should("activateBookmarksInNewTab with bookmarks completer and newTab true", () => {
    Vomnibar.activateBookmarksInNewTab(0, { options: {} });
    assert.equal("bookmarks", lastShowArgs.completer);
    assert.equal(true, lastShowArgs.selectFirst);
    assert.equal(true, lastShowArgs.newTab);
  });

  should("activateEditUrl with query set to current URL", () => {
    Vomnibar.activateEditUrl(0);
    assert.equal("http://example.com", lastShowArgs.query);
    assert.equal("omni", lastShowArgs.completer);
    assert.equal(false, lastShowArgs.selectFirst);
  });

  should("activateEditUrlInNewTab with query and newTab true", () => {
    Vomnibar.activateEditUrlInNewTab(0);
    assert.equal("http://example.com", lastShowArgs.query);
    assert.equal(true, lastShowArgs.newTab);
    assert.equal("omni", lastShowArgs.completer);
  });

  should("open calls HelpDialog.abort", () => {
    Vomnibar.activate(0, { options: {} });
    assert.isTrue(helpDialogAborted);
  });

  should("init creates UIComponent only once", () => {
    let constructCount = 0;
    stub(
      globalThis,
      "UIComponent",
      class {
        constructor() {
          constructCount++;
        }
        load() {}
        show() {}
      },
    );
    Vomnibar.vomnibarUI = null;
    Vomnibar.activate(0, { options: {} });
    Vomnibar.activate(0, { options: {} });
    assert.equal(1, constructCount);
  });

  should("open passes sourceFrameId and focus option", () => {
    Vomnibar.activate(42, { options: {} });
    assert.equal(42, lastShowOpts.sourceFrameId);
    assert.equal(true, lastShowOpts.focus);
  });

  should("activate merges registryEntry options", () => {
    Vomnibar.activate(0, { options: { keyword: "wiki" } });
    assert.equal("wiki", lastShowArgs.keyword);
    assert.equal("omni", lastShowArgs.completer);
  });

  should("activateInNewTab merges registryEntry options", () => {
    Vomnibar.activateInNewTab(0, { options: { keyword: "g" } });
    assert.equal("g", lastShowArgs.keyword);
    assert.equal(true, lastShowArgs.newTab);
  });

  should("activateBookmarks merges registryEntry options", () => {
    Vomnibar.activateBookmarks(0, { options: { keyword: "bm" } });
    assert.equal("bm", lastShowArgs.keyword);
    assert.equal("bookmarks", lastShowArgs.completer);
  });

  should("open sets name to activate in show args", () => {
    Vomnibar.activate(0, { options: {} });
    assert.equal("activate", lastShowArgs.name);
  });

  should("activateEditUrl does not set newTab", () => {
    Vomnibar.activateEditUrl(0);
    assert.equal(undefined, lastShowArgs.newTab);
  });
});
