"""Reports of one event from several outlets merge into one story that outranks single-article
stories; unrelated stories that merely share a country stay apart; mojibake is repaired.
Run: python tests/test_clusters.py"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import build_events as be  # noqa: E402

titles = [  # real headlines from the 19 Nov 2026 edition, with made-up single-article scores
    ("Court papers: suspect objected to driver's name before seatbelt strangling attack", 900),
    ("Russian national accused of spying on employees of Silicon Valley defense and technology company", 800),
    ("APEC summit: Xi, Trump and Putin to hold first-ever trilateral in China", 300),
    ("Trump’s Latest Strongman Summit Is Exposing All His Fatal Weaknesses", 250),
    ("Putin expecting a 'big potential benefit' from historic trilateral meeting with Trump and Xi", 180),
    ("Xi vows to resist protectionism as Putin attacks Western sanctions", 120),
    ("US and Venezuela sign a deal to reestablish military ties, Hegseth says in visit to Caracas", 140),
    ("Hegseth signs military partnership with Venezuela during surprise Caracas visit", 110),
    ("Republicans at a crossroads for Iran war support", 170),
    ("Iran hammers US drone, missile sites in Kuwait", 130),
    ("Mideast nations ramp up efforts to avert all-out war as Israel urges Iran strikes, officials say", 160),
]
stories = [{"title": t, "what": "", "score": sc, "stats": [{"v": "1", "l": "news sources"}]} for t, sc in titles]
out = be.cluster_stories(stories)
assert out[0]["title"].startswith("APEC summit") and out[0]["reports"] == 4, [(o["title"][:30], o["score"]) for o in out]
assert any(o.get("reports") == 2 and "Venezuela" in o["title"] for o in out)
assert sum("Iran" in o["title"] for o in out) == 3, "different Iran stories must stay separate"
assert be.fix_mojibake("Trumpâ€™s summit") == "Trump’s summit"
assert be.fix_mojibake("Trumpâ\u0080\u0099s summit") == "Trump’s summit"
assert be.fix_mojibake("Café in São Paulo") == "Café in São Paulo"
print("ok:", [(o["title"][:40], o["score"], o.get("reports", 1)) for o in out[:4]])
