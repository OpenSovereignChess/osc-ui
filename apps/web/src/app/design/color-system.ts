export type SovereignColorId =
  | "white"
  | "ash"
  | "slate"
  | "black"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "navy"
  | "violet";

export type SovereignOwner = "Player 1" | "Player 2" | "Neutral";
export type SwatchPattern =
  | "solid"
  | "grid"
  | "vertical"
  | "cross"
  | "dots"
  | "diagonal"
  | "reverse-diagonal"
  | "rings"
  | "bricks"
  | "checker"
  | "chevron"
  | "plus";

export interface SovereignColorSpec {
  readonly id: SovereignColorId;
  readonly label: string;
  readonly code: string;
  readonly fill: string;
  readonly pattern: SwatchPattern;
  readonly owner: SovereignOwner;
}

export const sovereignColorSpecs = [
  {
    id: "white",
    label: "White",
    code: "WT",
    fill: "#FFFFFF",
    pattern: "solid",
    owner: "Player 1",
  },
  {
    id: "ash",
    label: "Ash",
    code: "AS",
    fill: "#C7C9C8",
    pattern: "grid",
    owner: "Neutral",
  },
  {
    id: "slate",
    label: "Slate",
    code: "SL",
    fill: "#586E75",
    pattern: "vertical",
    owner: "Player 2",
  },
  {
    id: "black",
    label: "Black",
    code: "BK",
    fill: "#121212",
    pattern: "cross",
    owner: "Player 2",
  },
  {
    id: "pink",
    label: "Pink",
    code: "PK",
    fill: "#FFAFD2",
    pattern: "dots",
    owner: "Neutral",
  },
  {
    id: "red",
    label: "Red",
    code: "RD",
    fill: "#DC050C",
    pattern: "diagonal",
    owner: "Player 1",
  },
  {
    id: "orange",
    label: "Orange",
    code: "OR",
    fill: "#F4A736",
    pattern: "reverse-diagonal",
    owner: "Neutral",
  },
  {
    id: "yellow",
    label: "Yellow",
    code: "YW",
    fill: "#F7F056",
    pattern: "rings",
    owner: "Neutral",
  },
  {
    id: "green",
    label: "Green",
    code: "GN",
    fill: "#4EB265",
    pattern: "bricks",
    owner: "Neutral",
  },
  {
    id: "cyan",
    label: "Cyan",
    code: "CY",
    fill: "#7BAFDE",
    pattern: "checker",
    owner: "Neutral",
  },
  {
    id: "navy",
    label: "Navy",
    code: "NV",
    fill: "#1965B0",
    pattern: "chevron",
    owner: "Player 2",
  },
  {
    id: "violet",
    label: "Violet",
    code: "VT",
    fill: "#882E72",
    pattern: "plus",
    owner: "Player 1",
  },
] as const satisfies readonly SovereignColorSpec[];

export const sovereignColorById = Object.fromEntries(
  sovereignColorSpecs.map((spec) => [spec.id, spec]),
) as Record<SovereignColorId, SovereignColorSpec>;

export function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((part) => parseInt(part, 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4),
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function swatchForeground(fill: string): "#1C1B1A" | "#FFFFFF" {
  const surfaceLuminance = luminance(fill);
  const darkContrast = (surfaceLuminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (surfaceLuminance + 0.05);
  return darkContrast >= lightContrast ? "#1C1B1A" : "#FFFFFF";
}

export function swatchBorder(fill: string): "#1C1B1A" | "#FFFFFF" {
  return swatchForeground(fill);
}

export function swatchStyle(spec: SovereignColorSpec): Record<string, string> {
  return {
    "--swatch-bg": spec.fill,
    "--swatch-fg": swatchForeground(spec.fill),
    "--swatch-border": swatchBorder(spec.fill),
  };
}

export function swatchStyleAttribute(spec: SovereignColorSpec): string {
  const style = swatchStyle(spec);
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
