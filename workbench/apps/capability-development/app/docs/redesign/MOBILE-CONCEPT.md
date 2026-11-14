# The mobile: concept

Status: built on `redesign/personal-shell` and described here as built. Sections marked
**open** are questions for the owner, not decisions.

## The idea

A hanging mobile is a small physical argument: many separate things, held in balance, that
answer to the air and to what is hung on them — and to nothing else. That is the stance this
application takes towards a person's development, so the mobile is its one personal object.

It is yours on the first visit and complete as it is. It does not grow, level up, wilt, or
have moods. What changes it is what would change a real one: you turn it, you hang something on
it, the light in the room moves through the day.

![](mobile-3d.png)

## The journey (current direction, 14 November, evening)

The owner redirected the mobile from a quiet companion to the main screen: **your alter ego as a
skill tree**. This section describes what is built for that. It supersedes the earlier rule that
the mobile "does not grow with competence", and it departs from the repository's research in
three places, listed at the end.

![](mobile-tree.png)

**1. Nobody starts from nothing.** `Begin` asks what you are building towards and where you
already stand on its skills, in your own judgement (not yet · with help · I can do this · I do
this regularly). The first version of the mobile is built from the answers at once.

![](begin.png)

**2. A placement is a statement, not evidence.** This is the mechanic that keeps the tree
honest. What you say primes a piece; only what you record paints it. The two never merge, and a
placement credits no practice experience.

| Made as | Means exactly | Comes from |
|---|---|---|
| Wire outline | Nothing said, nothing recorded — a piece you could add | — |
| Firm outline in the branch colour | The same, and part of your target | Your target |
| Primed, unpainted | You placed yourself on it; no records yet | Your placement |
| Painted | Applied in writing to a real situation | Records |
| One engraved line | Rehearsed and reflected on | Records |
| Two lines and a pierced hole | Tried for real, once | Records |
| An inlaid ring | Tried for real more than once | Records |
| A second, smaller pendant | Tried in more than one setting | Records |

Detail accumulates and is never removed. Size and colour do not change with it.

**3. A target constellation.** Three drafts, each cutting across branches: *Leading a group to a
decision*, *Working well with AI*, *Future skills (a draft)*. Choosing one brings its pieces
forward and draws the ones you lack as firm outlines. Switching loses nothing.

**4. Time: seasons, and a road.** One branch is active at a time, for a chosen number of weeks,
with a date to look back on. Past that date a season is "due a look", never late. The road shows
*Now* (the season), *Next* (what you queued, then where your target is still open) and *Towards*
(the target and how much of it is practised). Closing a season records what it left you with.

**5. A piece is a door.** Selecting one opens its card: what it looks like in practice, where
you place yourself, its dated history in your own words, and one action — *Start this* or
*Practise this again* — which opens the plan with that skill already linked.

![](mobile-tree-card.png)

**Vocabulary.** Twenty-four skills on seven branches. Twelve were in the app (leadership,
collaboration). Six come from the repository's "AI Skills in the Wild" scenario catalogue and six
from the "Startkarte für OE-Praxis" in the skills research report, translated. All are
provisional authored maps. "Future skills" is a target composed from these, because the research
names future-skills frameworks without listing their contents and the product concept rules out
a universal catalogue.

**Why it should work on people** — hypotheses, none tested here. Building something from your own
answers creates ownership and opens with strengths. A shared vocabulary gives words for what you
already do. A chosen, visible target pulls harder than an abstract goal, and because you chose it
the gap reads as a direction, not a deficit. An unfinished shape invites completion. A season
makes "now" small enough to act on. Nothing is ever lost, so there is nothing to be anxious about
returning to.

**Departures from the repository's research, taken deliberately.**
- *Alter ego first.* The research decision was a companion beside you, with "represents me"
  tested separately.
- *Richer reads as more capable.* The research called this its strongest objection. The tree
  accepts it, so each visual step is tied to one checkable fact about the records.
- *A shared vocabulary to place yourself against.* Consistent with "no universal taxonomy" only
  while placement is private self-assessment and vocabularies stay swappable content packs.
  There is no employer view and nothing is inferred.

**Still open.** No XP on the main screen (it would turn the tree into a score). Seasons do not
yet change what Practice suggests. The five-sheet personal mobile and its chosen memories still
exist under Settings and as the side-rail mark; whether memories move onto skill pieces is
undecided. The target lists and the branch structure need a real standard to be tried against.

## Grammar

