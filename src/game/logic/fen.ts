import { invRanks, pos2key } from "./util.ts";
import * as types from "./types.ts";

export const initial: types.FEN =
  "aqabvrvnbrbnbbbqbkbbbnbrynyrsbsq/aranvpvpbpbpbpbpbpbpbpbpypypsnsr/nbnp12opob/nqnp12opoq/crcp12rprr/cncp12rprn/gbgp12pppb/gqgp12pppq/yqyp12vpvq/ybyp12vpvb/onop12npnn/orop12npnr/rqrp12cpcq/rbrp12cpcb/srsnppppwpwpwpwpwpwpwpwpgpgpanar/sqsbprpnwrwnwbwqwkwbwnwrgngrabaq";

const colors: { [letter: string]: types.Color } = {
  w: "white",
  a: "ash",
  s: "slate",
  b: "black",
  p: "pink",
  r: "red",
  o: "orange",
  y: "yellow",
  g: "green",
  c: "cyan",
  n: "navy",
  v: "violet",
};

const colorLetters: { [color: string]: string } = {
  white: "w",
  ash: "a",
  slate: "s",
  black: "b",
  pink: "p",
  red: "r",
  orange: "o",
  yellow: "y",
  green: "g",
  cyan: "c",
  navy: "n",
  violet: "v",
};

const roles: { [letter: string]: types.Role } = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king",
};

const roleLetters: { [role: string]: string } = {
  pawn: "p",
  rook: "r",
  knight: "n",
  bishop: "b",
  queen: "q",
  king: "k",
};

export function read(fen: types.FEN): types.Pieces {
  if (fen === undefined) {
    fen = initial;
  }
  const pieces: types.Pieces = new Map();
  let row: number = 15;
  let col: number = 0;

  // Piece token is always two characters long.
  // Number of skipped squares token is 1-2 characters long.
  // We need to get both characters before we can process them.
  // So we use these two variables to store them temporarily.
  let pieceToken: string = "";
  let skippedSquaresToken: string = "";

  for (const c of fen) {
    switch (c) {
      case " ":
        return pieces;
      case "/": {
        --row;
        if (row < 0) {
          return pieces;
        }
        col = 0;
        skippedSquaresToken = "";
        break;
      }
      default: {
        const nb = c.charCodeAt(0);
        if (nb < 58) {
          skippedSquaresToken += c;
        } else {
          pieceToken += c;

          // Now that we've reached a piece, process any skipped squares first.
          if (skippedSquaresToken.length > 0) {
            const skip = parseInt(skippedSquaresToken, 10);
            col += skip;
            skippedSquaresToken = "";
          }
        }

        if (pieceToken.length == 2) {
          const colorChar = pieceToken.charAt(0).toLowerCase();
          const roleChar = pieceToken.charAt(1).toLowerCase();
          const key = pos2key([col, row]);
          if (key) {
            pieces.set(key, {
              role: roles[roleChar],
              color: colors[colorChar],
            });
          }
          ++col;
          pieceToken = "";
        }
      }
    }
  }
  return pieces;
}

export function write(pieces: types.Pieces): types.FEN {
  return invRanks
    .map((y) =>
      types.files
        .map((x) => {
          const piece = pieces.get((x + y) as types.Key);
          if (piece) {
            const c = colorLetters[piece.color];
            const p = roleLetters[piece.role];
            return c + p;
          } else {
            return "1";
          }
        })
        .join(""),
    )
    .join("/")
    .replace(/1+/g, (match) => match.length.toString());
}
