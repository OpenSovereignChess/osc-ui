import { BOARD_SIZE, BOARD_SIZE_ZERO_INDEX } from "./constants";
import * as types from "./types";

export const invRanks: readonly types.Rank[] = [...types.ranks].reverse();

export const allKeys: readonly types.Key[] = types.files.flatMap((f) =>
  types.ranks.map((r) => (f + r) as types.Key),
);

export const pos2key = (pos: types.Pos): types.Key | undefined =>
  pos.every((x) => x >= 0 && x < 16)
    ? allKeys[16 * pos[0] + pos[1]]
    : undefined;

export const key2pos = (k: types.Key): types.Pos => [
  k.charCodeAt(0) - 97,
  parseInt(k.slice(1), 10) - 1,
];

export function memo<A>(f: () => A): types.Memo<A> {
  let v: A | undefined;
  const ret = (): A => {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = () => {
    v = undefined;
  };
  return ret;
}

export const timer = (): types.Timer => {
  let startAt: number | undefined;
  return {
    start() {
      startAt = performance.now();
    },
    cancel() {
      startAt = undefined;
    },
    stop() {
      if (!startAt) {
        return 0;
      }
      const time = performance.now() - startAt;
      startAt = undefined;
      return time;
    },
  };
};

export const opposite = (c: types.Color): types.Color =>
  c === "white" ? "black" : "white";

export const posToTranslate =
  (
    bounds: DOMRectReadOnly,
  ): ((pos: types.Pos, asWhite: boolean) => types.NumberPair) =>
  (pos, asWhite) => [
    ((asWhite ? pos[0] : BOARD_SIZE_ZERO_INDEX - pos[0]) * bounds.width) /
      BOARD_SIZE,
    ((asWhite ? BOARD_SIZE_ZERO_INDEX - pos[1] : pos[1]) * bounds.height) /
      BOARD_SIZE,
  ];

export const event2Key = (
  e: MouseEvent,
  bounds: DOMRectReadOnly,
): types.Key | undefined => {
  const origin = { x: bounds.x, y: bounds.y };
  const offset = { x: e.pageX - origin.x, y: e.pageY - origin.y };
  const size = bounds.width / BOARD_SIZE;
  const invRow = Math.floor(offset.y / size);
  const col = Math.floor(offset.x / size);
  const row = BOARD_SIZE_ZERO_INDEX - invRow;
  return pos2key([col, row]);
};

export const eventPosition = (
  e: types.MouchEvent,
): types.NumberPair | undefined => {
  if (e.clientX || e.clientX === 0) {
    return [e.clientX, e.clientY!];
  }
  if (e.targetTouches?.[0]) {
    return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  }
  return;
};

const isFireMac = () =>
  !("ontouchstart" in window) &&
  ["macintosh", "firefox"].every((x) =>
    navigator.userAgent.toLowerCase().includes(x),
  );

export const isRightButton = (e: types.MouchEvent): boolean =>
  e.button === 2 && !(e.ctrlKey && isFireMac());
