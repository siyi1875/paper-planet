"""Replays the rules on 30 real stories from the 15 Nov 2026 live edition (headline,
summary and GDELT's original geocode) and prints old vs new. GDELT's numeric signals
weren't saved, so they are set to neutral here. Run: python tests/test_replay.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import build_events as be  # noqa: E402

rows = json.load(open(os.path.join(HERE, "fixtures", "live-2026-11-15.json")))
neutral = {"quad_max": 1, "gold_avg": 0, "tone_avg": 0, "root": "04"}
changes = {"tone": 0, "icon": 0, "moved": 0, "dropped": 0}
icons = {}
for iso, place, country, old_tone, old_icon, title, what in rows:
    if be.BAD_TITLE.search(title):
        changes["dropped"] += 1
        print(f"DROP  {title[:70]}"); continue
    title = __import__("re").sub(r"^(news|breaking|update|exclusive|video|photos?)\s*[:|-]\s*", "", title, flags=2)
    moved = be.locate_from_text(title, what, iso, place)
    tone, icon, _ = be.classify(neutral, title, what)
    icons[icon] = icons.get(icon, 0) + 1
    where = f"{place}, {country}" + (f"  ->  {moved['place']}, {moved['country']}" if moved else "")
    changes["tone"] += tone != old_tone; changes["icon"] += icon != old_icon; changes["moved"] += bool(moved)
    print(f"{old_tone[:1]}>{tone[:1]}  {old_icon:>8}>{icon:<9} {title[:58]:<58}  {where}")
print(changes); print(dict(sorted(icons.items(), key=lambda kv: -kv[1])))
