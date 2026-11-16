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
- **A Walkman** in the corner. Click it and it grows into the full deck: press play, swap between three tapes, turn the knobs for pace and tone, roll the side wheel for volume. The sunrise tape is a studio edit of "Arpent" by Kevin MacLeod (CC0, FreePD). The midnight and grid tapes are composed live in the browser with the Web Audio API.
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
