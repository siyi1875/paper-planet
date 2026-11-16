#!/usr/bin/env python3
"""
Paper Planet — LLM-free news builder.

Pulls the last few hours of the GDELT 2.0 Events feed (free, worldwide,
geocoded, updated every 15 minutes), picks ~30 widely-covered stories spread
across every inhabited continent, fetches each story's headline and summary
from its source page, classifies tone/figure/weight with plain rules, and
writes site/data/events.json for the map page to load.

No language model is involved anywhere in this file.

Usage:
  python scripts/build_events.py --out site/data/events.json [--hours 3] [--count 30]
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import io
import json
import re
import sys
import time
import zipfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

import requests

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from geo_tables import continent_from_iso, flag_from_iso, iso_from_fips  # noqa: E402
from place_names import COUNTRY, US_STATES  # noqa: E402

GDELT_BASE = "http://data.gdeltproject.org/gdeltv2/"
UA = "PaperPlanetBot/1.0 (+https://github.com/; automated news map; contact via repo)"
HTTP_TIMEOUT = 12

# GDELT 2.0 Events export column positions (0-based). See the GDELT codebook.
C = dict(
    GLOBALEVENTID=0, DAY=1, ACTOR1NAME=6, ACTOR2NAME=16, ISROOT=25, EVENTCODE=26,
    EVENTBASE=27, EVENTROOT=28, QUADCLASS=29, GOLDSTEIN=30, NUMMENTIONS=31,
    NUMSOURCES=32, NUMARTICLES=33, AVGTONE=34, GEOTYPE=51, GEONAME=52,
    GEOCOUNTRY=53, GEOADM1=54, GEOLAT=56, GEOLON=57, DATEADDED=59, SOURCEURL=60,
)

# ---------------------------------------------------------------------------
# Rules. Order matters: the first matching keyword group wins for the figure.
# ---------------------------------------------------------------------------
ICON_RULES = [
    ("flood",      r"\b(flood\w*|typhoon|hurricane|cyclone|tsunami|monsoon|storm surge)\b"),
    ("wildfire",   r"\b(wildfire\w*|bushfire\w*|forest fire|heat ?wave|blaze)\b"),
    ("rubble",     r"\b(earthquake|quake|collapse\w*|demolish\w*|rubble|aftershock|landslide|mudslide)\b"),
    ("blast",      r"\b(bomb\w*|blast|explosion\w*|explode\w*|detonat\w*|suicide attack|car bomb)\b"),
    ("missile",    r"\b(missile\w*|air ?strike\w*|airstrike\w*|rocket\w*|shelling|drone (attack|strike)\w*|bombard\w*|strikes? (on|hit|kill)\w*)\b"),
    ("ballot",     r"\b(election\w*|vote[sd]?|voters?|referendum|ballot\w*|polls? open|runoff|primary|turnout|seats|coalition talks|landslide (win|victory))\b"),
    ("court",      r"\b(court|judge|trial|verdict|sentenc\w*|indict\w*|lawsuit|tribunal|ruling|convict\w*|acquit\w*|arrest\w*|detain\w*|execution\w*|jail\w*|prison\w*|charged|extradit\w*|prosecut\w*|icc\b|icj\b)\b"),
    ("bank",       r"\b(central bank|interest rates?|rates? (hike|cut|rise|decision)|(cuts?|raises?|hikes?|holds?) (its )?(\w+ )?rates?|benchmark rate|policy rate|selic|repo rate|federal reserve|the fed\b|ecb\b|boj\b|inflation|monetary)\b"),
    ("chart",      r"\b(stocks?|shares|stock market|markets?|nasdaq|dow jones|s&p|wall street|gdp|earnings|ipo|rating agency|downgrade|upgrade|unemployment)\b"),
    ("oil",        r"\b(pipeline|drilling|refinery|refineries|oil ?field|opec)\b"),
    ("barrel",     r"\b(oil|crude|fuel|petrol|gasoline|diesel|gas prices?|lng|energy prices?)\b"),
    ("factory",    r"\b(factory|factories|manufactur\w*|industrial|steel|plant workers|output data|production (fell|rose))\b"),
    ("tanker",     r"\b(tankers?|shipping|container|cargo|freight|ports?\b|canal|strait)\b"),
    ("boat",       r"\b(ferry|ferries|vessel|boats?|capsiz\w*|sinks?|sank|coast ?guard|navy|naval)\b"),
    ("plane",      r"\b(hotels?|touris\w*|plane|airplane|aircraft|airliner|airlines?|flights?|airports?|jets?|aviation|helicopter)\b"),
    ("medic",      r"\b(ebola|outbreak|virus|cholera|measles|malaria|vaccin\w*|hospitals?|disease|epidemic|pandemic|health (ministry|officials|agency)|world health|doctors?|clinic)\b"),
    ("footballer", r"\b(football|soccer|world cup|olympic\w*|league|championship\w*|tennis|cricket|rugby|athletics|marathon|nba|nfl|mlb|nhl|formula 1|grand prix|medal\w*|tournament|striker|goalkeeper|stadium|fifa|uefa)\b"),
    ("guitar",     r"\b(music|concert|festival|album|film|movie|cinema|oscar\w*|museum|artist\w*|book|novel|singer|band|theatre|theater|exhibition|grammy\w*|archaeolog\w*|world war (i|ii|two)|veterans?|anniversar\w*|memorial|tomb|burial|ancient|fossil|heritage)\b"),
    ("robot",      r"\b(satellites?|starlink|starshield|space ?x|spacecraft|ai\b|artificial intelligence|robots?|chips?|semiconductor\w*|openai|nvidia|tech giants?|cyber\w*|hack\w*|data cent\w*|software|app\b|smartphone)\b"),
    ("migrants",   r"\b(refugees?|migrants?|migration|asylum|displace\w*|flee\w*|fled|evacuat\w*|deport\w*|border crossing)\b"),
    ("protest",    r"\b(protest\w*|rally|rallies|march\w*|strikes?\b|demonstrat\w*|riots?|unrest|walkout|picket)\b"),
    ("summit",     r"\b(summit|talks|negotiat\w*|g20|g7|asean|nato|un general assembly|ceasefire|peace (deal|plan|talks))\b"),
    ("alert",      r"\b(shooting|shot dead|stabbing|killed|crash\w*|accident|fire\b|wreck|poison\w*|stampede|drown\w*|missing|bod(y|ies) found|murder\w*|homicide|dead)\b"),
    ("coin",       r"\b(parental leave|maternity|childcare|birth ?rate|benefits|currency|yen|dollar|euro|rupee|peso|yuan|budget|tax\w*|debt|bailout|subsid\w*|tariffs?|deficit|wages?|pension\w*)\b"),
    ("flagpost",   r"\b(treaty|pact|accord|agreement|rapprochement|diplomac\w*|delegation|foreign minister|sovereignty|independence|annex\w*|territory|border|sanctions?|diplomatic|ambassador|alliance|parliament|government|minister|president|prime minister)\b"),
    ("speaker",    r"\b(says|said|announc\w*|statement|warns|urges|calls for|vows|pledges|declares|speech)\b"),
]
ICON_RULES = [(name, re.compile(rx, re.I)) for name, rx in ICON_RULES]

# CAMEO root code -> figure, used when no keyword matched.
CAMEO_ICON = {
    "01": "speaker", "02": "speaker", "03": "speaker", "04": "speaker", "05": "flagpost",
    "06": "coin", "07": "medic", "08": "flagpost", "09": "court", "10": "protest",
    "11": "protest", "12": "flagpost", "13": "alert", "14": "protest", "15": "missile",
    "16": "flagpost", "17": "court", "18": "blast", "19": "missile", "20": "rubble",
}

URGENT_KW = re.compile(
    r"\b(killed|kills?|dead|deaths?|dies|died|death toll|toll|injured|wounded|massacre|attacks?|"
    r"airstrikes?|air strikes?|bombing|explosion|blast|floods?|flooding|earthquake|wildfires?|hurricane|"
    r"typhoon|cyclone|collapse[sd]?|crash\w*|outbreak|famine|starv\w*|displaced|flee\w*|fled|"
    r"evacuat\w*|missing|shooting|stabbing|hostages?|kidnapp\w*|war\b|fighting|clash\w*|violent|siege|"
    r"blockade|emergency|crisis|recession|layoffs|poison\w*|drown\w*|stampede|wreck|sinks|sank|"
    r"capsized|erupt\w*|landslide|tsunami|execut\w*|torture|abuse|shortage|murder\w*|homicide|bod(y|ies) found)\b", re.I)
GOOD_WEAK = re.compile(r"\b(historic|first[- ]ever|opens|hope|safe|protect\w*|expands?|boost\w*|milestone|celebrat\w*)\b", re.I)
FIGURATIVE = re.compile(r"\b(trade|drug|price|culture|bidding|word|tariff) wars?\b|\bwar of words\b", re.I)
GOOD_KW = re.compile(
    r"\b(rescued|saved|survive[sd]?|recover\w*|wins?|won|victory|champions?|breakthrough|cure|"
    r"approved|ceasefire holds|peace deal|peace agreement|released|freed|reunited|celebrat\w*|"
    r"awards?|nobel|discover\w*|milestone|first[- ]ever|historic|record low unemployment|"
    r"growth beats|surplus|reopens?|opens|inaugurat\w*|restored|cleared|safe|hope|donat\w*|free (school|health)|"
    r"benefits?|boost\w*|expands?|improv\w*|record (high|harvest)|lowest|eradicat\w*|protect\w*|conserv\w*|clean energy|solar|wins? (bid|approval))\b", re.I)
HEAVY_KW = re.compile(
    r"\b(killed|kills?|dead|deaths?|dies|died|death toll|massacre|airstrikes?|bombing|explosion|"
    r"floods?|flooding|earthquake|wildfires?|hurricane|typhoon|cyclone|collapse[sd]?|crash\w*|"
    r"outbreak|famine|stampede|drown\w*|tsunami|landslide|erupt\w*|murder\w*|homicide|bod(y|ies) found)\b", re.I)

# Page titles that mean the fetch hit a wall rather than an article.
BAD_TITLE = re.compile(
    r"(access denied|just a moment|attention required|403 forbidden|404|page not found|"
    r"are you a robot|captcha|subscribe to|sign in|log in|enable javascript|cloudflare|"
    r"^untitled$|^home$|^news$|^error|transcript|live updates|live blog|^live:|^watch:|^listen:|podcast|newsletter|"
    r"quiz|crossword|horoscope|obituar|^opinion|^letters?\b)", re.I)

# Sites whose pages are paywalled or bot-walled so often that it is cheaper to skip them.
SKIP_DOMAINS = {"facebook.com", "twitter.com", "x.com", "youtube.com", "instagram.com",
                "tiktok.com", "linkedin.com", "reddit.com", "wsj.com", "ft.com", "bloomberg.com",
                "nytimes.com", "pressreader.com", "msn.com", "yahoo.com", "news.google.com"}

# Very large "regional" sources that otherwise crowd out the rest of the world.
COUNTRY_CAP_DEFAULT = 3
COUNTRY_CAP = {"US": 4}
GOOD_MIN = 3
CONTINENT_MIN = {"africa": 2, "asia": 2, "europe": 2, "north_america": 2,
                 "south_america": 2, "oceania": 2}


# ---------------------------------------------------------------------------
# 1. Fetch the GDELT export files for the window
# ---------------------------------------------------------------------------
def latest_stamp(session: requests.Session) -> str:
    txt = session.get(GDELT_BASE + "lastupdate.txt", timeout=HTTP_TIMEOUT).text
    m = re.search(r"gdeltv2/(\d{14})\.export\.CSV\.zip", txt)
    if not m:
        raise RuntimeError("could not parse lastupdate.txt")
    return m.group(1)


def stamps_for_window(latest: str, hours: float) -> list[str]:
    t = dt.datetime.strptime(latest, "%Y%m%d%H%M%S")
    n = max(1, int(round(hours * 4)))
    return [(t - dt.timedelta(minutes=15 * i)).strftime("%Y%m%d%H%M%S") for i in range(n)]


def fetch_export(session: requests.Session, stamp: str) -> list[list[str]]:
    url = f"{GDELT_BASE}{stamp}.export.CSV.zip"
    try:
        r = session.get(url, timeout=HTTP_TIMEOUT * 3)
        if r.status_code != 200:
            return []
        z = zipfile.ZipFile(io.BytesIO(r.content))
        rows = []
        for name in z.namelist():
            with z.open(name) as fh:
                for raw in io.TextIOWrapper(fh, encoding="utf-8", errors="replace"):
                    parts = raw.rstrip("\n").split("\t")
                    if len(parts) >= 61:
                        rows.append(parts)
        return rows
    except Exception as e:  # network blip on one file is not fatal
        print(f"  ! {stamp}: {e}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# 2. Collapse events into candidate stories (one per source URL)
# ---------------------------------------------------------------------------
def collect_candidates(rows: list[list[str]]) -> list[dict]:
    by_url: dict[str, dict] = {}
    for p in rows:
        url = p[C["SOURCEURL"]].strip()
        if not url.startswith("http"):
            continue
        try:
            geotype = int(p[C["GEOTYPE"]] or 0)
            lat = float(p[C["GEOLAT"]]); lon = float(p[C["GEOLON"]])
        except ValueError:
            continue
        if geotype == 0 or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        if lat == 0 and lon == 0:
            continue
        domain = urlparse(url).netloc.lower().removeprefix("www.")
        if any(domain == d or domain.endswith("." + d) for d in SKIP_DOMAINS):
            continue
        try:
            mentions = int(p[C["NUMMENTIONS"]] or 0)
            sources = int(p[C["NUMSOURCES"]] or 0)
            articles = int(p[C["NUMARTICLES"]] or 0)
            gold = float(p[C["GOLDSTEIN"]] or 0)
            tone = float(p[C["AVGTONE"]] or 0)
            quad = int(p[C["QUADCLASS"]] or 0)
        except ValueError:
            continue
        iso = iso_from_fips(p[C["GEOCOUNTRY"]])
        cand = by_url.setdefault(url, {
            "url": url, "domain": domain, "geos": defaultdict(int), "roots": defaultdict(int),
            "gold": [], "tone": [], "quad": [], "mentions": 0, "sources": 0, "articles": 0,
            "actors": set(), "isroot": 0,
        })
        key = (p[C["GEONAME"]], iso, p[C["GEOCOUNTRY"]], round(lat, 2), round(lon, 2), geotype)
        # Prefer precise places (geotype 3/4 = city/landmark) over country centroids (1).
        cand["geos"][key] += mentions * (2 if geotype >= 3 else 1)
        cand["roots"][p[C["EVENTROOT"]]] += mentions
        cand["gold"].append(gold); cand["tone"].append(tone); cand["quad"].append(quad)
        cand["mentions"] += mentions; cand["sources"] = max(cand["sources"], sources)
        cand["articles"] = max(cand["articles"], articles)
        cand["isroot"] += int(p[C["ISROOT"]] or 0)
        for a in (p[C["ACTOR1NAME"]], p[C["ACTOR2NAME"]]):
            if a:
                cand["actors"].add(a.title())

    out = []
    for cand in by_url.values():
        geo = max(cand["geos"].items(), key=lambda kv: kv[1])[0]
        geoname, iso, fips, lat, lon, geotype = geo
        parts = [s.strip() for s in geoname.split(",") if s.strip()]
        place = parts[0] if parts else (geoname or "Unknown")
        country = parts[-1] if parts else ""
        if geotype == 1:  # country-level only: the "place" is the country itself
            place = country or place
        place, country = nice_case(place), nice_case(country)
        cand.update({
            "place": place, "country": country, "iso": iso, "fips": fips,
            "lat": lat, "lon": lon, "geotype": geotype,
            "root": max(cand["roots"].items(), key=lambda kv: kv[1])[0],
            "gold_avg": sum(cand["gold"]) / len(cand["gold"]),
            "tone_avg": sum(cand["tone"]) / len(cand["tone"]),
            "quad_max": max(cand["quad"]),
            "continent": continent_from_iso(iso),
            # coverage score: how many outlets are talking about it, how prominently
            "score": cand["mentions"] * (1 + 0.25 * cand["sources"]) * (1.5 if cand["isroot"] else 1),
        })
        out.append(cand)
    out.sort(key=lambda c: c["score"], reverse=True)
    return out


# ---------------------------------------------------------------------------
# 3. Pull headline + summary from the source page
# ---------------------------------------------------------------------------
META_RX = re.compile(r"<meta\s+[^>]*>", re.I | re.S)
ATTR_RX = re.compile(r"""([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))""", re.S)
TITLE_RX = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


def _attrs(tag: str) -> dict:
    d = {}
    for m in ATTR_RX.finditer(tag):
        d[m.group(1).lower()] = html.unescape(m.group(3) or m.group(4) or m.group(5) or "")
    return d


def clean_text(s: str, limit: int) -> str:
    s = html.unescape(re.sub(r"\s+", " ", s or "")).strip()
    s = s.replace("*", "")
    if len(s) > limit:
        cut = s[:limit].rsplit(" ", 1)[0]
        s = cut.rstrip(" ,;:-") + "…"
    return s


ENGLISH_HINT = re.compile(r"\b(the|to|in|of|and|for|on|as|with|at|by|after|over|from|is|are|says|new)\b", re.I)


def looks_english(title: str) -> bool:
    letters = re.findall(r"[^\W\d_]", title)
    if not letters:
        return False
    ascii_share = sum(1 for ch in letters if ch.isascii()) / len(letters)
    return ascii_share > 0.9 and bool(ENGLISH_HINT.search(title))


SMALL_WORDS = {"of", "the", "and", "da", "de", "del", "la", "di", "du", "des", "al", "el", "van", "von", "y"}


def nice_case(name: str) -> str:
    words = name.split()
    return " ".join(w if i == 0 or w.lower() not in SMALL_WORDS else w.lower() for i, w in enumerate(words))


def strip_site_suffix(title: str, domain: str) -> str:
    # "Headline | Outlet Name" / "Headline - Outlet" -> "Headline"
    for sep in (" | ", " – ", " — ", " - ", " :: "):
        if sep in title:
            head, tail = title.rsplit(sep, 1)
            if len(tail) <= 40 and len(head) >= 20:
                title = head
    return title.strip()


def fetch_page_meta(url: str, domain: str, session: requests.Session) -> dict | None:
    try:
        r = session.get(url, timeout=HTTP_TIMEOUT, allow_redirects=True,
                        headers={"User-Agent": UA, "Accept-Language": "en"})
        if r.status_code != 200 or "html" not in r.headers.get("content-type", "html"):
            return None
        page = r.text[:300_000]
    except Exception:
        return None
    meta = {}
    for tag in META_RX.findall(page):
        a = _attrs(tag)
        key = (a.get("property") or a.get("name") or "").lower()
        if key in ("og:title", "twitter:title", "og:description", "description", "twitter:description",
                   "og:site_name", "article:published_time", "og:locale"):
            meta.setdefault(key, a.get("content", ""))
    title = meta.get("og:title") or meta.get("twitter:title") or ""
    if not title:
        m = TITLE_RX.search(page)
        title = m.group(1) if m else ""
    title = strip_site_suffix(clean_text(title, 200), domain)
    title = re.sub(r"^(news|breaking|update|exclusive|video|photos?)\s*[:|-]\s*", "", title, flags=re.I)
    if len(title) < 18 or BAD_TITLE.search(title):
        return None
    locale = (meta.get("og:locale") or "en").lower()
    if not locale.startswith("en"):
        return None
    if not looks_english(title):
        return None
    desc = clean_text(meta.get("og:description") or meta.get("description")
                      or meta.get("twitter:description") or "", 420)
    if desc and (desc.lower().startswith(title.lower()[:40]) and len(desc) < len(title) + 20):
        desc = ""
    return {"title": clean_text(title, 110), "summary": desc,
            "source": clean_text(meta.get("og:site_name") or domain, 60)}


# ---------------------------------------------------------------------------
# 3b. Where is the story? GDELT geocodes the *event* it extracted, which is
#     often a side detail (a Yemeni port in a story about Iran). If the headline
#     names a country and never mentions GDELT's country, trust the headline.
# ---------------------------------------------------------------------------
EXTRA_ALIASES = {
    "US": ["U.S.", "US", "USA", "America", "American", "Americans", "White House", "Pentagon", "Washington DC"],
    "GB": ["UK", "U.K.", "Britain", "British", "England", "English", "Scotland", "Scottish", "Wales", "Welsh", "London"],
    "AU": ["Aussie", "Aussies", "Australian", "Australians"], "NZ": ["Kiwi", "Kiwis", "New Zealander"],
    "CN": ["Chinese", "Beijing", "Shanghai", "Hong Kong"], "TW": ["Taiwanese"], "JP": ["Japanese", "Tokyo"],
    "KR": ["Korean", "Seoul"], "KP": ["North Korean", "Pyongyang"], "IN": ["Indian", "New Delhi", "Delhi", "Mumbai"],
    "PK": ["Pakistani", "Islamabad", "Karachi", "Lahore"], "AF": ["Afghan", "Kabul"],
    "IR": ["Iranian", "Iranians", "Tehran"], "IQ": ["Iraqi", "Baghdad"], "SY": ["Syrian", "Damascus"],
    "IL": ["Israeli", "Israelis", "Tel Aviv"], "PS": ["Palestinian", "Palestinians", "Gaza", "West Bank"],
    "LB": ["Lebanese", "Beirut"], "YE": ["Yemeni", "Sanaa"],
    "SA": ["Saudi", "Saudis", "Riyadh"], "AE": ["UAE", "Emirati", "Dubai", "Abu Dhabi"], "QA": ["Qatari", "Doha"],
    "TR": ["Turkish", "Türkiye", "Ankara", "Istanbul"], "EG": ["Egyptian", "Cairo"], "RU": ["Russian", "Russians", "Kremlin", "Moscow"],
    "UA": ["Ukrainian", "Ukrainians", "Kyiv"], "BY": ["Belarusian", "Minsk"],
    "DE": ["German", "Germans", "Berlin"], "FR": ["French", "Paris"], "IT": ["Italian", "Rome"],
    "ES": ["Spanish", "Madrid"], "PL": ["Polish", "Warsaw"], "NL": ["Dutch", "Amsterdam"], "EE": ["Estonian", "Tallinn"],
    "CA": ["Canadian", "Canadians", "Ottawa", "Toronto", "Quebec"], "MX": ["Mexican", "Mexico City"],
    "BR": ["Brazilian", "Brasilia"], "AR": ["Argentine", "Argentinian", "Buenos Aires"], "VE": ["Venezuelan", "Caracas"],
    "CO": ["Colombian", "Bogota"], "CL": ["Chilean", "Santiago"], "PE": ["Peruvian", "Lima"],
    "NG": ["Nigerian", "Abuja", "Lagos"], "KE": ["Kenyan", "Nairobi"], "ZA": ["South African", "Johannesburg", "Cape Town"],
    "ET": ["Ethiopian", "Addis Ababa"], "SD": ["Sudanese", "Khartoum"], "SS": ["South Sudanese"], "SO": ["Somali", "Mogadishu"],
    "CD": ["DR Congo", "DRC", "Congolese", "Kinshasa"], "UG": ["Ugandan", "Kampala"], "GH": ["Ghanaian", "Accra"],
    "MA": ["Moroccan", "Rabat"], "PH": ["Filipino", "Philippine", "Manila"], "ID": ["Indonesian", "Jakarta"],
    "VN": ["Vietnamese", "Hanoi"], "TH": ["Thai", "Bangkok"], "MM": ["Myanmar", "Burmese"], "BD": ["Bangladeshi", "Dhaka"],
}
# Names that are also common words or people: never used on their own.
AMBIGUOUS = {"Georgia", "Jordan", "Chad", "Victoria", "Kingston", "Georgetown", "Washington", "Santiago"}


def _build_place_index():
    alias = {}
    for iso, (name, capital, lat, lon) in COUNTRY.items():
        for a in [name] + ([capital] if len(capital) > 4 else []) + EXTRA_ALIASES.get(iso, []):
            if a not in AMBIGUOUS:
                alias.setdefault(a, (iso, None))
    for state in US_STATES:
        if state not in AMBIGUOUS:
            alias.setdefault(state, ("US", state))
    alias["Republic of Georgia"] = ("GE", None)
    # longest names first so "South Sudan" wins over "Sudan", "Papua New Guinea" over "Guinea"
    names = sorted(alias, key=len, reverse=True)
    rx = re.compile(r"(?<![\w.])(" + "|".join(re.escape(n) for n in names) + r")(?![\w])")
    return alias, rx


PLACE_ALIAS, PLACE_RX = _build_place_index()


def place_mentions(text: str) -> list[tuple[str, str | None, int]]:
    """(iso, us_state, position) for every country/state named in text, case-sensitive."""
    return [(*PLACE_ALIAS[m.group(1)], m.start()) for m in PLACE_RX.finditer(text)]


def locate_from_text(title: str, summary: str, iso: str, place: str = "") -> dict | None:
    """Return a new location if the text clearly points somewhere other than GDELT's geocode."""
    if place and len(place) > 3 and place.lower() in f"{title} {summary}".lower():
        return None  # GDELT's own town is named in the story: trust it
    t_hits, s_hits = place_mentions(title), place_mentions(summary)
    if not t_hits and not s_hits:
        return None
    score = defaultdict(int)
    first = {}
    for h in t_hits:
        score[h[0]] += 3; first.setdefault(h[0], h[2])
    for h in s_hits:
        score[h[0]] += 1; first.setdefault(h[0], 1000 + h[2])
    best = max(score, key=lambda k: (score[k], -first[k]))
    # Only move a story to a country its headline names, and only if that country
    # outweighs GDELT's own (people and groups are deliberately not aliases: they travel).
    if first[best] >= 1000 or best not in COUNTRY or score.get(iso, 0) >= score[best]:
        return None
    state = next((h[1] for h in t_hits + s_hits if h[0] == best and h[1]), None)
    name, capital, lat, lon = COUNTRY[best]
    if state:
        lat, lon = US_STATES[state]
        return {"iso": best, "place": state, "country": name, "lat": lat, "lon": lon}
    return {"iso": best, "place": capital, "country": name, "lat": lat, "lon": lon}


