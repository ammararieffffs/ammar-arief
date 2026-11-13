# Ammar Arief · Portfolio

Cream, forest green and near-black. Condensed italic display type, mono labels, a layered photographic collage. Built with plain HTML, CSS and JavaScript, plus GSAP and Three.js. No framework, no build step.

## Run it

Serve the folder. WebGL textures need a server, so don't just double-click the HTML file:

```bash
npx serve .
```

or

```bash
python3 -m http.server 8000
```

## Files

```
index.html     Home: hero collage, intro, selected work, marquee, experience, contact
work.html      All projects; a WebGL preview follows the cursor
hardline.html  Case study: expanding image, horizontal gallery
about.html     Background, toolkit, experience, outside the editor
css/style.css  Whole design system, commented and sectioned (tokens at the top)
js/gl.js       Three.js image layer
js/main.js     All animation and interaction, one block per feature
images/        Put your photos here
_archive/      The earlier "Working Copy" build, kept for reference
```

Libraries come from CDNs, pinned to exact versions:
- Three.js r128
- GSAP 3.12.5 and ScrollTrigger
- Lenis 1.1.13

## How the images work

Every image slot is a `<figure class="media" data-gl ...>`. Three.js draws it on one canvas behind the page and keeps it aligned with the element every frame. That's what makes these effects possible:
- **hover:** a ripple distortion
- **fast scrolling:** a slight bend and colour split
- **reveals:** a wipe from the left
- **grading:** a film grain and green duotone

**Until you add a photo**, the slot shows a generated placeholder. `data-kind` picks the type:

| `data-kind` | Placeholder |
|---|---|
| `0` | portrait light |
| `1` | dark texture |
| `2` | light streak |
| `3` | water |

**To add a real photo**, put an `<img>` inside the figure:

```html
<figure class="media" data-gl data-kind="0" data-seed="1.3" data-tone=".58" data-z="1">
  <img src="images/portrait.jpg" alt="Ammar Arief">
  <span class="media__label">IMG 01 · Portrait</span>   <!-- delete the label -->
</figure>
```

The photo is graded to the site's green duotone automatically, so any decent photo will fit. Without WebGL, or with reduced motion on, the `<img>` shows normally with a CSS filter.

## Placeholders to replace

Search the HTML for `tbd` and `IMG `.

**Suggested shots for the hero collage**
- **IMG 01:** a portrait, 4:5, window light.
- **IMG 02:** an SRV250 detail in low light.
- **IMG 03:** a night ride or light trails, in place of the stock "light streak".
- **IMG 04:** a texture.

**Project screenshots**
- **IMG 05:** HARDLINE.
- **IMG 06:** WIE.
- **IMG 07:** SRIWI.
- **IMG 08–10:** Bike Bear (only if allowed), E-ADUAN and the ED system.
- **IMG 11–15:** HARDLINE gallery screens.
- **IMG 16:** the SRV250 on the About page.

**Facts to confirm**
- Your role on SRIWI and WIE.
- The stack for WIE and E-ADUAN.
- Bike Bear dates and your scope on each project.
- HARDLINE's year and live link.
- Institution and years.
- Email and social links.
- Bike modification list.

## Motion system

Rules that keep it polished:
- Every element enters once.
- Ambient loops are slow and small.
- There's one pinned scene per page at most.

| Moment | What happens | Ease / timing |
|---|---|---|
| First visit | Green curtain, counter 000→100, curtain lifts | ~1.6s, once per session |
| Page change | Curtain rises from the bottom, next page lifts it | 0.9s expo.inOut |
| Hero intro | Name letters rise, ghost blocks grow, images wipe in, arc draws, list slides in, labels scramble | ~2.4s, expo.out / expo.inOut |
| Hero ambient | Arc rotates (80s), arrows nudge, green "A" sheen every 7s, stack list cycles | sine.inOut |
| Hero mouse | Collage layers parallax at different depths; name letters widen near the cursor | power3.out |
| Hero scroll (desktop) | Hero pins; images drift right at different speeds and fade over each other; name and menu stay | scrubbed |
| Sections | Headings rise letter by letter, blocks fade up, images wipe in, cards parallax | expo.out |
| Intro text | Words fill in as you read | scrubbed |
| Marquee | Speed, direction and skew follow your scroll | — |
| Work list | Preview follows the cursor and tilts with movement | power3.out |
| Case study | Image expands to full screen; gallery scrolls sideways | scrubbed |
| Cursor | Dot grows into a label over projects; buttons are magnetic | power3.out |

**Reduced motion:** no curtain, no scroll scenes, no WebGL. Content shows immediately.
