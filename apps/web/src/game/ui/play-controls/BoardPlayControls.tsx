import { For, Show } from "solid-js";

import Button from "../../../app/components/Button.tsx";

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
              <Button disabled size="sm">
                No castle
              </Button>
            }
          >
            <For each={props.castleActions}>
              {(action) => (
                <Button
                  disabled={action.disabled}
                  onClick={action.onClick}
                  size="sm"
                >
                  {action.label}
                </Button>
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
              <Button disabled size="sm">
                No defect
              </Button>
            }
          >
            <For each={props.defectActions}>
              {(action) => (
                <Button
                  disabled={action.disabled}
                  onClick={action.onClick}
                  size="sm"
                >
                  {action.label}
                </Button>
              )}
            </For>
          </Show>
        </div>
      </section>
    </div>
  );
}
