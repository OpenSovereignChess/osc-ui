import { describe, expect, test } from "vitest";
import { Setup } from "./setup.ts";
import { SovereignChess } from "./position.ts";
import { makeLegalMoves } from "./utils.ts";
import { moveNames, sq } from "./test-utils.ts";

describe("utils", () => {
  test("makeLegalMoves", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/1wk14/16 1 w b -"));
    expect([...makeLegalMoves(pos).keys()]).toEqual([sq("b2")]);
    expect(moveNames(makeLegalMoves(pos).get(sq("b2")))).toEqual(["a1", "b1", "c1", "a2", "c2", "a3", "b3", "c3"]);
  });
});
