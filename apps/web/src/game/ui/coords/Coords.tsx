import { BoardCoords } from "@osc/board-solid";
import { createMemo } from "solid-js";
import { useGameSession } from "../../session/useGameSession.ts";

export default function Coords() {
  const session = useGameSession();
  const snapshot = createMemo(() => session.getSnapshot());

  return (
    <BoardCoords
      orientation={snapshot().orientation}
      show={snapshot().coordinates}
    />
  );
}
