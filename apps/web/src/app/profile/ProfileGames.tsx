import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import Button from "../components/Button.tsx";
import {
  playRoomPath,
  type ActiveGameSummary,
} from "../../game/online/protocol.ts";
import {
  createGamesLoader,
  fetchMyGames,
  gameStatus,
  initialGamesState,
  relativeTime,
  watchProfileVisibility,
  type GamesState,
} from "./games.ts";
import "./profile-games.css";

export function ProfileGamesView(props: {
  state: GamesState;
  retry: () => void;
}) {
  return (
    <>
      <section class="profile-games" aria-labelledby="active-games-heading">
        <h2 id="active-games-heading">Active games</h2>
        <div class="profile-games__feedback" role="status" aria-live="polite">
          <Show when={props.state.loading}>
            <p>
              {props.state.games === undefined
                ? "Loading your games…"
                : "Refreshing your games…"}
            </p>
          </Show>
          <Show when={props.state.error}>
            <p>{props.state.error}</p>
          </Show>
        </div>
        <Show when={props.state.error}>
          <Button
            size="sm"
            disabled={props.state.loading}
            onClick={props.retry}
          >
            Retry
          </Button>
        </Show>
        <Show when={props.state.games !== undefined}>
          <Show
            when={props.state.games!.length > 0}
            fallback={
              <div class="profile-games__empty">
                <p>No active games yet.</p>
                <Button href="/play">Create or join a game</Button>
              </div>
            }
          >
            <ul class="profile-games__list">
              <For each={props.state.games}>
                {(game) => (
                  <GameRow game={game} now={props.state.refreshedAt} />
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </section>
      <section class="profile-games" aria-labelledby="game-history-heading">
        <h2 id="game-history-heading">Game history</h2>
        <p class="profile-games__muted">
          Completed games will appear here once game results are supported.
        </p>
      </section>
    </>
  );
}

function GameRow(props: { game: ActiveGameSummary; now: number }) {
  const timestamp = () =>
    props.game.seq > 0 ? props.game.updatedAt : props.game.createdAt;
  const fullTime = () => new Date(timestamp()).toLocaleString();
  return (
    <li class="profile-games__row">
      <div class="profile-games__details">
        <h3>Game {props.game.roomCode}</h3>
        <p>
          {props.game.yourSeat
            ? `Your seat: ${props.game.yourSeat === "player1" ? "Player 1" : "Player 2"}`
            : "Seat not claimed"}
        </p>
        <p class="profile-games__muted">
          {props.game.seq > 0 ? "Last move " : "Created "}
          <time
            dateTime={timestamp()}
            title={fullTime()}
            aria-label={fullTime()}
          >
            {relativeTime(timestamp(), props.now)}
          </time>
        </p>
      </div>
      <strong class="profile-games__status">{gameStatus(props.game)}</strong>
      <Button
        size="sm"
        href={playRoomPath(props.game.roomCode)}
        aria-label={`Open game ${props.game.roomCode}`}
      >
        Open game
      </Button>
    </li>
  );
}

export default function ProfileGames() {
  const [state, setState] = createSignal(initialGamesState());
  const loader = createGamesLoader(fetchMyGames, setState);

  onMount(() => {
    const stopWatching = watchProfileVisibility(
      () => void loader.refresh(),
      document,
      window,
    );
    void loader.refresh();
    onCleanup(() => {
      stopWatching();
      loader.dispose();
    });
  });

  return (
    <ProfileGamesView state={state()} retry={() => void loader.refresh()} />
  );
}
