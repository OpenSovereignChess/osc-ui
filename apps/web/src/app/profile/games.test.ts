import { describe, expect, test, vi } from "vitest";
import type { ActiveGameSummary } from "../../game/online/protocol.ts";
import {
  createGamesLoader,
  fetchMyGames,
  gameStatus,
  relativeTime,
  sortGames,
  watchProfileVisibility,
  type GamesState,
} from "./games.ts";

function game(overrides: Partial<ActiveGameSummary> = {}): ActiveGameSummary {
  return {
    roomCode: "ABCD1234",
    yourSeat: "player1",
    turn: "player1",
    claimedSeats: 2,
    seq: 0,
    createdAt: "2026-01-01T12:00:00Z",
    updatedAt: "2026-01-01T12:00:00Z",
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("profile game summaries", () => {
  test("derives status from durable seats, not presence", () => {
    expect(gameStatus(game())).toBe("Your turn");
    expect(gameStatus(game({ turn: "player2" }))).toBe("Opponent’s turn");
    expect(gameStatus(game({ claimedSeats: 1 }))).toBe("Waiting for opponent");
    expect(gameStatus(game({ claimedSeats: 0, yourSeat: null }))).toBe(
      "Waiting for opponent",
    );
    expect(gameStatus(game({ yourSeat: null }))).toBe("No player seat");
  });

  test("sorts by status, latest update, then room code without mutating input", () => {
    const input = [
      game({ roomCode: "NOSEAT", yourSeat: null }),
      game({ roomCode: "WAITING", claimedSeats: 1 }),
      game({ roomCode: "OPPONENT", turn: "player2" }),
      game({ roomCode: "B" }),
      game({ roomCode: "A" }),
      game({ roomCode: "NEW", updatedAt: "2026-01-02T12:00:00Z" }),
    ];
    const before = [...input];
    expect(sortGames(input).map((item) => item.roomCode)).toEqual([
      "NEW",
      "A",
      "B",
      "OPPONENT",
      "WAITING",
      "NOSEAT",
    ]);
    expect(input).toEqual(before);
  });

  test("formats relative timestamps with singular/plural and clock skew", () => {
    const value = "2026-01-01T12:00:00Z";
    const now = Date.parse(value);
    expect(relativeTime(value, now - 1000)).toBe("just now");
    expect(relativeTime(value, now + 59_000)).toBe("just now");
    expect(relativeTime(value, now + 60_000)).toBe("1 minute ago");
    expect(relativeTime(value, now + 120_000)).toBe("2 minutes ago");
    expect(relativeTime(value, now + 3_600_000)).toBe("1 hour ago");
    expect(relativeTime(value, now + 172_800_000)).toBe("2 days ago");
  });
});

describe("profile requests", () => {
  test("uses credentialed no-store fetch and returns summaries", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ games: [game()] })));
    const controller = new AbortController();
    expect(
      await fetchMyGames(
        controller.signal,
        "https://api.example/api/me/games",
        request,
      ),
    ).toEqual([game()]);
    expect(request).toHaveBeenCalledWith("https://api.example/api/me/games", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
  });

  test("rejects HTTP errors and malformed lists", async () => {
    for (const response of [
      new Response("error", { status: 500 }),
      new Response(JSON.stringify({ games: null })),
    ]) {
      const request = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(
        fetchMyGames(
          new AbortController().signal,
          "https://api.example",
          request,
        ),
      ).rejects.toThrow();
    }
  });

  test("distinguishes initial loading, errors, empty success, and retry", async () => {
    const load = vi
      .fn<(signal: AbortSignal) => Promise<ActiveGameSummary[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    const states: GamesState[] = [];
    const loader = createGamesLoader(load, (state) => states.push(state));
    await loader.refresh();
    expect(states[0].loading).toBe(true);
    expect(states[0].games).toBeUndefined();
    expect(states.at(-1)?.loading).toBe(false);
    expect(states.at(-1)?.games).toBeUndefined();
    expect(states.at(-1)?.error).toContain("Could not load");
    await loader.refresh();
    expect(states.at(-1)).toMatchObject({ loading: false, games: [] });
    expect(states.at(-1)?.error).toBeUndefined();
    loader.dispose();
  });

  test("retains the prior list after a failed refresh", async () => {
    const load = vi
      .fn<(signal: AbortSignal) => Promise<ActiveGameSummary[]>>()
      .mockResolvedValueOnce([game()])
      .mockRejectedValueOnce(new Error("offline"));
    const states: GamesState[] = [];
    const loader = createGamesLoader(load, (state) => states.push(state));
    await loader.refresh();
    await loader.refresh();
    expect(states.at(-1)?.games).toEqual([game()]);
    expect(states.at(-1)?.error).toContain("Could not refresh");
    loader.dispose();
  });

  test("ignores stale responses and aborts superseded requests", async () => {
    const old = deferred<ActiveGameSummary[]>();
    const latest = deferred<ActiveGameSummary[]>();
    const load = vi
      .fn<(signal: AbortSignal) => Promise<ActiveGameSummary[]>>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const states: GamesState[] = [];
    const loader = createGamesLoader(load, (state) => states.push(state));
    const first = loader.refresh();
    const second = loader.refresh();
    expect(load.mock.calls[0][0].aborted).toBe(true);
    latest.resolve([game({ roomCode: "NEW" })]);
    await second;
    old.resolve([game({ roomCode: "OLD" })]);
    await first;
    expect(states.at(-1)?.games?.[0].roomCode).toBe("NEW");
    loader.dispose();
  });

  test("ignores stale failures and all responses after disposal", async () => {
    const old = deferred<ActiveGameSummary[]>();
    const latest = deferred<ActiveGameSummary[]>();
    const load = vi
      .fn<(signal: AbortSignal) => Promise<ActiveGameSummary[]>>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const publish = vi.fn();
    const loader = createGamesLoader(load, publish);
    const first = loader.refresh();
    const second = loader.refresh();
    old.reject(new Error("stale"));
    await first;
    expect(publish).toHaveBeenCalledTimes(2);
    loader.dispose();
    expect(load.mock.calls[1][0].aborted).toBe(true);
    latest.resolve([game()]);
    await second;
    await loader.refresh();
    expect(publish).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("refreshes on visibility and persisted pageshow, then removes listeners", () => {
    const page = Object.assign(new EventTarget(), {
      visibilityState: "hidden",
    });
    const browser = new EventTarget();
    const refresh = vi.fn();
    const stop = watchProfileVisibility(
      refresh,
      page as unknown as Document,
      browser as unknown as Window,
    );
    page.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).not.toHaveBeenCalled();
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    browser.dispatchEvent(
      Object.assign(new Event("pageshow"), { persisted: false }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    browser.dispatchEvent(
      Object.assign(new Event("pageshow"), { persisted: true }),
    );
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    page.dispatchEvent(new Event("visibilitychange"));
    browser.dispatchEvent(
      Object.assign(new Event("pageshow"), { persisted: true }),
    );
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
