import { bishopAttacks, kingAttacks, knightAttacks, pawnAttacks, rookAttacks } from "./attacks.ts";
import { ArmyManager } from "./army-manager.ts";
import { FenException, pieceColorFromChar, pieceColors, roleFromChar, roleLetters, squareColor, squareFromCoords, type Piece, type PieceColor, type Role, type Side, type Square } from "./models.ts";
import { SquareSet } from "./square-set.ts";

export class Board {
  constructor(
    readonly occupied: SquareSet,
    readonly white: SquareSet,
    readonly ash: SquareSet,
    readonly slate: SquareSet,
    readonly black: SquareSet,
    readonly pink: SquareSet,
    readonly red: SquareSet,
    readonly orange: SquareSet,
    readonly yellow: SquareSet,
    readonly green: SquareSet,
    readonly cyan: SquareSet,
    readonly navy: SquareSet,
    readonly violet: SquareSet,
    readonly pawns: SquareSet,
    readonly knights: SquareSet,
    readonly bishops: SquareSet,
    readonly rooks: SquareSet,
    readonly queens: SquareSet,
    readonly kings: SquareSet,
    readonly armyManager: ArmyManager,
  ) {}

  static readonly standard = new Board(
    new SquareSet(0xffffffff, 0xc003c003, 0xc003c003, 0xc003c003, 0xc003c003, 0xc003c003, 0xc003c003, 0xffffffff),
    new SquareSet(0, 0, 0, 0, 0, 0, 0, 0x0ff00ff0),
    new SquareSet(0x30003, 0, 0, 0, 0, 0, 0, 0xc000c000),
    new SquareSet(0xc000c000, 0, 0, 0, 0, 0, 0, 0x30003),
    new SquareSet(0x0ff00ff0, 0, 0, 0, 0, 0, 0, 0),
    new SquareSet(0, 0, 0, 0xc000c000, 0, 0, 0, 0xc000c),
    new SquareSet(0, 0, 0xc000c000, 0, 0, 0, 0x30003, 0),
    new SquareSet(0, 0xc000c000, 0, 0, 0, 0x30003, 0, 0),
    new SquareSet(0x30003000, 0, 0, 0, 0x30003, 0, 0, 0),
    new SquareSet(0, 0, 0, 0x30003, 0, 0, 0, 0x30003000),
    new SquareSet(0, 0, 0x3003, 0, 0, 0, 0xc000c000, 0),
    new SquareSet(0, 0xc000c000, 0, 0, 0, 0x3003, 0, 0),
    new SquareSet(0xc000c, 0, 0, 0, 0xc000c000, 0, 0, 0),
    new SquareSet(0x3ffc, 0x40024002, 0x40024002, 0x40024002, 0x40024002, 0x40024002, 0x40024002, 0x3ffc0000),
    new SquareSet(0x14284002, 0, 0x8001, 0, 0, 0x80010000, 0, 0x40021428),
    new SquareSet(0x42420000, 0x80010000, 0, 0x80010000, 0x8001, 0, 0x8001, 0x4242),
    new SquareSet(0x28148001, 0, 0x80010000, 0, 0, 0x8001, 0, 0x80012814),
    new SquareSet(0x80810000, 0x8001, 0, 0x8001, 0x80010000, 0, 0x80010000, 0x8081),
    new SquareSet(0x1000000, 0, 0, 0, 0, 0, 0, 0x100),
    ArmyManager.standard,
  );

  static readonly empty = new Board(
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    ArmyManager.empty,
  );

  static parseFen(boardFen: string): Board {
    let board = Board.empty;
    let rank = 15;
    let file = 0;
    let pieceToken = "";
    let skippedToken = "";
    for (const c of boardFen) {
      switch (c) {
        case "/":
          rank--;
          if (rank < 0) return board;
          file = 0;
          skippedToken = "";
          break;
        default: {
          const code = c.charCodeAt(0);
          if (code < 58) {
            skippedToken += c;
          } else {
            pieceToken += c;
            if (skippedToken.length > 0) {
              file += Number.parseInt(skippedToken, 10);
              skippedToken = "";
            }
          }
          if (file > 15 || rank < 0) throw new FenException("board");
          if (pieceToken.length === 2) {
            const color = pieceColorFromChar(pieceToken[0]);
            const role = roleFromChar(pieceToken[1]);
            if (!color || !role) throw new FenException("board");
            board = board.setPieceAt(squareFromCoords(file, rank), { color, role });
            file++;
            pieceToken = "";
          }
        }
      }
    }
    if (skippedToken.length > 0) file += Number.parseInt(skippedToken, 10);
    if (rank !== 0 || file !== 16) throw new FenException("board");
    return board;
  }

