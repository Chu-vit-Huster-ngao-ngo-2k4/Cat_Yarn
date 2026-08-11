#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Doc tools/locale.csv (cot: key, vi, en, ... - them ngon ngu moi thi them 1 cot moi
o cuoi, khong can sua script nay) roi xuat ra locales.js o goc repo - game load
file nay bang <script src="locales.js"> (xem index.html/Color_Flow_2.0_fixed.html)
truoc script.js, dinh nghia san bien global LOCALES = { vi: {...}, en: {...} }.

Cach dung:
  python tools/build_locales.py
  (roi nho tu copy locales.js sang www/locales.js truoc khi build/test nhu moi
  file khac, xem CLAUDE.md - script nay KHONG tu dong copy)
"""
import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "tools", "locale.csv")
OUT_PATH = os.path.join(ROOT, "locales.js")


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    if not rows:
        print("locale.csv rong, khong co gi de build.")
        return

    header = rows[0]
    if header[0] != "key":
        print("Cot dau tien phai la 'key', dang thay:", header[0])
        return

    langs = header[1:]
    data = {lang: {} for lang in langs}

    for lineno, row in enumerate(rows[1:], start=2):
        if not row or not row[0].strip():
            continue  # dong trong, bo qua
        key = row[0].strip()
        for i, lang in enumerate(langs):
            value = row[i + 1] if i + 1 < len(row) else ""
            if not value:
                print(f"[canh bao] dong {lineno}: key '{key}' thieu ban dich '{lang}', dung tam 'vi'")
                value = row[1] if len(row) > 1 else key
            data[lang][key] = value

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// File TU DONG SINH tu tools/locale.csv bang tools/build_locales.py\n")
        f.write("// KHONG sua tay o day - sua tools/locale.csv roi chay lai script do.\n")
        f.write("const LOCALES = ")
        f.write(json.dumps(data, ensure_ascii=False, indent=2))
        f.write(";\n")

    total_keys = len(data[langs[0]])
    print(f"Da xuat {OUT_PATH}: {len(langs)} ngon ngu ({', '.join(langs)}), {total_keys} key moi ngon ngu.")


if __name__ == "__main__":
    main()
