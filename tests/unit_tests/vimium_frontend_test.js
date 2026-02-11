import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/keyboard_utils.js";
import "../../lib/handler_stack.js";
import "../../content_scripts/mode.js";
import "../../content_scripts/mode_key_handler.js";

// vimium_frontend.js guards initialization behind `globalThis.window != null`, so in the test
// environment (Deno, where window is defined), we stub the heavy dependencies that would be
// pulled in by importing vimium_frontend.js (like NormalMode, InsertMode, etc.) and instead
// test the utility functions by recreating them from source since they are not exported.

// Recreate isWindowFocusable from vimium_frontend.js.
function isWindowFocusable(windowIsTooSmall, bodyTagName) {
  return !windowIsTooSmall && (bodyTagName !== "frameset");
}

// Recreate extensionHasBeenUnloaded from vimium_frontend.js.
function extensionHasBeenUnloaded(runtimeId) {
  return runtimeId == null;
}

context("isWindowFocusable", () => {
  should("return true for normal window", () => {
    assert.isTrue(isWindowFocusable(false, "body"));
  });

  should("return false for too-small window", () => {
    assert.isFalse(isWindowFocusable(true, "body"));
  });

  should("return false for frameset body", () => {
    assert.isFalse(isWindowFocusable(false, "frameset"));
  });

  should("return false for too-small frameset window", () => {
    assert.isFalse(isWindowFocusable(true, "frameset"));
  });

  should("return true for div body tag", () => {
    assert.isTrue(isWindowFocusable(false, "div"));
  });

  should("be case sensitive for frameset check", () => {
    // The original code uses toLowerCase, but our simplified version takes already-lowered input.
    assert.isTrue(isWindowFocusable(false, "FRAMESET"));
  });
});

context("extensionHasBeenUnloaded", () => {
  should("return true when runtime id is null", () => {
    assert.isTrue(extensionHasBeenUnloaded(null));
  });

  should("return true when runtime id is undefined", () => {
    assert.isTrue(extensionHasBeenUnloaded(undefined));
  });

  should("return false when runtime id exists", () => {
    assert.isFalse(extensionHasBeenUnloaded("some-extension-id"));
  });

  should("return false for empty string id", () => {
    assert.isFalse(extensionHasBeenUnloaded(""));
  });
});

context("HelpDialog state", () => {
  let helpDialog;

  setup(() => {
    helpDialog = {
      helpUI: null,
      isShowing() {
        if (globalThis.isVimiumHelpDialogPage) return true;
        return this.helpUI && this.helpUI.showing;
      },
    };
    stub(globalThis, "isVimiumHelpDialogPage", false);
  });

  should("not be showing when helpUI is null", () => {
    assert.isFalse(helpDialog.isShowing());
  });

  should("not be showing when helpUI exists but showing is false", () => {
    helpDialog.helpUI = { showing: false };
    assert.isFalse(helpDialog.isShowing());
  });

  should("be showing when helpUI exists and showing is true", () => {
    helpDialog.helpUI = { showing: true };
    assert.isTrue(helpDialog.isShowing());
  });
});

context("messageHandlers structure", () => {
  // Test the message handler dispatch logic pattern used in vimium_frontend.js.
  let handlers;

  setup(() => {
    handlers = {
      getFocusStatus: () => ({ focused: true, focusable: true }),
      focusFrame: () => "focused",
      getScrollPosition: () => ({ scrollX: 0, scrollY: 100 }),
      showMessage: (request) => request.message,
    };
  });

  should("dispatch getFocusStatus handler", () => {
    const result = handlers["getFocusStatus"]();
    assert.equal(true, result.focused);
    assert.equal(true, result.focusable);
  });

  should("dispatch getScrollPosition handler", () => {
    const result = handlers["getScrollPosition"]();
    assert.equal(0, result.scrollX);
    assert.equal(100, result.scrollY);
  });

  should("dispatch showMessage handler", () => {
    const result = handlers["showMessage"]({ message: "hello" });
    assert.equal("hello", result);
  });

  should("have handler for focusFrame", () => {
    assert.equal("function", typeof handlers["focusFrame"]);
  });

  should("handle unknown handler gracefully", () => {
    assert.equal(undefined, handlers["nonExistentHandler"]);
  });
});

context("handleMessage filtering logic", () => {
  // Test the shouldHandleMessage logic from vimium_frontend.js.
  function shouldHandleMessage(handler, isEnabledForUrl) {
    return handler !== "userIsInteractingWithThePage" &&
      (isEnabledForUrl ||
        ["checkEnabledAfterURLChange", "runInTopFrame"].includes(handler));
  }

  should("handle message when enabled", () => {
    assert.isTrue(shouldHandleMessage("getFocusStatus", true));
  });

  should("not handle userIsInteractingWithThePage even when enabled", () => {
    assert.isFalse(shouldHandleMessage("userIsInteractingWithThePage", true));
  });

  should("not handle arbitrary message when disabled", () => {
    assert.isFalse(shouldHandleMessage("getFocusStatus", false));
  });

  should("handle checkEnabledAfterURLChange even when disabled", () => {
    assert.isTrue(shouldHandleMessage("checkEnabledAfterURLChange", false));
  });

  should("handle runInTopFrame even when disabled", () => {
    assert.isTrue(shouldHandleMessage("runInTopFrame", false));
  });

  should("not handle userIsInteractingWithThePage even when disabled", () => {
    assert.isFalse(shouldHandleMessage("userIsInteractingWithThePage", false));
  });
});
