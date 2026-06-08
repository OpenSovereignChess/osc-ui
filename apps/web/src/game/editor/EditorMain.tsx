import { GameProvider } from "../provider/GameProvider.tsx";
import EditorShell from "./EditorShell.tsx";

export default function EditorMain() {
  return (
    <GameProvider>
      <EditorShell />
    </GameProvider>
  );
}
