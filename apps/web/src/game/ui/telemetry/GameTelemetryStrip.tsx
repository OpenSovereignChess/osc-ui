import {
  sovereignColorById,
  swatchStyle,
  type SovereignColorId,
} from "../../../app/design/color-system.ts";

import "./game-telemetry-strip.css";

export type GameTelemetryStripProps = {
  playerOneClock: string;
  playerTwoClock: string;
  playerOneRegime: SovereignColorId;
  playerTwoRegime: SovereignColorId;
  turn: number;
  phase: string;
  ariaLabel?: string;
};

function RegimeBadge(props: { id: SovereignColorId; labelPrefix: string }) {
  const spec = () => sovereignColorById[props.id];
  return (
    <span
      aria-label={`${props.labelPrefix}: ${spec().label}`}
      class="game-telemetry-strip__regime"
      data-pattern={spec().pattern}
      style={swatchStyle(spec())}
    >
      {spec().code}
    </span>
  );
}

export default function GameTelemetryStrip(props: GameTelemetryStripProps) {
  return (
    <div
      aria-label={props.ariaLabel ?? "Game clock and turn status"}
      class="game-telemetry-strip"
    >
      <span class="game-telemetry-strip__clock">{props.playerOneClock}</span>
      <RegimeBadge id={props.playerOneRegime} labelPrefix="Player one regime" />
      <span class="game-telemetry-strip__turn">
        {`T${props.turn} / ${props.phase}`}
      </span>
      <RegimeBadge id={props.playerTwoRegime} labelPrefix="Player two regime" />
      <span class="game-telemetry-strip__clock">{props.playerTwoClock}</span>
    </div>
  );
}
