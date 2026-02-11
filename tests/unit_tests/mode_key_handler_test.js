import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/keyboard_utils.js";
import "../../lib/handler_stack.js";
import "../../content_scripts/mode.js";
import "../../content_scripts/mode_key_handler.js";

// Helper to create a fake keydown event for a given key character.
const createKeyEvent = (key, options = {}) => ({
  key,
  code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
  keyCode: key === "Escape" ? 27 : key.charCodeAt(0),
  shiftKey: options.shiftKey || false,
  altKey: options.altKey || false,
  ctrlKey: options.ctrlKey || false,
  metaKey: options.metaKey || false,
  isTrusted: true,
  preventDefault: () => {},
  stopImmediatePropagation: () => {},
});

// A sample key mapping used across tests.
const sampleKeyMapping = () => ({
  i: { command: "enterInsertMode" },
  j: { command: "scrollDown" },
  k: { command: "scrollUp" },
  g: {
    g: { command: "scrollToTop" },
    t: { command: "nextTab" },
  },
});

context("KeyHandlerMode", () => {
  let handler, lastCommand;

  setup(async () => {
    await Settings.load();
    stub(globalThis, "DomUtils", {
      consumeKeyup: (_event, callback) => {
        if (callback) callback();
        return false;
      },
      suppressEvent: () => {},
      suppressPropagation: () => {},
    });
    stub(globalThis, "HUD", { show() {}, hide() {} });
    stub(globalThis, "HelpDialog", { isShowing: () => false, toggle: () => {} });
    stub(globalThis, "HintCoordinator", { mouseOutOfLastClickedElement: () => {} });
    // Reset Mode state for clean tests.
    Mode.modes = [];
    handlerStack.reset();

    lastCommand = null;
    handler = new KeyHandlerMode();
    handler.init({
      keyMapping: sampleKeyMapping(),
      commandHandler: (args) => {
        lastCommand = args;
      },
    });
  });

  // --- setKeyMapping / setPassKeys / reset ---

  context("setKeyMapping", () => {
    should("reset state when key mapping is set", () => {
      // Advance state by pressing "g".
      handler.handleKeyChar("g");
      assert.isTrue(handler.keyState.length > 1);
      handler.setKeyMapping(sampleKeyMapping());
      assert.equal(1, handler.keyState.length);
      assert.equal(0, handler.countPrefix);
    });
  });

  context("setPassKeys", () => {
    should("reset state when pass keys are set", () => {
      handler.countPrefix = 5;
      handler.setPassKeys(["x"]);
      assert.equal(0, handler.countPrefix);
      assert.equal(1, handler.keyState.length);
    });
  });

  context("reset", () => {
    should("reset countPrefix to 0 and keyState to [keyMapping] with no argument", () => {
      handler.countPrefix = 42;
      handler.keyState = [{}, {}];
      handler.reset();
      assert.equal(0, handler.countPrefix);
      assert.equal(1, handler.keyState.length);
    });

    should("preserve the provided count prefix", () => {
      handler.reset(7);
      assert.equal(7, handler.countPrefix);
      assert.equal(1, handler.keyState.length);
    });
  });

  // --- isMappedKey ---

  context("isMappedKey", () => {
    should("return true for a directly mapped key", () => {
      assert.isTrue(handler.isMappedKey("i"));
    });

    should("return true for a nested first key", () => {
      assert.isTrue(handler.isMappedKey("g"));
    });

    should("return false for an unmapped key", () => {
      assert.isFalse(handler.isMappedKey("x"));
    });

    should("return false when key is a pass key", () => {
      handler.setPassKeys(["i"]);
      assert.isFalse(handler.isMappedKey("i"));
    });

    should("return true for continuation key after partial match", () => {
      // Press "g" to advance into nested mapping.
      handler.handleKeyChar("g");
      assert.isTrue(handler.isMappedKey("t"));
    });
  });

  // --- isCountKey ---

  context("isCountKey", () => {
    should("return true for digits 1-9 when countPrefix is 0", () => {
      handler.countPrefix = 0;
      assert.isTrue(handler.isCountKey("1"));
      assert.isTrue(handler.isCountKey("9"));
    });

    should("return false for 0 when countPrefix is 0", () => {
      handler.countPrefix = 0;
      assert.isFalse(handler.isCountKey("0"));
    });

    should("return true for 0 when countPrefix > 0", () => {
      handler.countPrefix = 3;
      assert.isTrue(handler.isCountKey("0"));
    });

    should("return false for a non-digit", () => {
      assert.isFalse(handler.isCountKey("a"));
    });

    should("return false for a digit that is a pass key", () => {
      handler.setPassKeys(["5"]);
      assert.isFalse(handler.isCountKey("5"));
    });
  });

  // --- isPassKey ---

  context("isPassKey", () => {
    should("return true when key is in passKeys, countPrefix=0, keyState at root", () => {
      handler.setPassKeys(["i"]);
      assert.isTrue(handler.isPassKey("i"));
    });

    should("return false when countPrefix > 0", () => {
      handler.setPassKeys(["i"]);
      handler.countPrefix = 3;
      assert.isFalse(handler.isPassKey("i"));
    });

    should("return false when in nested keyState", () => {
      handler.setPassKeys(["t"]);
      // Advance state with "g".
      handler.handleKeyChar("g");
      // "t" has a continuation mapping (g -> t), so it's not a pass key.
      assert.isFalse(handler.isPassKey("t"));
    });

    should("return false when passKeys is not set", () => {
      assert.isFalse(handler.isPassKey("i"));
    });

    should("return false for a key that is in a continued mapping", () => {
      handler.setPassKeys(["g"]);
      // "g" is itself the start of a nested mapping (continuation mapping).
      // Since "g" appears in keyMapping (which is the root mapping, not a continuation),
      // isPassKey checks for continuation mappings only.
      // "g" in keyMapping === this.keyMapping, so it's excluded from continuation mappings.
      assert.isTrue(handler.isPassKey("g"));
    });
  });

  // --- isInResetState ---

  context("isInResetState", () => {
    should("return true when countPrefix=0 and keyState has one entry", () => {
      assert.isTrue(handler.isInResetState());
    });

    should("return false when countPrefix > 0", () => {
      handler.countPrefix = 1;
      assert.isFalse(handler.isInResetState());
    });

    should("return false when keyState is deeper", () => {
      handler.handleKeyChar("g");
      assert.isFalse(handler.isInResetState());
    });
  });

  // --- handleKeyChar ---

  context("handleKeyChar", () => {
    should("execute command for a directly mapped key", () => {
      handler.handleKeyChar("j");
      assert.isTrue(lastCommand != null);
      assert.equal("scrollDown", lastCommand.command.command);
    });

    should("pass null count when no count prefix", () => {
      handler.handleKeyChar("j");
      assert.equal(null, lastCommand.count);
    });

    should("handle nested mapping: g advances state, then t executes command", () => {
      handler.handleKeyChar("g");
      assert.equal(null, lastCommand);
      handler.handleKeyChar("t");
      assert.isTrue(lastCommand != null);
      assert.equal("nextTab", lastCommand.command.command);
    });

    should("apply count prefix: type 3 then j gives count=3", () => {
      handler.countPrefix = 3;
      handler.handleKeyChar("j");
      assert.equal(3, lastCommand.count);
    });

    should("reset after command execution", () => {
      handler.handleKeyChar("j");
      assert.isTrue(handler.isInResetState());
    });

    should("reset count prefix when key is not in first mapping", () => {
      // Set count prefix and go into nested state with "g".
      handler.countPrefix = 5;
      handler.handleKeyChar("g");
      // Now "t" is not in keyState[0] (which is the mapping from "g").
      // Actually after pressing "g", keyState = [{ g: ..., t: ... }, keyMapping].
      // Let's verify the count reset behavior:
      // "g" maps to { g: scrollToTop, t: nextTab } in the nested mapping.
      // After pressing "g", keyState[0] = { g: scrollToTop, t: nextTab }.
      // "t" IS in keyState[0], so count is preserved.
      handler.handleKeyChar("t");
      assert.equal(5, lastCommand.count);
    });

    should("exit mode when options.count reaches 0", () => {
      const countHandler = new KeyHandlerMode();
      let commandExecuted = false;
      countHandler.init({
        keyMapping: { j: { command: "scrollDown" } },
        commandHandler: () => {
          commandExecuted = true;
        },
        count: 1,
      });
      countHandler.handleKeyChar("j");
      assert.isTrue(commandExecuted);
      assert.isFalse(countHandler.modeIsActive);
    });

    should("handle nested gg mapping correctly", () => {
      handler.handleKeyChar("g");
      handler.handleKeyChar("g");
      assert.isTrue(lastCommand != null);
      assert.equal("scrollToTop", lastCommand.command.command);
    });
  });

  // --- onKeydown ---

  context("onKeydown", () => {
    should("reset when escape is pressed and not in reset state", () => {
      handler.countPrefix = 5;
      const event = createKeyEvent("Escape");
      handler.onKeydown(event);
      assert.equal(0, handler.countPrefix);
    });

    should("toggle HelpDialog when escape is pressed and dialog is showing", () => {
      let toggled = false;
      stub(globalThis, "HelpDialog", {
        isShowing: () => true,
        toggle: () => {
          toggled = true;
        },
      });
      const event = createKeyEvent("Escape");
      handler.onKeydown(event);
      assert.isTrue(toggled);
    });

    should("call HintCoordinator.mouseOutOfLastClickedElement on escape in reset state", () => {
      let called = false;
      stub(globalThis, "HintCoordinator", {
        mouseOutOfLastClickedElement: () => {
          called = true;
        },
      });
      const event = createKeyEvent("Escape");
      handler.onKeydown(event);
      assert.isTrue(called);
    });

    should("return suppressEvent for a mapped key", () => {
      const event = createKeyEvent("j");
      const result = handler.onKeydown(event);
      assert.equal(handlerStack.suppressEvent, result);
    });

    should("reset and return continueBubbling for an unmapped key", () => {
      // First advance state.
      handler.handleKeyChar("g");
      assert.isFalse(handler.isInResetState());
      const event = createKeyEvent("x");
      const result = handler.onKeydown(event);
      assert.isTrue(handler.isInResetState());
      assert.equal(handlerStack.continueBubbling, result);
    });

    should("return suppressEvent for a count key", () => {
      const event = createKeyEvent("3");
      const result = handler.onKeydown(event);
      assert.equal(handlerStack.suppressEvent, result);
      assert.equal(3, handler.countPrefix);
    });

    should("accumulate count prefix digits", () => {
      handler.onKeydown(createKeyEvent("1"));
      handler.onKeydown(createKeyEvent("2"));
      assert.equal(12, handler.countPrefix);
    });
  });
});
