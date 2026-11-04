import { expect, test, vi } from "vitest";
import { watchRoomSocket } from "./roomConnection.ts";

function harness() {
  const socket = new EventTarget();
  const close = vi.fn();
  const ws = Object.assign(socket, { close }) as unknown as WebSocket;
  const handlers = {
    open: vi.fn(),
    message: vi.fn(),
    close: vi.fn(),
    error: vi.fn(),
  };
  const dispose = watchRoomSocket(ws, handlers);
  const message = (data: string) => {
    socket.dispatchEvent(Object.assign(new Event("message"), { data }));
  };
  return { socket, close, handlers, dispose, message };
}

test("socket delivers events and parsed room state", () => {
  const h = harness();
  h.socket.dispatchEvent(new Event("open"));
  const message = {
    type: "room_state",
    payload: { you: { seat: "observer" } },
  };
  h.message(JSON.stringify(message));
  expect(h.handlers.open).toHaveBeenCalledOnce();
  expect(h.handlers.message).toHaveBeenCalledWith(message);
  h.socket.dispatchEvent(new Event("close"));
  expect(h.handlers.close).toHaveBeenCalledOnce();
});

test("socket reports invalid messages and connection errors", () => {
  const h = harness();
  h.message("invalid json");
  expect(h.handlers.error).toHaveBeenCalledWith(
    "Received an invalid server message.",
  );
  h.socket.dispatchEvent(new Event("error"));
  expect(h.handlers.error).toHaveBeenCalledWith("Connection failed.");
});

for (const end of ["dispose", "close"] as const) {
  test(`ignores queued socket events after ${end}`, () => {
    const h = harness();
    if (end === "dispose") h.dispose();
    else h.socket.dispatchEvent(new Event("close"));
    Object.values(h.handlers).forEach((handler) => handler.mockClear());
    h.socket.dispatchEvent(new Event("open"));
    h.message('{"type":"room_state"}');
    h.message("invalid");
    h.socket.dispatchEvent(new Event("error"));
    h.socket.dispatchEvent(new Event("close"));
    Object.values(h.handlers).forEach((handler) =>
      expect(handler).not.toHaveBeenCalled(),
    );
    expect(h.close).toHaveBeenCalledTimes(end === "dispose" ? 1 : 0);
  });
}
