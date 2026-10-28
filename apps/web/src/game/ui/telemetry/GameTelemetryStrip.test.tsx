import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";

import GameTelemetryStrip from "./GameTelemetryStrip.tsx";

test("renders board-area player telemetry without placeholder metadata", () => {
  const html = renderToString(() => (
    <GameTelemetryStrip
      active
      clock="1:05"
      player={{
        side: "player1",
        label: "Player 1",
        currentRegime: "red",
        controlledRegimes: ["cyan"],
        capturedPieces: [{ color: "black", role: "pawn" }],
      }}
    />
  ));

  expect(html).toContain("game-telemetry-strip");
  expect(html).toContain("Player 1");
  expect(html).toContain("1:05");
  expect(html).toContain('aria-label="Player 1 current regime: Red"');
  expect(html).toContain('aria-label="Player 1 controls: Cyan"');
  expect(html).toContain(">RD</span>");
  expect(html).toContain(">CY</span>");
  expect(html).toContain('role="img"');
  expect(html).toContain('tabindex="0"');
  expect(html).not.toContain("data-pattern");
  expect(html).toContain("captured-piece piece pawn black");
  expect(html).not.toContain("Avatar");
  expect(html).not.toContain("Rating");
  expect(html).not.toContain("Material");
});
