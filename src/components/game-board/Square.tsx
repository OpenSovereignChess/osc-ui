type SquareProps = {
  index: number;
  size: number;
};

export default function Square(props: SquareProps) {
  console.log("===Square", props.index, props.size, (props.index % 16));
  return (
    <div
      class="square absolute top-0 left-0"
      style={{
        "background-color": "beige",
        "height": `${props.size}px`,
        "width": `${props.size}px`,
        "translate": `${(props.index % 16) * props.size}px ${Math.floor(props.index / 16) * props.size}px`,
      }}
    >
      Sq {props.index}
    </div>
  );
}
