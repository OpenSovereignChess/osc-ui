import { ArmyManager } from "./army-manager.ts";
import { Board } from "./board.ts";
import { FenException, colorLetters, pieceColorFromChar, pieceColors, squareFromCoords, type PieceColor, type Side, type Square } from "./models.ts";
import { SquareSet } from "./square-set.ts";

export class Setup {
  constructor(
    readonly board: Board,
    readonly turn: Side,
    readonly castlingRights: SquareSet,
    readonly ply: number,
  ) {}

  static readonly standard = new Setup(Board.standard, "player1", SquareSet.castlingRooks, 0);

  static parseFen(fen: string): Setup {
    const parts = fen.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === "") throw new FenException("format");
    const board = Board.parseFen(parts.shift()!);

    const turnPart = parts.shift();
    const turn: Side = turnPart == null ? "player1" : turnPart === "1" ? "player1" : turnPart === "2" ? "player2" : (() => { throw new FenException("turn"); })();

    const p1Part = parts.shift();
    const p1Owned = p1Part == null ? "white" : pieceColorFromChar(p1Part);
    if (!p1Owned) throw new FenException("p1Owned");

    const p2Part = parts.shift();
    const p2Owned = p2Part == null ? "black" : pieceColorFromChar(p2Part);
    if (!p2Owned) throw new FenException("p2Owned");

    const armyManager = parseControlledArmies(board, p1Owned, p2Owned);

    const castlingPart = parts.shift();
    const castlingRights = castlingPart == null ? SquareSet.empty : parseCastlingFen(castlingPart);

    const plyPart = parts.shift();
    const ply = plyPart == null ? 0 : Number.parseInt(plyPart, 10);
    if (!Number.isInteger(ply)) throw new FenException("ply");

    return new Setup(board.copyWith({ armyManager }), turn, castlingRights, ply);
  }

  get fen(): string {
    return [
      this.board.fen,
      this.turn === "player1" ? "1" : "2",
      colorLetters[this.board.armyManager.p1Owned],
      colorLetters[this.board.armyManager.p2Owned],
      makeCastlingFen(this.board, this.castlingRights),
      String(this.ply),
    ].join(" ");
  }
}

function parseCastlingFen(castlingPart: string): SquareSet {
  let castlingRights = SquareSet.empty;
  if (castlingPart === "-") return castlingRights;
  for (const c of castlingPart) {
    const lower = c.toLowerCase();
    const file = lower.charCodeAt(0) - 97;
    if (file < 0 || file > 15) throw new FenException("castling");
    const side: Side = c === lower ? "player2" : "player1";
    const rank = side === "player1" ? 0 : 15;
    castlingRights = castlingRights.withSquare(squareFromCoords(file, rank));
  }
  if (["player1", "player2"].some((side) => SquareSet.backrankOf(side as Side).intersect(castlingRights).size > 4)) {
    throw new FenException("castling");
  }
  return castlingRights;
}

function parseControlledArmies(board: Board, p1Owned: PieceColor, p2Owned: PieceColor): ArmyManager {
  const owned = new Set([p1Owned, p2Owned]);
  const controlledBy = new Map<PieceColor, PieceColor>();
  for (const color of pieceColors) {
    if (owned.has(color)) continue;
    const piece = board.pieceOnSquareOf(color);
    if (piece) controlledBy.set(color, piece.color);
  }
  return new ArmyManager({ p1Owned, p2Owned, controlledBy });
}

function makeCastlingFen(board: Board, castlingRights: SquareSet): string {
  let fen = "";
  for (const side of ["player1", "player2"] as const) {
    const backrank = SquareSet.backrankOf(side);
    const king = board.kingOf(side);
    if (king == null || castlingRights.intersect(backrank).isEmpty) continue;
    for (const square of castlingRights.intersect(backrank).squares()) {
      const letter = String.fromCharCode(97 + (square & 0xf)).toUpperCase();
      fen += side === "player1" ? letter : letter.toLowerCase();
    }
  }
  return fen === "" ? "-" : fen;
}

export function setupCastlingFen(board: Board, castlingRights: SquareSet): string {
  return makeCastlingFen(board, castlingRights);
}
