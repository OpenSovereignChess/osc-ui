import { For, Show } from "solid-js";
import {
  sovereignColorById,
  swatchStyle,
  type SovereignColorId,
} from "../../../app/design/color-system.ts";
import type { BoardPlayerTelemetry } from "../../session/boardTelemetry.ts";

import "./game-telemetry-strip.css";

export type GameTelemetryStripProps = {
  player: BoardPlayerTelemetry;
  clock: string;
  active?: boolean;
  ariaLabel?: string;
};

function RegimeSwatch(props: {
  id: SovereignColorId;
  labelPrefix: string;
  compact?: boolean;
}) {
  const spec = () => sovereignColorById[props.id];
  return (
    <span
      aria-label={`${props.labelPrefix}: ${spec().label}`}
      class="game-telemetry-strip__regime osc-swatch"
      classList={{ "game-telemetry-strip__regime--compact": props.compact }}
      data-pattern={spec().pattern}
      style={swatchStyle(spec())}
    >
      <span class="osc-swatch__code">{spec().code}</span>
    </span>
  );
}

export default function GameTelemetryStrip(props: GameTelemetryStripProps) {
  return (
    <div
      aria-label={
        props.ariaLabel ?? `${props.player.label} board-area telemetry`
      }
      class="game-telemetry-strip"
      classList={{ "game-telemetry-strip--active": props.active }}
    >
      <div class="game-telemetry-strip__identity">
        <RegimeSwatch
          id={props.player.currentRegime}
          labelPrefix={`${props.player.label} current regime`}
        />
        <span class="game-telemetry-strip__name">{props.player.label}</span>
      </div>

      <Show when={props.player.controlledRegimes.length > 0}>
        <div
          aria-label={`${props.player.label} controlled armies`}
          class="game-telemetry-strip__controlled"
        >
          <For each={props.player.controlledRegimes}>
            {(regime) => (
              <RegimeSwatch
                compact
                id={regime}
                labelPrefix={`${props.player.label} controls`}
              />
            )}
          </For>
        </div>
      </Show>

      <Show when={props.player.capturedPieces.length > 0}>
        <div
          aria-label={`${props.player.label} captured pieces`}
          class="game-telemetry-strip__captured"
        >
          <For each={props.player.capturedPieces}>
            {(piece) => (
              <span
                aria-label={`Captured ${piece.color} ${piece.role}`}
                class={`game-telemetry-strip__captured-piece piece ${piece.role} ${piece.color}`}
                role="img"
              />
            )}
          </For>
        </div>
      </Show>

      <span class="game-telemetry-strip__clock">{props.clock}</span>
    </div>
  );
}
