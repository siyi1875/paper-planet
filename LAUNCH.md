# Launching Paper Planet

Goal: build a public profile and learn which channels bring visitors and email sign-ups.
Not for profit. Everything below is free except the domain (about $10–15 a year).

The site is ready. Three things need your own accounts. Each one is "off" until you
fill in one line in `site/config.js`.

---

## 1. Domain (15 minutes)

1. Buy a short domain at any registrar (Cloudflare, Namecheap, Porkbun). Ideas:
   `paperplanet.news`, `paperplanet.world`, `paper-planet.app`.
2. In the registrar's DNS settings add:
   - four `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - one `CNAME` record for `www` → `siyi1875.github.io`
3. GitHub → repo **Settings → Pages → Custom domain**: type the domain, **Save**.
   Wait for the DNS check to pass (minutes to an hour), then tick **Enforce HTTPS**.
4. Tell Claude the domain. The share-image links in `site/index.html` point at
   `siyi1875.github.io/paper-planet/…`; they keep working through GitHub's redirect,
   but should be updated to the new domain.

## 2. Analytics: GoatCounter (5 minutes)

No cookies, so no cookie banner. Free for personal sites.

1. Sign up at goatcounter.com and pick a code, e.g. `paperplanet`
   (your dashboard becomes `paperplanet.goatcounter.com`).
2. In `site/config.js` set `goatcounter: "paperplanet"`.

What you'll see: visitors, pages, referrers, countries, and these events:

| Event | Means |
|---|---|
| `story/<id>` | someone opened a story |
| `share/<id>` | someone shared a story link |
| `tour` | someone started the tour |
| `blend/<topics>` | someone tuned the blend bar (e.g. `blend/economy+politics`) |
| `about` | someone opened About |
| `signup` | someone subscribed to the email |

## 3. Email sign-ups: Buttondown (10 minutes)

This is the "lead" in lead generation: a visitor who leaves an email.

1. Sign up at buttondown.com (free up to 100 subscribers), pick a username, e.g. `paperplanet`.
2. In `site/config.js` set `newsletter: "paperplanet"`.
   A one-line signup appears in the page footer: *The world in 5 stories, every Monday.*
3. Send that email by hand at first: once a week, the 5 stories you found most interesting,
   one line each with a link to the globe. It doubles as your writing practice.

---

## Tracking links

Post a different link per channel, so analytics shows which one brought people.
GoatCounter reads `utm_source` automatically.

| Channel | Link |
|---|---|
| X | `https://paperplanet.app/?utm_source=x&utm_campaign=launch` |
| Reddit r/InternetIsBeautiful | `https://paperplanet.app/?utm_source=reddit-iib&utm_campaign=launch` |
| Reddit r/dataisbeautiful | `https://paperplanet.app/?utm_source=reddit-dib&utm_campaign=launch` |
| Hacker News | `https://paperplanet.app/?utm_source=hn&utm_campaign=launch` |
| LinkedIn | `https://paperplanet.app/?utm_source=linkedin&utm_campaign=launch` |
| Product Hunt | `https://paperplanet.app/?utm_source=producthunt&utm_campaign=launch` |

## Launch order (one channel a week, so results don't blur)

1. **X** (week 1): build-in-public thread with the video.
2. **Reddit** (week 2): r/InternetIsBeautiful first; r/dataisbeautiful needs an `[OC]` image or GIF.
3. **Show HN** (week 3): post on a weekday morning US time. Stay and answer comments for the first 2 hours.
4. **LinkedIn** (week 3): the "what I learned" angle, for your professional network.
5. **Product Hunt** (later): once you have a few hundred users and some feedback to show.

## Scorecard (fill in per channel)

| Channel | Visitors | Stories opened per visitor | Shares | Sign-ups | Sign-up rate |
|---|---|---|---|---|---|
| X | | | | | |
| Reddit | | | | | |
| HN | | | | | |
| LinkedIn | | | | | |

Sign-up rate = sign-ups ÷ visitors. Above 1% is good for a free tool with no prompt to sign up.

---

## Post drafts

**X thread (with `paper-planet-launch.mp4`)**

> I built a living globe of today's world news. 🌍
>
> Every glowing point is a story, placed where it happened. Red = people in danger,
> gold = everything else, green = something got better.
>
> It rebuilds itself every 3 hours. No AI writes anything, no ads. [link]

> How it works: it reads the GDELT news feed, groups reports of the same event,
> and ranks stories by how many outlets cover them. Plain rules, about 1,100 lines of Python,
> GitHub Actions, free hosting.

> Slide the bar to tune your front page: blend Politics and Economy, or mute Conflict for a day.

> I'm not a designer or an engineer by trade. I built it to learn, and I'd love feedback:
> what would make you open it every morning?

**Reddit, r/InternetIsBeautiful**

> Title: A living globe of today's news: every glowing dot is a story, placed where it happened
>
> Body: Refreshes every 3 hours from the GDELT news feed. Colour = what it means for the
> people in it (red: harm, gold: neutral, green: improvement). You can slide a bar to blend
> topics. No AI, no ads, no sign-up. Made it as a side project; feedback welcome.

**Show HN**

> Title: Show HN: Paper Planet – today's news on a globe, rebuilt every 3 hours without AI
>
> Body: A static page on GitHub Pages; a GitHub Action reads the last 3 hours of GDELT events,
> fetches each article's title and description, groups reports of the same event, and
> scores them by coverage. Tone, topic and placement are keyword rules, so it gets things
> wrong sometimes; there's a "report a mistake" link. Code: github.com/siyi1875/paper-planet

## Assets

- `site/assets/og.jpg`: the share preview image (shows automatically when the link is posted)
- `paper-planet-launch.mp4` and `paper-planet-globe.gif`: in the Claude chat; not in the repo
