import { splitProps, type JSX, type ParentProps } from "solid-js";

import "./Button.css";

type ButtonVariant = "secondary" | "primary" | "ghost";
type ButtonSize = "sm" | "md";

type CommonButtonProps = ParentProps<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  disabled?: boolean;
}>;

type AnchorButtonProps = CommonButtonProps &
  Omit<
    JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
    "class" | "classList" | "href"
  > & {
    href: string;
  };

type NativeButtonProps = CommonButtonProps &
  Omit<
    JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    "class" | "classList" | "disabled"
  > & {
    href?: undefined;
  };

export type ButtonProps = AnchorButtonProps | NativeButtonProps;

export default function Button(props: ButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "icon",
    "class",
    "classList",
    "disabled",
    "href",
    "children",
    "aria-disabled",
    "type",
  ]);

  const variant = () => local.variant ?? "secondary";
  const size = () => local.size ?? "md";
  const disabled = () =>
    Boolean(
      local.disabled ||
      local["aria-disabled"] === true ||
      local["aria-disabled"] === "true",
    );
  const buttonClass = () =>
    [
      "osc-button",
      variant() !== "secondary" ? `osc-button--${variant()}` : undefined,
      size() !== "md" ? `osc-button--${size()}` : undefined,
      local.icon ? "osc-button--icon" : undefined,
      local.class,
    ]
      .filter(Boolean)
      .join(" ");
  const buttonClassList = () => ({
    ...(local.classList ?? {}),
    "osc-button--disabled": disabled(),
  });

  if (local.href !== undefined) {
    return (
      <a
        {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}
        aria-disabled={disabled() ? "true" : local["aria-disabled"]}
        class={buttonClass()}
        classList={buttonClassList()}
        href={disabled() ? undefined : local.href}
        tabindex={disabled() ? -1 : rest.tabindex}
      >
        {local.children}
      </a>
    );
  }

  return (
    <button
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
      class={buttonClass()}
      classList={buttonClassList()}
      disabled={disabled()}
      type={
        (local.type as JSX.ButtonHTMLAttributes<HTMLButtonElement>["type"]) ??
        "button"
      }
    >
      {local.children}
    </button>
  );
}
