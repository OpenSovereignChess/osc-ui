import { expect, test } from "vitest";
import {
  luminance,
  sovereignColorSpecs,
  swatchBorder,
  swatchForeground,
} from "./color-system.ts";

test.each(sovereignColorSpecs)(
  "$label has a unique code and readable text",
  (spec) => {
    const foreground = luminance(swatchForeground(spec.fill));
    const background = luminance(spec.fill);
    const contrast =
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(swatchBorder(spec.fill)).toBe(swatchForeground(spec.fill));
    expect(
      sovereignColorSpecs.filter((other) => other.code === spec.code),
    ).toHaveLength(1);
    expect(spec).not.toHaveProperty("pattern");
  },
);
