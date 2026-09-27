import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";

import Button from "./Button.tsx";

test("renders a native button by default", () => {
  const html = renderToString(() => <Button>Press</Button>);

  expect(html).toContain("<button");
  expect(html).toContain('type="button"');
  expect(html).toContain("osc-button");
  expect(html).toContain("Press");
});

test("renders links when href is provided", () => {
  const html = renderToString(() => (
    <Button href="/play" variant="primary">
      Play
    </Button>
  ));

  expect(html).toContain("<a");
  expect(html).toContain('href="/play"');
  expect(html).toContain("osc-button--primary");
});

test("passes through attributes and disables link-style buttons", () => {
  const html = renderToString(() => (
    <Button class="extra" disabled href="/soon" aria-label="Soon">
      Soon
    </Button>
  ));

  expect(html).toContain('aria-label="Soon"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('tabindex="-1"');
  expect(html).not.toContain('href="/soon"');
  expect(html).toContain("extra");
});
