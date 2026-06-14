import { describe, expect, test } from "vitest";
import {
  createRoomEndpoint,
  makeMoveMessage,
  normalizeRoomCode,
  playRoomUrl,
  roomWebsocketUrl,
} from "./protocol.ts";

describe("online protocol helpers", () => {
  test("normalizes room codes", () => {
    expect(normalizeRoomCode(" abcd1234 ")).toBe("ABCD1234");
    expect(normalizeRoomCode(undefined)).toBe("");
  });

  test("builds query-string play links", () => {
    expect(playRoomUrl("abcd1234", "https://play.example")).toBe(
      "https://play.example/play/?room=ABCD1234",
    );
  });

  test("builds API and websocket URLs from a server origin", () => {
    expect(createRoomEndpoint("http://localhost:8080")).toBe(
      "http://localhost:8080/api/rooms",
    );
    expect(roomWebsocketUrl("abcd1234", "http://localhost:8080")).toBe(
      "ws://localhost:8080/api/rooms/ABCD1234/ws",
    );
    expect(roomWebsocketUrl("abcd1234", "https://play.example")).toBe(
      "wss://play.example/api/rooms/ABCD1234/ws",
    );
  });

  test("encodes make_move messages", () => {
    expect(
      JSON.parse(makeMoveMessage({ seq: 1, orig: "a2", dest: "a3" })),
    ).toEqual({
      type: "make_move",
      payload: { seq: 1, orig: "a2", dest: "a3" },
    });
    expect(
      JSON.parse(makeMoveMessage({ seq: 2, kind: "defect", color: "navy" })),
    ).toEqual({
      type: "make_move",
      payload: { seq: 2, kind: "defect", color: "navy" },
    });
  });
});
