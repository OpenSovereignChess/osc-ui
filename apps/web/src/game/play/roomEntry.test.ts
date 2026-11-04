import { expect, test, vi } from "vitest";
import type { RoomEntry } from "../online/protocol.ts";
import {
  createRoomEntryLookup,
  fetchRoomEntry,
  shouldAutoJoin,
} from "./roomEntry.ts";

const entry: RoomEntry = {
  roomCode: "ABCD1234",
  yourSeat: null,
  claimedSeats: 1,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function harness(
  load = vi.fn<(code: string, signal: AbortSignal) => Promise<RoomEntry>>(
    async () => entry,
  ),
) {
  const handlers = {
    load,
    checking: vi.fn(),
    invitation: vi.fn(),
    connect: vi.fn(),
    error: vi.fn(),
  };
  return { ...handlers, lookup: createRoomEntryLookup(handlers) };
}

for (const yourSeat of [null, "player1", "player2"] as const) {
  for (const claimedSeats of [0, 1, 2]) {
    if (yourSeat && claimedSeats === 0) continue;
    test(`entry policy: ${yourSeat ?? "visitor"}, ${claimedSeats} claimed seats`, async () => {
      const body = { ...entry, yourSeat, claimedSeats };
      const auto = yourSeat !== null || claimedSeats === 2;
      expect(shouldAutoJoin(body)).toBe(auto);
      const h = harness(vi.fn(async () => body));
      await h.lookup.check(entry.roomCode);
      expect(h.checking).toHaveBeenCalledOnce();
      expect(h.connect).toHaveBeenCalledTimes(auto ? 1 : 0);
      expect(h.invitation).toHaveBeenCalledTimes(auto ? 0 : 1);
      if (auto) expect(h.connect).toHaveBeenCalledWith(entry.roomCode);
      expect(h.error).not.toHaveBeenCalled();
    });
  }
}

test("lookup uses credentials, no-store and cancellation", async () => {
  const request = vi.fn(async () => new Response(JSON.stringify(entry)));
  const controller = new AbortController();
  await expect(
    fetchRoomEntry("abcd1234", controller.signal, "/room", request),
  ).resolves.toEqual(entry);
  expect(request).toHaveBeenCalledWith("/room", {
    credentials: "include",
    cache: "no-store",
    signal: controller.signal,
  });
});

for (const body of [
  null,
  {},
  { ...entry, roomCode: "OTHER" },
  { ...entry, yourSeat: "observer" },
  { ...entry, yourSeat: undefined },
  { ...entry, claimedSeats: -1 },
  { ...entry, claimedSeats: 3 },
  { ...entry, claimedSeats: 1.5 },
  { ...entry, claimedSeats: "2" },
  { ...entry, yourSeat: "player1", claimedSeats: 0 },
]) {
  test(`rejects malformed eligibility ${JSON.stringify(body)}`, async () => {
    await expect(
      fetchRoomEntry(
        entry.roomCode,
        new AbortController().signal,
        "/room",
        vi.fn(async () => new Response(JSON.stringify(body))),
      ),
    ).rejects.toThrow("Invalid room response");
  });
}

for (const [status, message] of [
  [404, "Room not found."],
  [500, "Could not check room."],
] as const) {
  test(`lookup error ${status} never auto-connects`, async () => {
    const h = harness(
      vi.fn((_code: string, signal: AbortSignal) =>
        fetchRoomEntry(
          entry.roomCode,
          signal,
          "/room",
          vi.fn(async () => new Response("", { status })),
        ),
      ),
    );
    await h.lookup.check(entry.roomCode);
    expect(h.error).toHaveBeenCalledWith(expect.stringContaining(message));
    expect(h.connect).not.toHaveBeenCalled();
  });
}

test("fetch failures and invalid JSON provide an actionable fallback", async () => {
  for (const request of [
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }),
    vi.fn(async () => new Response("not JSON")),
  ]) {
    await expect(
      fetchRoomEntry(
        entry.roomCode,
        new AbortController().signal,
        "/room",
        request,
      ),
    ).rejects.toThrow("You can try Join game.");
  }
});

test("network failure leaves eligibility unknown", async () => {
  const h = harness(
    vi.fn(async () => {
      throw new Error("Offline");
    }),
  );
  await h.lookup.check(entry.roomCode);
  expect(h.error).toHaveBeenCalledWith("Offline");
  expect(h.connect).not.toHaveBeenCalled();
  expect(h.invitation).not.toHaveBeenCalled();
});

for (const action of ["cancel", "dispose"] as const) {
  test(`${action} aborts lookup and ignores late success or failure`, async () => {
    for (const fail of [false, true]) {
      const pending = deferred<RoomEntry>();
      const h = harness(
        vi.fn<(code: string, signal: AbortSignal) => Promise<RoomEntry>>(
          () => pending.promise,
        ),
      );
      const checking = h.lookup.check(entry.roomCode);
      const signal = h.load.mock.calls[0][1];
      h.lookup[action]();
      expect(signal.aborted).toBe(true);
      if (fail) pending.reject(new Error("late failure"));
      else pending.resolve({ ...entry, claimedSeats: 2 });
      await checking;
      expect(h.connect).not.toHaveBeenCalled();
      expect(h.invitation).not.toHaveBeenCalled();
      expect(h.error).not.toHaveBeenCalled();
    }
  });
}

test("new lookup supersedes old eligibility", async () => {
  const pending = deferred<RoomEntry>();
  const load = vi.fn<(code: string, signal: AbortSignal) => Promise<RoomEntry>>(
    () => pending.promise,
  );
  const h = harness(load);
  const first = h.lookup.check("OLD");
  load.mockImplementation(async () => ({ ...entry, claimedSeats: 2 }));
  await h.lookup.check(entry.roomCode);
  pending.resolve({ ...entry, roomCode: "OLD", yourSeat: "player1" });
  await first;
  expect(h.connect).toHaveBeenCalledExactlyOnceWith(entry.roomCode);
  expect(load.mock.calls[0][1].aborted).toBe(true);
});

test("disposed lookups cannot restart", async () => {
  const h = harness();
  h.lookup.dispose();
  await h.lookup.check(entry.roomCode);
  expect(h.load).not.toHaveBeenCalled();
});
