# Toolnest UI DNA

A toolbox built for developers. The interface should feel like a precision tool — quiet, fast, trustworthy. Never marketing-page energy. Never AI-generated maximalism.

## Voice

- Direct, lowercase-leaning, no exclamation marks. "Format" not "Format your data!"
- One verb per CTA. "Generate", "Copy", "Decode" — never "Click here to generate now"
- Status messages are a sentence fragment in `text-muted-foreground`. No icons stacked next to micro-copy.
- No emoji. No "✨". No generic taglines like "All-in-one" in body copy.
- Vietnamese is welcome where natural; do not translate every English term.

## Design tokens

- One brand hue (teal, ~173° hue). Used at most twice per screen as a real signal: the active nav item and one piece of confirmed-state feedback. Never as decoration.
- Neutral palette is the primary surface. Background, foreground, muted, border — that is the visible vocabulary 95% of the time.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px. Vertical rhythm uses 8px base; section breaks use 24–32px.
- Radius scale: `sm` (controls, chips), `md` (cards, panels). No fully rounded "pill" containers larger than a tag. Avoid stacking different radii in one component.
- Typography: one sans (UI), one mono (data, code, output). Three weights max: 400, 500, 600. No bold + italic + color all on the same line.
- Type ramp: 12 / 14 / 16 / 20 / 30. h1 is 24–30px and appears once per page.

## Surface and depth

- Border before shadow. Default depth is a 1px border on `--border`. Reach for shadow only when an element actually floats (popover, dialog, dropdown).
- Cards are flat: 1px border, optional `bg-card`, no shadow.
- No nested rounded boxes. A bordered card inside a bordered card means the outer container is wrong.
- No gradients on UI surfaces. Gradients are reserved for a single, contained accent area (hero), never on cards or buttons.
- No glow, no blur halos behind content blocks, no decorative blurred orbs. If a designer would call it "atmospheric", remove it.

## Layout

- Container max width 1120–1280px. Tools sit in a single column or a 2-column input/output split at `lg:`.
- Grids of cards stop at 3 columns. 4-column grids feel like a marketplace, not a tool.
- White space is the layout. Resist filling empty regions with badges, illustrations, or "decorative" elements.
- Sidebar nav stays visible at `lg:` and above; below that, a drawer triggered from the header. Bottom navs are out of scope.

## Components

- Buttons: solid for the single primary action, outline for secondary, ghost for tertiary. Never two solid buttons side by side.
- Inputs and textareas share the same border, radius, focus ring. No "fancy" search inputs with gradients or extra-large rounded ends.
- Segmented controls are the canonical multi-choice control — `role="group"`, `aria-pressed`, consistent height with buttons.
- Checkboxes use the project's `Checkbox` component, never raw `<input type="checkbox">`. Same for selects when they appear.
- Empty states are one line of muted text inside the component's natural container. No giant illustration, no "Get started" button.
- Code, hashes, ids, and tool output are mono. Labels are sans.

## Interaction & motion

- Transition only `colors`, `border-color`, `background-color`, `transform`. Never `all`.
- Duration ≤ 150ms for state changes; 200ms for entering/leaving popovers. No spring physics, no layout transitions.
- Hover lifts are off by default. Only the homepage featured cards get a subtle 1–2px Y translate; everything else changes color, not position.
- Focus ring is a 2px ring in brand hue. Always visible on keyboard focus.
- No looped animations on idle UI (no pulsing dots, no shimmer placeholders unless something is genuinely loading).

## Accessibility

- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for UI controls. Muted text passes AA against its actual background.
- Every interactive element is reachable by keyboard and announces its role. Toggles use `aria-pressed`. Drawers use `role="dialog"` + `aria-modal`.
- Touch targets ≥ 36px height; primary actions ≥ 40px.
- Icon-only buttons carry an `aria-label`. Decorative icons use `aria-hidden`.

## Anti-patterns (what an "AI look" introduces — avoid)

- Gradient hero blocks with blurred glowing orbs
- Sparkle/star icons next to product names
- Pill-shaped badges advertising "100% local" / "AI-powered" / "free forever" stacked in a row
- Cards with both a colored accent bar and a tinted icon box and a hover lift and a shadow
- "Just works", "magical", "delightful" copy
- Emoji-as-feature-list ("⚡ Fast · 🔒 Private")
- Decorative gradients on category labels
- Multi-color illustrations to fill empty grid cells
- Centered hero CTAs with two side-by-side primary buttons
- Drop shadows under flat content cards
- Rounded-2xl wrappers around already-rounded children
- Tagline > headline (the tool name should win the visual hierarchy on its own page)
- Auto-applied glassmorphism (`backdrop-blur` on every panel)

## Pruning rules

- If a screen has more than one accent color in use, remove the weakest.
- If a card has more than two of: border, shadow, accent bar, hover lift, icon box — drop one.
- If a label appears in two casings on the same screen, unify to sentence case.
- If a number can be inferred from the rest of the page, do not show it as a chip.

When in doubt: remove, don't add.
