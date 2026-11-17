"""One wire story copied across a newspaper chain must count once, and must not
outrank a story genuinely covered by many outlets. Run: python tests/test_syndication.py"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import build_events as be  # noqa: E402


def row(url, mentions, sources, fips="AS", geo="Melbourne, Victoria, Australia", lat=-37.82, lon=144.97):
    r = [""] * 61
    C = be.C
    r[C["SOURCEURL"]] = url; r[C["GEOTYPE"]] = "4"; r[C["GEOLAT"]] = str(lat); r[C["GEOLON"]] = str(lon)
    r[C["NUMMENTIONS"]] = str(mentions); r[C["NUMSOURCES"]] = str(sources); r[C["NUMARTICLES"]] = str(mentions)
    r[C["GOLDSTEIN"]] = "0"; r[C["AVGTONE"]] = "0"; r[C["QUADCLASS"]] = "1"; r[C["EVENTROOT"]] = "04"
    r[C["GEOCOUNTRY"]] = fips; r[C["GEONAME"]] = geo; r[C["ISROOT"]] = "1"
    return r


chain = ["cootamundraherald.com.au", "bordermail.com.au", "theleader.com.au", "bendigoadvertiser.com.au",
         "newcastleherald.com.au", "canberratimes.com.au", "examiner.com.au"]
rows = []
for d in chain:  # 7 copies, each article producing 10 coded events with 68 mentions / 7 "sources"
    rows += [row(f"https://www.{d}/story/9391964/detained-aussie-tests-relationship/", 68, 7)] * 10
# A genuinely big story: one article, 3 events, 120 mentions across 25 different outlets.
rows += [row("https://www.reuters.com/world/iran-drone-attack-bahrain-2026-11-15/", 120, 25,
             fips="IR", geo="Tehran, Tehran, Iran", lat=35.75, lon=51.51)] * 3

cands = be.collect_candidates(rows)
urls = [c["url"] for c in cands]
assert sum("9391964" in u for u in urls) == 1, "syndicated copies should collapse into one candidate"
syn = next(c for c in cands if "9391964" in c["url"])
assert syn["syndicated"] == 7 and syn["sources"] == 1, (syn["syndicated"], syn["sources"])
assert "reuters" in cands[0]["url"], [(c["url"], round(c["score"])) for c in cands]
assert be.story_key("https://example.com/news/2026/11/15/") is None
print("ok:", [(c["domain"], round(c["score"]), c["sources"]) for c in cands])
