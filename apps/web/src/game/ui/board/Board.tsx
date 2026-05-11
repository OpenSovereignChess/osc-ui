import { type Setter, createMemo } from "solid-js";
import { BoardView } from "@osc/board-solid";
import { useGameContext } from "../../logic/provider/useGameContext.ts";
import * as types from "../../logic/types.ts";

type BoardProps = {
  bounds?: DOMRectReadOnly;
  ref: Setter<HTMLElement | undefined>;
};

export default function Board(props: BoardProps) {
  const { state } = useGameContext();
  const pieces = createMemo<types.Pieces>(() => state.pieces);

  return (
    <BoardView
      boardRef={props.ref}
      bounds={props.bounds}
      fallback={<div>Loading...</div>}
      orientation={state.orientation}
      pieces={pieces()}
      selectedKey={state.selected}
    />
  );
}
