import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";

import GameTelemetryStrip from "./GameTelemetryStrip.tsx";

test("renders board-area game telemetry without defaults", () => {
  const html = renderToString(() => (
    <GameTelemetryStrip
      playerOneClock="09:58"
      playerTwoClock="10:00"
      playerOneRegime="red"
      playerTwoRegime="cyan"
      turn={3}
      phase="RED REGIME"
    />
  ));

  expect(html).toContain("game-telemetry-strip");
  expect(html).toContain("09:58");
  expect(html).toContain("10:00");
  expect(html).toContain("T3 / RED REGIME");
  expect(html).toContain('aria-label="Player one regime: Red"');
  expect(html).toContain('aria-label="Player two regime: Cyan"');
  expect(html).toContain('data-pattern="diagonal"');
  expect(html).toContain('data-pattern="checker"');
});
