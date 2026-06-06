import { describe, expect, test } from "vitest";
import { normalMove } from "./models.ts";
import { moveNotation, castleSan, defectionSan } from "./notation.ts";
import { SovereignChess } from "./position.ts";
import { Setup } from "./setup.ts";

describe("notation", () => {
  test("normal move", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/8wp7/8wk7 1 w b -"),
    );
    expect(moveNotation(pos, normalMove("i2", "i3"))).toBe("wPi2-i3");
  });

  test("capture", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/16/16/16/16/16/16/16/16/16/16/16/16/8bp7/8wk7 1 w b -"),
    );
    expect(moveNotation(pos, normalMove("i1", "i2"))).toBe("wKi1xi2");
  });

  test("starting square removes ambiguity", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/16/16/16/16/16/16/16/16/16/16/16/7wn1wn6/16/8wk7 1 w b -"),
    );
    expect(moveNotation(pos, normalMove("h3", "i5"))).toBe("wNh3-i5");
    expect(moveNotation(pos, normalMove("j3", "i5"))).toBe("wNj3-i5");
  });

  test("promotion", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/8wk7 1 w b -"),
    );
    expect(moveNotation(pos, normalMove("h6", "h7", "king"))).toBe("wPh6-h7=K");
  });

  test("check suffix", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/bq15/8wk7 2 w b -"),
    );
    expect(moveNotation(pos, normalMove("a2", "i2"))).toBe("bQa2-i2+");
  });

  test("castling includes side and destination", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expect(castleSan(pos, normalMove("i1", "j1"))).toBe("O-O@j1");
    expect(castleSan(pos, normalMove("i1", "h1"))).toBe("O-O-O@h1");
  });

  test("defection uses king recolor notation", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/4wp11/16/16/16/8wk7 1 w b -"),
    );
    expect(defectionSan(pos, "navy")).toBe("wK=navy");
  });
});
