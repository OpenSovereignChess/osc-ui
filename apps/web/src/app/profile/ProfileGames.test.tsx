import { renderToString } from "solid-js/web";
import { expect, test, vi } from "vitest";
import type { ActiveGameSummary } from "../../game/online/protocol.ts";
import ProfileGames, { ProfileGamesView } from "./ProfileGames.tsx";
import type { GamesState } from "./games.ts";

const game: ActiveGameSummary = {
  roomCode: "ABCD1234",
  yourSeat: "player2",
  turn: "player2",
  claimedSeats: 2,
  seq: 1,
  createdAt: "2026-01-01T12:00:00Z",
  updatedAt: "2026-01-02T12:00:00Z",
};
const now = Date.parse("2026-01-02T12:01:00Z");

function render(state: Partial<GamesState> = {}) {
  return renderToString(() => (
    <ProfileGamesView
      state={{ loading: false, refreshedAt: now, ...state }}
      retry={() => {}}
    />
  )).replace(/<!--[\s\S]*?-->/g, "");
}

test("SSR shows loading without accessing browser globals or fetching", () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  try {
    const html = renderToString(() => <ProfileGames />);
    expect(request).not.toHaveBeenCalled();
    expect(html).toContain("Loading your games");
    expect(html).not.toContain("No active games yet");
  } finally {
    vi.unstubAllGlobals();
  }
});

test("history is below active games in every state, without tabs or fake results", () => {
  const states: Partial<GamesState>[] = [
    { loading: true },
    { error: "Could not load your games." },
    { games: [] },
    { games: [game] },
    { games: [game], loading: true },
    { games: [game], error: "Could not refresh your games." },
  ];
  for (const state of states) {
    const html = render(state);
    expect(html.indexOf("Active games")).toBeLessThan(
      html.indexOf("Game history"),
    );
    expect(html).toContain(
      "Completed games will appear here once game results are supported.",
    );
    expect(html).not.toContain('role="tab');
    expect(html).not.toContain("You won");
  }
});

test("only successful empty lists show the create/join call to action", () => {
  expect(render({ loading: true })).not.toContain("No active games yet");
  expect(render({ error: "Could not load" })).not.toContain(
    "No active games yet",
  );
  const html = render({ games: [] });
  expect(html).toContain("No active games yet.");
  expect(html).toContain('href="/play"');
  expect(html).toContain("Create or join a game");
});

test("renders seat, status, timestamp and an explicitly named room link", () => {
  const html = render({ games: [game] });
  expect(html).toContain("Game ABCD1234");
  expect(html).toContain("Your seat: Player 2");
  expect(html).toContain("Your turn");
  expect(html).toContain("Last move");
  expect(html).toContain('datetime="2026-01-02T12:00:00Z"');
  expect(html).toContain("1 minute ago");
  expect(html).toContain('href="/play?room=ABCD1234"');
  expect(html).toContain('aria-label="Open game ABCD1234"');
  expect(html).not.toContain("Join game");
});

test("unclaimed games use creation time and do not invent a seat", () => {
  const html = render({
    games: [{ ...game, yourSeat: null, seq: 0, claimedSeats: 0 }],
  });
  expect(html).toContain("Seat not claimed");
  expect(html).toContain("Waiting for opponent");
  expect(html).toContain("Created");
  expect(html).toContain('datetime="2026-01-01T12:00:00Z"');
  expect(html).not.toContain("Your seat:");
});

test("refresh errors retain rows and expose a Retry control", () => {
  const html = render({
    games: [game],
    error: "Could not refresh your games.",
  });
  expect(html).toContain("Game ABCD1234");
  expect(html).toContain("Could not refresh your games.");
  expect(html).toContain("Retry");
  expect(html).toContain('role="status"');
});
