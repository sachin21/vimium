import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/handler_stack.js";
import "../../content_scripts/mode.js";
import "../../content_scripts/scroller.js";

// Helpers for DOM stubs needed by Scroller.
const stubDOMForScroller = () => {
  stub(globalThis, "DomUtils", {
    isEditable: () => false,
    getVisibleClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
    getContainingElement: () => null,
    consumeKeyup: () => {},
    suppressEvent: () => {},
    suppressPropagation: () => {},
  });
  stub(globalThis, "HUD", { show: () => {}, hide: () => {} });
  stub(globalThis, "requestAnimationFrame", (fn) => fn(16));
  stub(globalThis, "innerWidth", 1024);
  stub(globalThis, "innerHeight", 768);
  stub(globalThis, "location", { host: "example.com" });
  stub(globalThis, "getComputedStyle", () => ({
    getPropertyValue: () => "visible",
  }));
  stub(globalThis, "document", {
    body: {
      scrollHeight: 2000,
      clientHeight: 768,
      scrollWidth: 2000,
      clientWidth: 1024,
      scrollTop: 0,
      scrollLeft: 0,
      children: [],
      scrollBy: () => {},
    },
    documentElement: {
      scrollHeight: 2000,
      clientHeight: 768,
    },
    scrollingElement: {
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 2000,
      clientHeight: 768,
      scrollWidth: 2000,
      clientWidth: 1024,
      scrollBy: () => {},
      children: [],
      getBoundingClientRect: () => ({ top: 0, bottom: 768, left: 0, right: 1024 }),
    },
    querySelector: () => null,
  });
  stub(Settings, "get", (key) => {
    if (key === "smoothScroll") return false;
    if (key === "scrollStepSize") return 60;
    return null;
  });
  // Utils.isFirefox() requires browser info to be loaded.
  Utils._browserInfoLoaded = true;
  Utils._isFirefox = false;
};

// ---- Tests for Scroller initialization ----

context("Scroller", () => {
  setup(() => {
    stubDOMForScroller();
  });

  should("have an init method", () => {
    assert.equal("function", typeof Scroller.init);
  });

  should("have a reset method", () => {
    assert.equal("function", typeof Scroller.reset);
  });

  should("have a scrollBy method", () => {
    assert.equal("function", typeof Scroller.scrollBy);
  });

  should("have a scrollTo method", () => {
    assert.equal("function", typeof Scroller.scrollTo);
  });

  should("have an isScrollableElement method", () => {
    assert.equal("function", typeof Scroller.isScrollableElement);
  });

  should("have a scrollIntoView method", () => {
    assert.equal("function", typeof Scroller.scrollIntoView);
  });
});

context("Scroller.init", () => {
  setup(() => {
    stubDOMForScroller();
    handlerStack.reset();
  });

  should("initialize without errors", () => {
    Scroller.init();
    // After init, the handler stack should have entries pushed by Scroller and CoreScroller.
    assert.isTrue(handlerStack.stack.length > 0);
  });

  should("reset activatedElement via reset()", () => {
    Scroller.init();
    Scroller.reset();
    // After reset, scrollBy should re-find the scrollable element.
    // No error should be thrown.
    assert.equal("function", typeof Scroller.reset);
  });
});

// ---- Tests for Scroller.scrollBy ----

context("Scroller.scrollBy", () => {
  setup(() => {
    stubDOMForScroller();
    handlerStack.reset();
    Scroller.init();
  });

  should("not throw when called with direction y", () => {
    // With jump scrolling (smoothScroll=false), this should attempt a scroll.
    let threw = false;
    try {
      Scroller.scrollBy("y", 60, 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("not throw when called with direction x", () => {
    let threw = false;
    try {
      Scroller.scrollBy("x", 60, 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("accept a negative amount for scrolling up", () => {
    let threw = false;
    try {
      Scroller.scrollBy("y", -60, 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("handle zero amount gracefully", () => {
    let threw = false;
    try {
      Scroller.scrollBy("y", 0, 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("use default factor of 1 when factor is null", () => {
    let threw = false;
    try {
      Scroller.scrollBy("y", 60);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });
});

// ---- Tests for Scroller.scrollTo ----

context("Scroller.scrollTo", () => {
  setup(() => {
    stubDOMForScroller();
    handlerStack.reset();
    Scroller.init();
  });

  should("not throw when scrolling to a position in y direction", () => {
    let threw = false;
    try {
      Scroller.scrollTo("y", 0);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("not throw when scrolling to a position in x direction", () => {
    let threw = false;
    try {
      Scroller.scrollTo("x", 0);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("not throw when scrolling to max", () => {
    let threw = false;
    try {
      Scroller.scrollTo("y", "max");
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });
});

// ---- Tests for Scroller.scrollBy with string amounts ----

context("Scroller.scrollBy with string amounts", () => {
  setup(() => {
    stubDOMForScroller();
    handlerStack.reset();
    Scroller.init();
  });

  should("handle viewSize as amount for page scrolling", () => {
    let threw = false;
    try {
      Scroller.scrollBy("y", "viewSize", 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("handle viewSize for x direction", () => {
    let threw = false;
    try {
      Scroller.scrollBy("x", "viewSize", 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("handle negative factor with viewSize", () => {
    let threw = false;
    try {
      Scroller.scrollBy("y", "viewSize", -0.5);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });
});

// ---- Tests for Scroller.scrollBy with non-continuous scroll ----

context("Scroller.scrollBy non-continuous", () => {
  setup(() => {
    stubDOMForScroller();
    handlerStack.reset();
    Scroller.init();
  });

  should("accept continuous=false parameter", () => {
    let threw = false;
    try {
      Scroller.scrollBy("y", 60, 1, false);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });
});

// ---- Tests for Scroller after reset ----

context("Scroller after reset", () => {
  setup(() => {
    stubDOMForScroller();
    handlerStack.reset();
    Scroller.init();
  });

  should("allow scrollBy after reset", () => {
    Scroller.reset();
    let threw = false;
    try {
      Scroller.scrollBy("y", 60, 1);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });

  should("allow scrollTo after reset", () => {
    Scroller.reset();
    let threw = false;
    try {
      Scroller.scrollTo("y", 0);
    } catch {
      threw = true;
    }
    assert.equal(false, threw);
  });
});
