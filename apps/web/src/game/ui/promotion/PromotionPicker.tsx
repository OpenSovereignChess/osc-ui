import {
  BOARD_SIZE,
  key2pos,
  posToTranslate,
  type BoardKey,
  type BoardOrientation,
  type BoardPiece,
  type BoardRole,
} from "@osc/board-core";
import { For, Show, createMemo } from "solid-js";

import "./promotion-picker.css";

type PromotionPickerProps = {
  request?: {
    readonly dest: BoardKey;
    readonly piece: BoardPiece;
    readonly roles: readonly BoardRole[];
  };
  bounds?: DOMRectReadOnly;
  orientation: BoardOrientation;
  onPromote: (role: BoardRole) => void;
  ref?: (element: HTMLDivElement) => void;
};

/** Presentation only: callers own promotion validation and cancellation. */
export default function PromotionPicker(props: PromotionPickerProps) {
  const style = createMemo(() => {
    const pending = props.request;
    const bounds = props.bounds;
    if (!pending || !bounds) return undefined;

    const squareSize = bounds.width / BOARD_SIZE;
    const [x, y] = posToTranslate(bounds)(
      key2pos(pending.dest),
      props.orientation,
    );
    const width = pending.roles.length * squareSize;
    return {
      "--promotion-square-size": `${squareSize}px`,
      left: `${Math.min(Math.max(0, x - (width - squareSize) / 2), bounds.width - width)}px`,
      top: `${Math.min(Math.max(0, y), bounds.height - squareSize)}px`,
    };
  });

  return (
    <Show when={style()}>
      {(pickerStyle) => (
        <div
          aria-label="Choose promotion piece"
          class="promotion-picker"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          ref={props.ref}
          role="dialog"
          style={pickerStyle()}
        >
          <For each={props.request!.roles}>
            {(role) => (
              <button
                aria-label={`Promote to ${role}`}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  props.onPromote(role);
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  class={`promotion-piece piece ${role} ${props.request!.piece.color}`}
                />
              </button>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}
