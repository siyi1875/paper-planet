"""Offline smoke test: feeds build_events a synthetic GDELT export and fake page
metadata, then checks the JSON the page will load. Run: python tests/test_offline.py"""
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import build_events as be  # noqa: E402

ICONS = {"summit", "speaker", "flagpost", "ballot", "protest", "migrants", "court", "missile", "blast",
         "rubble", "alert", "boat", "tanker", "plane", "flood", "wildfire", "bank", "chart", "coin",
         "barrel", "oil", "factory", "medic", "footballer", "guitar", "robot", "globe"}

# (fips, geoname, lat, lon, geotype, root, quad, goldstein, tone, headline, summary)
SAMPLE = [
    ("UP", "Kyiv, Kyyiv, Misto, Ukraine", 50.4333, 30.5167, 4, "19", 4, -10, -7.2,
     "Russian missiles and drones injure at least 20 in Kyiv", "A combined overnight attack hit three districts of the capital, officials said."),
    ("IR", "Strait Of Hormuz, Iran (General), Iran", 26.5667, 56.25, 4, "15", 3, -7.2, -3.1,
     "Tankers queue as the Strait of Hormuz enters a seventh month closed", "Shipping data shows more than 200 vessels waiting outside the Gulf."),
    ("JA", "Tokyo, Tokyo, Japan", 35.685, 139.7514, 4, "01", 1, 0, 1.2,
     "Bank of Japan raises interest rate to 1.25%, a 31-year high", "The decision passed seven to two."),
    ("KE", "Nairobi, Nairobi Area, Kenya", -1.2833, 36.8167, 4, "05", 2, 3.4, 4.1,
     "Nairobi wins bid to host first World Athletics Championships in Africa", "The city celebrates a historic first for the continent."),
    ("SU", "West Kordofan, Sudan (General), Sudan", 12.0, 28.5, 2, "20", 4, -10, -8,
     "Gold mine collapse kills at least 60 in Sudan's West Kordofan", "Rescuers are digging with hand tools."),
    ("BR", "Brasilia, Distrito Federal, Brazil", -15.7833, -47.9167, 4, "01", 1, 0, 0.3,
     "Brazil cuts Selic rate to 13.75% in fifth straight reduction", "The central bank cited easing inflation."),
    ("AS", "Canberra, Australian Capital Territory, Australia", -35.2833, 149.2167, 4, "01", 1, 0, -0.5,
     "Australia moves to cut migration and bar students' families", "The minister said net migration would fall to 245,000."),
    ("NZ", "Wellington, New Zealand (General), New Zealand", -41.3, 174.7833, 4, "09", 1, 0, -1,
     "Tribunal finds curriculum rewrite breached treaty principles", "Labour pledged to pause the changes if elected."),
    ("US", "Washington, District Of Columbia, United States", 38.8951, -77.0364, 3, "01", 1, 0, -1,
     "Fed raises rates for the first time since 2023", "Chair Warsh said inflation is the problem."),
    ("US", "New York, New York, United States", 40.7142, -74.0064, 3, "04", 2, 1, 0.5,
     "UN General Assembly votes to let Abbas address it remotely", "The vote was 152 to 3."),
    ("US", "Los Angeles, California, United States", 34.0522, -118.2437, 3, "18", 4, -9, -6,
     "Wildfire forces evacuations north of Los Angeles", "Thousands of homes are under evacuation orders."),
    ("US", "Chicago, Illinois, United States", 41.85, -87.65, 3, "14", 3, -6.5, -2,
     "Chicago teachers strike enters second week", "Classes remain cancelled for 300,000 pupils."),
    ("US", "Miami, Florida, United States", 25.7743, -80.1937, 3, "01", 1, 0, 0,
     "Miami unveils new seawall plan", "The city council approved the plan on Tuesday."),
    ("CA", "Edmonton, Alberta, Canada", 53.55, -113.4687, 3, "01", 1, 0, 0.1,
     "Alberta puts separation question to October referendum", "Ten questions will be on the ballot."),
    ("MX", "Mexico City, Distrito Federal, Mexico", 19.4342, -99.1386, 3, "17", 4, -7, -4,
     "Mexican police arrest cartel leader in Mexico City raid", "The suspect faces extradition."),
    ("VE", "Caracas, Distrito Federal, Venezuela", 10.488, -66.8792, 3, "05", 2, 3.4, 2.2,
     "Britain upgrades ties with Venezuela and names ambassador", "Relations were downgraded years ago."),
    ("AR", "Buenos Aires, Distrito Federal, Argentina", -34.5875, -58.6725, 3, "01", 1, 0, -1.5,
     "Argentina projects 4% growth in 2027 budget", "Economists called the target optimistic."),
    ("CG", "Bunia, Ituri, Democratic Republic Of The Congo", 1.5667, 30.25, 4, "07", 2, 7, -3,
     "Ebola outbreak in Congo passes 6,700 cases", "WHO says the case fatality rate is 48 percent."),
    ("NI", "Ondo, Ondo, Nigeria", 7.0833, 4.8333, 4, "20", 4, -10, -7,
     "At least 48 dead in Nigeria after drinking methanol-laced spirit", "About 100 remain in hospital."),
    ("MO", "Rabat, Rabat-Sale-Zemmour-Zaer, Morocco", 34.0253, -6.8361, 4, "01", 1, 0, 0,
     "Morocco votes next week with youth unemployment at 37 percent", "27 parties are competing for 395 seats."),
    ("SF", "Boksburg, Gauteng, South Africa", -26.2125, 28.2625, 4, "18", 4, -9.5, -8,
     "Ninth woman's body found on Johannesburg's East Rand", "Police have offered a reward."),
    ("VM", "Thanh Hoa, Thanh Hoa, Vietnam", 19.8, 105.7667, 4, "01", 1, 0, -5,
     "Floods inundate more than 16,000 homes across northern Vietnam", "Three people died in a landslide."),
    ("ID", "Palangkaraya, Kalimantan Tengah, Indonesia", -2.2167, 113.9167, 4, "01", 1, 0, -4,
     "Indonesian wildfire smoke doubles respiratory infections in a week", "Haze has closed schools."),
    ("KN", "Pyongyang, P'yongyang-Si, North Korea", 39.0194, 125.7547, 4, "01", 1, 0, -2,
     "Kim Yo Jong calls North Korea's nuclear status irreversible", "The statement rejected IAEA discussion."),
    ("CH", "Beijing, Beijing, China", 39.9289, 116.3883, 4, "04", 2, 1, 1,
     "Trump to host Xi next week with low expectations", "Officials on both sides played down the summit."),
    ("SW", "Stockholm, Stockholms Lan, Sweden", 59.3333, 18.05, 4, "01", 1, 0, 0,
     "Sweden's count ends with the opposition three seats ahead", "The prime minister asked to be relieved."),
    ("GM", "Berlin, Berlin, Germany", 52.5167, 13.4, 4, "01", 1, 0, -3,
     "German petrol hits a record as Europe scrambles over fuel costs", "Diesel reached 2.40 euros a litre."),
    ("NL", "The Hague, Zuid-Holland, Netherlands", 52.0833, 4.3, 4, "09", 1, 0, -2,
     "Duterte appears at the ICC over the Philippine drug war", "He faces charges of crimes against humanity."),
    ("FR", "Paris, Ile-De-France, France", 48.8667, 2.3333, 4, "04", 2, 1, 1,
     "Paris hosts talks on what Lebanon's army needs", "European and Arab military leaders attended."),
    ("YM", "Taiz, Ta'izz, Yemen", 13.5795, 44.0205, 4, "19", 4, -10, -7,
     "Yemen's coastal fighting displaces 57,000 people in two weeks", "At least nine children have been killed."),
    ("FJ", "Suva, Central, Fiji", -18.1333, 178.4167, 4, "05", 2, 3.4, 3,
     "Pacific leaders sign declaration protecting kava", "Growers celebrated the agreement."),
    ("PE", "Trujillo, La Libertad, Peru", -8.1159, -79.0299, 4, "01", 1, 0, 2.5,
     "Untouched Chimu burial platform discovered at Chan Chan", "Archaeologists found 38 sets of remains."),
    ("UK", "London, London, City Of, United Kingdom", 51.5, -0.1167, 4, "01", 1, 0, 1,
     "London stocks slip as oil climbs again", "The FTSE 100 fell 0.1 percent."),
    ("IN", "New Delhi, Delhi, India", 28.6, 77.2, 4, "04", 2, 1, 0.5,
     "India opens semiconductor fair with new chip plant pledges", "The prime minister addressed the event."),
    ("EG", "Cairo, Al Qahirah, Egypt", 30.05, 31.25, 4, "04", 2, 1, 0.2,
     "Egypt hosts Gaza reconstruction talks", "Delegations arrived from six countries."),
    ("PP", "Port Moresby, National Capital, Papua New Guinea", -9.4431, 147.1797, 4, "18", 4, -9, -5,
     "Landslide cuts off villages in Papua New Guinea highlands", "Rescue teams are walking in."),
]


