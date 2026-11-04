import type { ServerMessage } from "../online/protocol.ts";

// A replaced socket may still dispatch queued events after close().
export function watchRoomSocket(
  ws: WebSocket,
  handlers: {
    open: () => void;
    message: (message: ServerMessage) => void;
    close: () => void;
    error: (message: string) => void;
  },
): () => void {
  let active = true;
  ws.addEventListener("open", () => {
    if (active) handlers.open();
  });
  ws.addEventListener("message", (event) => {
    if (!active) return;
    try {
      handlers.message(JSON.parse(event.data) as ServerMessage);
    } catch {
      handlers.error("Received an invalid server message.");
    }
  });
  ws.addEventListener("close", () => {
    if (!active) return;
    active = false;
    handlers.close();
  });
  ws.addEventListener("error", () => {
    if (active) handlers.error("Connection failed.");
  });
  return () => {
    active = false;
    ws.close();
  };
}
