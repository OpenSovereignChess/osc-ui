import { For, Show } from "solid-js";

import "./board-play-controls.css";

export interface PlayControlAction {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

interface BoardPlayControlsProps {
  readonly castleActions: readonly PlayControlAction[];
  readonly defectActions: readonly PlayControlAction[];
}

export default function BoardPlayControls(props: BoardPlayControlsProps) {
  const hasCastleActions = () => props.castleActions.length > 0;
  const hasDefectActions = () => props.defectActions.length > 0;

  return (
    <div class="board-play-controls" aria-label="Play controls">
      <section class="board-play-control-group" aria-label="Castle">
        <h2>Castle</h2>
        <div class="board-play-control-actions">
          <Show
            when={hasCastleActions()}
            fallback={
              <button disabled type="button">
                No castle
              </button>
            }
          >
            <For each={props.castleActions}>
              {(action) => (
                <button
                  disabled={action.disabled}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              )}
            </For>
          </Show>
        </div>
      </section>

      <section class="board-play-control-group" aria-label="Defect">
        <h2>Defect</h2>
        <div class="board-play-control-actions">
          <Show
            when={hasDefectActions()}
            fallback={
              <button disabled type="button">
                No defect
              </button>
            }
          >
            <For each={props.defectActions}>
              {(action) => (
                <button
                  disabled={action.disabled}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              )}
            </For>
          </Show>
        </div>
      </section>
    </div>
  );
}
