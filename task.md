# Project Tasks & Active State

## Completed Deliverables
- [x] **Resolved "Reply Null" Leaks in Conversations & Reply Lists**:
  - Updated [`messageUtils.ts`](file:///c:/Users/Administrator/Documents/String/src/lib/messageUtils.ts) and [`src/components/messages/messageUtils.ts`](file:///c:/Users/Administrator/Documents/String/src/components/messages/messageUtils.ts) so that `extractCleanSnippet` and `formatLastMessage` gracefully strip any unparsed `[REPLY:...]` tags, prevent `"null"`, `"undefined"`, or empty snippets from ever reaching conversation previews, reply quotes, or chat items, and fallback cleanly to `"Message"`.
  - Cleaned reply preview bars in [`CustomerMessages.tsx`](file:///c:/Users/Administrator/Documents/String/src/pages/customer/CustomerMessages.tsx) and [`BusinessMessages.tsx`](file:///c:/Users/Administrator/Documents/String/src/pages/business/BusinessMessages.tsx).
- [x] **Full In-App Immersive Image Viewer (No Storage URLs)**:
  - Removed all external bucket links and `<ExternalLink />` redirects.
  - Built full-screen in-app image viewer modal in [`ChatMessageBubble.tsx`](file:///c:/Users/Administrator/Documents/String/src/components/messages/ChatMessageBubble.tsx) without navigation bars or header clutter.
  - Added clean top toolbar with Close button and a prominent 3-dots action menu (**Reply, Forward, Copy Image, Delete**).
  - Added floating bottom action pills for 1-tap **Reply**, **Forward**, and **Copy Image**.
- [x] **Visible 3-Dots Button Styling**:
  - Changed message bubble 3-dots trigger button from hidden/hover-only (`opacity-0`) to always visibly accessible on both mobile and desktop with a sleek glassmorphic pill style.
- [x] **Verification**:
  - `tsc --noEmit`: Passed with **0 errors**.
