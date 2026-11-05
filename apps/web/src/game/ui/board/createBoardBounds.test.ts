import { createRoot, createSignal } from "solid-js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createBoardBounds } from "./createBoardBounds.ts";

// Exercise real effects and cleanup without adding a browser DOM dependency.
vi.mock("solid-js", () =>
  vi.importActual<typeof import("solid-js")>("solid-js/dist/solid.js"),
);

function rect(
  width: number,
  height: number,
  left = 0,
  top = 0,
): DOMRectReadOnly {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  };
}

function element(getBounds: () => DOMRectReadOnly): HTMLElement {
  return {
    style: {},
    getBoundingClientRect: getBounds,
  } as unknown as HTMLElement;
}

const observe = vi.fn();
const disconnect = vi.fn();
const cancelFrame = vi.fn();
let notifyResize: (bounds: DOMRectReadOnly) => void;
let nextFrame: FrameRequestCallback;
const disposals: (() => void)[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  class Observer {
    observe = observe;
    disconnect = disconnect;
    constructor(callback: ResizeObserverCallback) {
      notifyResize = (bounds) =>
        callback(
          [{ contentRect: bounds } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("window", {
    devicePixelRatio: 1.25,
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 7;
    }),
    cancelAnimationFrame: cancelFrame,
    ResizeObserver: Observer,
  });
});

afterEach(() => {
  disposals.splice(0).forEach((dispose) => dispose());
  vi.unstubAllGlobals();
});

function mount(stage: HTMLElement, container: HTMLElement) {
  return createRoot((dispose) => {
    disposals.push(dispose);
    return createBoardBounds(
      () => stage,
      () => container,
    );
  });
}

test.each([1, 1.25, 2])(
  "board squares align to device pixels at DPR %s",
  (dpr) => {
    window.devicePixelRatio = dpr;
    const stage = element(() => rect(503, 420));
    const container = element(() =>
      rect(
        parseFloat(container.style.width),
        parseFloat(container.style.height),
        30,
        40,
      ),
    );
    const bounds = mount(stage, container);
    const expectedSize = (Math.floor((420 * dpr) / 16) * 16) / dpr;

    expect(container.style.width).toBe(`${expectedSize}px`);
    expect(container.style.height).toBe(`${expectedSize}px`);
    expect(bounds()).toMatchObject({
      width: expectedSize,
      height: expectedSize,
      left: 30,
      top: 40,
    });
    expect(observe).toHaveBeenCalledWith(stage);
  },
);

test("resize notifications and the post-layout frame refresh board bounds", () => {
  let stageBounds = rect(400, 400);
  const stage = element(() => stageBounds);
  const container = element(() =>
    rect(parseFloat(container.style.width), parseFloat(container.style.height)),
  );
  const bounds = mount(stage, container);

  notifyResize(rect(300, 450));
  expect(bounds()?.width).toBe(294.4);
  expect(container.style.height).toBe("294.4px");

  stageBounds = rect(500, 500);
  nextFrame(0);
  expect(bounds()?.width).toBe(499.2);
});

test("works without ResizeObserver and cancels the pending frame on disposal", () => {
  Reflect.deleteProperty(window, "ResizeObserver");
  const stage = element(() => rect(320, 320));
  const container = element(() => rect(320, 320));
  const bounds = mount(stage, container);

  expect(bounds()?.width).toBe(320);
  expect(observe).not.toHaveBeenCalled();
  disposals.pop()!();
  expect(cancelFrame).toHaveBeenCalledWith(7);
});

test("waits for element refs and disconnects when they change or unmount", () => {
  const [stage, setStage] = createSignal<HTMLElement>();
  const [container, setContainer] = createSignal<HTMLElement>();
  const bounds = createRoot((dispose) => {
    disposals.push(dispose);
    return createBoardBounds(stage, container);
  });
  expect(bounds()).toBeUndefined();
  expect(observe).not.toHaveBeenCalled();

  setStage(element(() => rect(320, 320)));
  expect(observe).not.toHaveBeenCalled();
  setContainer(element(() => rect(320, 320)));
  expect(observe).toHaveBeenCalledTimes(1);

  const replacement = element(() => rect(640, 640));
  setStage(replacement);
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(cancelFrame).toHaveBeenCalledTimes(1);
  expect(observe).toHaveBeenLastCalledWith(replacement);

  disposals.pop()!();
  expect(disconnect).toHaveBeenCalledTimes(2);
  expect(cancelFrame).toHaveBeenCalledTimes(2);
});
