import { expect, test } from "vitest";
import {
  handleServerMessage,
  isBoardVisible,
  isCreateDisabled,
  isJoinDisabled,
  statusLabel,
  statusSummary,
  type RoomInfo,
} from "./PlayMain.tsx";
import type { Move, Seat } from "../online/protocol.ts";

function harness() {
  let info: RoomInfo = {
    code: "",
    seq: 0,
    turn: "player1",
    players: 0,
  };
  let error: string | undefined;
  let seat: Seat | undefined;
  const applied: Move[] = [];
  const replayed: Move[][] = [];

  return {
    get applied() {
      return applied;
    },
    get error() {
      return error;
    },
    get info() {
      return info;
    },
    get replayed() {
      return replayed;
    },
    get seat() {
      return seat;
    },
    handlers: {
      applyMove: (move: Move) => {
        applied.push(move);
        return true;
      },
      applyMoves: (moves: readonly Move[]) => {
        replayed.push([...moves]);
      },
      setError: (message: string | undefined) => {
        error = message;
        return message;
      },
      setInfo: (next: RoomInfo | ((current: RoomInfo) => RoomInfo)) => {
        info = typeof next === "function" ? next(info) : next;
        return info;
      },
      setSeat: (next: Seat) => {
        seat = next;
      },
    },
  };
}

test("room_state sets seat, room info, and replays server moves", () => {
  const h = harness();
  const move: Move = { seq: 1, seat: "player1", orig: "a2", dest: "a3" };

  handleServerMessage(
    {
      type: "room_state",
      payload: {
        roomCode: "ABCD1234",
        you: { id: "c1", seat: "player2" },
        players: [
          { id: "c0", seat: "player1" },
          { id: "c1", seat: "player2" },
        ],
        turn: "player2",
        seq: 1,
        moves: [move],
      },
    },
    h.handlers,
  );

  expect(h.seat).toBe("player2");
  expect(h.info).toEqual({
    code: "ABCD1234",
    role: "player2",
    seq: 1,
    turn: "player2",
    players: 2,
  });
  expect(h.replayed).toEqual([[move]]);
});

test("move_applied updates sequence and next turn", () => {
  const h = harness();

  handleServerMessage(
    {
      type: "move_applied",
      payload: { seq: 1, seat: "player1", orig: "a2", dest: "a3" },
    },
    h.handlers,
  );

  expect(h.applied).toEqual([
    { seq: 1, seat: "player1", orig: "a2", dest: "a3" },
  ]);
  expect(h.info.seq).toBe(1);
  expect(h.info.turn).toBe("player2");
});

test("move_rejected exposes server reason", () => {
  const h = harness();

  handleServerMessage(
    {
      type: "move_rejected",
      payload: { seq: 2, reason: "wrong turn" },
    },
    h.handlers,
  );

  expect(h.error).toBe("Move rejected: wrong turn");
});

test("connected room copy makes the created player1 seat obvious", () => {
  const info: RoomInfo = {
    code: "ABCD1234",
    role: "player1",
    seq: 0,
    turn: "player1",
    players: 1,
  };

  expect(statusLabel("connected", info)).toBe("Joined as Player 1");
  expect(statusSummary("connected", info)).toBe(
    "Room ABCD1234 is ready. Share the invite link with player 2.",
  );
});

test("connecting room copy shows optimistic player1 details immediately", () => {
  const info: RoomInfo = {
    code: "ABCD1234",
    role: "player1",
    seq: 0,
    turn: "player1",
    players: 1,
  };

  expect(statusLabel("connecting", info)).toBe("Joining as Player 1");
  expect(statusSummary("connecting", info)).toBe(
    "Room ABCD1234 was created. Opening the live connection.",
  );
});

test("room action disabled state follows membership", () => {
  const noRoom: RoomInfo = {
    code: "",
    seq: 0,
    turn: "player1",
    players: 0,
  };
  const createdRoom: RoomInfo = {
    code: "ABCD1234",
    seq: 0,
    turn: "player1",
    players: 1,
  };
  const joinedRoom: RoomInfo = {
    ...createdRoom,
    role: "player1",
  };

  expect(isCreateDisabled("idle", noRoom)).toBe(false);
  expect(isCreateDisabled("creating", noRoom)).toBe(true);
  expect(isCreateDisabled("connected", createdRoom)).toBe(true);
  expect(isJoinDisabled(createdRoom)).toBe(false);
  expect(isJoinDisabled(joinedRoom)).toBe(true);
});

test("board is hidden until a room exists", () => {
  expect(
    isBoardVisible({
      code: "",
      seq: 0,
      turn: "player1",
      players: 0,
    }),
  ).toBe(false);
  expect(
    isBoardVisible({
      code: "ABCD1234",
      seq: 0,
      turn: "player1",
      players: 1,
    }),
  ).toBe(true);
});
