# Local AI Operator - Concept Demo

Interactive concept demo of a local AI operator that runs on one office PC.

**Live demo:** https://perfectcode537.github.io/local-ai-operator/

> All data, timings and results in this demo are simulated in the browser to show the planned behaviour. Real numbers are measured in Phase 0.

## What it shows

- **Opening** - a film title card, then an editorial cover with a grown-to-full-screen reel.
- **How it works** - a pinned 3D story: Plan, Act, Verify, Report.
- **Live console** - run a goal, kill the process mid-step, resume without repeating a step, approve on the phone.
- **Workspaces** - isolated businesses in 3D; a cross-workspace read is denied in code.
- **A week with the operator** - six video panels on a 3D cylinder that turns as you scroll.
- **Hard controls, call assist, delivery phases, questions** - with fixed AUD prices and acceptance tests.

## Run locally

No build step. Serve the folder with any static server:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Tech

- HTML, CSS and plain JavaScript
- three.js for the 3D scenes, GSAP + ScrollTrigger and Lenis for motion
- Fonts: Inter and JetBrains Mono

## Credits

Background video and photos from [Mixkit](https://mixkit.co/) under the Mixkit free licence, colour graded for this site.
