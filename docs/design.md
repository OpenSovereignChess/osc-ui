# UI Design Notes

## Inspiration

- Braun / Swiss modernist product interfaces: functional, flat, gridded, and restrained.
- Chess analysis tools: board-first layouts with dense but legible supporting telemetry.
- Instrument panels: persistent status, compact controls, and clear system feedback.

## Guiding principles

1. **Board first**
   - Preserve as much space as possible for the 16×16 board.
   - Supporting UI should frame the board, not compete with it.

2. **Three-zone structure**
   - Header: global status and navigation.
   - Canvas: board or primary task.
   - Dock/panel: tactical context, notation, controls, and inspector content.

3. **Persistent context over modals**
   - Prefer inline panels, docks, and inspectors.
   - Avoid modal interruptions unless the user must make a blocking decision.

4. **Color is never the only signal**
   - Regimes must be represented by color, pattern, and short code.
   - Interactive state must also use shape, border, text, or position.

5. **Functional before decorative**
   - If something looks interactive, it should work.
   - If something is decorative, it should not be a button or announced as a control.

6. **Flat, compact, explicit**
   - Use simple borders, tight grids, direct labels, and minimal ornament.
   - Prefer clear density over spacious marketing layout in tool surfaces.

7. **Shared design language, not duplicated state**
   - Reuse component patterns for matrices, panels, buttons, and docks.
   - Keep game state in game/session/rules code, not in visual design metadata.

8. **Mobile keeps core actions available**
   - Responsive layouts may collapse secondary information.
   - Required play controls must remain reachable.

## Spacing

Use a **4px base spacing unit**, with **8px as the default layout rhythm**. The UI should feel compact, gridded, and board-first rather than spacious or decorative.

| Step | Value | Typical use |
| --- | ---: | --- |
| `0` | `0` | Flush edges and reset spacing. |
| `px` | `1px` | Borders, dividers, hairlines, and grid separators. |
| `0.5` | `2px` | Micro gaps, compact icon spacing, and dense visual patterns. |
| `1` | `4px` | Tight internal gaps and close label/control relationships. |
| `2` | `8px` | Default app-shell padding, grid gaps, board-adjacent gutters, and dense component spacing. |
| `3` | `12px` | Compact panel padding and stacked control groups. |
| `4` | `16px` | Standard panel/card padding and medium group spacing. |
| `6` | `24px` | Larger group separation inside content areas. |
| `8` | `32px` | Standard page-section vertical padding. |
| `12` | `48px` | Large page or hero spacing. |
| `14` | `56px` | Maximum standard page gutter. |
| `18` | `72px` | Hero/marketing spacing only. |

Guidelines:

- Prefer `4px`, `8px`, `12px`, and `16px` in game, tool, and panel UI.
- Use `8px` for default shell gaps and board-adjacent layout gutters.
- Use `12px` for compact panels and `16px` for standard panels/cards.
- Use `32px` vertical spacing for page sections, with responsive horizontal gutters like `clamp(16px, 4vw, 56px)`.
- Reserve `40px+` spacing for marketing/hero surfaces, not dense game tools.
- Avoid arbitrary spacing values unless needed for optical alignment, hit targets, or fixed board math.

## Source of truth

- Global tokens and shared utility styles: `apps/web/src/pages/_Layout.astro`
- Sovereign color metadata and swatch helpers: `apps/web/src/app/design/color-system.ts`
- App-level Astro components: `apps/web/src/app/components/`
- Game UI components and tool CSS: `apps/web/src/game/ui/`
