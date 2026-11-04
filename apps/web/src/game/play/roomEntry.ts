import {
  normalizeRoomCode,
  roomEntryEndpoint,
  type RoomEntry,
} from "../online/protocol.ts";

export async function fetchRoomEntry(
  code: string,
  signal: AbortSignal,
  endpoint = roomEntryEndpoint(code),
  request: typeof fetch = fetch,
): Promise<RoomEntry> {
  let response: Response;
  try {
    response = await request(endpoint, {
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch {
    throw new Error("Could not check room. You can try Join game.");
  }
  if (response.status === 404) throw new Error("Room not found.");
  if (!response.ok)
    throw new Error("Could not check room. You can try Join game.");
  let body: RoomEntry;
  try {
    body = (await response.json()) as RoomEntry;
  } catch {
    throw new Error("Invalid room response. You can try Join game.");
  }
  if (
    !body ||
    body.roomCode !== normalizeRoomCode(code) ||
    ![null, "player1", "player2"].includes(body.yourSeat) ||
    !Number.isInteger(body.claimedSeats) ||
    body.claimedSeats < 0 ||
    body.claimedSeats > 2 ||
    (body.yourSeat !== null && body.claimedSeats === 0)
  ) {
    throw new Error("Invalid room response. You can try Join game.");
  }
  return body;
}

export function shouldAutoJoin(entry: RoomEntry): boolean {
  return entry.yourSeat !== null || entry.claimedSeats === 2;
}

// Explicit ownership also rejects stale results from transports ignoring abort.
export function createRoomEntryLookup(handlers: {
  load: (code: string, signal: AbortSignal) => Promise<RoomEntry>;
  checking: () => void;
  invitation: () => void;
  connect: (code: string) => void;
  error: (message: string) => void;
}) {
  let controller: AbortController | undefined;
  let disposed = false;
  const cancel = () => {
    controller?.abort();
    controller = undefined;
  };
  return {
    async check(code: string) {
      if (disposed) return;
      cancel();
      const current = new AbortController();
      controller = current;
      handlers.checking();
      try {
        const entry = await handlers.load(code, current.signal);
        if (disposed || controller !== current) return;
        controller = undefined;
        if (shouldAutoJoin(entry)) handlers.connect(entry.roomCode);
        else handlers.invitation();
      } catch (err) {
        if (disposed || controller !== current) return;
        controller = undefined;
        handlers.error(
          err instanceof Error
            ? err.message
            : "Could not check room. You can try Join game.",
        );
      }
    },
    cancel,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
