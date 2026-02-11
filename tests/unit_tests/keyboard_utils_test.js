import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/keyboard_utils.js";

// -- init() tests --
// Note: Deno's navigator is read-only, so we test init() behavior in the Deno environment
// and test platform-specific logic by setting KeyboardUtils.platform directly.

context("KeyboardUtils.init", () => {
  should("have been called at module load time and set a platform", () => {
    // In Deno, navigator.userAgent is defined but doesn't contain Mac/Linux, so defaults to Windows.
    assert.isTrue(KeyboardUtils.platform != null);
  });

  should("default to Windows when userAgent does not match Mac or Linux", () => {
    // Deno's userAgent is like "Deno/x.y.z", which doesn't match Mac or Linux.
    assert.equal("Windows", KeyboardUtils.platform);
  });
});

// -- getKeyChar() tests --

context("KeyboardUtils.getKeyChar", () => {
  setup(async () => {
    await Settings.load();
  });

  should("return the key for a normal single character", () => {
    assert.equal("a", KeyboardUtils.getKeyChar({ key: "a" }));
  });

  should("return mapped name for ArrowLeft", () => {
    assert.equal("left", KeyboardUtils.getKeyChar({ key: "ArrowLeft" }));
  });

  should("return mapped name for ArrowUp", () => {
    assert.equal("up", KeyboardUtils.getKeyChar({ key: "ArrowUp" }));
  });

  should("return mapped name for ArrowRight", () => {
    assert.equal("right", KeyboardUtils.getKeyChar({ key: "ArrowRight" }));
  });

  should("return mapped name for ArrowDown", () => {
    assert.equal("down", KeyboardUtils.getKeyChar({ key: "ArrowDown" }));
  });

  should("return space for space key", () => {
    assert.equal("space", KeyboardUtils.getKeyChar({ key: " " }));
  });

  should("return enter for newline key", () => {
    assert.equal("enter", KeyboardUtils.getKeyChar({ key: "\n" }));
  });

  should("return empty string for modifier keys", () => {
    assert.equal("", KeyboardUtils.getKeyChar({ key: "Control" }));
    assert.equal("", KeyboardUtils.getKeyChar({ key: "Shift" }));
    assert.equal("", KeyboardUtils.getKeyChar({ key: "Alt" }));
    assert.equal("", KeyboardUtils.getKeyChar({ key: "Meta" }));
  });

  should("return empty string when key is missing", () => {
    assert.equal("", KeyboardUtils.getKeyChar({}));
  });

  should("return lowercased multi-character key name", () => {
    assert.equal("pagedown", KeyboardUtils.getKeyChar({ key: "PageDown" }));
    assert.equal("pageup", KeyboardUtils.getKeyChar({ key: "PageUp" }));
  });

  should("return single character key as-is", () => {
    assert.equal("z", KeyboardUtils.getKeyChar({ key: "z" }));
    assert.equal("1", KeyboardUtils.getKeyChar({ key: "1" }));
    assert.equal("/", KeyboardUtils.getKeyChar({ key: "/" }));
  });

  should("return lowercased escape key name", () => {
    assert.equal("escape", KeyboardUtils.getKeyChar({ key: "Escape" }));
  });

  should("return enter for Enter key", () => {
    assert.equal("enter", KeyboardUtils.getKeyChar({ key: "Enter" }));
  });
});

context("KeyboardUtils.getKeyChar with ignoreKeyboardLayout", () => {
  setup(async () => {
    await Settings.load();
    await Settings.set("ignoreKeyboardLayout", true);
  });

  should("use event.code and strip Key prefix", () => {
    assert.equal("a", KeyboardUtils.getKeyChar({ key: "q", code: "KeyA" }));
  });

  should("lowercase single character from code", () => {
    assert.equal("z", KeyboardUtils.getKeyChar({ key: "w", code: "KeyZ", shiftKey: false }));
  });

  should("translate Semicolon code without shift", () => {
    assert.equal(";", KeyboardUtils.getKeyChar({ key: "é", code: "Semicolon", shiftKey: false }));
  });

  should("translate Semicolon code with shift", () => {
    assert.equal(":", KeyboardUtils.getKeyChar({ key: "É", code: "Semicolon", shiftKey: true }));
  });

  should("translate BracketLeft code without shift", () => {
    assert.equal("[", KeyboardUtils.getKeyChar({ key: "^", code: "BracketLeft", shiftKey: false }));
  });

  should("translate BracketRight code with shift", () => {
    assert.equal("}", KeyboardUtils.getKeyChar({ key: "^", code: "BracketRight", shiftKey: true }));
  });

  should("use event.key for Numpad keys even when ignoreKeyboardLayout is on", () => {
    assert.equal("5", KeyboardUtils.getKeyChar({ key: "5", code: "Numpad5" }));
  });

  should("fall back to event.key when code is missing", () => {
    assert.equal("a", KeyboardUtils.getKeyChar({ key: "a", code: "" }));
  });

  should("return empty string when both key and code are missing", () => {
    assert.equal("", KeyboardUtils.getKeyChar({ code: "" }));
  });

  should("translate Digit1 code without shift", () => {
    assert.equal("1", KeyboardUtils.getKeyChar({ key: "&", code: "Digit1", shiftKey: false }));
  });

  should("translate Digit1 code with shift", () => {
    assert.equal("!", KeyboardUtils.getKeyChar({ key: "1", code: "Digit1", shiftKey: true }));
  });
});

