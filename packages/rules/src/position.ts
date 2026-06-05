import { bishopAttacks, between, kingAttacks, knightAttacks, pawnAttacks, queenAttacks, ray, rookAttacks } from "./attacks.ts";
import { Board } from "./board.ts";
import { Castles } from "./castles.ts";
import { pawnMoves } from "./pawn-moves.ts";
import { Setup } from "./setup.ts";
import { SquareSet } from "./square-set.ts";
import {
  PlayException,
  oppositeSide,
  promotionSquares,
  squareColor,
  type CastlingSide,
  type Move,
  type Piece,
  type PieceColor,
  type Role,
  type Side,
  type Square,
} from "./models.ts";

interface Context {
  king?: Square;
  blockers: SquareSet;
  checkers: SquareSet;
}

export class Position {
  constructor(
    readonly board: Board,
    readonly turn: Side,
    readonly castles: Castles,
    readonly ply: number,
  ) {}

  get rule(): "sovereignChess" {
    return "sovereignChess";
  }

  static setupPosition(setup: Setup): SovereignChess {
    return SovereignChess.fromSetup(setup);
  }

  get fen(): string {
    return new Setup(this.board, this.turn, this.castles.castlingRights, this.ply).fen;
  }

  get isCheck(): boolean {
    return this.board.kingOf(this.turn) != null && this.checkers.isNotEmpty;
  }

  get isCheckmate(): boolean {
    return this.checkers.isNotEmpty && !this.hasSomeLegalMoves;
  }

  get checkedKingColor(): PieceColor | undefined {
    return this.isCheck ? this.board.ownedColorOf(this.turn) : undefined;
  }

  canDefect(side: Side): boolean {
    return this.board.controlledColorsOf(side).size > 0;
  }

  get ownedColor(): PieceColor {
    return this.board.ownedColorOf(this.turn);
  }

  ownedColorOf(side: Side): PieceColor {
    return this.board.ownedColorOf(side);
  }

  get controlledColors(): ReadonlySet<PieceColor> {
    return this.board.controlledColorsOf(this.turn);
  }

  get hasSomeLegalMoves(): boolean {
    const context = this.makeContext();
    for (const square of this.board.bySide(this.turn).squares()) {
      if (this.legalMovesOfInternal(square, context).isNotEmpty) return true;
    }
    return false;
  }

  isLegal(move: Move): boolean {
    if (move.kind !== "normal") return false;
    if (move.promotion === "pawn") return false;
    if (move.promotion != null && (!this.board.pawns.has(move.from) || !promotionSquares.has(move.to))) return false;
    if (this.isCheck && move.promotion != null && move.promotion !== "king") return false;
    return this.legalMovesOf(move.from).has(move.to);
  }

  legalMovesOf(square: Square): SquareSet {
    return this.legalMovesOfInternal(square);
  }

  get legalMoves(): ReadonlyMap<Square, SquareSet> {
    const context = this.makeContext();
    return new Map([...this.board.bySide(this.turn).squares()].map((s) => [s, this.legalMovesOfInternal(s, context)]));
  }

  get checkers(): SquareSet {
    const king = this.board.kingOf(this.turn);
    return king != null ? this.kingAttackers(king, oppositeSide(this.turn)) : SquareSet.empty;
  }

  kingAttackers(square: Square, attacker: Side, occupied = this.board.occupied): SquareSet {
    let attackers = this.board.attacksTo(square, attacker, occupied);
    for (const sq of attackers.squares()) {
      const piece = this.board.pieceAt(sq);
      if (piece?.color === squareColor(square)) attackers = attackers.withoutSquare(sq);
    }
    return attackers;
  }

  play(move: Move): Position {
    if (!this.isLegal(move)) throw new PlayException(`Invalid move ${JSON.stringify(move)}`);
    return this.playUnchecked(move);
  }

  playUnchecked(move: Move): Position {
    const piece = this.board.pieceAt(move.from);
    if (!piece) return this.copyWith({});
    let newBoard = this.board.removePieceAt(move.from);

    if (move.promotion === "king") {
      const kingSquare = newBoard.kingOf(this.turn);
      if (kingSquare != null) newBoard = newBoard.removePieceAt(kingSquare);
      newBoard = newBoard.setOwnedColor(this.turn, piece.color);
    }

    const newPiece: Piece = move.promotion != null ? { ...piece, role: move.promotion } : piece;
    newBoard = newBoard.setPieceAt(move.to, newPiece);

    const fromColor = squareColor(move.from);
    const toColor = squareColor(move.to);
    if (fromColor) newBoard = newBoard.removeControlledColor(fromColor);
    if (toColor) newBoard = newBoard.addControlledColor(newPiece.color, toColor);

    let newCastles = this.castles;
    if (newPiece.role === "king") newCastles = newCastles.discardSide(this.turn);
    else if (newPiece.role === "rook") newCastles = newCastles.discardRookAt(move.from);

    return this.copyWith({
      ply: this.ply + 1,
      board: newBoard,
      turn: oppositeSide(this.turn),
      castles: newCastles,
    });
  }

