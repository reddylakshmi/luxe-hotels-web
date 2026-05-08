# Account flow — screenshot demos

Walk-through of the signed-in flow at desktop width (1280px), captured
via Chrome headless against the federated stack. Sophia Chen
(`guest-001`) is the demo account used throughout.

| # | File | What it shows |
|---|---|---|
| 01 | [01-sign-in.png](01-sign-in.png) | `/sign-in` — editorial sign-in form |
| 02 | [02-trips.png](02-trips.png) | `/trips` — three reservations on Sophia's account (Tokyo · Paris · London) |
| 03 | [03-account-display.png](03-account-display.png) | `/account` — read-only display: profile · addresses · payment methods · recent trips |
| 04 | [04-account-edit-mode.png](04-account-edit-mode.png) | `/account` — Profile edit form open + Add-card form open simultaneously |
| 05 | [05-address-add-form.png](05-address-add-form.png) | `/account` — Add-address form expanded with existing rows still visible |
| 06 | [06-address-edit-form.png](06-address-edit-form.png) | `/account` — Edit-address form swapped in for the WORK row, all fields prefilled |
| 07 | [07-address-after-edit.png](07-address-after-edit.png) | `/account` — after editing WORK's `line1` to `100 California St`, only the changed field updated, all other fields preserved |
| 08 | [08-address-after-add.png](08-address-after-add.png) | `/account` — after adding a new BILLING address with `Set as primary` checked: BILLING is primary, HOME demoted (now shows `Set as primary` action) |
| 09 | [09-address-after-remove.png](09-address-after-remove.png) | `/account` — after removing the WORK address: count drops to "1 on file", HOME stays primary |

Each round-trip exercises the full federated stack:

```
browser → Next.js Server Action → federated router (:4000)
       → guest subgraph mutation → in-memory data source
       → revalidatePath('/account') → re-fetch → DOM rerender
```

Captured against:
- `luxe-hotels-graphqlwithJava` Apollo Federation router + 10 subgraphs
- `luxe-hotels-web` Next.js 14 (App Router, RSC, Server Actions)

The capture harness lives in `/tmp/luxe-cdp-*.mjs` during a session and
isn't checked in — it forges Sophia's session cookie and drives Chrome
via the DevTools Protocol over Node 24's built-in WebSocket.
