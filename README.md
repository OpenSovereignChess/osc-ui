# Open Sovereign Chess Frontend Site

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm install`         | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |
| `pnpm check --watch`   | Run Typescript check                             |
| `pnpm format`          | Format code using Prettier                       |
| `pnpm lint`            | Lint code using ESLint                           |
| `pnpm test`            | Run test suite                                   |

## Project structure plan

```
project/
│
├─ src/
│  ├─ game/                  # Everything about the chess variant itself
│  │   ├─ logic/             # Pure logic - no UI imports
│  │   │   ├─ board.ts
│  │   │   ├─ pieces.ts
│  │   │   ├─ rules.ts
│  │   │   ├─ move-generator.ts
│  │   │   ├─ game-state.ts
│  │   │   └─ index.ts
│  │   ├─ ui/                # SolidJS components for rendering the board + pieces
│  │   │   ├─ Board.solid.tsx
│  │   │   ├─ Square.solid.tsx
│  │   │   ├─ Piece.solid.tsx
│  │   │   └─ index.ts
│  │   ├─ assets/            # SVGs, piece icons, board textures, etc.
│  │   └─ index.ts
│  │
│  ├─ app/                   # The application around the game
│  │   ├─ pages/             # Solid views for app features
│  │   │   ├─ Home.solid.tsx
│  │   │   ├─ Play.solid.tsx
│  │   │   ├─ Settings.solid.tsx
│  │   │   └─ index.ts
│  │   ├─ logic/             # App-level logic: user settings, UI state, prefs, etc.
│  │   │   ├─ user-settings.ts
│  │   │   ├─ theme.ts
│  │   │   └─ index.ts
│  │   ├─ components/        # App-wide UI components
│  │   │   ├─ Layout.solid.tsx
│  │   │   ├─ Button.solid.tsx
│  │   │   ├─ Sidebar.solid.tsx
│  │   │   └─ index.ts
│  │   ├─ state/             # Signals, contexts, stores
│  │   │   ├─ game-store.ts
│  │   │   └─ ui-store.ts
│  │   └─ index.ts
│  │
│  ├─ backend/               # Astro server endpoints + shared types
│  │   ├─ api/
│  │   │   ├─ match-history.ts
│  │   │   ├─ puzzles.ts
│  │   │   └─ index.ts
│  │   ├─ models/            # Shared data types/interfaces
│  │   │   ├─ Match.ts
│  │   │   └─ User.ts
│  │   └─ index.ts
│  │
│  ├─ design/                # Design system (small, pragmatic)
│  │   ├─ tokens.ts          # Colors, radii, spacing, etc.
│  │   ├─ theme.css
│  │   └─ index.ts
│  │
│  ├─ assets/                # Global images, fonts
│  │   ├─ fonts/
│  │   └─ images/
│  │
│  ├─ utils/                 # Small helpers shared across domains
│  │   ├─ math.ts
│  │   ├─ array.ts
│  │   └─ index.ts
│  │
│  ├─ pages/                 # Astro pages routing
│  │   ├─ index.astro
│  │   ├─ play.astro
│  │   └─ settings.astro
│  │
│  └─ main.tsx               # App entry point (if using islands)
│
├─ public/                   # Static assets (served directly)
│
└─ package.json
```
