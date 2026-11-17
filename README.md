<div align="center">

<a href="https://techmines.github.io/"><img src="icons/og-card.jpg" alt="Pranav Jangid, TECHMINES" width="640"></a>

# techmines.github.io

**The portfolio of Pranav Jangid (TECHMINES): B.Tech IT at MIT Manipal, BBA in Digital Business & Entrepreneurship at IIM Bangalore. Building software, and the case for it.**

[Live site](https://techmines.github.io/) · [GitHub](https://github.com/TECHMINEs) · [LinkedIn](https://www.linkedin.com/in/pranavjangid)

</div>

---

## Contents

1. [What the site is](#what-the-site-is)
2. [A tour of the page](#a-tour-of-the-page)
3. [The interactive pieces](#the-interactive-pieces)
4. [The five projects](#the-five-projects)
5. [How it is built](#how-it-is-built)
6. [Files](#files)
7. [How the pieces talk to each other](#how-the-pieces-talk-to-each-other)
8. [Accessibility](#accessibility)
9. [Performance](#performance)
10. [Run it locally](#run-it-locally)
11. [Editing the site](#editing-the-site)
12. [Deploying](#deploying)
13. [Browser support](#browser-support)
14. [Credits](#credits)

---

## What the site is

A single-page portfolio that presents two things side by side: software built for the day things go wrong, and the business work of pitching, negotiating and owning the numbers. It is written in plain HTML, CSS and JavaScript, with no framework and no build step, and is served by GitHub Pages straight from this repository.

The look is a black circuit board with red traces: square edges, 45-degree chamfered corners, a monospaced label face and an engine logo as the brand mark. Everything interactive on the page is built from that same vocabulary.

## A tour of the page

| # | Section | What it holds |
|---|---|---|
| 01 | **Intro** | Name, one-line positioning, the two degrees, the lead paragraph, the CV, GitHub and LinkedIn links, and the engine logo hanging from the header as a physical object. |
| | **Ticker** | A scrolling tape of what Pranav works on. |
| 02 | **About** | "I build for the bad day": the outage, the edited record, the plant that loses power. Four headline numbers count up as they come into view. |
| 03 | **Selected work** | Five systems, each built around a failure. A failure picker jumps to the matching project, and a workbench opens every live demo inside the page. |
| 04 | **Experience** | D.S. Design Sense LLP (founder's office), Manipal The Talk Network (Head of Business Development & PR) and earlier roles, with the work and the results in each. |
| 05 | **Education** | IIM Bangalore (BBA, DBE, graduating 2029), MIT Manipal (B.Tech IT, 2024 to 2028) and schooling in Faridabad. |
| 06 | **Skills** | Engineering and business as two panels wired into seven shared results. |
| 07 | **Right now** | What he is exploring, leading, working on, studying and looking for, with the time in India. |
| 08 | **Contact** | "Let's talk", the email with a copy button, the links, the CV download, and a telephone that rings as you approach. |

A thin route down the left edge of wide screens shows where you are and jumps between these sections.

## The interactive pieces

### The logo case (intro)

The engine logo sits in its case, hanging from the header on a thin red trace.

- **Physics:** a Verlet rope with the case as a heavier, stiff final link. It runs at a fixed 60 steps a second and is drawn between steps, so motion stays smooth on 60 Hz and 120 Hz screens alike. It sleeps once it comes to rest and settles on whole pixels, so the photo stays sharp.
- **Drag and throw:** the whole case moves as one piece (the photo can never be dragged on its own). A hard throw sends a surge through the circuit backdrop.
- **Turn it over:** click or press Enter. The back is the page's mainboard: a small OLED with the time in India (IST), the music and theme state, three cut-corner slide switches (light theme, music, backdrop glow) and the contact links. Escape turns it back.
- **Placement:** on wide screens it measures where the intro text actually ends and sits centred in the space between the text and the Walkman.

### The Walkman (fixed in a corner)

A cassette player parked in the bottom corner. Click it and it grows into the full deck.

- **Three tapes:** Sunrise is a studio track; Midnight and The Grid are composed live in the browser with the Web Audio API (a lookahead sequencer with drums, bass, chords, arpeggios, delay and reverb; The Grid is a dark, cinematic piece with a sixteenth-note ostinato, strings and low brass).
- **Controls:** play and stop keys, previous and next tape keys, three tape buttons under the window, a pace knob, a tone knob, a side wheel for volume, a VU meter and a tape counter. The knobs and the wheel respond to dragging, the scroll wheel, the arrow keys and double-click (reset).
- **Presets:** the red button beside the counter steps through four named pace-and-tone presets for the loaded tape, gliding both knobs and showing the preset's name on the display.

  | Tape | Presets |
  |---|---|
  | Sunrise | Studio, Slow & warm, Lifted, Late drive |
  | Midnight | Late night, After hours, Rush hour, Low light |
  | The Grid | The grid, Slow burn, Overdrive, Night shift |

- **Tape rack:** spare tapes sit beside the open deck; drag one into the cassette door (or click it) to load it.
- **Carry it:** drag the folded Walkman and it glides to the nearer corner, left or right.
- **Pace on the studio track** changes speed while keeping pitch. To stay glitch-free in every browser, the speed moves in 5% steps and is applied once the knob settles; a watchdog nudges playback back on if a browser ever stalls it.
- Sound only ever starts after a click, and the deck pauses when the tab is hidden.

### The circuit backdrop

A canvas behind the page draws one continuous circuit: traces, pads and travelling light pulses, with contact pads that light up near the pointer. Behind text the traces fade back so everything stays readable. While the Walkman plays, every beat makes the pulses run faster, longer and brighter.

### Skills: two sets wired into one

Engineering on the left, business and product on the right, and in the middle seven things the two do together: find the right problem, ship it end to end, make it survive a bad day, prove it with numbers, pitch it and close, lead the people who build it, and put AI to work. Pick a result and the skills behind it light up on both sides, with chamfered traces running from each lit skill into the centre, plus one line of explanation and one piece of proof from real work. Hovering a skill marks the results it feeds; clicking it steps to the next result that uses it. Until someone touches it, the section steps through the results on its own.

### The telephone (contact)

A telephone handset hangs on a coiled cord from a carriage that rides a rail along the top of the contact section.

- **Drawn in 3D** with three.js: glossy black plastic lit by soft studio lights with a red bounce from the section, ear and mouth cups with perforated grilles, a rubber cord sleeve, the wordmark pressed into the handle, a metal rail with a screwed-on carriage, and a soft shadow cast onto the red. The cord is a true helix rebuilt every frame, so its coils spread when it stretches.
- **Follows the pointer:** the carriage slides along the rail toward the pointer, and the handset turns in 3D to face it.
- **Rings as you approach:** a double ring that grows more urgent the closer you get, with ring marks at the earpiece. The status line changes from "Line open" to "Incoming call".
- **Connects on the email:** hover or focus the email or the copy button and it stops ringing and reads "Connected · say hello"; copying the address shows "Email copied".
- **Toy:** grab it, swing it, throw it; a quick tap answers with "Hello?". While music plays, the cord bounces to the beat.
- **Never in the way:** the rail covers only free space. It measures the text and the buttons, stays out of the column the Walkman uses (whether folded, open, or carried to the other side), and slides aside when the Walkman changes. The handset leans toward you but never swings lower than its resting depth, so it cannot cover the links. On phones it gets its own strip of space above the heading and rings once when the section scrolls into view.
- **Fallback:** if WebGL is unavailable, a detailed flat drawing of the same handset is used with the same behaviour.

### The rest

- **Project workbench:** a full-screen dialog that runs each project's live demo in a frame, with a tab per project and a link out to the full demo.
- **Section route:** one pad per section on screens 1280 px and wider; the trace fills as you scroll.
- **Counting numbers:** the About figures count up once, the first time they appear.
- **Cursor:** on mouse and trackpad, four chamfered brackets frame the pointer and lock around anything clickable, following it with a damped spring. Over the logo, the tapes and the handset it shows a one-word tag such as "drag" or "open".
- **Themes:** dark by default, light on request; the choice is remembered.

## The five projects

| Project | Built for | Live demo | Code |
|---|---|---|---|
| **ChainProof** | Evidence altered: chain of custody for forensic evidence, checked across a database, IPFS and a blockchain | [Demo](https://techmines.github.io/ChainProof/) | [Repo](https://github.com/TECHMINEs/ChainProof) |
| **Relay** | Model outage: a fault-tolerant gateway that speaks the OpenAI API and fails over between providers | [Demo](https://techmines.github.io/Relay/) | [Repo](https://github.com/TECHMINEs/Relay) |
| **DevPulse** | Workload strain: developer analytics and burnout signals | [Demo](https://techmines.github.io/DevPulse/) | [Repo](https://github.com/TECHMINEs/DevPulse) |
| **Nexora** | Factory flood: an operations platform that keeps a plant running through disruption | [Demo](https://techmines.github.io/Nexora/) | [Repo](https://github.com/TECHMINEs/Nexora) |
| **AutoLine** | Plant bottleneck: production, parts and quality tracking for an assembly line | [Demo](https://techmines.github.io/AutoLine/) | [Repo](https://github.com/TECHMINEs/AutoLine) |

Each project card links to the exact file that backs its headline number. On GitHub Pages, backend features are simulated where noted.

## How it is built

- **HTML:** one page, `index.html`, with semantic sections, a skip link and a small inline script (theme, intro reveal, reveal-on-scroll, mobile menu, copy-email, the logo glint).
- **CSS:** one stylesheet, `style.css`, in numbered sections. Colours are custom properties with a dark and a light set; layout is CSS grid and flexbox; all motion respects `prefers-reduced-motion`.
- **JavaScript:** one plain script per feature, each wrapped in its own function scope and loaded with `defer`. No dependencies, except three.js for the 3D telephone, which is fetched from cdnjs only when the visitor nears the contact section.
- **Fonts:** Chakra Petch (display), IBM Plex Sans (body), JetBrains Mono (labels) and Caveat (the footer signature), from Google Fonts.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page and its small inline script |
| `style.css` | All styles, in numbered sections (base, layout, sections, Walkman, cursor, logo case, Skills, route, telephone) |
| `toy.js` | The logo case: rope physics, drag and throw, the mainboard on the back |
| `walkman.js` | The Walkman: the deck, the tape rack, carrying, presets, and the Web Audio engine that composes two of the tapes |
| `backdrop.js` | The circuit backdrop and its reaction to the music |
| `skills.js` | The Skills section: results, lit skills and the traces between them |
| `extras.js` | The section route and the counting numbers |
| `phone.js` | The telephone: cord physics, placement around the text and the Walkman, ringing, and the flat fallback drawing |
| `phone3d.js` | The telephone in 3D: handset, cord, rail, carriage, lighting and shadow |
| `cursor.js` | The chamfer-lock cursor |
| `workbench.js` | The in-page project demo viewer |
| `audio/arpent-studio.mp3` | The studio track for the Sunrise tape |
| `profile.jpg` | The engine logo shown in the case |
| `resume.pdf` | The CV behind the "View CV" and "Download CV" links |
| `logos/*/mark.svg` | Project marks used on the project cards |
| `icons/` | Favicons, the home-screen icon and the link-preview image |
| `404.html` | The page shown for missing links |
| `_config.yml` | Tells GitHub Pages to publish the site files only |

## How the pieces talk to each other

- **`tm:beat` events:** the Walkman measures the music's level and fires a `tm:beat` event on `window` at each beat, with a strength from 0 to 1. A hard throw of the logo or the handset fires the same event. The backdrop answers with faster, brighter pulses, the logo case flashes, and the telephone cord bounces.
- **Placement:** the logo case and the telephone both measure the real text on the page (line by line, not whole blocks) and the Walkman's current position, and re-measure on resize, when fonts finish loading, and whenever the Walkman opens, closes or changes side.
- **Remembered settings** (in the visitor's browser only):

  | Key | Holds |
  |---|---|
  | `theme` | Light or dark |
  | `techmines-intro-seen` | Skips the intro animation on later visits |
  | `tm-jbx-mix`, `tm-jbx-pace`, `tm-jbx-tone`, `tm-jbx-volume` | The Walkman's tape and settings |
  | `tm-jbx-side`, `tm-jbx-seen` | Which corner the Walkman sits in, and whether its hint has been seen |
  | `tm-toy-seen` | Whether the logo's "drag me" hint has been seen |

## Accessibility

- Every control is a real button, link or labelled ARIA control, reachable and usable by keyboard (Enter and Space press, arrow keys turn knobs and move between tapes and results, Escape turns the logo back).
- The hidden face of the logo case is made inert so it cannot be focused or clicked.
- Decorative canvases and drawings are hidden from screen readers; the email, links and all text stay plain HTML.
- With reduced motion requested, the rope physics settle instantly, auto-play effects stop, the telephone stops reaching and ringing, and transitions are cut.
- Text keeps its contrast in both themes, and selected text stays legible on the red contact section.

## Performance

- No framework and no build step; every feature is a small script loaded with `defer`.
- Animation loops sleep when nothing is moving, pause when their section is off screen, and stop in background tabs.
- three.js loads only when the visitor is within a few screens of the contact section; until then, and if it fails, the flat handset drawing is shown.
- The 3D telephone renders only while it moves and keeps its shadow map tight around the handset.
- Static assets carry a version query (`style.css?v=22`, `phone.js?v=13`, ...) so a new deploy is fetched straight away.

## Run it locally

From this folder:

```bash
python3 -m http.server 4100
```

Then open http://localhost:4100. Any static file server works; the site needs no install. The 3D telephone fetches three.js from cdnjs, so it needs a network connection (without one, the flat drawing is used).

## Editing the site

| To change | Edit |
|---|---|
| Any text on the page | `index.html` (each section is marked with a comment) |
| The CV | Replace `resume.pdf` |
| The logo photo | Replace `profile.jpg` (square, at least 1200 px) |
| Colours or spacing | The custom properties at the top of `style.css` |
| Skills and the seven results | The `#fusion` block in `index.html`: each result lists the skills it uses in `data-uses`, and each skill chip has a `data-skill` name |
| Walkman presets | `PRESETS` near the top of `walkman.js` (name, pace, tone) |
| The studio track | Replace `audio/arpent-studio.mp3` |

After changing a CSS or JavaScript file, raise its `?v=` number in `index.html` so returning visitors get the new version.

## Deploying

GitHub Pages publishes the `main` branch of this repository to https://techmines.github.io/. Commit, push, and the site updates within a minute or two.

## Browser support

Current Chrome, Edge, Safari and Firefox on desktop, and Safari and Chrome on iOS and Android. The 3D telephone needs WebGL; everything else works without it.

## Credits

- Sunrise tape: a studio edit of "Arpent" by Kevin MacLeod (CC0, FreePD).
- 3D rendering: [three.js](https://threejs.org/) r128 (MIT licence).
- Fonts: Chakra Petch, IBM Plex Sans, JetBrains Mono and Caveat, via Google Fonts (SIL Open Font Licence).

---

<div align="center">

Created by **Pranav Jangid** | [**TECHMINES**](https://github.com/TECHMINEs)

© 2026 Pranav Jangid. All rights reserved.

</div>
