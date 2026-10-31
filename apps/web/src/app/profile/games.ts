import {
  myGamesEndpoint,
  type ActiveGameSummary,
  type MyGamesResponse,
} from "../../game/online/protocol.ts";

export function gameStatus(game: ActiveGameSummary): string {
  if (game.claimedSeats < 2) return "Waiting for opponent";
  if (!game.yourSeat) return "No player seat";
  return game.turn === game.yourSeat ? "Your turn" : "Opponent’s turn";
}

const statusPriority = [
  "Your turn",
  "Opponent’s turn",
  "Waiting for opponent",
  "No player seat",
];

export function sortGames(games: ActiveGameSummary[]): ActiveGameSummary[] {
  return [...games].sort((a, b) => {
    const priority =
      statusPriority.indexOf(gameStatus(a)) -
      statusPriority.indexOf(gameStatus(b));
    if (priority) return priority;
    const updated = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (updated) return updated;
    return a.roomCode < b.roomCode ? -1 : a.roomCode > b.roomCode ? 1 : 0;
  });
}

export function relativeTime(value: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 60) return "just now";
  const [amount, unit] =
    seconds < 3600
      ? [Math.floor(seconds / 60), "minute"]
      : seconds < 86400
        ? [Math.floor(seconds / 3600), "hour"]
        : [Math.floor(seconds / 86400), "day"];
  return `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
}

export async function fetchMyGames(
  signal: AbortSignal,
  endpoint = myGamesEndpoint(),
  request: typeof fetch = fetch,
): Promise<ActiveGameSummary[]> {
  const response = await request(endpoint, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Could not load games.");
  const body = (await response.json()) as MyGamesResponse;
  if (!Array.isArray(body.games)) throw new Error("Invalid games response.");
  return body.games;
}

export interface GamesState {
  // undefined distinguishes a request that has never succeeded from an empty list.
  games?: ActiveGameSummary[];
  loading: boolean;
  error?: string;
  refreshedAt: number;
}

export function initialGamesState(): GamesState {
  return { loading: true, refreshedAt: Date.now() };
}

// Keep request ownership explicit so refreshes cannot overwrite newer results,
// even when a transport ignores AbortSignal.
export function createGamesLoader(
  load: (signal: AbortSignal) => Promise<ActiveGameSummary[]>,
  publish: (state: GamesState) => void,
) {
  let state = initialGamesState();
  let controller: AbortController | undefined;
  let disposed = false;

  return {
    async refresh() {
      if (disposed) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      state = { ...state, loading: true, error: undefined };
      publish(state);
      try {
        const games = await load(current.signal);
        if (disposed || controller !== current) return;
        state = {
          games: sortGames(games),
          loading: false,
          refreshedAt: Date.now(),
        };
      } catch {
        if (disposed || controller !== current) return;
        state = {
          ...state,
          loading: false,
          error:
            state.games === undefined
              ? "Could not load your games. Please try again."
              : "Could not refresh your games. The list may be out of date.",
        };
      }
      publish(state);
    },
    dispose() {
      disposed = true;
      controller?.abort();
    },
  };
}

export function watchProfileVisibility(
  refresh: () => void,
  page: Document,
  browser: Window,
): () => void {
  const onVisibility = () => {
    if (page.visibilityState === "visible") refresh();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted && page.visibilityState === "visible") refresh();
  };
  page.addEventListener("visibilitychange", onVisibility);
  browser.addEventListener("pageshow", onPageShow);
  return () => {
    page.removeEventListener("visibilitychange", onVisibility);
    browser.removeEventListener("pageshow", onPageShow);
  };
}
