# Chat components

## ScrollAwareChatList

**Problem:** When the user scrolls up to read older messages, new messages were auto-scrolling them back to the bottom.

**Solution:** Only auto-scroll to bottom when:
- The user is already near the bottom (within 80px), or
- The message list was empty (first load), or
- The current user just sent a message.

### Usage (in this app)

```tsx
import { ScrollAwareChatList } from "@/components/chat/ScrollAwareChatList";

<ScrollAwareChatList
  className="h-[300px] rounded border p-2"
  scrollTrigger={messages.length}
  userJustSent={lastMessageIsFromMe}
>
  {messages.map((m) => (
    <div key={m.id}>{m.text}</div>
  ))}
</ScrollAwareChatList>
```

### Using in Narrative Engine / Multiverse Character Chat

1. Copy `ScrollAwareChatList.tsx` into the narrative engine repo (e.g. `components/multiverse/ScrollAwareChatList.tsx`).
2. Find the Character Chat component — the div that wraps the message list and has `overflow-y-auto` or similar.
3. Replace that wrapper with `ScrollAwareChatList`, and pass:
   - `scrollTrigger={messages.length}` (or `messages` so it updates when messages change)
   - `userJustSent={true}` right after the current user sends (e.g. from a send handler or a one-shot state that you set on send and clear after the effect runs).
4. Ensure the scrollable element is the one that gets the ref (single scrollable container with the ref and onScroll).

No more auto-scroll when you’re reading above.
