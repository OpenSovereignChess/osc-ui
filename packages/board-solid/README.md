# Board Solid

Internal package-shaped board renderer for Open Sovereign Chess.

This package is intentionally narrow:

- renders pieces, selected square, and coordinates
- accepts plain props
- knows nothing about websocket state, matchmaking, or app providers

The web app owns session state and passes a snapshot into this package.

Owns:

- Solid components for the board, pieces, highlights, and coordinates
- board CSS and generated piece sprite CSS integration
- drag/select interaction wiring that emits callbacks
- renderer-facing exports from `@osc/board-core`

Does not own:

- legal move generation or move application
- game/session providers, clocks, matchmaking, rooms, or websocket transport
- editor/analysis/local/online mode decisions

Use props such as `canMove`, `canDragPiece`, `onMovePiece`, and `onSelectSquare`
to connect this renderer to application state. Keep rule decisions in
`@osc/rules` or the app session layer.