| Element | What it is | Rule |
|---|---|---|
| Thread | A line something hangs from | Everything turns freely about its own thread |
| Arm | A bowed wire | Hung off-centre by the lever rule: the heavier side gets the shorter reach |
| Hoop | A horizontal ring on three lines | Carries a fuller group in a ring, at staggered lengths |
| Sheet | A flat piece of painted metal | Six forms: disc, ring, leaf, crescent, bar, drop. Matte, never glossy |
| Bead and inlay | A mark on a sheet and its thread | The only way a sheet shows it carries something. Form, not colour |
| Palette | Wire plus three tones | Four curated sets; tone and form together tell groups apart |

One structure description (`src/mobile/catalogue.ts`), one geometry function
(`src/mobile/scene.ts`), one painter (`src/ui/mobile/Mobile.tsx`). It is drawn as SVG from a real
three-dimensional model — perspective, depth order, shading by how each sheet faces the light,
a shadow on the wall behind — with no WebGL and no added dependency.

## What it answers to

| It answers to | How | Why this is allowed |
|---|---|---|
| Your hand | Drag or the labelled **Turn it** button. A push eases out; sheets lag on their threads and swing back | Direct manipulation |
| Your pointer | Leans slightly towards a mouse | Presence, not data |
| What you hang on it | The bead slides down the thread, that sheet hangs a little lower, the arms above tip towards it | Your choice, one sheet at a time, reversible |
| Something being saved nearby | A small stir | It carries no information about what was saved |
| Arriving on screen | Settles into its pose | |
| The hour | Light from the left in the morning, from the right by evening; the shadow follows. The light on the wall is clear in the morning, warm towards evening, low at night | The local clock, nothing about you |
| Where it is shown | Hero on a first visit, companion on Home, a still mark in the side rail, a small witness when a reflection is saved, a wide map on Repertoire | Same object, different distance |
| Reduced motion | Rests in its authored pose. A drag follows the hand without coasting, the button steps it round, a new memory is simply there | |

## Setting and staging

It hangs somewhere. A fixing at the top, a pool of light on the wall behind it, and its shadow
falling on that wall are what make it an object in a room and not a picture on a page. Small
made-object details carry the same weight: a loop bent into the wire wherever a thread is tied,
a bead where a memory sits.

On a wide Home it hangs from the top edge of the page, so the thread reads as coming from the
ceiling. It is lowered in when it arrives, then left to settle. Its controls stay quiet until
the pointer or the keyboard reaches them.

![](mobile-stage.png)

## What it never answers to

- How much you have recorded, or how well anything went. The picture for an empty record set
  and a full one is identical until you hang something (unit-tested).
- Time away. Nothing fades, droops or resets.
- Anything inferred about you: no mood, no personality, no streak.
- It never rearranges itself, and never asks to be rearranged after a reflection.
- The picture receives geometry, colours and which sheets are marked — never a title or a line
  of anybody's writing (unit-tested).

## Two scales

**The personal mobile** — five sheets, three authored arrangements (Arc, Cascade, Hoop).
A memory is one of your own attempts, chosen by you.

**The grown mobile** — for a skill set. `growMobile` builds one bough per branch and one sheet
per skill, for any size. A branch of up to three skills is a bow; a fuller one is a hoop. Boughs
are gathered by halving, hung by the lever rule, in two tiers so neighbours pass under each
other. Each branch keeps one sheet form and one tone. It frames itself by measuring, and is seen
from further away as it gets larger so the near side does not loom.

![Thirty skills on five boughs](mobile-30-skills.png)

On Repertoire it draws the installed skill set (twelve skills in five branches today) with a
legend and a labelled list that does everything a click on a sheet does:

![](mobile-skill-map.png)

The thirty-skill case is a live study under Settings → Technical details, with synthetic names,
where the number of branches and skills can be changed.

## Accessibility

- The SVG is hidden from assistive technology and described in one sentence.
- Every action on the picture has a labelled HTML twin: memory buttons, the skill select,
  **Turn it**.
- A mark is a bead and an inlay, never colour alone; branches differ in form as well as tone.
- Motion is off under `prefers-reduced-motion`, and the still picture is the same picture.

## Open

1. **Marks on the skill mobile.** A sheet is marked when your records are linked to that skill,
   and the arms tip towards those. That is a statement of where records sit, the same one the
   list makes in words, and marked sheets are not bigger or brighter. It is still the closest
   this comes to "reflecting what you have done", which the brief ruled out for the personal
   mobile. If that is too close, the skill mobile can show the skill set unmarked and leave the
   records to the list.
2. **Thirty real skills.** The generator is tested to 56 sheets, but only twelve real skills
   exist in the content. Names, branch sizes and reading order should be tried with a real set.
3. **Beyond two levels.** Branch → skill is supported. Branch → sub-branch → skill would need the
   generator to take a tree, which is a small change to its input, not to the grammar.
4. **Sound, haptics, device tilt** — not attempted.
5. **Performance.** It redraws in React every frame while on screen. Fine here at thirty sheets;
   not profiled on a slow phone.
