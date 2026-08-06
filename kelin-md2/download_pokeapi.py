#!/usr/bin/env python3
"""
download_pokeapi.py

Downloads and extracts the PokeAPI sprite collection and the pre-rendered
PokeAPI JSON data archive into local folders (./sprites and ./data).

Requires: requests (third-party). zipfile, os, and sys are standard library.
Install requests with:  pip install requests
"""

import os
import sys
import zipfile
import requests

# Source archives (both are GitHub "download branch as zip" links, no auth needed)
SPRITES_URL = "https://github.com/PokeAPI/sprites/archive/refs/heads/master.zip"
DATA_URL = "https://github.com/PokeAPI/api-data/archive/refs/heads/master.zip"

# Where things go
WORK_DIR = os.path.dirname(os.path.abspath(__file__))
SPRITES_ZIP = os.path.join(WORK_DIR, "sprites_master.zip")
DATA_ZIP = os.path.join(WORK_DIR, "data_master.zip")
SPRITES_DIR = os.path.join(WORK_DIR, "sprites")
DATA_DIR = os.path.join(WORK_DIR, "data")


def download_file(url: str, dest_path: str, chunk_size: int = 1024 * 256) -> None:
    """Stream-download a URL to dest_path, printing progress as it goes."""
    print(f"\nDownloading:\n  {url}\n  -> {dest_path}")

    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()

    total_size = int(response.headers.get("content-length", 0))
    downloaded = 0

    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=chunk_size):
            if not chunk:
                continue
            f.write(chunk)
            downloaded += len(chunk)

            if total_size:
                pct = downloaded / total_size * 100
                mb_done = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                sys.stdout.write(
                    f"\r  {pct:5.1f}%  ({mb_done:.1f} MB / {mb_total:.1f} MB)"
                )
            else:
                mb_done = downloaded / (1024 * 1024)
                sys.stdout.write(f"\r  {mb_done:.1f} MB downloaded")
            sys.stdout.flush()

    print("\n  Done.")


def extract_zip(zip_path: str, target_dir: str) -> None:
    """Extract a zip archive into target_dir, stripping the top-level
    'reponame-master/' folder GitHub adds so the contents land directly
    in target_dir."""
    print(f"\nExtracting:\n  {zip_path}\n  -> {target_dir}")
    os.makedirs(target_dir, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        members = zf.namelist()
        total = len(members)

        # Figure out the common top-level prefix (e.g. "sprites-master/")
        top_level = members[0].split("/")[0] + "/" if members else ""

        for i, member in enumerate(members, start=1):
            # Strip the top-level folder so files land directly in target_dir
            relative_path = member[len(top_level):] if member.startswith(top_level) else member
            if not relative_path:
                continue

            dest_path = os.path.join(target_dir, relative_path)

            if member.endswith("/"):
                os.makedirs(dest_path, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with zf.open(member) as source, open(dest_path, "wb") as target:
                    target.write(source.read())

            if i % 200 == 0 or i == total:
                pct = i / total * 100
                sys.stdout.write(f"\r  {pct:5.1f}%  ({i}/{total} files)")
                sys.stdout.flush()

    print("\n  Extraction complete.")


def main():
    print("=== PokeAPI Sprites + Data Downloader ===")

    # 1. Sprites
    download_file(SPRITES_URL, SPRITES_ZIP)
    extract_zip(SPRITES_ZIP, SPRITES_DIR)

    # 2. Pre-rendered JSON data
    download_file(DATA_URL, DATA_ZIP)
    extract_zip(DATA_ZIP, DATA_DIR)

    # Cleanup the downloaded zip files
    for zip_path in (SPRITES_ZIP, DATA_ZIP):
        if os.path.exists(zip_path):
            os.remove(zip_path)

    print("\nAll done!")
    print(f"  Sprites -> {SPRITES_DIR}")
    print(f"  Data    -> {DATA_DIR}")


if __name__ == "__main__":
    main()
