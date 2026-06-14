import {
  type Accessor,
  createEffect,
  createSignal,
  onCleanup,
  Show,
  type Setter,
} from "solid-js";
import { GameProvider } from "../provider/GameProvider.tsx";
import { useGameSession } from "../session/useGameSession.ts";
import type { SessionMove } from "../session/types.ts";
import Container from "../ui/container/Container.tsx";
import {
  createRoomEndpoint,
  makeMoveMessage,
  normalizeRoomCode,
  playRoomUrl,
  roomCodeFromLocation,
  roomWebsocketUrl,
  type Move,
  type RoomState,
  type Seat,
  type ServerMessage,
} from "../online/protocol.ts";

import "./play-main.css";

type ConnectionState =
  | "idle"
  | "creating"
  | "connecting"
  | "connected"
  | "error";

interface ConnectionRequest {
  code: string;
  attempt: number;
}

export interface RoomInfo {
  code: string;
  role?: Seat;
  seq: number;
  turn: Seat;
  players: number;
}

type ValueSetter<T> = (value: T | ((current: T) => T)) => unknown;

export default function PlayMain() {
  const initialRoomCode =
    typeof window === "undefined" ? "" : roomCodeFromLocation(window.location);
  const [connectionRequest, setConnectionRequest] =
    createSignal<ConnectionRequest>({
      code: initialRoomCode,
      attempt: 0,
    });
  const [entryCode, setEntryCode] = createSignal(initialRoomCode);
  const [socket, setSocket] = createSignal<WebSocket>();
  const [status, setStatus] = createSignal<ConnectionState>(
    initialRoomCode ? "connecting" : "idle",
  );
  const [error, setError] = createSignal<string>();
  const [roomInfo, setRoomInfo] = createSignal<RoomInfo>({
    code: initialRoomCode,
    seq: 0,
    turn: "player1",
    players: 0,
  });

  const updateUrl = (code: string) => {
    const url = playRoomUrl(code);
    window.history.replaceState({}, "", url);
  };

  const connect = (code: string) => {
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      setError("Enter a room code.");
      setStatus("error");
      return;
    }
    setError(undefined);
    setStatus("connecting");
    setEntryCode(normalized);
    setConnectionRequest((current) => ({
      code: normalized,
      attempt: current.attempt + 1,
    }));
    updateUrl(normalized);
  };

  const createRoom = async () => {
    setStatus("creating");
    setError(undefined);
    try {
      const response = await fetch(createRoomEndpoint(), { method: "POST" });
      console.log("Create room response", response);
      if (!response.ok) {
        throw new Error("Could not create room.");
      }
      const body = (await response.json()) as { roomCode: string };
      connect(body.roomCode);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not create room.");
    }
  };

  const sendLocalMove = (move: SessionMove) => {
    const ws = socket();
    const info = roomInfo();
    console.log("Attempting to send move", move, "with info", info);
    if (!ws || ws.readyState !== WebSocket.OPEN || !info.role) {
      return;
    }
    if (info.role === "observer" || info.turn !== info.role) {
      return;
    }
    ws.send(
      makeMoveMessage({
        seq: info.seq + 1,
        orig: move.orig,
        dest: move.dest,
      }),
    );
  };

  return (
    <GameProvider onLocalMove={sendLocalMove}>
      <PlayRoomConnection
        request={connectionRequest()}
        error={error}
        setError={setError}
        setRoomInfo={setRoomInfo}
        setSocket={setSocket}
        setStatus={setStatus}
      />
      <section class="tool-shell">
        <aside class="tool-panel play-room-panel">
          <p class="eyebrow">Online play</p>
          <h1>Play online</h1>
          <div class="play-room-actions">
            <button
              class="button primary"
              disabled={status() === "creating"}
              onClick={createRoom}
              type="button"
            >
              Create game
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                connect(entryCode());
              }}
            >
              <label for="room-code">Room code</label>
              <div class="play-room-code-row">
                <input
                  id="room-code"
                  autocomplete="off"
                  inputmode="text"
                  onInput={(event) => setEntryCode(event.currentTarget.value)}
                  value={entryCode()}
                />
                <button class="button" type="submit">
                  Join
                </button>
              </div>
            </form>
          </div>

          <div class="play-room-status" aria-live="polite">
            <strong>{statusLabel(status())}</strong>
            <span>{roomSummary(roomInfo())}</span>
          </div>

          <Show when={roomInfo().code}>
            <div class="play-room-share">
              <label for="share-url">Share link</label>
              <input
                id="share-url"
                readOnly
                value={playRoomUrl(roomInfo().code)}
              />
              <button
                class="button"
                onClick={() =>
                  navigator.clipboard?.writeText(playRoomUrl(roomInfo().code))
                }
                type="button"
              >
                Copy link
              </button>
            </div>
          </Show>

          <Show when={error()}>
            {(message) => <p class="play-room-error">{message()}</p>}
          </Show>
        </aside>
        <div class="tool-stage play-stage">
          <Container />
        </div>
      </section>
    </GameProvider>
  );
}

