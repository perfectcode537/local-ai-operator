# Local AI Operator - Concept Demo

Interactive concept demo of a local AI operator that runs on one office PC.

**Live demo:** https://perfectcode537.github.io/local-ai-operator/

> All data, timings and results in this demo are simulated in the browser to show the planned behaviour. Real numbers are measured in Phase 0.

## What it shows

- **Operator console** - a plain-English goal with a budget and limits becomes a plan. Each step is verified and checkpointed.
- **Crash recovery** - kill the process mid-task, then resume. Verified steps are skipped and nothing runs twice.
- **Hard controls** - spending limits, approval gates, emergency stop and an append-only audit log.
- **Workspaces** - each business has its own data, vault, rules and history. Cross-workspace access is denied in code.
- **Phone approvals** - a blocked step is parked, sent to the phone, and the task continues after approval.
- **Live call assist** - local transcription with suggested answers and measured latency.
- **Learning from demonstration** - three demos become a procedure, tested on unseen cases with honest results.
- **Delivery phases** - fixed-price milestones, each with its acceptance test.

## Run locally

No build step. Serve the folder with any static server:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Tech

- HTML, CSS and plain JavaScript
- three.js for the 3D scene
- Fonts: Inter and JetBrains Mono

## Credits

Background video from [Mixkit](https://mixkit.co/) under the Mixkit free licence.