  get rooksAndQueens(): SquareSet {
    return this.rooks.union(this.queens);
  }

  get bishopsAndQueens(): SquareSet {
    return this.bishops.union(this.queens);
  }

  get fen(): string {
    const parts: string[] = [];
    for (let rank = 15; rank >= 0; rank--) {
      let empty = 0;
      let row = "";
      for (let file = 0; file < 16; file++) {
        const piece = this.pieceAt(squareFromCoords(file, rank));
        if (!piece) {
          empty++;
        } else {
          if (empty > 0) {
            row += String(empty);
            empty = 0;
          }
          row += `${piece.color[0] === "n" ? "n" : colorLetter(piece.color)}${roleLetters[piece.role]}`;
        }
      }
      if (empty > 0) row += String(empty);
      parts.push(row);
    }
    return parts.join("/");
  }

  bySide(side: Side): SquareSet {
    return this.byColors(this.armyManager.colorsOf(side));
  }

  byColor(color: PieceColor): SquareSet {
    return this[color];
  }

  byColors(colors: ReadonlySet<PieceColor>): SquareSet {
    let set = SquareSet.empty;
    for (const color of colors) set = set.union(this.byColor(color));
    return set;
  }

  byRole(role: Role): SquareSet {
    switch (role) {
      case "pawn":
        return this.pawns;
      case "knight":
        return this.knights;
      case "bishop":
        return this.bishops;
      case "rook":
        return this.rooks;
      case "queen":
        return this.queens;
      case "king":
        return this.kings;
    }
  }

  byPiece(piece: Piece): SquareSet {
    return this.byColor(piece.color).intersect(this.byRole(piece.role));
  }

  colorAt(square: Square): PieceColor | undefined {
    for (const color of pieceColors) if (this.byColor(color).has(square)) return color;
    return undefined;
  }

  roleAt(square: Square): Role | undefined {
    for (const role of ["pawn", "knight", "bishop", "rook", "queen", "king"] as const) {
      if (this.byRole(role).has(square)) return role;
    }
    return undefined;
  }

  pieceAt(square: Square): Piece | undefined {
    const color = this.colorAt(square);
    if (!color) return undefined;
    const role = this.roleAt(square);
    return role ? { color, role } : undefined;
  }

  kingOf(side: Side): Square | undefined {
    return this.byPiece({ color: this.armyManager.colorOf(side), role: "king" }).lsb();
  }

  attacksTo(square: Square, attacker: Side, occupied = this.occupied): SquareSet {
    let pawnAttackers = SquareSet.empty;
    for (const sq of this.pawns.squares()) {
      if (pawnAttacks(sq).has(square)) pawnAttackers = pawnAttackers.withSquare(sq);
    }
    return this.bySide(attacker).intersect(
      rookAttacks(square, occupied)
        .intersect(this.rooksAndQueens)
        .union(bishopAttacks(square, occupied).intersect(this.bishopsAndQueens))
        .union(knightAttacks(square).intersect(this.knights))
        .union(kingAttacks(square).intersect(this.kings))
        .union(pawnAttackers),
    );
  }

  setPieceAt(square: Square, piece: Piece): Board {
    const board = this.removePieceAt(square);
    return board.copyWith({
      occupied: board.occupied.withSquare(square),
      [piece.color]: board.byColor(piece.color).withSquare(square),
      [roleField(piece.role)]: board.byRole(piece.role).withSquare(square),
    });
  }

  removePieceAt(square: Square): Board {
    const piece = this.pieceAt(square);
    if (!piece) return this;
    return this.copyWith({
      occupied: this.occupied.withoutSquare(square),
      [piece.color]: this.byColor(piece.color).withoutSquare(square),
      [roleField(piece.role)]: this.byRole(piece.role).withoutSquare(square),
    });
  }