  defect(color: PieceColor): Position {
    if (!this.board.colorControlledBy(this.turn, color)) return this.copyWith({});
    const king = this.board.kingOf(this.turn);
    if (king == null) return this.copyWith({});
    const newBoard = this.board.setPieceAt(king, { role: "king", color }).setOwnedColor(this.turn, color);
    return this.copyWith({ board: newBoard, turn: oppositeSide(this.turn), ply: this.ply + 1 });
  }

  private squaresControllingColor(color: PieceColor, visited = new Set<PieceColor>()): SquareSet {
    if (visited.has(color) || this.board.colorIsOwned(color)) return SquareSet.empty;
    visited.add(color);
    let result = this.board.coloredSquaresOf(color).intersect(this.board.occupied);
    const occupiedSquare = result.lsb();
    if (occupiedSquare != null) {
      const piece = this.board.pieceAt(occupiedSquare);
      if (piece) result = result.union(this.squaresControllingColor(piece.color, visited));
    }
    return result;
  }

  private pawnPromotionMoves(moves: SquareSet): SquareSet {
    return moves.intersect(SquareSet.promotionBox);
  }

  private unattackedMoves(moves: SquareSet): SquareSet {
    let result = SquareSet.empty;
    for (const to of moves.squares()) {
      if (this.kingAttackers(to, oppositeSide(this.turn)).isEmpty) result = result.withSquare(to);
    }
    return result;
  }

  private legalMovesOfInternal(square: Square, context = this.makeContext()): SquareSet {
    const piece = this.board.pieceAt(square);
    if (!piece || !this.board.colorBelongsTo(this.turn, piece.color)) return SquareSet.empty;

    let pseudo: SquareSet;
    switch (piece.role) {
      case "pawn":
        pseudo = pawnAttacks(square).intersect(this.board.occupied).union(pawnMoves(square, this.board.occupied));
        break;
      case "bishop":
        pseudo = bishopAttacks(square, this.board.occupied);
        break;
      case "knight":
        pseudo = knightAttacks(square);
        break;
      case "rook":
        pseudo = rookAttacks(square, this.board.occupied);
        break;
      case "queen":
        pseudo = queenAttacks(square, this.board.occupied);
        break;
      case "king":
        pseudo = kingAttacks(square);
        break;
    }

    pseudo = pseudo.diff(this.board.coloredSquaresOf(piece.color));
    pseudo = pseudo.diff(this.occupiedColoredSquares(this.board.occupied.withoutSquare(square)));
    pseudo = pseudo.diff(this.board.occupied.diff(this.board.bySide(oppositeSide(this.turn))));

    if (context.king != null) {
      if (piece.role === "king") {
        const occ = this.board.occupied.withoutSquare(square);
        for (const to of pseudo.squares()) {
          if (this.kingAttackers(to, oppositeSide(this.turn), occ).isNotEmpty) pseudo = pseudo.withoutSquare(to);
        }
        return pseudo;
      }

      if (context.checkers.isNotEmpty) {
        const checker = context.checkers.singleSquare;
        if (checker == null) {
          if (piece.role === "pawn") return this.unattackedMoves(this.pawnPromotionMoves(pseudo));
          return SquareSet.empty;
        }

        const checkerPiece = this.board.pieceAt(checker)!;
        pseudo = pseudo.intersect(
          this.squaresControllingColor(checkerPiece.color)
            .intersect(this.board.bySide(oppositeSide(this.turn)))
            .union(between(checker, context.king).withSquare(checker))
            .union(piece.role === "pawn" ? this.unattackedMoves(this.pawnPromotionMoves(pseudo)) : SquareSet.empty),
        );
      }

      if (context.blockers.has(square)) pseudo = pseudo.intersect(ray(square, context.king));
    }
    return pseudo;
  }

  get canCastle(): boolean {
    return [...this.legalCastlingMoves.values()].some((moves) => moves.isNotEmpty);
  }

