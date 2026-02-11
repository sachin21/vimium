import "./test_helper.js";
import "../../lib/handler_stack.js";
import "../../content_scripts/mode.js";
import "../../lib/keyboard_utils.js";
import "../../lib/settings.js";
import "../../content_scripts/marks.js";

context("Marks.getLocationKey", () => {
  setup(() => {
    stub(globalThis, "HUD", { show: () => {} });
    stub(globalThis, "DomUtils", { isTopFrame: () => true });
    stub(globalThis, "localStorage", {});
    stub(globalThis, "scrollX", 100);
    stub(globalThis, "scrollY", 200);
    stub(globalThis, "scrollTo", () => {});
  });

  should("construct key from URL without hash", () => {
    stub(globalThis, "location", { href: "http://example.com/page#section", hash: "#section" });
    assert.equal("vimiumMark|http://example.com/page|a", Marks.getLocationKey("a"));
  });

  should("construct key with different characters", () => {
    stub(globalThis, "location", { href: "http://example.com/page", hash: "" });
    assert.equal("vimiumMark|http://example.com/page|z", Marks.getLocationKey("z"));
  });

  should("strip hash from URL", () => {
    stub(globalThis, "location", { href: "http://example.com/page#foo#bar", hash: "#foo#bar" });
    assert.equal("vimiumMark|http://example.com/page|x", Marks.getLocationKey("x"));
  });
});

context("Marks.isGlobalMark", () => {
  setup(() => {
    stub(globalThis, "HUD", { show: () => {} });
    stub(globalThis, "DomUtils", { isTopFrame: () => true });
    stub(globalThis, "localStorage", {});
    stub(globalThis, "location", { href: "http://example.com", hash: "" });
    stub(globalThis, "scrollX", 0);
    stub(globalThis, "scrollY", 0);
    stub(globalThis, "scrollTo", () => {});
    Marks.currentRegistryEntry = { options: { swap: false } };
  });

  should("return true when shift key is pressed", () => {
    assert.isTrue(Marks.isGlobalMark({ shiftKey: true }, "A"));
  });

  should("return false when shift key is not pressed", () => {
    assert.isFalse(Marks.isGlobalMark({ shiftKey: false }, "a"));
  });

  should("return false for backtick register even with shift", () => {
    assert.isFalse(Marks.isGlobalMark({ shiftKey: true }, "`"));
  });

  should("return false for single-quote register even with shift", () => {
    assert.isFalse(Marks.isGlobalMark({ shiftKey: true }, "'"));
  });

  should("invert shift behavior when swap option is true", () => {
    Marks.currentRegistryEntry = { options: { swap: true } };
    assert.isFalse(Marks.isGlobalMark({ shiftKey: true }, "A"));
    assert.isTrue(Marks.isGlobalMark({ shiftKey: false }, "a"));
  });
});

context("Marks.getMarkString", () => {
  setup(() => {
    stub(globalThis, "HUD", { show: () => {} });
    stub(globalThis, "DomUtils", { isTopFrame: () => true });
    stub(globalThis, "localStorage", {});
    stub(globalThis, "scrollTo", () => {});
  });

  should("return JSON with scrollX, scrollY, and hash", () => {
    stub(globalThis, "scrollX", 42);
    stub(globalThis, "scrollY", 84);
    stub(globalThis, "location", { href: "http://example.com/page#top", hash: "#top" });
    const result = JSON.parse(Marks.getMarkString());
    assert.equal(42, result.scrollX);
    assert.equal(84, result.scrollY);
    assert.equal("#top", result.hash);
  });

  should("return empty hash when no hash exists", () => {
    stub(globalThis, "scrollX", 0);
    stub(globalThis, "scrollY", 0);
    stub(globalThis, "location", { href: "http://example.com/page", hash: "" });
    const result = JSON.parse(Marks.getMarkString());
    assert.equal("", result.hash);
  });
});

context("Marks.setPreviousPosition", () => {
  setup(() => {
    stub(globalThis, "HUD", { show: () => {} });
    stub(globalThis, "DomUtils", { isTopFrame: () => true });
    stub(globalThis, "localStorage", {});
    stub(globalThis, "scrollX", 50);
    stub(globalThis, "scrollY", 75);
    stub(globalThis, "location", { href: "http://example.com", hash: "" });
    stub(globalThis, "scrollTo", () => {});
    Marks.localRegisters = {};
  });

  should("set both backtick and single-quote registers", () => {
    Marks.setPreviousPosition();
    assert.isTrue(Marks.localRegisters["`"] != null);
    assert.isTrue(Marks.localRegisters["'"] != null);
  });

  should("store current scroll position in registers", () => {
    Marks.setPreviousPosition();
    const backtick = JSON.parse(Marks.localRegisters["`"]);
    const quote = JSON.parse(Marks.localRegisters["'"]);
    assert.equal(50, backtick.scrollX);
    assert.equal(75, backtick.scrollY);
    assert.equal(50, quote.scrollX);
    assert.equal(75, quote.scrollY);
  });
});

context("Marks.exit", () => {
  setup(() => {
    stub(globalThis, "HUD", { show: () => {} });
    stub(globalThis, "DomUtils", { isTopFrame: () => true });
    stub(globalThis, "localStorage", {});
    stub(globalThis, "location", { href: "http://example.com", hash: "" });
    stub(globalThis, "scrollX", 0);
    stub(globalThis, "scrollY", 0);
    stub(globalThis, "scrollTo", () => {});
  });

  should("set mode to null when mode exists", () => {
    Marks.mode = { exit: () => {} };
    Marks.exit();
    assert.equal(null, Marks.mode);
  });

  should("call mode.exit when mode exists", () => {
    let exitCalled = false;
    Marks.mode = { exit: () => exitCalled = true };
    Marks.exit();
    assert.isTrue(exitCalled);
  });

  should("run continuation if provided", () => {
    let continuationCalled = false;
    Marks.mode = { exit: () => {} };
    Marks.exit(() => continuationCalled = true);
    assert.isTrue(continuationCalled);
  });

  should("handle null mode gracefully", () => {
    Marks.mode = null;
    Marks.exit();
    assert.equal(null, Marks.mode);
  });
});

context("Marks.showMessage", () => {
  setup(() => {
    stub(globalThis, "DomUtils", { isTopFrame: () => true });
    stub(globalThis, "localStorage", {});
    stub(globalThis, "location", { href: "http://example.com", hash: "" });
    stub(globalThis, "scrollX", 0);
    stub(globalThis, "scrollY", 0);
    stub(globalThis, "scrollTo", () => {});
  });

  should("call HUD.show with formatted message", () => {
    let shownMessage = null;
    stub(globalThis, "HUD", { show: (msg) => shownMessage = msg });
    Marks.showMessage("Created local mark", "a");
    assert.isTrue(shownMessage.includes("Created local mark"));
    assert.isTrue(shownMessage.includes("a"));
  });
});
