import {
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import {
  sovereignColorById,
  swatchStyle,
  type SovereignColorId,
} from "../design/color-system.ts";

import "./Header.css";

export type HeaderMode = "global" | "gameplay" | "workspace";

export type HeaderTelemetry = {
  playerOneClock: string;
  playerTwoClock: string;
  playerOneRegime: SovereignColorId;
  playerTwoRegime: SovereignColorId;
  activeRegime: SovereignColorId;
  turn: number;
  phase: string;
};

export type HeaderProps = {
  mode?: HeaderMode;
  currentPath?: string;
  telemetry?: Partial<HeaderTelemetry>;
  workspaceTitle?: string;
};

const defaultTelemetry: HeaderTelemetry = {
  playerOneClock: "03:42",
  playerTwoClock: "04:15",
  playerOneRegime: "red",
  playerTwoRegime: "cyan",
  activeRegime: "red",
  turn: 14,
  phase: "WHITE REGIME",
};

const globalLinks = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/analysis", label: "Analyze" },
  { href: "/editor", label: "Board Editor" },
  { href: "/rules", label: "Rules" },
];

const workspaceLinks = [
  { href: "/play", label: "Play game" },
  { href: "/analysis", label: "Analysis board" },
  { href: "/editor", label: "Board editor" },
  { href: "/rules", label: "Rules" },
];