# ---------------------------------------------------------------------------
# 4. Rules for tone / figure / weight
# ---------------------------------------------------------------------------
def classify(cand: dict, title: str, summary: str) -> tuple[str, str, str]:
    title = FIGURATIVE.sub(" ", title); summary = FIGURATIVE.sub(" ", summary)
    text = f"{title}. {summary}"
    urgent_text = len(URGENT_KW.findall(title)) * 2 + len(URGENT_KW.findall(summary))
    good_text = len(GOOD_KW.findall(title)) * 2 + len(GOOD_KW.findall(summary))
    urgent, good = urgent_text, good_text
    if cand["quad_max"] == 4:
        urgent += 2
    if cand["gold_avg"] <= -5:
        urgent += 1
    if cand["gold_avg"] >= 5:
        good += 1
    if cand["tone_avg"] >= 2:
        good += 1
    if cand["tone_avg"] <= -4:
        urgent += 1
    # GDELT's event codes and tone scores can push a story either way, but only
    # the words of the headline and summary can make it urgent or good.
    if urgent_text and urgent >= 2 and urgent > good:
        tone = "urgent"
    elif good_text and ((good >= 3 and good > urgent and len(GOOD_KW.findall(title)) > len(GOOD_WEAK.findall(title)))
                        or (urgent_text == 0 and len(GOOD_KW.findall(title)) > len(GOOD_WEAK.findall(title)))):
        tone = "good"
    else:
        tone = "neutral"

    # Headline first; then the summary, skipping the catch-all "says/said" figure.
    icon = next((name for name, rx in ICON_RULES if rx.search(title)), None)
    if icon is None:
        icon = next((name for name, rx in ICON_RULES if name != "speaker" and rx.search(summary)), None)
    if icon is None:
        icon = CAMEO_ICON.get(cand["root"], "globe")
    if tone == "good" and icon in ("blast", "missile", "rubble"):
        icon = "flagpost"
    # Legal proceedings are procedural news unless the headline itself reports deaths.
    if icon == "court" and tone == "urgent" and not HEAVY_KW.search(title):
        tone = "neutral"

    if tone == "urgent" and (cand["quad_max"] == 4 or HEAVY_KW.search(text)):
        weight = "heavy"
    elif tone == "good":
        weight = "light"
    else:
        weight = "normal"
    return tone, icon, weight


def slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:48] or "story"


def title_key(title: str) -> str:
    words = re.findall(r"[a-z0-9]+", title.lower())
    stop = {"the", "a", "an", "of", "in", "on", "to", "for", "and", "as", "at", "by", "with", "is", "are", "after", "over"}
    words = [w for w in words if w not in stop]
    return " ".join(sorted(words[:7]))


# ---------------------------------------------------------------------------
# 5. Select a globally spread set
# ---------------------------------------------------------------------------
def select_spread(stories: list[dict], count: int) -> list[dict]:
    chosen, per_country, per_cont, seen_titles = [], defaultdict(int), defaultdict(int), set()

    def take(st):
        chosen.append(st); per_country[st["iso"]] += 1; per_cont[st["continent"]] += 1
        seen_titles.add(st["_tkey"])

    def ok(st):
        cap = COUNTRY_CAP.get(st["iso"], COUNTRY_CAP_DEFAULT)
        return st["_tkey"] not in seen_titles and per_country[st["iso"]] < cap

    # First pass: guarantee every continent its minimum from its best stories.
    for cont, need in CONTINENT_MIN.items():
        for st in stories:
            if per_cont[cont] >= need:
                break
            if st["continent"] == cont and st not in chosen and ok(st):
                take(st)
    # Reserve a few places for good news so the green filter is never empty.
    for st in stories:
        if sum(1 for c in chosen if c["tone"] == "good") >= GOOD_MIN:
            break
        if st["tone"] == "good" and st not in chosen and ok(st):
            take(st)
    # Second pass: fill by coverage score.
    for st in stories:
        if len(chosen) >= count:
            break
        if st not in chosen and ok(st):
            take(st)
    chosen.sort(key=lambda s: s["score"], reverse=True)
    return chosen[:count]


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def build(hours: float, count: int, pool: int, workers: int) -> dict:
    session = requests.Session()
    session.headers["User-Agent"] = UA

    latest = latest_stamp(session)
    stamps = stamps_for_window(latest, hours)
    print(f"GDELT latest {latest}; fetching {len(stamps)} export files")
    rows = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for part in ex.map(lambda s: fetch_export(session, s), stamps):
            rows.extend(part)
    print(f"  {len(rows)} events")
    cands = collect_candidates(rows)
    print(f"  {len(cands)} candidate stories with a location")

    # Pre-balance the pool so we don't spend every fetch on one country.
    pool_list, per_c = [], defaultdict(int)
    for c in cands:
        if per_c[c["iso"]] < max(COUNTRY_CAP.get(c["iso"], COUNTRY_CAP_DEFAULT) * 4, 6):
            pool_list.append(c); per_c[c["iso"]] += 1
        if len(pool_list) >= pool:
            break
    # Make sure weak continents are represented in the fetch pool too.
    for cont in CONTINENT_MIN:
        extra = [c for c in cands if c["continent"] == cont and c not in pool_list][:8]
        pool_list.extend(extra)

    print(f"  fetching headlines for {len(pool_list)} pages")
    stories = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(fetch_page_meta, c["url"], c["domain"], session): c for c in pool_list}
        for fut in as_completed(futs):
            c = futs[fut]
            meta = fut.result()
            if not meta:
                continue
            moved = locate_from_text(meta["title"], meta["summary"], c["iso"], c["place"])
            if moved:
                c = {**c, **moved, "continent": continent_from_iso(moved["iso"]), "moved": True}
            tone, icon, weight = classify(c, meta["title"], meta["summary"])
            st = {
                "id": slug(meta["title"]),
                "tone": tone, "icon": icon, "weight": weight,
                "title": meta["title"],
                "place": c["place"], "country": c["country"] or c["place"],
                "flag": flag_from_iso(c["iso"]), "iso": c["iso"] or "",
                "lat": round(c["lat"], 2), "lon": round(c["lon"], 2),
                "what": meta["summary"] or f"Reported by {meta['source']}. Open the source for the full story.",
                "source": meta["source"], "url": c["url"],
                "stats": [{"v": str(min(c["sources"], 999)), "l": "news sources"},
                          {"v": str(min(c["mentions"], 9999)), "l": "mentions tracked"}],
                "continent": c["continent"], "score": round(c["score"], 1),
                "_tkey": title_key(meta["title"]),
            }
            if not (-58 <= st["lat"] <= 84):
                continue
            stories.append(st)
    stories.sort(key=lambda s: s["score"], reverse=True)
    print(f"  {len(stories)} stories with usable headlines")

    chosen = select_spread(stories, count)
    # unique ids
    seen = set()
    for st in chosen:
        base, i = st["id"], 2
        while st["id"] in seen:
            st["id"] = f"{base}-{i}"; i += 1
        seen.add(st["id"])
        st.pop("_tkey", None)

    now = dt.datetime.now(dt.timezone.utc)
    return {
        "day": {
            "iso": now.strftime("%Y-%m-%d"),
            "label": now.strftime("%A, %-d %B %Y"),
            "updated": now.strftime("%H:%M UTC"),
            "edition": now.strftime("%Y%m%d-%H%M"),
        },
        "meta": {
            "generated_at": now.isoformat(timespec="seconds"),
            "gdelt_latest": latest, "window_hours": hours,
            "events_scanned": len(rows), "candidates": len(cands),
            "pages_fetched": len(pool_list), "usable": len(stories), "selected": len(chosen),
            "source": "GDELT 2.0 Events + source page metadata; rules only, no language model",
        },
        "events": chosen,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="site/data/events.json")
    ap.add_argument("--hours", type=float, default=3.0, help="window of GDELT updates to scan")
    ap.add_argument("--count", type=int, default=30)
    ap.add_argument("--pool", type=int, default=140, help="how many source pages to try")
    ap.add_argument("--workers", type=int, default=16)
    ap.add_argument("--min", type=int, default=12, help="fail (keep last edition) below this many stories")
    a = ap.parse_args()

    t0 = time.time()
    data = build(a.hours, a.count, a.pool, a.workers)
    n = len(data["events"])
    tones = {t: sum(1 for e in data["events"] if e["tone"] == t) for t in ("urgent", "neutral", "good")}
    print(f"selected {n} stories {tones} in {time.time() - t0:.0f}s")
    if n < a.min:
        print(f"only {n} stories (< {a.min}); refusing to overwrite the last good edition", file=sys.stderr)
        sys.exit(2)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
