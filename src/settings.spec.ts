import { describe, expect, it } from "vitest";
import type { Text } from "../sdk/index.js";
import { schema } from "./settings.js";

const theme = {
  fg: (_name: string, text: string) => `[dim]${text}[/dim]`,
};

function controlBindingNode(key: string): Text {
  const controls = schema.controls;
  if (controls._tag !== "section") {
    throw new Error("controls node is not a section");
  }
  const node = controls.children[key];
  if (!node || node._tag !== "text") {
    throw new Error(`missing text binding node for ${key}`);
  }
  return node;
}

describe("settings control bindings", () => {
  const resetNode = controlBindingNode("reset-to-default");

  it("accepts valid bindings", () => {
    expect(resetNode.validation?.("r")).toEqual({ valid: true });
    expect(resetNode.validation?.("space")).toEqual({ valid: true });
    expect(resetNode.validation?.("shift+space")).toEqual({ valid: true });
    expect(resetNode.validation?.("alt+r")).toEqual({ valid: true });
    expect(resetNode.validation?.("ctrl+shift+up")).toEqual({ valid: true });
    expect(resetNode.validation?.("cmd+k")).toEqual({ valid: true });
    expect(resetNode.validation?.("f12")).toEqual({ valid: true });
    expect(resetNode.validation?.("d")).toEqual({ valid: true });
  });

  it("rejects invalid bindings", () => {
    expect(resetNode.validation?.("")).toEqual({
      valid: false,
      reason: "Binding cannot be empty",
    });
    expect(resetNode.validation?.("ctrl+")).toEqual({
      valid: false,
      reason: 'Missing key after "+"',
    });
    expect(resetNode.validation?.("ctrl+ctrl+r")).toEqual({
      valid: false,
      reason: 'Duplicate modifier "ctrl"',
    });
    expect(resetNode.validation?.("up+ctrl")).toEqual({
      valid: false,
      reason:
        '"up" is not a modifier — only modifiers (ctrl, alt, shift, meta, cmd, option) may precede "+"',
    });
    expect(resetNode.validation?.("hyper+r")).toEqual({
      valid: false,
      reason: 'Unknown key "hyper"',
    });
    expect(resetNode.validation?.("ctrl+alt")).toEqual({
      valid: false,
      reason:
        '"alt" is a modifier — add a non-modifier key after it, e.g. "alt+k"',
    });
  });

  it("renders + in dim with spaces around", () => {
    const rendered = resetNode.display?.("ctrl+alt+r", theme as any);
    expect(rendered).toBe("ctrl[dim] + [/dim]alt[dim] + [/dim]r");
  });

  it("hides trailing + in display", () => {
    const rendered = resetNode.display?.("ctrl+", theme as any);
    expect(rendered).toBe("ctrl");
  });

  it("defines behavior.start-in-search-mode with default false", () => {
    const behavior = schema.behavior;
    expect(behavior._tag).toBe("section");
    const start = behavior.children["start-in-search-mode"];
    expect(start?._tag).toBe("boolean");
    if (start && start._tag === "boolean") {
      expect(start.default).toBe(false);
    }
  });
});
