import { between } from "./attacks.ts";
import { Board } from "./board.ts";
import { type CastlingSide, type Side, type Square } from "./models.ts";
import { Setup } from "./setup.ts";
import { SquareSet } from "./square-set.ts";

const keep = Symbol("keep");

export class Castles {
  constructor(
    readonly castlingRights: SquareSet,
    readonly whiteRookQueenSide: Square | undefined,
    readonly whiteRookKingSide: Square | undefined,
    readonly blackRookQueenSide: Square | undefined,
    readonly blackRookKingSide: Square | undefined,
    readonly whiteKing: Square | undefined,
    readonly blackKing: Square | undefined,
    readonly whitePathQueenSide: SquareSet,
    readonly whitePathKingSide: SquareSet,
    readonly blackPathQueenSide: SquareSet,
    readonly blackPathKingSide: SquareSet,
  ) {}

  static readonly standard = new Castles(
    SquareSet.castlingRooks,
    4,
    11,
    244,
    251,
    8,
    248,
    new SquareSet(0, 0, 0, 0, 0, 0, 0, 0xe0),
    new SquareSet(0, 0, 0, 0, 0, 0, 0, 0x600),
    new SquareSet(0xe00000, 0, 0, 0, 0, 0, 0, 0),
    new SquareSet(0x6000000, 0, 0, 0, 0, 0, 0, 0),
  );

  static readonly empty = new Castles(
    SquareSet.empty,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
    SquareSet.empty,
  );

  static fromSetup(setup: Setup): Castles {
    let castles = Castles.empty.copyWith({ castlingRights: setup.castlingRights.intersect(setup.board.rooks) });
    for (const side of ["player1", "player2"] as const) {
      const backrank = SquareSet.backrankOf(side);
      const king = setup.board.kingOf(side);
      if (king == null || !backrank.has(king)) continue;
      castles = castles.copyWith({
        whiteKing: side === "player1" ? king : keep,
        blackKing: side === "player2" ? king : keep,
      });
      const backrankRooks = castles.castlingRights.intersect(setup.board.bySide(side)).intersect(backrank);
      const queenSideRook = getClosestRook("queen", king, backrankRooks);
      const kingSideRook = getClosestRook("king", king, backrankRooks);
      if (queenSideRook != null) castles = castles.add(side, "queen", king, queenSideRook);
      if (kingSideRook != null) castles = castles.add(side, "king", king, kingSideRook);
    }
    return castles;
  }

  rooksPositions(side: Side, cs: CastlingSide): Square | undefined {
    return this.rookOf(side, cs);
  }

  path(side: Side, cs: CastlingSide): SquareSet {
    if (side === "player1") return cs === "queen" ? this.whitePathQueenSide : this.whitePathKingSide;
    return cs === "queen" ? this.blackPathQueenSide : this.blackPathKingSide;
  }

  paths(side: Side): Record<CastlingSide, SquareSet> {
    return { queen: this.path(side, "queen"), king: this.path(side, "king") };
  }

  rookOf(side: Side, cs: CastlingSide): Square | undefined {
    if (side === "player1") return cs === "queen" ? this.whiteRookQueenSide : this.whiteRookKingSide;
    return cs === "queen" ? this.blackRookQueenSide : this.blackRookKingSide;
  }

  discardRookAt(square: Square): Castles {
    const newCastlingRights = this.castlingRights.withoutSquare(square);
    if (this.whiteRookQueenSide === square) {
      const newRook = getClosestRook("queen", this.whiteKing, newCastlingRights);
      return this.copyWith({
        castlingRights: newCastlingRights,
        whiteRookQueenSide: newRook,
        whitePathQueenSide: newRook != null ? between(newRook, this.whiteKing!) : SquareSet.empty,
      });
    }
    if (this.whiteRookKingSide === square) {
      const newRook = getClosestRook("king", this.whiteKing, newCastlingRights);
      return this.copyWith({
        castlingRights: newCastlingRights,
        whiteRookKingSide: newRook,
        whitePathKingSide: newRook != null ? between(newRook, this.whiteKing!) : SquareSet.empty,
      });
    }
    if (this.blackRookQueenSide === square) {
      const newRook = getClosestRook("queen", this.blackKing, newCastlingRights);
      return this.copyWith({
        castlingRights: newCastlingRights,
        blackRookQueenSide: newRook,
        blackPathQueenSide: newRook != null ? between(newRook, this.blackKing!) : SquareSet.empty,
      });
    }
    if (this.blackRookKingSide === square) {
      const newRook = getClosestRook("king", this.blackKing, newCastlingRights);
      return this.copyWith({
        castlingRights: newCastlingRights,
        blackRookKingSide: newRook,
        blackPathKingSide: newRook != null ? between(newRook, this.blackKing!) : SquareSet.empty,
      });
    }
    return this.copyWith({ castlingRights: newCastlingRights });
  }

