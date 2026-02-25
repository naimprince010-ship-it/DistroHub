/**
 * Chat message list that only auto-scrolls to bottom when the user is already
 * near the bottom. If the user scrolls up to read older messages, new messages
 * won't force them back down — best UX for story/character chat.
 *
 * Use: wrap your list of message elements in this component.
 * Copy this file to narrative engine / multiverse Character Chat and use
 * the same ref + scroll logic there.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const NEAR_BOTTOM_PX = 80;

export interface ScrollAwareChatListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** When this changes (e.g. messages array length), we decide whether to scroll */
  scrollTrigger?: unknown;
  /** Set true when the current user just sent a message — then we always scroll to bottom */
  userJustSent?: boolean;
}

const ScrollAwareChatList = React.forwardRef<
  HTMLDivElement,
  ScrollAwareChatListProps
>(
  (
    {
      className,
      children,
      scrollTrigger,
      userJustSent = false,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const wasNearBottom = React.useRef(true);
    const prevTrigger = React.useRef(scrollTrigger);

    const setRefs = React.useCallback(
      (el: HTMLDivElement | null) => {
        innerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      },
      [ref]
    );

    const handleScroll = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      wasNearBottom.current =
        scrollTop + clientHeight >= scrollHeight - NEAR_BOTTOM_PX;
    }, []);

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      const shouldScroll =
        userJustSent ||
        wasNearBottom.current ||
        prevTrigger.current === undefined;

      if (shouldScroll) {
        el.scrollTop = el.scrollHeight;
      }
      prevTrigger.current = scrollTrigger;
    }, [scrollTrigger, userJustSent]);

    return (
      <div
        ref={setRefs}
        className={cn("overflow-y-auto overflow-x-hidden", className)}
        onScroll={handleScroll}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollAwareChatList.displayName = "ScrollAwareChatList";

export { ScrollAwareChatList, NEAR_BOTTOM_PX };
