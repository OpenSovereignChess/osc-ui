import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";
import PromotionPicker from "./PromotionPicker.tsx";

const request = {
  dest: "h9",
  piece: { color: "cyan", role: "pawn" },
  roles: ["queen", "king"],
} as const;
const bounds = { width: 320, height: 320 } as DOMRectReadOnly;
const onPromote = () => {};

test("renders only the offered roles with the promoting piece's color", () => {
  const html = renderToString(() => (
    <PromotionPicker
      request={request}
      bounds={bounds}
      orientation="white"
      onPromote={onPromote}
    />
  ));

  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-label="Choose promotion piece"');
  expect(html).toContain('aria-label="Promote to queen"');
  expect(html).toContain('aria-label="Promote to king"');
  expect(html).not.toContain('aria-label="Promote to knight"');
  expect(html).toContain('class="promotion-piece piece queen cyan"');
  expect(html).toContain("--promotion-square-size:20px");
  expect(html).toContain("left:130px");
  expect(html).toContain("top:140px");
});

test.each([
  ["a16", "white", 0, 0],
  ["p1", "white", 280, 300],
  ["a16", "black", 280, 300],
  ["p1", "black", 0, 0],
] as const)(
  "clamps the picker at %s with %s orientation",
  (dest, orientation, left, top) => {
    const html = renderToString(() => (
      <PromotionPicker
        request={{ ...request, dest }}
        bounds={bounds}
        orientation={orientation}
        onPromote={onPromote}
      />
    ));

    expect(html).toContain(`left:${left}px`);
    expect(html).toContain(`top:${top}px`);
  },
);

test("does not render until both a request and board bounds are available", () => {
  for (const props of [{ request }, { bounds }]) {
    const html = renderToString(() => (
      <PromotionPicker {...props} orientation="white" onPromote={onPromote} />
    ));
    expect(html).not.toContain('role="dialog"');
  }
});
