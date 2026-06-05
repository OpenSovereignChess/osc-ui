import { type PieceColor, type Side } from "./models.ts";

function setOf<T>(values: Iterable<T>): ReadonlySet<T> {
  return new Set(values);
}

export class ArmyManager {
  readonly p1Owned: PieceColor;
  readonly p2Owned: PieceColor;
  readonly controlledBy: ReadonlyMap<PieceColor, PieceColor>;

  constructor({
    p1Owned,
    p2Owned,
    controlledBy = new Map(),
  }: {
    p1Owned: PieceColor;
    p2Owned: PieceColor;
    controlledBy?: ReadonlyMap<PieceColor, PieceColor>;
  }) {
    this.p1Owned = p1Owned;
    this.p2Owned = p2Owned;
    this.controlledBy = new Map(controlledBy);
  }

  static readonly empty = new ArmyManager({ p1Owned: "white", p2Owned: "black" });
  static readonly standard = ArmyManager.empty;

  copyWith(values: Partial<{ p1Owned: PieceColor; p2Owned: PieceColor; controlledBy: ReadonlyMap<PieceColor, PieceColor> }>): ArmyManager {
    return new ArmyManager({
      p1Owned: values.p1Owned ?? this.p1Owned,
      p2Owned: values.p2Owned ?? this.p2Owned,
      controlledBy: values.controlledBy ?? this.controlledBy,
    });
  }

  private controlledColorsOfColor(color: PieceColor, visited = new Set<PieceColor>()): ReadonlySet<PieceColor> {
    if (visited.has(color)) return new Set();
    visited.add(color);
    const direct = [...this.controlledBy.entries()]
      .filter(([, controller]) => controller === color)
      .map(([controlled]) => controlled);
    const result = new Set(direct);
    for (const controlledColor of direct) {
      if (controlledColor !== color) {
        for (const nested of this.controlledColorsOfColor(controlledColor, visited)) result.add(nested);
      }
    }
    return result;
  }

  controls(turn: Side, color: PieceColor): boolean {
    return this.controlledColorsOf(turn).has(color);
  }

  colorsOf(turn: Side): ReadonlySet<PieceColor> {
    return setOf([this.colorOf(turn), ...this.controlledColorsOf(turn)]);
  }

  colorOf(turn: Side): PieceColor {
    return turn === "player1" ? this.p1Owned : this.p2Owned;
  }

  controlledColorsOf(turn: Side): ReadonlySet<PieceColor> {
    return this.controlledColorsOfColor(this.colorOf(turn));
  }

  removeControlledArmy(color: PieceColor): ArmyManager {
    const controlledBy = new Map(this.controlledBy);
    controlledBy.delete(color);
    return this.copyWith({ controlledBy });
  }

  addControlledArmy(controllerColor: PieceColor, color: PieceColor): ArmyManager {
    if (color === this.p1Owned || color === this.p2Owned) return this.copyWith({});
    const controlledBy = new Map(this.controlledBy);
    controlledBy.set(color, controllerColor);
    return this.copyWith({ controlledBy });
  }

  setOwnedColor(turn: Side, color: PieceColor): ArmyManager {
    if (!this.controlledColorsOf(turn).has(color)) return this.copyWith({});
    const controlledBy = new Map(this.controlledBy);
    controlledBy.delete(color);
    return this.copyWith({
      p1Owned: turn === "player1" ? color : this.p1Owned,
      p2Owned: turn === "player2" ? color : this.p2Owned,
      controlledBy,
    });
  }
}
