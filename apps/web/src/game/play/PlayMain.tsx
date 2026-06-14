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

interface ConnectOptions {
  optimisticPlayers?: number;
  optimisticSeat?: Seat;
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
  const createDisabled = () => isCreateDisabled(status(), roomInfo());
  const joinDisabled = () => isJoinDisabled(roomInfo());

  const updateUrl = (code: string) => {
    const url = playRoomUrl(code);
    window.history.replaceState({}, "", url);
  };

  const connect = (code: string, options: ConnectOptions = {}) => {
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
    setRoomInfo({
      code: normalized,
      role: options.optimisticSeat,
      seq: 0,
      turn: "player1",
      players: options.optimisticPlayers ?? 0,
    });
    updateUrl(normalized);
  };

  const createRoom = async () => {
    setStatus("creating");
    setError(undefined);
    try {
      const response = await fetch(createRoomEndpoint(), { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not create room.");
      }
      const body = (await response.json()) as { roomCode: string };
      connect(body.roomCode, {
        optimisticPlayers: 1,
        optimisticSeat: "player1",
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not create room.");
    }
  };

  const sendLocalMove = (move: SessionMove) => {
    const ws = socket();
    const info = roomInfo();
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
              disabled={createDisabled()}
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
                <button class="button" disabled={joinDisabled()} type="submit">
                  Join
                </button>
              </div>
            </form>
          </div>

          <div class="play-room-status" aria-live="polite">
            <strong>{statusLabel(status(), roomInfo())}</strong>
            <span>{statusSummary(status(), roomInfo())}</span>
          </div>

          <Show when={roomInfo().code}>
            <RoomDetails info={roomInfo()} />
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

function RoomDetails(props: { info: RoomInfo }) {
  const shareUrl = () => playRoomUrl(props.info.code);

  return (
    <div class="play-room-details">
      <dl class="play-room-facts">
        <div>
          <dt>Room</dt>
          <dd>{props.info.code}</dd>
        </div>
        <div>
          <dt>Your seat</dt>
          <dd>{seatLabel(props.info.role)}</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd>{props.info.players}/2</dd>
        </div>
        <div>
          <dt>Turn</dt>
          <dd>{seatLabel(props.info.turn)}</dd>
        </div>
      </dl>
      <div class="play-room-share">
        <label for="share-url">Invite link</label>
        <input id="share-url" readOnly value={shareUrl()} />
        <button
          class="button"
          onClick={() => navigator.clipboard?.writeText(shareUrl())}
          type="button"
        >
          Copy link
        </button>
      </div>
    </div>
  );
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

export function statusLabel(status: ConnectionState, info: RoomInfo): string {
  switch (status) {
    case "creating":
      return "Creating room";
    case "connecting":
      return info.role ? `Joining as ${seatLabel(info.role)}` : "Joining room";
    case "connected":
      return info.role ? `Joined as ${seatLabel(info.role)}` : "Connected";
    case "error":
      return "Needs attention";
    default:
      return "Local board";
  }
}

export function statusSummary(status: ConnectionState, info: RoomInfo): string {
  if (!info.code) {
    return status === "creating"
      ? "Asking the server for a new invite room."
      : "Create or join a room to play online.";
  }
  if (!info.role) {
    return `Room ${info.code} is ready. Waiting for your seat assignment.`;
  }
  if (status === "connecting") {
    return `Room ${info.code} was created. Opening the live connection.`;
  }
  if (info.role === "observer") {
    return `Room ${info.code} is full. You are watching the game.`;
  }
  if (info.players < 2) {
    return `Room ${info.code} is ready. Share the invite link with player 2.`;
  }
  return `${seatLabel(info.turn)} to move. Move ${info.seq}.`;
}

export function isCreateDisabled(
  status: ConnectionState,
  info: RoomInfo,
): boolean {
  return status === "creating" || info.code !== "";
}

export function isJoinDisabled(info: RoomInfo): boolean {
  return info.role !== undefined;
}

function seatLabel(seat?: Seat): string {
  switch (seat) {
    case "player1":
      return "Player 1";
    case "player2":
      return "Player 2";
    case "observer":
      return "Observer";
    default:
      return "Assigning";
  }
}
