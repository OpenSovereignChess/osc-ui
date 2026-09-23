import { For } from "solid-js";
import {
  sovereignColorSpecs,
  swatchStyle,
  type SovereignColorId,
} from "../../../app/design/color-system.ts";

interface ColorControlMatrixProps {
  readonly activeColor?: SovereignColorId;
}

export default function ColorControlMatrix(props: ColorControlMatrixProps) {
  return (
    <div
      class="color-matrix color-control-matrix"
      aria-label="12-color control matrix"
    >
      <For each={sovereignColorSpecs}>
        {(color) => (
          <button
            aria-label={`${color.label}, ${color.code}, ${color.owner}`}
            aria-pressed={props.activeColor === color.id}
            class="color-matrix__cell osc-swatch color-control-matrix__cell"
            data-owner={color.owner}
            data-pattern={color.pattern}
            style={swatchStyle(color)}
            title={`${color.label} (${color.code}) — ${color.owner}`}
            type="button"
          >
            <span class="osc-swatch__code">{color.code}</span>
            <span class="color-control-matrix__owner">
              {color.owner === "Player 1"
                ? "P1"
                : color.owner === "Player 2"
                  ? "P2"
                  : "--"}
            </span>
          </button>
        )}
      </For>
    </div>
  );
}
