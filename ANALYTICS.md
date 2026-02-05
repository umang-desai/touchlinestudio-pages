# Touchline Studio Website Analytics

This site uses a privacy-safe event model in `assets/site.js`.

## Principles
- No personal identifiers are collected.
- No free-text field contents are sent.
- Only coarse interaction metadata is tracked.
- Events are sent only if a provider exists (`dataLayer`, `gtag`, or `plausible`).

## Event Transport
Each event emits to all available channels:
- `window.dataLayer.push({ event: "touchline_event", ...payload })`
- `window.gtag("event", event_name, payload)`
- `window.plausible(event_name, { props: payload })`
- `window.dispatchEvent(new CustomEvent("touchline:analytics", { detail: payload }))`

## Common Payload Fields
All events include:
- `event_name`
- `page` (`home`, `support`, `privacy`, `404`, etc.)
- `path`
- `ab_test` (`hero_v1` on homepage, otherwise `none`)
- `ab_variant` (`a` or `b` on homepage, otherwise `none`)
- `ab_source` (`query`, `storage`, `generated`, `generated_ephemeral`, or `none`)

## Event Catalog
- `ab_variant_assigned`
  - Props: `variant`, `source`
- `page_view`
- `click`
  - Props: `id` (from `data-track`), `tag`
- `section_view`
  - Props: `section` (from `data-track-view`)
- `mobile_menu`
  - Props: `state` (`open` | `closed`)
- `sticky_download_impression`
  - Props: `placement` (`mobile_bottom`)
- `tab_select`
  - Props: `tab` (`iphone` | `ipad` | `watch`)
- `screenshot_open`
  - Props: `shot` (1-based index)
- `screenshot_close`
- `screenshot_prev`
  - Props: `shot`
- `screenshot_next`
  - Props: `shot`
- `faq_toggle`
  - Props: `group`, `item`, `state`
- `faq_search`
  - Props: `group`, `query_bucket` (`empty` | `short` | `medium` | `long`), `results`
- `support_email_draft`
  - Props: `topic`, `urgency`

## A/B Test: `hero_v1`
Homepage copy supports two variants:
- Variant `a`: control copy
- Variant `b`: alternate conversion-oriented copy

Assignment logic:
1. Query override: `?ab=a` or `?ab=b`
2. Persisted value in `localStorage` key `tls_ab_hero_v1`
3. Random 50/50 assignment persisted when possible

Copy targets are elements with both `data-ab-a` and `data-ab-b` attributes.

## How to Add New Tracked Clicks
1. Add `data-track="your_click_id"` to the clickable element.
2. Keep IDs short and stable (snake_case style).
3. Avoid embedding user-generated values in IDs.

## Local Debugging Snippet
Run this in browser console to inspect emitted events:

```js
window.addEventListener("touchline:analytics", (event) => {
  console.log("touchline analytics", event.detail);
});
```