function isActivePath(currentPath: string, href: string): boolean {
  if (href === "/") {
    return currentPath === "/";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function dispatchFlipBoard(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("osc:flip-board"));
}

export default function Header(props: HeaderProps) {
  const mode = () => props.mode ?? "global";
  const currentPath = () => props.currentPath ?? "/";
  const telemetry = createMemo<HeaderTelemetry>(() => ({
    ...defaultTelemetry,
    ...props.telemetry,
  }));
  const workspaceTitle = createMemo(() => {
    if (props.workspaceTitle?.trim()) {
      return props.workspaceTitle.trim();
    }
    if (isActivePath(currentPath(), "/analysis")) {
      return "ANALYSIS BOARD";
    }
    if (isActivePath(currentPath(), "/editor")) {
      return "BOARD EDITOR";
    }
    return "BOARD WORKSPACE";
  });
  const [isNavOpen, setIsNavOpen] = createSignal(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = createSignal(false);

  const closeMenus = (): void => {
    setIsNavOpen(false);
    setIsActionMenuOpen(false);
  };

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
  });

  const renderGlobalLink = (link: { href: string; label: string }) => {
    const active = isActivePath(currentPath(), link.href);
    return (
      <a
        aria-current={active ? "page" : undefined}
        classList={{ "osc-header__link--active": active }}
        href={link.href}
        onClick={closeMenus}
      >
        {link.label}
      </a>
    );
  };

  const renderRegimeBadge = (id: SovereignColorId, labelPrefix: string) => {
    const spec = sovereignColorById[id];
    return (
      <span
        aria-label={`${labelPrefix}: ${spec.label}`}
        class="osc-header__regime"
        data-pattern={spec.pattern}
        style={swatchStyle(spec)}
      >
        {spec.code}
      </span>
    );
  };

  const activeSpec = () => sovereignColorById[telemetry().activeRegime];

  return (
    <header
      class="osc-header"
      classList={{
        "osc-header--global": mode() === "global",
        "osc-header--gameplay": mode() === "gameplay",
        "osc-header--workspace": mode() === "workspace",
      }}
      data-header-mode={mode()}
    >
      <Show
        when={mode() !== "global"}
        fallback={
          <>
            <div class="osc-header__brand-zone">
              <a
                class="osc-header__brand"
                href="/"
                aria-label="Open Sovereign Chess home"
              >
                <span class="osc-header__brand-mark" aria-hidden="true">
                  SC
                </span>
                <span class="osc-header__brand-label">SOVEREIGN CHESS</span>
              </a>
            </div>

            <nav class="osc-header__desktop-nav" aria-label="Primary">
              <For each={globalLinks}>{renderGlobalLink}</For>
            </nav>

            <div class="osc-header__actions">
              <a
                aria-current={
                  isActivePath(currentPath(), "/profile") ? "page" : undefined
                }
                class="osc-header__account"
                classList={{
                  "osc-header__link--active": isActivePath(
                    currentPath(),
                    "/profile",
                  ),
                }}
                href="/profile"
              >
                Account
              </a>
              <button
                aria-controls="osc-global-menu"
                aria-expanded={isNavOpen()}
                aria-haspopup="true"
                class="osc-header__menu-trigger"
                onClick={() => setIsNavOpen((open) => !open)}
                type="button"
              >
                MENU
              </button>
            </div>

            <Show when={isNavOpen()}>
              <nav
                aria-label="Mobile primary"
                class="osc-header__mobile-panel"
                id="osc-global-menu"
                role="menu"
              >
                <For each={globalLinks}>
                  {(link) => {
                    const active = isActivePath(currentPath(), link.href);
                    return (
                      <a
                        aria-current={active ? "page" : undefined}
                        classList={{ "osc-header__link--active": active }}
                        href={link.href}
                        onClick={closeMenus}
                        role="menuitem"
                      >
                        {link.label}
                      </a>
                    );
                  }}
                </For>
                <a href="/profile" onClick={closeMenus} role="menuitem">
                  Account
                </a>
              </nav>
            </Show>
          </>
        }
      >
        <>
          <div class="osc-header__game-left">
            <button
              aria-controls="osc-compact-nav"
              aria-expanded={isNavOpen()}
              aria-haspopup="true"
              class="osc-header__compact-trigger"
              onClick={() => setIsNavOpen((open) => !open)}
              type="button"
            >
              [SC ▾]
            </button>
            <Show when={isNavOpen()}>
              <nav
                aria-label="Compact navigation"
                class="osc-header__compact-popover"
                id="osc-compact-nav"
                role="menu"
              >
                <For each={globalLinks}>
                  {(link) => {
                    const active = isActivePath(currentPath(), link.href);
                    return (
                      <a
                        aria-current={active ? "page" : undefined}
                        classList={{ "osc-header__link--active": active }}
                        href={link.href}
                        onClick={closeMenus}
                        role="menuitem"
                      >
                        {link.label}
                      </a>
                    );
                  }}
                </For>
              </nav>
            </Show>
          </div>

          <Show
            when={mode() === "gameplay"}
            fallback={
              <div
                aria-label="Workspace status"
                class="osc-header__workspace-status"
              >
                <span class="osc-header__workspace-title">
                  {workspaceTitle()}
                </span>
              </div>
            }
          >
            <>
              <div
                aria-label="Game clock and turn status"
                class="osc-header__telemetry"
              >
                <span class="osc-header__clock">
                  {telemetry().playerOneClock}
                </span>
                {renderRegimeBadge(
                  telemetry().playerOneRegime,
                  "Player one regime",
                )}
                <span class="osc-header__turn">
                  T{telemetry().turn} / {telemetry().phase}
                </span>
                {renderRegimeBadge(
                  telemetry().playerTwoRegime,
                  "Player two regime",
                )}
                <span class="osc-header__clock">
                  {telemetry().playerTwoClock}
                </span>
              </div>

              <div
                aria-label="Compact game status"
                class="osc-header__mobile-telemetry"
              >
                <span>T{telemetry().turn}</span>
                <span aria-hidden="true">•</span>
                {renderRegimeBadge(telemetry().activeRegime, "Active regime")}
                <span>{activeSpec().label} active</span>
                <span class="osc-header__clock">
                  {telemetry().playerOneClock}
                </span>
              </div>
            </>
          </Show>

          <Show
            when={mode() === "gameplay"}
            fallback={
              <div class="osc-header__workspace-actions">
                <button
                  aria-label="Flip board"
                  class="osc-header__icon-button"
                  onClick={dispatchFlipBoard}
                  type="button"
                >
                  ⇄
                </button>
                <button
                  aria-controls="osc-workspace-menu"
                  aria-expanded={isActionMenuOpen()}
                  aria-haspopup="true"
                  class="osc-header__workspace-menu-trigger"
                  onClick={() => setIsActionMenuOpen((open) => !open)}
                  type="button"
                >
                  Workspace Menu ▾
                </button>
                <button
                  aria-controls="osc-workspace-menu"
                  aria-expanded={isActionMenuOpen()}
                  aria-haspopup="true"
                  class="osc-header__workspace-menu-mobile"
                  onClick={() => setIsActionMenuOpen((open) => !open)}
                  type="button"
                >
                  MENU ▾
                </button>
                <Show when={isActionMenuOpen()}>
                  <div
                    class="osc-header__game-menu osc-header__workspace-menu"
                    id="osc-workspace-menu"
                    role="menu"
                  >
                    <button
                      class="osc-header__menu-action"
                      onClick={() => {
                        dispatchFlipBoard();
                        closeMenus();
                      }}
                      role="menuitem"
                      type="button"
                    >
                      Flip board
                    </button>
                    <For each={workspaceLinks}>
                      {(link) => {
                        const active = isActivePath(currentPath(), link.href);
                        return (
                          <a
                            aria-current={active ? "page" : undefined}
                            classList={{ "osc-header__link--active": active }}
                            href={link.href}
                            onClick={closeMenus}
                            role="menuitem"
                          >
                            {link.label}
                          </a>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            }
          >
            <div class="osc-header__game-actions">
              <button
                aria-label="Flip board"
                class="osc-header__icon-button"
                onClick={dispatchFlipBoard}
                type="button"
              >
                ⇄
              </button>
              <button
                aria-controls="osc-game-menu"
                aria-expanded={isActionMenuOpen()}
                aria-haspopup="true"
                class="osc-header__game-menu-trigger"
                onClick={() => setIsActionMenuOpen((open) => !open)}
                type="button"
              >
                Game Menu ▾
              </button>
              <button
                aria-controls="osc-game-menu"
                aria-expanded={isActionMenuOpen()}
                aria-haspopup="true"
                class="osc-header__game-menu-mobile"
                onClick={() => setIsActionMenuOpen((open) => !open)}
                type="button"
              >
                MENU ▾
              </button>
              <Show when={isActionMenuOpen()}>
                <div
                  class="osc-header__game-menu"
                  id="osc-game-menu"
                  role="menu"
                >
                  <button
                    class="osc-header__menu-action osc-header__menu-action--mobile"
                    onClick={() => {
                      dispatchFlipBoard();
                      closeMenus();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Flip board
                  </button>
                  <a href="/analysis" onClick={closeMenus} role="menuitem">
                    Engine Analysis
                  </a>
                  <button disabled role="menuitem" type="button">
                    Draw
                  </button>
                  <button disabled role="menuitem" type="button">
                    Resign
                  </button>
                </div>
              </Show>
            </div>
          </Show>
        </>
      </Show>
    </header>
  );
}
