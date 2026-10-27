import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";
import PieceSprite from "../../../../../../packages/board-solid/src/PieceSprite.tsx";

for (const orientation of ["white", "black"] as const) {
  test.each([
    { left: 120, top: 240, width: 800, height: 800 },
    { left: 120, top: -160, width: 800, height: 800 },
    { left: 16, top: 80, width: 480, height: 480 },
    { left: 16, top: 80, width: 640, height: 480 },
  ])(
    `centers a dragged piece with bounds ($left, $top, $width, $height), ${orientation}`,
    (bounds) => {
      const html = renderToString(() => (
        <PieceSprite
          bounds={bounds as DOMRectReadOnly}
          dragPosition={[300, 400]}
          dragging
          key="e4"
          orientation={orientation}
          piece={{ role: "pawn", color: "white" }}
        />
      ));

      const x = 300 - bounds.left - bounds.width / 16 / 2;
      const y = 400 - bounds.top - bounds.height / 16 / 2;
      expect(html).toContain(`transform:translate(${x}px, ${y}px)`);
    },
  );
}
