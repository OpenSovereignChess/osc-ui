import { describe, expect, test } from "vitest";
import { ArmyManager } from "./army-manager.ts";

describe("ArmyManager", () => {
  test("basic army ownership", () => {
    const manager = new ArmyManager({ p1Owned: "white", p2Owned: "black", controlledBy: new Map() });

    expect(manager.colorOf("player1")).toBe("white");
    expect(manager.colorOf("player2")).toBe("black");
    expect(manager.controlledColorsOf("player1").size).toBe(0);
    expect(manager.controlledColorsOf("player2").size).toBe(0);
  });

  test("army control", () => {
    const manager = new ArmyManager({
      p1Owned: "white",
      p2Owned: "black",
      controlledBy: new Map([
        ["red", "white"],
        ["navy", "white"],
        ["green", "black"],
        ["yellow", "black"],
      ]),
    });

    expect([...manager.controlledColorsOf("player1")].sort()).toEqual(["navy", "red"]);
    expect([...manager.controlledColorsOf("player2")].sort()).toEqual(["green", "yellow"]);
  });

  test("owned armies", () => {
    let manager = new ArmyManager({
      p1Owned: "white",
      p2Owned: "black",
      controlledBy: new Map([
        ["red", "white"],
        ["green", "black"],
      ]),
    });

    manager = manager.setOwnedColor("player1", "green");
    expect(manager.colorOf("player1")).toBe("white");
    manager = manager.setOwnedColor("player1", "red");
    expect(manager.colorOf("player1")).toBe("red");
  });
});