context("KeyboardUtils.getKeyChar on Mac with altKey", () => {
  setup(async () => {
    await Settings.load();
    stub(KeyboardUtils, "platform", "Mac");
  });

  should("use event.code instead of event.key on Mac when alt is pressed", () => {
    assert.equal("c", KeyboardUtils.getKeyChar({ key: "ç", code: "KeyC", altKey: true }));
  });

  should("translate code via enUsTranslations on Mac with altKey", () => {
    assert.equal(
      ";",
      KeyboardUtils.getKeyChar({ key: "…", code: "Semicolon", altKey: true, shiftKey: false }),
    );
  });

  should("not use code path on Mac when alt is not pressed", () => {
    assert.equal("a", KeyboardUtils.getKeyChar({ key: "a", code: "KeyA", altKey: false }));
  });
});

// -- getKeyCharString() tests --

context("KeyboardUtils.getKeyCharString", () => {
  setup(async () => {
    await Settings.load();
  });

  should("return single char without modifiers", () => {
    assert.equal("a", KeyboardUtils.getKeyCharString({ key: "a" }));
  });

  should("uppercase single char with shift", () => {
    assert.equal("A", KeyboardUtils.getKeyCharString({ key: "a", shiftKey: true }));
  });

  should("wrap with alt modifier", () => {
    assert.equal("<a-x>", KeyboardUtils.getKeyCharString({ key: "x", altKey: true }));
  });

  should("wrap with ctrl modifier", () => {
    assert.equal("<c-x>", KeyboardUtils.getKeyCharString({ key: "x", ctrlKey: true }));
  });

  should("wrap with meta modifier", () => {
    assert.equal("<m-x>", KeyboardUtils.getKeyCharString({ key: "x", metaKey: true }));
  });

  should("include shift modifier for multi-char keys", () => {
    assert.equal(
      "<s-left>",
      KeyboardUtils.getKeyCharString({ key: "ArrowLeft", shiftKey: true }),
    );
  });

  should("order multiple modifiers alphabetically", () => {
    assert.equal(
      "<a-c-x>",
      KeyboardUtils.getKeyCharString({ key: "x", altKey: true, ctrlKey: true }),
    );
  });

  should("return undefined for modifier-only key press", () => {
    const result = KeyboardUtils.getKeyCharString({ key: "Control" });
    assert.equal(undefined, result);
  });

  should("combine all modifiers in alphabetical order", () => {
    assert.equal(
      "<a-c-m-s-left>",
      KeyboardUtils.getKeyCharString({
        key: "ArrowLeft",
        altKey: true,
        ctrlKey: true,
        metaKey: true,
        shiftKey: true,
      }),
    );
  });

  should("wrap ctrl+single char in angle brackets", () => {
    assert.equal("<c-a>", KeyboardUtils.getKeyCharString({ key: "a", ctrlKey: true }));
  });
});

// -- isEscape() tests --

context("KeyboardUtils.isEscape", () => {
  setup(async () => {
    await Settings.load();
  });

  should("return true for Escape key", () => {
    assert.isTrue(KeyboardUtils.isEscape({ key: "Escape", keyCode: 27 }));
  });

  should("return false for IME Escape (keyCode 229)", () => {
    assert.isFalse(KeyboardUtils.isEscape({ key: "Escape", keyCode: 229 }));
  });

  should("return true for Ctrl-[ (vim-like escape)", () => {
    assert.isTrue(KeyboardUtils.isEscape({ key: "[", ctrlKey: true }));
  });

  should("return false for non-escape key", () => {
    assert.isFalse(KeyboardUtils.isEscape({ key: "a", keyCode: 65 }));
  });

  should("return false for Ctrl with non-bracket key", () => {
    assert.isFalse(KeyboardUtils.isEscape({ key: "a", ctrlKey: true }));
  });
});

// -- isBackspace() tests --

context("KeyboardUtils.isBackspace", () => {
  should("return true for Backspace key", () => {
    assert.isTrue(KeyboardUtils.isBackspace({ key: "Backspace" }));
  });

  should("return true for Delete key", () => {
    assert.isTrue(KeyboardUtils.isBackspace({ key: "Delete" }));
  });

  should("return false for other keys", () => {
    assert.isFalse(KeyboardUtils.isBackspace({ key: "a" }));
    assert.isFalse(KeyboardUtils.isBackspace({ key: "Escape" }));
  });
});

// -- isPrintable() tests --

context("KeyboardUtils.isPrintable", () => {
  setup(async () => {
    await Settings.load();
  });

  should("return true for single printable character", () => {
    assert.isTrue(KeyboardUtils.isPrintable({ key: "a" }));
    assert.isTrue(KeyboardUtils.isPrintable({ key: "1" }));
  });

  should("return false for modifier combo", () => {
    assert.isFalse(KeyboardUtils.isPrintable({ key: "a", ctrlKey: true }));
  });

  should("return false for special keys", () => {
    assert.isFalse(KeyboardUtils.isPrintable({ key: "ArrowLeft" }));
  });

  should("return false for modifier-only key", () => {
    assert.isFalse(KeyboardUtils.isPrintable({ key: "Shift" }));
  });
});

// -- isModifier() tests --

context("KeyboardUtils.isModifier", () => {
  should("return true for each modifier key", () => {
    assert.isTrue(KeyboardUtils.isModifier({ key: "Control" }));
    assert.isTrue(KeyboardUtils.isModifier({ key: "Shift" }));
    assert.isTrue(KeyboardUtils.isModifier({ key: "Alt" }));
    assert.isTrue(KeyboardUtils.isModifier({ key: "Meta" }));
    assert.isTrue(KeyboardUtils.isModifier({ key: "OS" }));
    assert.isTrue(KeyboardUtils.isModifier({ key: "AltGraph" }));
  });

  should("return false for regular keys", () => {
    assert.isFalse(KeyboardUtils.isModifier({ key: "a" }));
    assert.isFalse(KeyboardUtils.isModifier({ key: "Escape" }));
    assert.isFalse(KeyboardUtils.isModifier({ key: "Enter" }));
  });
});
