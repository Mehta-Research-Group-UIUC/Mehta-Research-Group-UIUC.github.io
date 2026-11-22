#!/usr/bin/env python3
"""
Download the lab photos from the old Google Site into images/gallery/.

Run this from your site folder (the one with gallery.html in it):

    python3 download_gallery.py

How it works: Google's photo links on the old site are temporary, so the
script first opens the old gallery page, collects fresh links to the photos
(in the order they appear on the page), and downloads them right away.
Uses only the Python standard library; nothing to install.
"""
import os
import re
import sys
import urllib.request

GALLERY_PAGE = "https://mehta.mechse.illinois.edu/gallery"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "gallery")

# File names, in the order the photos appear on the old gallery page (newest first).
NAMES = [
    "2024-06-udit-farewell-1.jpg",
    "2024-06-udit-farewell-2.jpg",
    "2023-11-jin-thesis-award-1.jpg",
    "2023-11-jin-thesis-award-2.jpg",
    "2023-09-open-house-1.jpg",
    "2023-09-open-house-2.jpg",
    "2022-06-jin-defense-1.jpg",
    "2022-06-jin-defense-2.jpg",
    "2022-06-csl-quad-2022-1.jpg",
    "2021-08-kelly-farewell-1.jpg",
    "2021-08-csl-quad-2021-1.jpg",
    "2021-07-lunch-2021-1.jpg",
    "2021-05-sean-meyn-1.jpg",
    "2020-07-beers-2020b-1.jpg",
    "2020-07-beers-2020a-1.jpg",
    "2019-12-cdc-2019-1.jpg",
    "2019-12-cdc-2019-2.jpg",
    "2019-08-amir-farewell-1.jpg",
    "2019-08-amir-farewell-2.jpg",
    "2019-06-amir-defense-1.jpg",
    "2019-06-amir-defense-2.jpg",
    "2019-06-amir-defense-3.jpg",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Referer": "https://mehta.mechse.illinois.edu/",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def get(url, accept_html=False):
    h = dict(HEADERS)
    if accept_html:
        h["Accept"] = "text/html,application/xhtml+xml"
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def fresh_links():
    """Read the old gallery page and return its photo links, in page order."""
    html = get(GALLERY_PAGE, accept_html=True).decode("utf-8", "replace")
    found = re.findall(r'https://lh\d+(?:-\w+)?\.googleusercontent\.com/[^"\'\s<>)]+', html)
    links, seen = [], set()
    for u in found:
        u = u.replace("&amp;", "&").replace("\\u003d", "=").replace("\\u0026", "&")
        if "sitesv-images" not in u and "/s/" not in u:
            continue
        key = re.sub(r"=[^=/]*$", "", u)          # ignore the size suffix when de-duplicating
        if key in seen:
            continue
        seen.add(key)
        links.append(key + "=w1600")               # ask for a large version
    return links


def main():
    os.makedirs(OUT, exist_ok=True)
    try:
        links = fresh_links()
    except Exception as e:
        print("Could not open the old gallery page:", e)
        sys.exit(1)

    # the old page's social-preview image repeats the first photo; drop any extras at the front
    if len(links) > len(NAMES):
        links = links[-len(NAMES):]
    print(f"Found {len(links)} photos on the old page (expected {len(NAMES)}).\n")
    if len(links) != len(NAMES):
        print("The count does not match, so names may not line up with photos.")
        print("Photos will still be saved; check them against gallery.html afterwards.\n")

    ok = 0
    for name, url in zip(NAMES, links):
        path = os.path.join(OUT, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            print("already have", name)
            ok += 1
            continue
        try:
            data = get(url)
            with open(path, "wb") as f:
                f.write(data)
            print("saved", name)
            ok += 1
        except Exception as e:
            print("FAILED", name, "-", e)
    print(f"\n{ok} of {len(NAMES)} photos in {OUT}")
    if ok < len(NAMES):
        print("If photos keep failing, save them by hand instead (see the note from Claude).")


if __name__ == "__main__":
    main()