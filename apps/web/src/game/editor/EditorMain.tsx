import { GameProvider } from "../provider/GameProvider.tsx";
import EditorShell from "./EditorShell.tsx";

export default function EditorMain() {
  return (
    <GameProvider mode="editor">
      <EditorShell />
    </GameProvider>
  );
}