def fake_rows():
    rows, uid = [], 1000
    rnd = random.Random(7)
    for fips, name, lat, lon, gtype, root, quad, gold, tone, headline, summary in SAMPLE:
        url = "https://example-news.test/" + be.slug(headline)
        for _ in range(rnd.randint(1, 4)):  # same story appears in several 15-minute files
            row = [""] * 61
            row[0] = str(uid); uid += 1
            row[1] = "20261115"; row[6] = "GOVERNMENT"; row[25] = "1"
            row[26] = root + "0"; row[27] = root + "0"; row[28] = root; row[29] = str(quad)
            row[30] = str(gold); row[31] = str(rnd.randint(4, 60)); row[32] = str(rnd.randint(1, 12))
            row[33] = str(rnd.randint(1, 30)); row[34] = str(tone)
            row[51] = str(gtype); row[52] = name; row[53] = fips; row[56] = str(lat); row[57] = str(lon)
            row[59] = "20261115120000"; row[60] = url
            rows.append(row)
    # a few junk rows the parser must ignore
    rows.append([""] * 61)
    bad = [""] * 61; bad[60] = "https://example-news.test/x"; bad[51] = "0"; bad[56] = "0"; bad[57] = "0"
    rows.append(bad)
    return rows


META = {("https://example-news.test/" + be.slug(h)): {"title": h, "summary": s, "source": "Example News"}
        for *_, h, s in SAMPLE}