  discardSide(side: Side): Castles {
    return this.copyWith({
      castlingRights: this.castlingRights.diff(SquareSet.backrankOf(side)),
      whiteRookQueenSide: side === "player1" ? null : keep,
      whiteRookKingSide: side === "player1" ? null : keep,
      blackRookQueenSide: side === "player2" ? null : keep,
      blackRookKingSide: side === "player2" ? null : keep,
      whitePathQueenSide: side === "player1" ? SquareSet.empty : undefined,
      whitePathKingSide: side === "player1" ? SquareSet.empty : undefined,
      blackPathQueenSide: side === "player2" ? SquareSet.empty : undefined,
      blackPathKingSide: side === "player2" ? SquareSet.empty : undefined,
    });
  }

  private add(side: Side, cs: CastlingSide, king: Square, rook: Square): Castles {
    const path = between(rook, king);
    return this.copyWith({
      castlingRights: this.castlingRights.withSquare(rook),
      whiteRookQueenSide: side === "player1" && cs === "queen" ? rook : keep,
      whiteRookKingSide: side === "player1" && cs === "king" ? rook : keep,
      blackRookQueenSide: side === "player2" && cs === "queen" ? rook : keep,
      blackRookKingSide: side === "player2" && cs === "king" ? rook : keep,
      whitePathQueenSide: side === "player1" && cs === "queen" ? path : undefined,
      whitePathKingSide: side === "player1" && cs === "king" ? path : undefined,
      blackPathQueenSide: side === "player2" && cs === "queen" ? path : undefined,
      blackPathKingSide: side === "player2" && cs === "king" ? path : undefined,
    });
  }

  copyWith(values: {
    castlingRights?: SquareSet;
    whiteRookQueenSide?: Square | typeof keep | null;
    whiteRookKingSide?: Square | typeof keep | null;
    blackRookQueenSide?: Square | typeof keep | null;
    blackRookKingSide?: Square | typeof keep | null;
    whiteKing?: Square | typeof keep | null;
    blackKing?: Square | typeof keep | null;
    whitePathQueenSide?: SquareSet;
    whitePathKingSide?: SquareSet;
    blackPathQueenSide?: SquareSet;
    blackPathKingSide?: SquareSet;
  }): Castles {
    const val = <T>(next: T | typeof keep | null | undefined, current: T | undefined): T | undefined =>
      next === keep || next === undefined ? current : next === null ? undefined : next;
    return new Castles(
      values.castlingRights ?? this.castlingRights,
      val(values.whiteRookQueenSide, this.whiteRookQueenSide),
      val(values.whiteRookKingSide, this.whiteRookKingSide),
      val(values.blackRookQueenSide, this.blackRookQueenSide),
      val(values.blackRookKingSide, this.blackRookKingSide),
      val(values.whiteKing, this.whiteKing),
      val(values.blackKing, this.blackKing),
      values.whitePathQueenSide ?? this.whitePathQueenSide,
      values.whitePathKingSide ?? this.whitePathKingSide,
      values.blackPathQueenSide ?? this.blackPathQueenSide,
      values.blackPathKingSide ?? this.blackPathKingSide,
    );
  }
}

function getClosestRook(cs: CastlingSide, king: Square | undefined, rooks: SquareSet): Square | undefined {
  if (king == null) return undefined;
  let maxRook: Square | undefined;
  for (const rook of rooks.squares()) {
    if (cs === "queen") {
      if (rook < king) maxRook = rook;
      else break;
    } else if (rook > king) {
      return rook;
    }
  }
  return maxRook;
}
