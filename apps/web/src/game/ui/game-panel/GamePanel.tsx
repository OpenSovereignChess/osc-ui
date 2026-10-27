import {
  For,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  type JSX,
} from "solid-js";
import { tabIndexForKey } from "./tabNavigation.ts";

import "./game-panel.css";

export interface GamePanelTab {
  readonly id: string;
  readonly label: string;
  readonly content: () => JSX.Element;
  readonly onActivate?: (panel: HTMLElement) => void;
}

interface GamePanelProps {
  readonly label: string;
  readonly tabs: readonly GamePanelTab[];
  readonly initialTabId: string;
}

export default function GamePanel(props: GamePanelProps) {
  const id = createUniqueId();
  const [activeId, setActiveId] = createSignal(props.initialTabId);
  const buttons = new Map<string, HTMLButtonElement>();
  const panels = new Map<string, HTMLDivElement>();
  const tabId = (tab: GamePanelTab) => `${id}-tab-${tab.id}`;
  const panelId = (tab: GamePanelTab) => `${id}-panel-${tab.id}`;

  createEffect(() => {
    const tab = props.tabs.find((entry) => entry.id === activeId());
    const panel = tab && panels.get(tab.id);
    if (!tab?.onActivate || !panel) return;

    // Wait until the newly selected panel participates in layout.
    const frame = window.requestAnimationFrame(() => tab.onActivate?.(panel));
    onCleanup(() => window.cancelAnimationFrame(frame));
  });

  return (
    <aside class="game-panel" aria-label={props.label}>
      <div class="game-panel__tabs" role="tablist" aria-label={props.label}>
        <For each={props.tabs}>
          {(tab) => (
            <button
              ref={(element) => buttons.set(tab.id, element)}
              id={tabId(tab)}
              type="button"
              role="tab"
              aria-controls={panelId(tab)}
              aria-selected={activeId() === tab.id}
              tabIndex={activeId() === tab.id ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => {
                const index = tabIndexForKey(
                  event.key,
                  props.tabs.findIndex((entry) => entry.id === tab.id),
                  props.tabs.length,
                );
                if (index === undefined) return;
                event.preventDefault();
                const next = props.tabs[index];
                setActiveId(next.id);
                buttons.get(next.id)?.focus();
              }}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>
      <For each={props.tabs}>
        {(tab) => (
          <div
            ref={(element) => panels.set(tab.id, element)}
            class="game-panel__body"
            id={panelId(tab)}
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            hidden={activeId() !== tab.id}
            tabIndex={0}
          >
            {tab.content()}
          </div>
        )}
      </For>
    </aside>
  );
}
