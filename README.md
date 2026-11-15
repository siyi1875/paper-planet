# Paper Planet — self-updating edition

A cartoon world map where each figure is a real news story standing where it happened.
This version **rebuilds itself every three hours with no language model and no human
in the loop**: a GitHub Actions job pulls the last three hours of the free, worldwide
[GDELT 2.0](https://www.gdeltproject.org/) events feed, picks ~30 widely covered stories
spread across every inhabited continent, reads each story's headline and summary from
the source page, and publishes the result to GitHub Pages.

What you get on each card: the headline, where it happened, the source's own summary,
how many outlets covered it, and a link to the full story. What you don't get, because no
model writes anything: the plain-English "why it matters" and jargon explainers of the
hand-written edition. Tone and figure are chosen by rules (see below), so they are rougher.

## Set it up (about five minutes, once)

1. Create a new GitHub repository (public is fine) and upload the contents of this folder
   to it — the `.github`, `scripts`, `site` and `tests` folders plus `requirements.txt`.
   Push to a branch called `main`.
2. In the repository go to **Settings → Pages** and under **Build and deployment** set
   **Source** to **GitHub Actions**. (Not "Deploy from a branch".)
3. Go to the **Actions** tab. If it asks you to enable workflows, click **I understand my
   workflows, go ahead and enable them**. Open **Refresh Paper Planet** and press
   **Run workflow** once. The first run takes 2–4 minutes; its log lists every story it picked.
4. The page is live at `https://<your-username>.github.io/<repo-name>/`. From now on it
   refreshes on its own at :17 past every third hour (UTC). Nothing else to do.

Until the first run finishes, the page shows the seed edition shipped in
`site/data/events.json` and says so in its date line.

> GitHub pauses scheduled workflows on repositories with no commits for 60 days. If that
> ever happens, any commit (or pressing *Run workflow*) wakes it up again.

## How the rules work

`scripts/build_events.py` is the whole pipeline; it is about 400 lines of ordinary Python.

| Step | What happens |
|---|---|
| Fetch | Downloads the 12 most recent 15-minute GDELT export files (≈3 hours, ~40 000 events). |
| Candidates | Keeps events with a real location and groups them by source article. Score = how many times and by how many outlets the article was mentioned. |
| Spread | Guarantees at least two stories from each of Africa, Asia, Europe, North America, South America and Oceania, caps any one country (3; the US 4), then fills by score. |
| Headlines | Fetches each candidate page and reads its `og:title` / `og:description`. Paywalled, bot-walled, non-English or junk titles are dropped. |
| Tone | *Urgent* when the event is coded as material conflict or its text carries words like killed, flood, outbreak. *Good* only when several positive signals line up (rescued, wins, breakthrough, strongly positive tone). Everything else, including every politically contested story, is *neutral*. |
| Figure | Keyword rules on the headline (flood → house in water, election → ballot box …), falling back to the event's CAMEO category. |
| Weight | Heavy (no bobbing) for deaths and disasters, light for good news, normal otherwise. |
| Safety | If fewer than 12 usable stories come back, the job fails and the previous edition stays online. |

Change the schedule in `.github/workflows/refresh.yml` (`cron`), the story count or window
with the `--count` / `--hours` flags there, and the keyword rules at the top of the script.

## Run it locally

```bash
pip install -r requirements.txt
python scripts/build_events.py --out site/data/events.json   # needs internet; ~1–3 min
python -m http.server -d site 8000                            # then open http://localhost:8000
python tests/test_offline.py                                  # no-network smoke test
```

## Data shape

`site/data/events.json` → `{ day: {iso, label, updated, edition}, meta: {…}, events: [ … ] }`.
Each event: `id, tone, icon, weight, title, place, country, flag, iso, lat, lon, what,
source, url, stats[], continent, score`. The page ignores fields it does not know, so the
older hand-written shape (`why`, `jargon`) still renders if you ever mix editions.

## Credits

Map, figures and interaction: the original Paper Planet page. News data: GDELT Project
(CC-BY-style terms, see gdeltproject.org). Headlines and summaries belong to their publishers
and link back to them.
