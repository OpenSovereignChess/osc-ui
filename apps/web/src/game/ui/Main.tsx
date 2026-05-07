import { GameProvider } from "../logic/provider/GameProvider.tsx";
import Container from "./container/Container.tsx";

export default function Main() {
  return (
    <GameProvider>
      <Container />
    </GameProvider>
  );
}
