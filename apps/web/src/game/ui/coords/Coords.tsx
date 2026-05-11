import { BoardCoords } from "@osc/board-solid";
import { useGameContext } from "../../logic/provider/useGameContext.ts";

export default function Coords() {
  const { state } = useGameContext();

  return (
    <BoardCoords orientation={state.orientation} show={state.coordinates} />
  );
}
