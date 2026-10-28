import {
  Show,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import {
  sovereignColorById,
  swatchStyle,
  type SovereignColorId,
} from "../design/color-system.ts";

import "./ColorSwatch.css";

type ColorSwatchProps = {
  color: SovereignColorId;
  label?: string;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  selected?: boolean;
  onClick?: () => void;
};

export default function ColorSwatch(props: ColorSwatchProps) {
  const spec = () => sovereignColorById[props.color];
  const tooltipId = createUniqueId();
  const [position, setPosition] = createSignal<{ left: number; top: number }>();
  let trigger: HTMLElement | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelHide = () => clearTimeout(hideTimer);
  const hide = () => {
    cancelHide();
    setPosition(undefined);
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer = setTimeout(hide, 120);
  };
  const show = () => {
    cancelHide();
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      hide();
      return;
    }
    setPosition({
      left: Math.max(
        48,
        Math.min(window.innerWidth - 48, rect.left + rect.width / 2),
      ),
      top: rect.bottom + 32 <= window.innerHeight ? rect.bottom : rect.top - 28,
    });
  };

  createEffect(() => {
    if (!position()) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    const onViewportChange = () => {
      // Focusing a swatch can scroll it into view; keep its tooltip aligned.
      if (document.activeElement === trigger) show();
      else hide();
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("scroll", onViewportChange, true);
    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("scroll", onViewportChange, true);
    });
  });
  onCleanup(cancelHide);

  return (
    <>
      <Dynamic
        component={props.onClick ? "button" : "span"}
        ref={(element: HTMLElement) => (trigger = element)}
        aria-label={props.label ?? spec().label}
        aria-describedby={position() ? tooltipId : undefined}
        aria-selected={props.onClick ? props.selected : undefined}
        class={`osc-swatch ${props.class ?? ""}`}
        classList={props.classList}
        data-color={props.color}
        role={props.onClick ? "tab" : "img"}
        style={swatchStyle(spec())}
        tabindex={props.onClick ? undefined : 0}
        type={props.onClick ? "button" : undefined}
        onClick={props.onClick}
        onMouseEnter={show}
        onMouseLeave={() => {
          if (document.activeElement !== trigger) scheduleHide();
        }}
        onFocus={show}
        onBlur={hide}
      >
        <span class="osc-swatch__code">{spec().code}</span>
      </Dynamic>
      <Show when={position()}>
        {(point) => (
          // Telemetry strips clip overflow, so render tooltips outside them.
          <Portal>
            <span
              id={tooltipId}
              class="osc-swatch-tooltip"
              role="tooltip"
              style={{ left: `${point().left}px`, top: `${point().top}px` }}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            >
              {spec().label}
            </span>
          </Portal>
        )}
      </Show>
    </>
  );
}
