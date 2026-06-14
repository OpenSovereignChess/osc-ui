import type * as types from "../rules/types.ts";
import type { PieceColor, Role } from "@osc/rules";

export type Seat = "player1" | "player2" | "observer";

export interface Player {
  id: string;
  seat: Seat;
}

export interface Move {
  seq: number;
  seat: Seat;
  kind?: "move";
  orig: types.Key;
  dest: types.Key;
  promotion?: Role;
}

export interface CastleMove {
  seq: number;
  seat: Seat;
  kind: "castle";
  orig: types.Key;
  dest: types.Key;
}

export interface DefectionMove {
  seq: number;
  seat: Seat;
  kind: "defect";
  color: PieceColor;
}

export type RoomMove = Move | CastleMove | DefectionMove;

export interface RoomState {
  roomCode: string;
  you: Player;
  players: Player[];
  turn: Seat;
  seq: number;
  moves: RoomMove[] | null;
}

export interface MoveRejected {
  reason: string;
  seq: number;
}

export interface ServerError {
  message: string;
}

export type ServerMessage =
  | { type: "room_state"; payload: RoomState }
  | { type: "player_joined"; payload: { player: Player } }
  | { type: "player_left"; payload: { player: Player } }
  | { type: "move_applied"; payload: RoomMove }
  | { type: "move_rejected"; payload: MoveRejected }
  | { type: "error"; payload: ServerError };

export interface ClientMove {
  seq: number;
  kind?: "move";
  orig: types.Key;
  dest: types.Key;
  promotion?: Role;
}

export interface ClientCastle {
  seq: number;
  kind: "castle";
  orig: types.Key;
  dest: types.Key;
}

export interface ClientDefection {
  seq: number;
  kind: "defect";
  color: PieceColor;
}

export type ClientAction = ClientMove | ClientCastle | ClientDefection;

export function makeMoveMessage(move: ClientAction): string {
  return JSON.stringify({ type: "make_move", payload: move });
}

export function normalizeRoomCode(value: string | undefined | null): string {
  return (value ?? "").trim().toUpperCase();
}

export function roomCodeFromLocation(location: Location): string {
  return normalizeRoomCode(new URL(location.href).searchParams.get("room"));
}

export function playRoomUrl(
  roomCode: string,
  origin = window.location.origin,
): string {
  const url = new URL("/play/", origin);
  url.searchParams.set("room", normalizeRoomCode(roomCode));
  return url.toString();
}

export function serverHttpOrigin(): string {
  const configured = import.meta.env.PUBLIC_OSC_SERVER_URL;
  if (configured) {
    return configured;
  }
  if (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  ) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return window.location.origin;
}

export function createRoomEndpoint(origin = serverHttpOrigin()): string {
  return new URL("/api/rooms", origin).toString();
}

export function roomWebsocketUrl(
  roomCode: string,
  origin = serverHttpOrigin(),
): string {
  const url = new URL(`/api/rooms/${normalizeRoomCode(roomCode)}/ws`, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
