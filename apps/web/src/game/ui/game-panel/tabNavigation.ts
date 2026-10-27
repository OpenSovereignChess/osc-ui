export function tabIndexForKey(
  key: string,
  currentIndex: number,
  tabCount: number,
): number | undefined {
  if (tabCount === 0) return undefined;

  switch (key) {
    case "ArrowRight":
      return (currentIndex + 1) % tabCount;
    case "ArrowLeft":
      return (currentIndex + tabCount - 1) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return undefined;
  }
}
