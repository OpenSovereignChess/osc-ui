type SquareProps = {
  index: number;
};

export default function Square({ index }: SquareProps) {
  return <div style="background-color: beige">Square {index}</div>;
}
