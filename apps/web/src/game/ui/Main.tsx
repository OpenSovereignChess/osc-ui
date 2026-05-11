import { GameProvider } from "../provider/GameProvider.tsx";
import Container from "./container/Container.tsx";

export default function Main() {
  return (
    <GameProvider>
      <Container />
    </GameProvider>
  );
}
