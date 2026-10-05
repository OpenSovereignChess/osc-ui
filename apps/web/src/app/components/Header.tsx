import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import Button from "./Button.tsx";

import "./Header.css";

export type HeaderMode = "global" | "board";

export type HeaderProps = {
  mode?: HeaderMode;
  currentPath?: string;
};

const globalLinks = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/analysis", label: "Analyze" },
  { href: "/editor", label: "Board Editor" },
];

function isActivePath(currentPath: string, href: string): boolean {
  if (href === "/") {
    return currentPath === "/";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function Header(props: HeaderProps) {
  const mode = () => props.mode ?? "global";
  const currentPath = () => props.currentPath ?? "/";
  const [isNavOpen, setIsNavOpen] = createSignal(false);

  const closeMenus = (): void => {
    setIsNavOpen(false);
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

  const renderProfileLink = () => {
    const active = isActivePath(currentPath(), "/profile");
    return (
      <a
        aria-current={active ? "page" : undefined}
        class="osc-header__profile"
        classList={{ "osc-header__link--active": active }}
        href="/profile"
        onClick={closeMenus}
      >
        Profile
      </a>
    );
  };

  return (
    <header
      class="osc-header"
      classList={{
        "osc-header--global": mode() === "global",
        "osc-header--board": mode() === "board",
      }}
      data-header-mode={mode()}
    >
      <Show
        when={mode() === "board"}
        fallback={
          <>
            <div class="osc-header__brand-zone">
              <a
                class="osc-header__brand"
                href="/"
                aria-label="Play Sovereign Chess home"
              >
                <span class="osc-header__brand-mark" aria-hidden="true">
                  PSC
                </span>
                <span class="osc-header__brand-label">
                  PLAY SOVEREIGN CHESS
                </span>
              </a>
            </div>

            <nav class="osc-header__desktop-nav" aria-label="Primary">
              <For each={globalLinks}>{renderGlobalLink}</For>
            </nav>

            <div class="osc-header__actions">
              {renderProfileLink()}
              <Button
                aria-controls="osc-global-menu"
                aria-expanded={isNavOpen()}
                aria-haspopup="true"
                class="osc-header__menu-trigger"
                onClick={() => setIsNavOpen((open) => !open)}
                size="sm"
                variant="ghost"
              >
                MENU
              </Button>
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
                  Profile
                </a>
              </nav>
            </Show>
          </>
        }
      >
        <>
          <div class="osc-header__board-left">
            <Button
              aria-controls="osc-compact-nav"
              aria-expanded={isNavOpen()}
              aria-haspopup="true"
              class="osc-header__compact-trigger"
              onClick={() => setIsNavOpen((open) => !open)}
              size="sm"
              variant="ghost"
            >
              [PSC ▾]
            </Button>
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

          <div class="osc-header__board-spacer" aria-hidden="true" />

          <div class="osc-header__board-actions">{renderProfileLink()}</div>
        </>
      </Show>
    </header>
  );
}
