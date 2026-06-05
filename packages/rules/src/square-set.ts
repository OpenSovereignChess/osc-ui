import { fileOf, rankOf, type File, type Rank, type Side, type Square } from "./models.ts";

const intSize = 32;
const rowSize = 16;
const mask32 = 0xffffffff;
const full256 = (1n << 256n) - 1n;

function u32(n: number): number {
  return n >>> 0;
}

function squareToKey(square: Square): [number, number] {
  return [Math.floor(square / intSize), square % intSize];
}

function ntz32(x: number): number {
  return Math.clz32((x & -x) >>> 0) ^ 31;
}

function bitCount32(x: number): number {
  x >>>= 0;
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function mirrorHorizontalWord(val: number): number {
  const k1 = 0x55555555;
  const k2 = 0x33333333;
  const k4 = 0x0f0f0f0f;
  const k8 = 0x00ff00ff;
  let x = val >>> 0;
  x = (((x >>> 1) & k1) | ((x & k1) << 1)) >>> 0;
  x = (((x >>> 2) & k2) | ((x & k2) << 2)) >>> 0;
  x = (((x >>> 4) & k4) | ((x & k4) << 4)) >>> 0;
  x = (((x >>> 8) & k8) | ((x & k8) << 8)) >>> 0;
  return x >>> 0;
}

export class SquareSet {
  readonly h: number;
  readonly g: number;
  readonly f: number;
  readonly e: number;
  readonly d: number;
  readonly c: number;
  readonly b: number;
  readonly a: number;

  constructor(h: number, g: number, f: number, e: number, d: number, c: number, b: number, a: number) {
    this.h = u32(h);
    this.g = u32(g);
    this.f = u32(f);
    this.e = u32(e);
    this.d = u32(d);
    this.c = u32(c);
    this.b = u32(b);
    this.a = u32(a);
  }

  static fromSquare(square: Square): SquareSet {
    const [index, offset] = squareToKey(square);
    return new SquareSet(
      index === 7 ? 1 << offset : 0,
      index === 6 ? 1 << offset : 0,
      index === 5 ? 1 << offset : 0,
      index === 4 ? 1 << offset : 0,
      index === 3 ? 1 << offset : 0,
      index === 2 ? 1 << offset : 0,
      index === 1 ? 1 << offset : 0,
      index === 0 ? 1 << offset : 0,
    );
  }

  static fromSquares(squares: Iterable<Square>): SquareSet {
    let set = SquareSet.empty;
    for (const square of squares) set = set.withSquare(square);
    return set;
  }

  static fromRank(rank: Rank): SquareSet {
    return rankMasks[rank] ?? SquareSet.empty;
  }

  static fromFile(file: File): SquareSet {
    return fileMasks[file] ?? SquareSet.empty;
  }

  static backrankOf(side: Side): SquareSet {
    return side === "player1" ? SquareSet.firstRankMask : SquareSet.sixteenthRankMask;
  }

  static fromBigInt(value: bigint): SquareSet {
    const word = (shift: bigint) => Number((value >> shift) & 0xffffffffn);
    return new SquareSet(word(224n), word(192n), word(160n), word(128n), word(96n), word(64n), word(32n), word(0n));
  }

  toBigInt(): bigint {
    return (
      (BigInt(this.h) << 224n) |
      (BigInt(this.g) << 192n) |
      (BigInt(this.f) << 160n) |
      (BigInt(this.e) << 128n) |
      (BigInt(this.d) << 96n) |
      (BigInt(this.c) << 64n) |
      (BigInt(this.b) << 32n) |
      BigInt(this.a)
    );
  }

  shr(shift: number): SquareSet {
    if (shift >= 256) return SquareSet.empty;
    if (shift <= 0) return this;
    return SquareSet.fromBigInt(this.toBigInt() >> BigInt(shift));
  }

  shl(shift: number): SquareSet {
    if (shift >= 256) return SquareSet.empty;
    if (shift <= 0) return this;
    return SquareSet.fromBigInt((this.toBigInt() << BigInt(shift)) & full256);
  }

  xor(other: SquareSet): SquareSet {
    return new SquareSet(
      this.h ^ other.h,
      this.g ^ other.g,
      this.f ^ other.f,
      this.e ^ other.e,
      this.d ^ other.d,
      this.c ^ other.c,
      this.b ^ other.b,
      this.a ^ other.a,
    );
  }

  union(other: SquareSet): SquareSet {
    return new SquareSet(
      this.h | other.h,
      this.g | other.g,
      this.f | other.f,
      this.e | other.e,
      this.d | other.d,
      this.c | other.c,
      this.b | other.b,
      this.a | other.a,
    );
  }

  intersect(other: SquareSet): SquareSet {
    return new SquareSet(
      this.h & other.h,
      this.g & other.g,
      this.f & other.f,
      this.e & other.e,
      this.d & other.d,
      this.c & other.c,
      this.b & other.b,
      this.a & other.a,
    );
  }

  diff(other: SquareSet): SquareSet {
    return new SquareSet(
      this.h & ~other.h,
      this.g & ~other.g,
      this.f & ~other.f,
      this.e & ~other.e,
      this.d & ~other.d,
      this.c & ~other.c,
      this.b & ~other.b,
      this.a & ~other.a,
    );
  }

  flipVertical(): SquareSet {
    return new SquareSet(
      ((this.a >>> rowSize) | (this.a << rowSize)) >>> 0,
      ((this.b >>> rowSize) | (this.b << rowSize)) >>> 0,
      ((this.c >>> rowSize) | (this.c << rowSize)) >>> 0,
      ((this.d >>> rowSize) | (this.d << rowSize)) >>> 0,
      ((this.e >>> rowSize) | (this.e << rowSize)) >>> 0,
      ((this.f >>> rowSize) | (this.f << rowSize)) >>> 0,
      ((this.g >>> rowSize) | (this.g << rowSize)) >>> 0,
      ((this.h >>> rowSize) | (this.h << rowSize)) >>> 0,
    );
  }

  mirrorHorizontal(): SquareSet {
    return new SquareSet(
      mirrorHorizontalWord(this.h),
      mirrorHorizontalWord(this.g),
      mirrorHorizontalWord(this.f),
      mirrorHorizontalWord(this.e),
      mirrorHorizontalWord(this.d),
      mirrorHorizontalWord(this.c),
      mirrorHorizontalWord(this.b),
      mirrorHorizontalWord(this.a),
    );
  }

  equals(other: SquareSet): boolean {
    return (
      this.a === other.a &&
      this.b === other.b &&
      this.c === other.c &&
      this.d === other.d &&
      this.e === other.e &&
      this.f === other.f &&
      this.g === other.g &&
      this.h === other.h
    );
  }

  get(index: number): number {
    return [this.a, this.b, this.c, this.d, this.e, this.f, this.g, this.h][index] ?? 0;
  }

  squares(): Square[] {
    const result: Square[] = [];
    for (let index = 0; index < 8; index++) {
      let bitboard = this.get(index);
      const offset = index * intSize;
      while (bitboard !== 0) {
        const square = ntz32(bitboard);
        bitboard = (bitboard ^ (1 << square)) >>> 0;
        result.push(square + offset);
      }
    }
    return result;
  }

  get size(): number {
    return (
      bitCount32(this.a) +
      bitCount32(this.b) +
      bitCount32(this.c) +
      bitCount32(this.d) +
      bitCount32(this.e) +
      bitCount32(this.f) +
      bitCount32(this.g) +
      bitCount32(this.h)
    );
  }

  get isEmpty(): boolean {
    return this.lsb() == null;
  }

  get isNotEmpty(): boolean {
    return this.lsb() != null;
  }

  get moreThanOne(): boolean {
    return this.size > 1;
  }

  get singleSquare(): Square | undefined {
    return this.moreThanOne ? undefined : this.lsb();
  }

  has(square: Square): boolean {
    const [index, offset] = squareToKey(square);
    return (this.get(index) & (1 << offset)) !== 0;
  }

  isIntersected(other: SquareSet): boolean {
    return this.intersect(other).isNotEmpty;
  }

  withSquare(square: Square): SquareSet {
    const [index, offset] = squareToKey(square);
    const bit = 1 << offset;
    return new SquareSet(
      index === 7 ? this.h | bit : this.h,
      index === 6 ? this.g | bit : this.g,
      index === 5 ? this.f | bit : this.f,
      index === 4 ? this.e | bit : this.e,
      index === 3 ? this.d | bit : this.d,
      index === 2 ? this.c | bit : this.c,
      index === 1 ? this.b | bit : this.b,
      index === 0 ? this.a | bit : this.a,
    );
  }

  withoutSquare(square: Square): SquareSet {
    const [index, offset] = squareToKey(square);
    const bit = ~(1 << offset);
    return new SquareSet(
      index === 7 ? this.h & bit : this.h,
      index === 6 ? this.g & bit : this.g,
      index === 5 ? this.f & bit : this.f,
      index === 4 ? this.e & bit : this.e,
      index === 3 ? this.d & bit : this.d,
      index === 2 ? this.c & bit : this.c,
      index === 1 ? this.b & bit : this.b,
      index === 0 ? this.a & bit : this.a,
    );
  }

  lsb(): Square | undefined {
    for (let index = 0; index < 8; index++) {
      const word = this.get(index);
      if (word !== 0) return index * intSize + ntz32(word);
    }
    return undefined;
  }

  withoutFirst(): SquareSet {
    const first = this.lsb();
    return first == null ? SquareSet.empty : this.withoutSquare(first);
  }

  static readonly empty = new SquareSet(0, 0, 0, 0, 0, 0, 0, 0);
  static readonly full = new SquareSet(mask32, mask32, mask32, mask32, mask32, mask32, mask32, mask32);

  static readonly northRay = new SquareSet(0, 0, 0, 1, 0x10001, 0x10001, 0x10001, 0x10000);
  static readonly eastRay = new SquareSet(0, 0, 0, 0, 0, 0, 0, 0x1fe);
  static readonly southRay = new SquareSet(0x8000, 0x80008000, 0x80008000, 0x80008000, 0x80000000, 0, 0, 0);
  static readonly westRay = new SquareSet(0x7f800000, 0, 0, 0, 0, 0, 0, 0);
  static readonly northwestRay = new SquareSet(0, 0, 0, 1, 0x20004, 0x80010, 0x200040, 0x800000);
  static readonly northeastRay = new SquareSet(0, 0, 0, 0x100, 0x800040, 0x200010, 0x80004, 0x20000);
  static readonly southeastRay = new SquareSet(0x100, 0x2000400, 0x8001000, 0x20004000, 0x80000000, 0, 0, 0);
  static readonly southwestRay = new SquareSet(0x4000, 0x20001000, 0x8000400, 0x2000100, 0x800000, 0, 0, 0);

  static readonly firstRankMask = new SquareSet(0, 0, 0, 0, 0, 0, 0, 0xffff);
  static readonly secondRankMask = new SquareSet(0, 0, 0, 0, 0, 0, 0, 0xffff0000);
  static readonly thirdRankMask = new SquareSet(0, 0, 0, 0, 0, 0, 0xffff, 0);
  static readonly fourthRankMask = new SquareSet(0, 0, 0, 0, 0, 0, 0xffff0000, 0);
  static readonly fifthRankMask = new SquareSet(0, 0, 0, 0, 0, 0xffff, 0, 0);
  static readonly sixthRankMask = new SquareSet(0, 0, 0, 0, 0, 0xffff0000, 0, 0);
  static readonly seventhRankMask = new SquareSet(0, 0, 0, 0, 0xffff, 0, 0, 0);
  static readonly eighthRankMask = new SquareSet(0, 0, 0, 0, 0xffff0000, 0, 0, 0);
  static readonly ninthRankMask = new SquareSet(0, 0, 0, 0xffff, 0, 0, 0, 0);
  static readonly tenthRankMask = new SquareSet(0, 0, 0, 0xffff0000, 0, 0, 0, 0);
  static readonly eleventhRankMask = new SquareSet(0, 0, 0xffff, 0, 0, 0, 0, 0);
  static readonly twelfthRankMask = new SquareSet(0, 0, 0xffff0000, 0, 0, 0, 0, 0);
  static readonly thirteenthRankMask = new SquareSet(0, 0xffff, 0, 0, 0, 0, 0, 0);
  static readonly fourteenthRankMask = new SquareSet(0, 0xffff0000, 0, 0, 0, 0, 0, 0);
  static readonly fifteenthRankMask = new SquareSet(0xffff, 0, 0, 0, 0, 0, 0, 0);
  static readonly sixteenthRankMask = new SquareSet(0xffff0000, 0, 0, 0, 0, 0, 0, 0);

  static readonly aFileMask = new SquareSet(0x10001, 0x10001, 0x10001, 0x10001, 0x10001, 0x10001, 0x10001, 0x10001);
  static readonly bFileMask = new SquareSet(0x20002, 0x20002, 0x20002, 0x20002, 0x20002, 0x20002, 0x20002, 0x20002);
  static readonly cFileMask = new SquareSet(0x40004, 0x40004, 0x40004, 0x40004, 0x40004, 0x40004, 0x40004, 0x40004);
  static readonly dFileMask = new SquareSet(0x80008, 0x80008, 0x80008, 0x80008, 0x80008, 0x80008, 0x80008, 0x80008);
  static readonly eFileMask = new SquareSet(0x100010, 0x100010, 0x100010, 0x100010, 0x100010, 0x100010, 0x100010, 0x100010);
  static readonly fFileMask = new SquareSet(0x200020, 0x200020, 0x200020, 0x200020, 0x200020, 0x200020, 0x200020, 0x200020);
  static readonly gFileMask = new SquareSet(0x400040, 0x400040, 0x400040, 0x400040, 0x400040, 0x400040, 0x400040, 0x400040);
  static readonly hFileMask = new SquareSet(0x800080, 0x800080, 0x800080, 0x800080, 0x800080, 0x800080, 0x800080, 0x800080);
  static readonly iFileMask = new SquareSet(0x1000100, 0x1000100, 0x1000100, 0x1000100, 0x1000100, 0x1000100, 0x1000100, 0x1000100);
  static readonly jFileMask = new SquareSet(0x2000200, 0x2000200, 0x2000200, 0x2000200, 0x2000200, 0x2000200, 0x2000200, 0x2000200);
  static readonly kFileMask = new SquareSet(0x4000400, 0x4000400, 0x4000400, 0x4000400, 0x4000400, 0x4000400, 0x4000400, 0x4000400);
  static readonly lFileMask = new SquareSet(0x8000800, 0x8000800, 0x8000800, 0x8000800, 0x8000800, 0x8000800, 0x8000800, 0x8000800);
  static readonly mFileMask = new SquareSet(0x10001000, 0x10001000, 0x10001000, 0x10001000, 0x10001000, 0x10001000, 0x10001000, 0x10001000);
  static readonly nFileMask = new SquareSet(0x20002000, 0x20002000, 0x20002000, 0x20002000, 0x20002000, 0x20002000, 0x20002000, 0x20002000);
  static readonly oFileMask = new SquareSet(0x40004000, 0x40004000, 0x40004000, 0x40004000, 0x40004000, 0x40004000, 0x40004000, 0x40004000);
  static readonly pFileMask = new SquareSet(0x80008000, 0x80008000, 0x80008000, 0x80008000, 0x80008000, 0x80008000, 0x80008000, 0x80008000);

  static readonly whiteSquares = new SquareSet(0, 0, 0, 0x80, 0x1000000, 0, 0, 0);
  static readonly blackSquares = new SquareSet(0, 0, 0, 0x100, 0x800000, 0, 0, 0);
  static readonly ashSquares = new SquareSet(0, 0, 0, 0x2000000, 0x40, 0, 0, 0);
  static readonly slateSquares = new SquareSet(0, 0, 0, 0x400000, 0x200, 0, 0, 0);
  static readonly cyanSquares = new SquareSet(0, 0, 0, 0x400, 0x200000, 0, 0, 0);
  static readonly greenSquares = new SquareSet(0, 0, 0x400, 0, 0, 0x200000, 0, 0);
  static readonly navySquares = new SquareSet(0, 0, 0x8000000, 0, 0, 0x10, 0, 0);
  static readonly orangeSquares = new SquareSet(0, 0, 0, 0x20, 0x4000000, 0, 0, 0);
  static readonly pinkSquares = new SquareSet(0, 0, 0x80, 0, 0, 0x1000000, 0, 0);
  static readonly redSquares = new SquareSet(0, 0, 0x100000, 0, 0, 0x800, 0, 0);
  static readonly violetSquares = new SquareSet(0, 0, 0x100, 0, 0, 0x800000, 0, 0);
  static readonly yellowSquares = new SquareSet(0, 0, 0x20, 0, 0, 0x4000000, 0, 0);
  static readonly castlingRooks = new SquareSet(0x28140000, 0, 0, 0, 0, 0, 0, 0x2814);
  static readonly promotionBox = new SquareSet(0, 0, 0, 0x3c00240, 0x24003c0, 0, 0, 0);
}

export const rankMasks = [
  SquareSet.firstRankMask,
  SquareSet.secondRankMask,
  SquareSet.thirdRankMask,
  SquareSet.fourthRankMask,
  SquareSet.fifthRankMask,
  SquareSet.sixthRankMask,
  SquareSet.seventhRankMask,
  SquareSet.eighthRankMask,
  SquareSet.ninthRankMask,
  SquareSet.tenthRankMask,
  SquareSet.eleventhRankMask,
  SquareSet.twelfthRankMask,
  SquareSet.thirteenthRankMask,
  SquareSet.fourteenthRankMask,
  SquareSet.fifteenthRankMask,
  SquareSet.sixteenthRankMask,
];

export const fileMasks = [
  SquareSet.aFileMask,
  SquareSet.bFileMask,
  SquareSet.cFileMask,
  SquareSet.dFileMask,
  SquareSet.eFileMask,
  SquareSet.fFileMask,
  SquareSet.gFileMask,
  SquareSet.hFileMask,
  SquareSet.iFileMask,
  SquareSet.jFileMask,
  SquareSet.kFileMask,
  SquareSet.lFileMask,
  SquareSet.mFileMask,
  SquareSet.nFileMask,
  SquareSet.oFileMask,
  SquareSet.pFileMask,
];

export function squareSetNames(set: SquareSet): string[] {
  return set.squares().map((square) => `${String.fromCharCode(97 + fileOf(square))}${rankOf(square) + 1}`);
}