  coloredSquaresOf(color: PieceColor): SquareSet {
    switch (color) {
      case "white":
        return SquareSet.whiteSquares;
      case "black":
        return SquareSet.blackSquares;
      case "ash":
        return SquareSet.ashSquares;
      case "slate":
        return SquareSet.slateSquares;
      case "cyan":
        return SquareSet.cyanSquares;
      case "green":
        return SquareSet.greenSquares;
      case "navy":
        return SquareSet.navySquares;
      case "orange":
        return SquareSet.orangeSquares;
      case "pink":
        return SquareSet.pinkSquares;
      case "red":
        return SquareSet.redSquares;
      case "violet":
        return SquareSet.violetSquares;
      case "yellow":
        return SquareSet.yellowSquares;
    }
  }

  pieceOnSquareOf(color: PieceColor): Piece | undefined {
    for (const square of this.coloredSquaresOf(color).squares()) {
      const piece = this.pieceAt(square);
      if (piece) return piece;
    }
    return undefined;
  }

  ownedColorOf(side: Side): PieceColor {
    return this.armyManager.colorOf(side);
  }

  colorIsOwned(color: PieceColor): boolean {
    return this.armyManager.colorOf("player1") === color || this.armyManager.colorOf("player2") === color;
  }

  colorBelongsTo(side: Side, color: PieceColor): boolean {
    return this.armyManager.colorsOf(side).has(color);
  }

  colorControlledBy(side: Side, color: PieceColor): boolean {
    return this.armyManager.colorsOf(side).has(color);
  }

  setOwnedColor(side: Side, color: PieceColor): Board {
    return this.ownedColorOf(side) === color ? this.copyWith({}) : this.copyWith({ armyManager: this.armyManager.setOwnedColor(side, color) });
  }

  controlledColorsOf(side: Side): ReadonlySet<PieceColor> {
    return this.armyManager.controlledColorsOf(side);
  }

  addControlledColor(controllerColor: PieceColor, color: PieceColor): Board {
    return this.copyWith({ armyManager: this.armyManager.addControlledArmy(controllerColor, color) });
  }

  removeControlledColor(color: PieceColor): Board {
    return this.copyWith({ armyManager: this.armyManager.removeControlledArmy(color) });
  }

  copyWith(values: Partial<Record<keyof Board, SquareSet | ArmyManager>>): Board {
    return new Board(
      (values.occupied as SquareSet) ?? this.occupied,
      (values.white as SquareSet) ?? this.white,
      (values.ash as SquareSet) ?? this.ash,
      (values.slate as SquareSet) ?? this.slate,
      (values.black as SquareSet) ?? this.black,
      (values.pink as SquareSet) ?? this.pink,
      (values.red as SquareSet) ?? this.red,
      (values.orange as SquareSet) ?? this.orange,
      (values.yellow as SquareSet) ?? this.yellow,
      (values.green as SquareSet) ?? this.green,
      (values.cyan as SquareSet) ?? this.cyan,
      (values.navy as SquareSet) ?? this.navy,
      (values.violet as SquareSet) ?? this.violet,
      (values.pawns as SquareSet) ?? this.pawns,
      (values.knights as SquareSet) ?? this.knights,
      (values.bishops as SquareSet) ?? this.bishops,
      (values.rooks as SquareSet) ?? this.rooks,
      (values.queens as SquareSet) ?? this.queens,
      (values.kings as SquareSet) ?? this.kings,
      (values.armyManager as ArmyManager) ?? this.armyManager,
    );
  }
}

function roleField(role: Role): "pawns" | "knights" | "bishops" | "rooks" | "queens" | "kings" {
  return `${role}s` as ReturnType<typeof roleField>;
}

function colorLetter(color: PieceColor): string {
  if (color === "white") return "w";
  if (color === "black") return "b";
  if (color === "navy") return "n";
  return color[0];
}

export function boardPieces(board: Board): Map<string, Piece> {
  const result = new Map<string, Piece>();
  for (const square of board.occupied.squares()) {
    const piece = board.pieceAt(square);
    if (piece) result.set(String(square), piece);
  }
  return result;
}
