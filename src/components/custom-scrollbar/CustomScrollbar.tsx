import { cn } from "@/common/classNames";
import style from "./CustomScrollbar.module.scss";

import {
  useMutationObserver,
  useResizeObserver,
} from "@/common/useResizeObserver";
import {
  createContext,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { createContextProvider } from "@solid-primitives/context";

interface CustomScrollbarProps {
  scrollElement?: HTMLElement;
  class?: string;
  marginTop?: number;
  marginBottom?: number;
}

export const [CustomScrollbarProvider, useCustomScrollbar] =
  createContextProvider(
    () => {
      const [isVisible, setIsVisible] = createSignal(false);
      const [marginTop, setMarginTop] = createSignal(0);
      const [marginBottom, setMarginBottom] = createSignal(0);

      return {
        marginTop,
        marginBottom,
        setMarginTop,
        setMarginBottom,
        isVisible,
        setIsVisible,
      };
    },
    {
      marginTop: () => 0,
      marginBottom: () => 0,
      setMarginBottom: () => {},
      setMarginTop: () => {},
      isVisible: () => false,
      setIsVisible: () => {},
    }
  );

export const CustomScrollbar = (props: CustomScrollbarProps) => {
  let scrollBarEl: HTMLDivElement | undefined;
  const {
    marginBottom,
    marginTop,
    setMarginBottom,
    setMarginTop,
    isVisible,
    setIsVisible,
  } = useCustomScrollbar();
  setMarginBottom(props.marginBottom || 0);
  setMarginTop(props.marginTop || 0);

  const { height, width } = useResizeObserver(() => props.scrollElement!);
  const [thumbHeight, setThumbHeight] = createSignal(0);
  const [thumbTop, setThumbTop] = createSignal(0);
  const [scrollbarHeight, setScrollbarHeight] = createSignal(0);

  const scrollElement = () => props.scrollElement;

  createEffect(
    on(scrollElement, (el) => {
      el?.addEventListener("scroll", update);
      onCleanup(() => el?.removeEventListener("scroll", update));
    })
  );

  const calculateThumbHeight = () => {
    if (!props.scrollElement) return;
    if (!scrollBarEl) return;

    const scrollbarHeight = scrollBarEl.clientHeight;

    const thumbHeightRatio =
      scrollbarHeight * (height() / props.scrollElement.scrollHeight);

    if (thumbHeightRatio <= 20) return 15;

    return thumbHeightRatio;
  };

  function calculateThumbTopPosition() {
    if (!props.scrollElement) return;
    if (!scrollBarEl) return;

    const viewportHeight = props.scrollElement.clientHeight;
    const contentHeight = props.scrollElement.scrollHeight;
    const scrollbarHeight = scrollBarEl.clientHeight;

    const scrollableDistance = contentHeight - viewportHeight;

    const thumbHeight = (viewportHeight / contentHeight) * scrollbarHeight;

    const scrollPosition = props.scrollElement.scrollTop;
    const thumbTopPosition =
      (scrollPosition / scrollableDistance) * (scrollbarHeight - thumbHeight);

    return thumbTopPosition;
  }

  const update = () => {
    setThumbHeight(calculateThumbHeight() || 0);
    setThumbTop(calculateThumbTopPosition() || 0);
    setScrollbarHeight(scrollBarEl?.scrollHeight || 0);
    setIsVisible(thumbHeight() !== scrollbarHeight());
  };

  const onDomChange = () => {
    update();
  };

  useMutationObserver(() => props.scrollElement!, onDomChange);

  const dimensions = [width, height];
  createEffect(on(dimensions, update));

  return (
    <div
      ref={scrollBarEl}
      class={cn(style.scrollbarContainer, props.class)}
      style={{
        "margin-top": `${marginTop()}px`,
        "margin-bottom": `${marginBottom()}px`,
        visibility: isVisible() ? "visible" : "hidden",
      }}
    >
      <div
        class={style.scrollbarThumb}
        style={{
          height: `${thumbHeight()}px`,
          top: `${thumbTop()}px`,
        }}
      />
    </div>
  );
};