def main():
    be.latest_stamp = lambda session: "20261115120000"
    be.fetch_export = lambda session, stamp: fake_rows() if stamp.endswith("120000") else []
    be.fetch_page_meta = lambda url, domain, session: META.get(url)

    data = be.build(hours=3, count=30, pool=140, workers=4)
    ev = data["events"]
    fails = []
    ok = lambda c, m: None if c else fails.append(m)
    ok(25 <= len(ev) <= 30, f"count {len(ev)}")
    ids = [e["id"] for e in ev]
    ok(len(ids) == len(set(ids)), "duplicate ids")
    conts = {}
    for e in ev:
        ok(e["tone"] in ("urgent", "neutral", "good"), f"{e['id']} tone")
        ok(e["icon"] in ICONS, f"{e['id']} icon {e['icon']}")
        ok(e["weight"] in ("heavy", "normal", "light"), f"{e['id']} weight")
        ok(-58 <= e["lat"] <= 84 and -180 <= e["lon"] <= 180, f"{e['id']} coords")
        ok(len(e["flag"]) in (1, 2) , f"{e['id']} flag {e['flag']!r}")
        ok("*" not in e["what"], f"{e['id']} asterisk")
        ok(e["url"].startswith("http"), f"{e['id']} url")
        ok(all(len(s["v"]) < 8 and s["l"] == s["l"].lower() for s in e["stats"]), f"{e['id']} stats")
        conts[e["continent"]] = conts.get(e["continent"], 0) + 1
    for c, n in be.CONTINENT_MIN.items():
        ok(conts.get(c, 0) >= n, f"continent {c} has {conts.get(c, 0)} < {n}")
    us = sum(1 for e in ev if e["iso"] == "US")
    ok(us <= be.COUNTRY_CAP["US"], f"US has {us}")

    print(json.dumps(data["day"]), json.dumps(data["meta"]))
    for e in ev:
        print(f"  {e['flag']} {e['tone']:7} {e['icon']:10} {e['weight']:6} {e['place']}, {e['country']}  — {e['title']}")
    print("continents:", conts)
    if fails:
        print("FAILURES:\n  " + "\n  ".join(fails)); sys.exit(1)
    print("OFFLINE TEST OK")
    out = os.path.join(HERE, "..", "site", "data", "events.sample.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
