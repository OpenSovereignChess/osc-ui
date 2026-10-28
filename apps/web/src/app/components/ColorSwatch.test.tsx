import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";
import ColorSwatch from "./ColorSwatch.tsx";

test("renders a solid swatch with a full name and keyboard focus", () => {
  const html = renderToString(() => <ColorSwatch color="violet" />);

  expect(html).toContain('aria-label="Violet"');
  expect(html).toContain('role="img"');
  expect(html).toContain('tabindex="0"');
  expect(html).toContain(">VT</span>");
  expect(html).toContain("--swatch-bg:#882E72");
  expect(html).not.toContain("data-pattern");
  expect(html).not.toContain('role="tooltip"');
});

test.each([true, false])("exposes editor selection state (%s)", (selected) => {
  const html = renderToString(() => (
    <ColorSwatch color="red" selected={selected} onClick={() => {}} />
  ));

  expect(html).toContain("<button");
  expect(html).toContain('type="button"');
  expect(html).toContain('role="tab"');
  expect(html).toContain(`aria-selected="${selected}"`);
});