  get legalCastlingMoves(): ReadonlyMap<Square, SquareSet> {
    const king = this.board.kingOf(this.turn);
    if (king == null || this.castles.castlingRights.isEmpty || this.isCheck) return new Map();
    let moves = SquareSet.empty;
    for (const cs of ["queen", "king"] as const) {
      const path = this.castles.path(this.turn, cs);
      if (path.intersect(this.board.occupied).isNotEmpty) continue;
      const orientedSquares = cs === "king" ? path.squares() : [...path.squares()].reverse();
      for (const square of orientedSquares) {
        if (this.kingAttackers(square, oppositeSide(this.turn)).isNotEmpty) break;
        moves = moves.withSquare(square);
      }
    }
    return new Map([[king, moves]]);
  }

  playCastle(move: Move): Position {
    if (!this.isLegalCastle(move)) throw new PlayException(`Invalid move ${JSON.stringify(move)}`);
    return this.playCastleUnchecked(move);
  }

  isLegalCastle(move: Move): boolean {
    const piece = this.board.pieceAt(move.from);
    if (!piece || piece.role !== "king" || move.promotion != null) return false;
    const king = this.board.kingOf(this.turn);
    const legalMoves = king != null ? this.legalCastlingMoves.get(king) : undefined;
    return legalMoves?.has(move.to) ?? false;
  }

  playCastleUnchecked(move: Move): Position {
    const piece = this.board.pieceAt(move.from);
    if (!piece) return this.copyWith({});
    let newBoard = this.board.removePieceAt(move.from).setPieceAt(move.to, piece);
    const cs = this.castlingSideOf(move);
    const rookSquare = this.castles.rookOf(this.turn, cs);
    if (rookSquare == null) return this.copyWith({});
    const rook = newBoard.pieceAt(rookSquare);
    if (!rook) return this.copyWith({});
    const newRook = move.to + (cs === "king" ? -1 : 1);
    newBoard = newBoard.removePieceAt(rookSquare).setPieceAt(newRook, rook);
    return this.copyWith({
      ply: this.ply + 1,
      board: newBoard,
      turn: oppositeSide(this.turn),
      castles: this.castles.discardSide(this.turn),
    });
  }

  private castlingSideOf(move: Move): CastlingSide {
    return move.to - move.from > 0 ? "king" : "queen";
  }

  private occupiedColoredSquares(occupied: SquareSet): SquareSet {
    const colored = [
      SquareSet.whiteSquares,
      SquareSet.blackSquares,
      SquareSet.ashSquares,
      SquareSet.slateSquares,
      SquareSet.cyanSquares,
      SquareSet.greenSquares,
      SquareSet.navySquares,
      SquareSet.orangeSquares,
      SquareSet.pinkSquares,
      SquareSet.redSquares,
      SquareSet.violetSquares,
      SquareSet.yellowSquares,
    ];
    let result = SquareSet.empty;
    for (const mask of colored) {
      if (mask.intersect(occupied).lsb() != null) result = result.union(mask.diff(occupied));
    }
    return result;
  }

  private makeContext(): Context {
    const king = this.board.kingOf(this.turn);
    return {
      king,
      blockers: king != null ? this.sliderBlockers(king) : SquareSet.empty,
      checkers: this.checkers,
    };
  }

  private sliderBlockers(king: Square): SquareSet {
    const snipers = rookAttacks(king, SquareSet.empty)
      .intersect(this.board.rooksAndQueens)
      .union(bishopAttacks(king, SquareSet.empty).intersect(this.board.bishopsAndQueens))
      .intersect(this.board.bySide(oppositeSide(this.turn)));
    let blockers = SquareSet.empty;
    for (const sniper of snipers.squares()) {
      const b = between(king, sniper).intersect(this.board.occupied);
      if (!b.moreThanOne) blockers = blockers.union(b);
    }
    return blockers;
  }

  copyWith(values: Partial<{ board: Board; turn: Side; castles: Castles; ply: number }>): Position {
    return new Position(values.board ?? this.board, values.turn ?? this.turn, values.castles ?? this.castles, values.ply ?? this.ply);
  }
}

export class SovereignChess extends Position {
  static fromSetup(setup: Setup): SovereignChess {
    return new SovereignChess(setup.board, setup.turn, Castles.fromSetup(setup), setup.ply);
  }

  override copyWith(values: Partial<{ board: Board; turn: Side; castles: Castles; ply: number }>): SovereignChess {
    return new SovereignChess(values.board ?? this.board, values.turn ?? this.turn, values.castles ?? this.castles, values.ply ?? this.ply);
  }
}
