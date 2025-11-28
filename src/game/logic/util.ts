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
