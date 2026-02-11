import "./test_helper.js";
import "../../lib/settings.js";
import "../../lib/keyboard_utils.js";
import "../../lib/handler_stack.js";
import "../../content_scripts/mode.js";
import "../../content_scripts/mode_key_handler.js";
import "../../content_scripts/mode_visual.js";

context("VisualMode movements table", () => {
  should("define single-key movement mappings", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("forward character", movements["l"]);
    assert.equal("backward character", movements["h"]);
    assert.equal("forward line", movements["j"]);
    assert.equal("backward line", movements["k"]);
    assert.equal("forward word", movements["e"]);
    assert.equal("backward word", movements["b"]);
    assert.equal("forward vimword", movements["w"]);
  });

  should("define sentence movement mappings", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("forward sentence", movements[")"]);
    assert.equal("backward sentence", movements["("]);
  });

  should("define paragraph movement mappings", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("forward paragraph", movements["}"]);
    assert.equal("backward paragraph", movements["{"]);
  });

  should("define line boundary movement mappings", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("backward lineboundary", movements["0"]);
    assert.equal("forward lineboundary", movements["$"]);
  });

  should("define document boundary movement mappings", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("forward documentboundary", movements["G"]);
    assert.equal("backward documentboundary", movements["gg"]);
  });

  should("define function-type mappings for aw and as", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("function", typeof movements["aw"]);
    assert.equal("function", typeof movements["as"]);
  });

  should("define function-type mappings for find commands", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("function", typeof movements["n"]);
    assert.equal("function", typeof movements["N"]);
    assert.equal("function", typeof movements["/"]);
  });

  should("define function-type mappings for yank commands", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("function", typeof movements["y"]);
    assert.equal("function", typeof movements["Y"]);
  });

  should("define function-type mappings for paste commands", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("function", typeof movements["p"]);
    assert.equal("function", typeof movements["P"]);
  });

  should("define function-type mappings for mode switching", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("function", typeof movements["v"]);
    assert.equal("function", typeof movements["V"]);
    assert.equal("function", typeof movements["c"]);
  });

  should("define function-type mapping for reverse selection", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("function", typeof movements["o"]);
  });
});

context("VisualMode class structure", () => {
  should("be a subclass of KeyHandlerMode", () => {
    assert.isTrue(VisualMode.prototype instanceof KeyHandlerMode);
  });

  should("have an init method", () => {
    assert.equal("function", typeof VisualMode.prototype.init);
  });

  should("have a commandHandler method", () => {
    assert.equal("function", typeof VisualMode.prototype.commandHandler);
  });

  should("have a find method", () => {
    assert.equal("function", typeof VisualMode.prototype.find);
  });

  should("have a yank method", () => {
    assert.equal("function", typeof VisualMode.prototype.yank);
  });
});

context("VisualLineMode class structure", () => {
  should("be a subclass of VisualMode", () => {
    assert.isTrue(VisualLineMode.prototype instanceof VisualMode);
  });

  should("have an init method", () => {
    assert.equal("function", typeof VisualLineMode.prototype.init);
  });

  should("have a commandHandler method", () => {
    assert.equal("function", typeof VisualLineMode.prototype.commandHandler);
  });

  should("have an extendSelection method", () => {
    assert.equal("function", typeof VisualLineMode.prototype.extendSelection);
  });
});

context("VisualMode movements completeness", () => {
  should("have all expected single-character movement keys", () => {
    const movements = VisualMode.prototype.movements;
    const expectedKeys = [
      "l",
      "h",
      "j",
      "k",
      "e",
      "b",
      "w",
      ")",
      "(",
      "}",
      "{",
      "0",
      "$",
      "G",
    ];
    for (const key of expectedKeys) {
      assert.isTrue(
        movements[key] != null,
        `Expected movement key '${key}' to be defined`,
      );
    }
  });

  should("have all expected two-character movement keys", () => {
    const movements = VisualMode.prototype.movements;
    assert.isTrue(movements["gg"] != null);
    assert.isTrue(movements["aw"] != null);
    assert.isTrue(movements["as"] != null);
  });

  should("have all expected command keys", () => {
    const movements = VisualMode.prototype.movements;
    const commandKeys = ["y", "Y", "p", "P", "v", "V", "c", "o", "n", "N", "/"];
    for (const key of commandKeys) {
      assert.isTrue(
        movements[key] != null,
        `Expected command key '${key}' to be defined`,
      );
    }
  });
});

context("VisualMode movement values", () => {
  should("map string movements to correct directions and granularities", () => {
    const movements = VisualMode.prototype.movements;
    // Verify each string movement has both direction and granularity.
    const stringMappings = {
      "l": ["forward", "character"],
      "h": ["backward", "character"],
      "j": ["forward", "line"],
      "k": ["backward", "line"],
      "e": ["forward", "word"],
      "b": ["backward", "word"],
      "w": ["forward", "vimword"],
      ")": ["forward", "sentence"],
      "(": ["backward", "sentence"],
      "}": ["forward", "paragraph"],
      "{": ["backward", "paragraph"],
      "0": ["backward", "lineboundary"],
      "$": ["forward", "lineboundary"],
      "G": ["forward", "documentboundary"],
    };
    for (const [key, [dir, gran]] of Object.entries(stringMappings)) {
      const parts = movements[key].split(" ");
      assert.equal(dir, parts[0]);
      assert.equal(gran, parts[1]);
    }
  });

  should("have gg mapped to backward documentboundary", () => {
    const movements = VisualMode.prototype.movements;
    assert.equal("backward documentboundary", movements["gg"]);
  });
});
