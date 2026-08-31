# Walkthrough copy

Every word the guided tours say, in English and Bengali.

```
walkthrough/
  walkthrough.xsd     what a copy file may contain
  demo/tour.xml       the demo tour, English
  demo/bn.xml         the demo tour, Bengali
  trial/tour.xml      the trial tour, English
  trial/bn.xml        the trial tour, Bengali
```

## The split

Words live here. Behaviour lives in `src/lib/walkthrough/tours.ts`.

That line is drawn where it is because the two are edited by different people
for different reasons. Rewording a step is a judgement about the sentence;
deciding that a step rings `po-create` and waits for a click is a judgement
about the screen, and it has to be read next to the `data-tour` attribute it
names or it goes stale silently.

So `tours.ts` keeps the structure - the missions, their order, which control
each beat points at, which page it lives on, whether it waits for a click - and
carries no prose at all. These files carry nothing but prose. They are joined
by id and key: mission `purchase` plus step `create` is the step `purchase.create`.

## Editing

Open the files, or run the dev server and use **Walkthrough copy**, at the foot
of the admin sidebar under *My Profile*. It shows both languages of every step
side by side and writes these same files when you press save.

That link, like the route behind it, only exists outside a production build -
the check is `process.env.NODE_ENV`, which Next inlines, so the link is not in
the production bundle at all rather than merely hidden in it.

Either way the result is a diff. **Git is the source of truth**: there is no
copy in a database anywhere, nothing to export, and no way for a production
instance to have different words from the ones in the repository. The studio
route returns 404 in a production build for exactly that reason.

Then commit the XML *and* the generated module (see below) together.

## Compiling

```bash
npm run walkthrough:copy
```

Reads the four files, checks them against each other, and writes
`src/lib/walkthrough/copy.generated.ts`. `npm run dev` and `npm run build` both
run it first, so a checkout is never a compile behind its own files.

It is a compiler, not a merge - the files go in, the module comes out whole.
Editing the generated module is pointless: the next run overwrites it.

The compiler refuses, and writes nothing, when:

- a step is in one language but not the other,
- a title or body is empty in either language,
- two missions or two steps share a key,
- a file's `kind` or `language` attribute disagrees with where it lives.

A missing Bengali step is a refusal rather than a fallback to the English. A
fallback would ship, look right to everybody who reviews it in English, and be
found by a Bengali-speaking restaurant.

## Adding a step

Add the beat to `tours.ts` first - it is the beat that decides a step exists -
then add a `<step>` with the same key to all four files. The tour throws on load
if a beat has no copy, which is loud on purpose: the alternative is a card that
renders blank and looks like a rendering fault.

## Keys are permanent

A step key is written into every progress record, so somebody halfway through
the tour is remembered by it. Renaming one does not lose the copy, it loses
their place - they resume at the beginning. Reword freely; rename almost never.
