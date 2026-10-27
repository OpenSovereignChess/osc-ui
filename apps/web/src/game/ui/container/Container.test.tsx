import { renderToString } from "solid-js/web";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GameProvider } from "../../provider/GameProvider.tsx";
import Container from "./Container.tsx";

beforeEach(() => vi.stubGlobal("window", {}));
afterEach(() => vi.unstubAllGlobals());

test("Play renders real Moves and Actions tabs with live player telemetry", () => {
  const html = renderToString(() => (
    <GameProvider>
      <Container showBoardTelemetry />
    </GameProvider>
  ));

  expect(html.match(/role="tablist"/g)).toHaveLength(1);
  expect(html.match(/role="tab"/g)).toHaveLength(2);
  expect(html).toContain("Moves");
  expect(html).toContain("Actions");
  expect(html).toContain("No moves yet.");
  expect(html).toContain('aria-label="Move history"');
  expect(html).toContain('aria-label="Castle"');
  expect(html).toContain('aria-label="Defect"');
  expect(html).toContain('aria-label="Opponent board telemetry"');
  expect(html).toContain('aria-label="Current player board telemetry"');
  expect(html).not.toContain("12-regime matrix");
});

test("editor board-only mode renders no game panel or player telemetry", () => {
  const html = renderToString(() => (
    <GameProvider>
      <Container showControls={false} />
    </GameProvider>
  ));

  expect(html).toContain("game-board-shell--board-only");
  expect(html).not.toContain('role="tablist"');
  expect(html).not.toContain('class="game-panel"');
  expect(html).not.toContain('class="game-telemetry-strip');
});
