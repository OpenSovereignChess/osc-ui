# Board Solid

Internal package-shaped board renderer for Open Sovereign Chess.

This package is intentionally narrow:

- renders pieces, selected square, and coordinates
- accepts plain props
- knows nothing about websocket state, matchmaking, or app providers

The web app owns session state and passes a snapshot into this package.
