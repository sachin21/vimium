import "./test_helper.js";
import "../../lib/handler_stack.js";
import "../../lib/dom_utils.js";

context("DomUtils.makeXPath", () => {
  should("create XPath for a single element", () => {
    assert.equal(".//a | .//xhtml:a", DomUtils.makeXPath(["a"]));
  });

  should("create XPath for multiple elements", () => {
    assert.equal(
      ".//a | .//xhtml:a | .//area | .//xhtml:area",
      DomUtils.makeXPath(["a", "area"]),
    );
  });

  should("return empty string for empty array", () => {
    assert.equal("", DomUtils.makeXPath([]));
  });

  should("create XPath for three elements", () => {
    assert.equal(
      ".//div | .//xhtml:div | .//span | .//xhtml:span | .//p | .//xhtml:p",
      DomUtils.makeXPath(["div", "span", "p"]),
    );
  });

  should("handle single-character element names", () => {
    assert.equal(".//b | .//xhtml:b", DomUtils.makeXPath(["b"]));
  });
});

context("DomUtils.isDOMDescendant", () => {
  should("return true for same element", () => {
    const node = { parentNode: null };
    assert.isTrue(DomUtils.isDOMDescendant(node, node));
  });

  should("return true for direct child", () => {
    const parent = { parentNode: null };
    const child = { parentNode: parent };
    assert.isTrue(DomUtils.isDOMDescendant(parent, child));
  });

  should("return true for nested descendant", () => {
    const grandparent = { parentNode: null };
    const parent = { parentNode: grandparent };
    const child = { parentNode: parent };
    assert.isTrue(DomUtils.isDOMDescendant(grandparent, child));
  });

  should("return false for non-descendant", () => {
    const parent = { parentNode: null };
    const other = { parentNode: null };
    assert.isFalse(DomUtils.isDOMDescendant(parent, other));
  });
});

context("DomUtils.windowIsTooSmall", () => {
  should("return true when width is less than 3", () => {
    stub(globalThis, "innerWidth", 2);
    stub(globalThis, "innerHeight", 100);
    assert.isTrue(DomUtils.windowIsTooSmall());
  });

  should("return true when height is less than 3", () => {
    stub(globalThis, "innerWidth", 100);
    stub(globalThis, "innerHeight", 2);
    assert.isTrue(DomUtils.windowIsTooSmall());
  });

  should("return false for normal window size", () => {
    stub(globalThis, "innerWidth", 1024);
    stub(globalThis, "innerHeight", 768);
    assert.isFalse(DomUtils.windowIsTooSmall());
  });
});

context("DomUtils.suppressEvent", () => {
  should("call preventDefault and stopImmediatePropagation", () => {
    let preventDefaultCalled = false;
    let stopImmediatePropagationCalled = false;
    const event = {
      preventDefault: () => preventDefaultCalled = true,
      stopImmediatePropagation: () => stopImmediatePropagationCalled = true,
    };
    DomUtils.suppressEvent(event);
    assert.isTrue(preventDefaultCalled);
    assert.isTrue(stopImmediatePropagationCalled);
  });
});

context("DomUtils.suppressPropagation", () => {
  should("call stopImmediatePropagation but not preventDefault", () => {
    let preventDefaultCalled = false;
    let stopImmediatePropagationCalled = false;
    const event = {
      preventDefault: () => preventDefaultCalled = true,
      stopImmediatePropagation: () => stopImmediatePropagationCalled = true,
    };
    DomUtils.suppressPropagation(event);
    assert.isFalse(preventDefaultCalled);
    assert.isTrue(stopImmediatePropagationCalled);
  });
});

context("DomUtils.isEmbed", () => {
  should("return true for embed elements", () => {
    assert.isTrue(DomUtils.isEmbed({ nodeName: "EMBED" }));
  });

  should("return true for object elements", () => {
    assert.isTrue(DomUtils.isEmbed({ nodeName: "OBJECT" }));
  });

  should("return false for non-embed elements", () => {
    assert.isFalse(DomUtils.isEmbed({ nodeName: "IFRAME" }));
    assert.isFalse(DomUtils.isEmbed({ nodeName: "DIV" }));
  });

  should("return false when nodeName is null", () => {
    assert.isFalse(DomUtils.isEmbed({ nodeName: null }));
  });
});

context("DomUtils.isTopFrame", () => {
  should("compare globalThis.top with globalThis.self", () => {
    // DomUtils.isTopFrame returns globalThis.top === globalThis.self.
    const expected = globalThis.top === globalThis.self;
    assert.equal(expected, DomUtils.isTopFrame());
  });
});

context("DomUtils.cropRectToVisible", () => {
  setup(() => {
    stub(globalThis, "Rect", {
      create(x1, y1, x2, y2) {
        return {
          bottom: y2,
          top: y1,
          left: x1,
          right: x2,
          width: x2 - x1,
          height: y2 - y1,
        };
      },
    });
    stub(globalThis, "innerWidth", 800);
    stub(globalThis, "innerHeight", 600);
  });

  should("return bounded rect for visible rect", () => {
    const rect = { left: 10, top: 10, right: 100, bottom: 100, width: 90, height: 90 };
    const result = DomUtils.cropRectToVisible(rect);
    assert.isTrue(result !== null);
    assert.equal(10, result.top);
    assert.equal(10, result.left);
  });

  should("return null when rect is below viewport", () => {
    const rect = { left: 10, top: 600, right: 100, bottom: 700, width: 90, height: 100 };
    const result = DomUtils.cropRectToVisible(rect);
    assert.equal(null, result);
  });

  should("return null when rect is right of viewport", () => {
    const rect = { left: 800, top: 10, right: 900, bottom: 100, width: 100, height: 90 };
    const result = DomUtils.cropRectToVisible(rect);
    assert.equal(null, result);
  });

  should("clamp negative top and left to zero", () => {
    const rect = { left: -10, top: -10, right: 100, bottom: 100, width: 110, height: 110 };
    const result = DomUtils.cropRectToVisible(rect);
    assert.isTrue(result !== null);
    assert.equal(0, result.top);
    assert.equal(0, result.left);
  });
});

context("DomUtils.isReady", () => {
  should("return true when document is not loading", () => {
    stub(globalThis, "document", { readyState: "complete" });
    assert.isTrue(DomUtils.isReady());
  });

  should("return true when document is interactive", () => {
    stub(globalThis, "document", { readyState: "interactive" });
    assert.isTrue(DomUtils.isReady());
  });

  should("return false when document is loading", () => {
    stub(globalThis, "document", { readyState: "loading" });
    assert.isFalse(DomUtils.isReady());
  });
});

context("DomUtils.isFocusable", () => {
  setup(() => {
    // Stub Element so instanceof checks work in Deno.
    stub(globalThis, "Element", Object);
  });

  should("return false for null element", () => {
    assert.isFalse(DomUtils.isFocusable(null));
  });

  should("return true for embed element", () => {
    assert.isTrue(DomUtils.isFocusable({ nodeName: "EMBED" }));
  });

  should("return false for regular div", () => {
    assert.isFalse(DomUtils.isFocusable({ nodeName: "DIV", isContentEditable: false }));
  });
});

context("DomUtils.isEditable", () => {
  setup(() => {
    stub(globalThis, "Element", Object);
  });

  should("return true for select element", () => {
    assert.isTrue(DomUtils.isEditable({ nodeName: "SELECT" }));
  });

  should("return false for non-editable div", () => {
    assert.isFalse(DomUtils.isEditable({ nodeName: "DIV", isContentEditable: false }));
  });
});