function PlayRoomConnection(props: {
  request: ConnectionRequest;
  error: Accessor<string | undefined>;
  setError: Setter<string | undefined>;
  setRoomInfo: Setter<RoomInfo>;
  setSocket: Setter<WebSocket | undefined>;
  setStatus: Setter<ConnectionState>;
}) {
  const session = useGameSession();

  createEffect(() => {
    const request = props.request;
    const code = normalizeRoomCode(request.code);
    if (!code) {
      session.setOnlineSeat(undefined);
      props.setSocket(undefined);
      return;
    }

    props.setStatus("connecting");
    props.setError(undefined);
    const ws = new WebSocket(roomWebsocketUrl(code));
    props.setSocket(ws);

    ws.addEventListener("open", () => {
      props.setStatus("connected");
    });
    ws.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        handleServerMessage(message, {
          applyMove: (move) => session.applyServerMove(move),
          applyMoves: (moves) => session.applyServerMoves(moves),
          setError: props.setError,
          setInfo: props.setRoomInfo,
          setSeat: (seat) => session.setOnlineSeat(seat),
        });
        if (message.type === "error") {
          props.setStatus("error");
        }
      } catch {
        props.setError("Received an invalid server message.");
        props.setStatus("error");
      }
    });
    ws.addEventListener("close", () => {
      props.setSocket(undefined);
      if (props.error()) {
        props.setStatus("error");
      } else {
        props.setStatus("idle");
      }
    });
    ws.addEventListener("error", () => {
      props.setError("Connection failed.");
      props.setStatus("error");
    });

    onCleanup(() => {
      ws.close();
    });
  });

  return null;
}

export function handleServerMessage(
  message: ServerMessage,
  handlers: {
    applyMove: (move: Move) => boolean;
    applyMoves: (moves: readonly Move[]) => void;
    setError: (message: string | undefined) => unknown;
    setInfo: ValueSetter<RoomInfo>;
    setSeat: (seat: Seat) => void;
  },
): void {
  switch (message.type) {
    case "room_state":
      applyRoomState(message.payload, handlers);
      return;
    case "move_applied":
      handlers.applyMove(message.payload);
      handlers.setInfo((current) => ({
        ...current,
        seq: message.payload.seq,
        turn: message.payload.seat === "player1" ? "player2" : "player1",
      }));
      return;
    case "player_joined":
      handlers.setInfo((current) => ({
        ...current,
        players: current.players + 1,
      }));
      return;
    case "player_left":
      handlers.setInfo((current) => ({
        ...current,
        players: Math.max(0, current.players - 1),
      }));
      return;
    case "move_rejected":
      handlers.setError(`Move rejected: ${message.payload.reason}`);
      return;
    case "error":
      handlers.setError(message.payload.message);
      return;
  }
}

function applyRoomState(
  state: RoomState,
  handlers: {
    applyMoves: (moves: readonly Move[]) => void;
    setInfo: ValueSetter<RoomInfo>;
    setSeat: (seat: Seat) => void;
  },
): void {
  handlers.setSeat(state.you.seat);
  handlers.applyMoves(state.moves);
  handlers.setInfo({
    code: state.roomCode,
    role: state.you.seat,
    seq: state.seq,
    turn: state.turn,
    players: state.players.length,
  });
}

function statusLabel(status: ConnectionState): string {
  switch (status) {
    case "creating":
      return "Creating room";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "error":
      return "Needs attention";
    default:
      return "Local board";
  }
}

function roomSummary(info: RoomInfo): string {
  if (!info.code) {
    return "Create or join a room to play online.";
  }
  const role = info.role ?? "joining";
  return `${info.code} · ${role} · ${info.players} connected · move ${info.seq}`;
}
