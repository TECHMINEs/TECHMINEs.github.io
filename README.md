<div align="center">

<a href="https://techmines.github.io/"><img src="icons/og-card.jpg" alt="Pranav Jangid, TECHMINES" width="640"></a>

# techmines.github.io

**The portfolio of Pranav Jangid (TECHMINES): B.Tech IT at MIT Manipal, BBA at IIM Bangalore. Building software, and the case for it.**

[Live site](https://techmines.github.io/) · [GitHub](https://github.com/TECHMINEs) · [LinkedIn](https://www.linkedin.com/in/pranavjangid)

</div>

## What's here

- **Five projects**, each with a live GitHub Pages demo and a link to the evidence behind its headline number: [ChainProof](https://github.com/TECHMINEs/ChainProof), [Relay](https://github.com/TECHMINEs/Relay), [DevPulse](https://github.com/TECHMINEs/DevPulse), [Nexora](https://github.com/TECHMINEs/Nexora) and [AutoLine](https://github.com/TECHMINEs/AutoLine).
- **A project workbench** that opens any demo inside the page.
- **A circuit-trace backdrop** drawn on a canvas, with travelling light pulses and contact pads that light up near the pointer. Behind text the same traces fade back, so everything stays readable.
- **A logo you can play with.** The engine logo in the intro hangs from the header on a thin trace: drag it, throw it, and click it to turn it over. The back is the page's mainboard, with the time in India, switches for the theme, the music and the backdrop, and the contact links.
- **A Walkman** in the corner. Click it and it grows into the full deck: press play, swap between three tapes, turn the knobs for pace and tone, roll the side wheel for volume. Spare tapes sit beside the open deck and can be dragged into the door, and the folded Walkman can be dragged to either side of the page. The sunrise tape is a studio edit of "Arpent" by Kevin MacLeod (CC0, FreePD). The midnight and grid tapes are composed live in the browser with the Web Audio API.
- **Skills wired into one.** Engineering on one side, business on the other, and in the middle what the two do together. Pick a result and the skills behind it light up on both sides, with traces running into the middle.
- **A page that answers the music.** While the Walkman plays, the circuit's pulses speed up and brighten on each beat, and throwing the logo sends a surge through them.
- **A section route** down the left edge of wide screens: one pad per section, filling as you scroll.
- **A telephone in the contact section**: a handset on a coiled cord hangs from a carriage on a rail. It follows the pointer, turns to face it and rings as it gets close; reaching the email connects the call. It can be grabbed and thrown, and it always moves out of the Walkman's way.
- **A target-lock cursor** for mouse and trackpad users: four chamfered brackets that frame the pointer and snap around whatever can be clicked.
- Dark and light themes, a skip link, keyboard support throughout, and reduced-motion support.

## Built with

Plain HTML, CSS and JavaScript, with no framework and no build step. Fonts: Chakra Petch, IBM Plex Sans and JetBrains Mono.

| File | Purpose |
|---|---|
| `index.html` | The page, with its small inline script |
| `style.css` | All styles, in numbered sections |
| `workbench.js` | The in-page demo viewer |
| `backdrop.js` | The circuit-trace backdrop |
| `walkman.js` | The Walkman player and its live-composed music |
| `toy.js` | The swinging, flippable logo in the intro |
| `skills.js` | The interactive Skills section |
| `extras.js` | The section route and the counting numbers |
| `phone.js` | The contact handset: drawing, cord physics and placement |
| `cursor.js` | The target-lock cursor |
| `audio/` | The studio track for the sunrise tape |
| `404.html` | The page shown for missing links |
| `icons/` | Favicons and the link-preview image |

## Run locally

```bash
python3 -m http.server 4100
```

Then open http://localhost:4100.

---

<div align="center">

Created by **Pranav Jangid** | [**TECHMINES**](https://github.com/TECHMINEs)

</div>
