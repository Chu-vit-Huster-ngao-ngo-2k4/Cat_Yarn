#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sinh bo icon Android (legacy + adaptive) va icon Play Store tu 1 anh nguon vuong,
dua vao dung quy uoc thu muc/kich thuoc ma Capacitor/Android Studio dung
(android/app/src/main/res/mipmap-<density>/...).

Cach dung:
  python tools/generate_icons.py                      # dung icon/icon_game.png mac dinh
  python tools/generate_icons.py duong/dan/anh.png     # dung anh nguon khac

Anh nguon nen vuong, do phan giai cao (>= 512x512, cang cao cang net) — se tu
crop giua thanh hinh vuong neu chua vuong san.

Sinh ra:
  - android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/
      ic_launcher.png        (legacy, full-bleed, khong padding)
      ic_launcher_round.png  (legacy round, full-bleed)
      ic_launcher_foreground.png (adaptive icon, co padding an toan 66%
                                   theo dung khuyen nghi cua Google de khong
                                   bi cat mat khi he thong mask thanh hinh
                                   tron/vuong bo goc/giot nuoc...)
  - icon/play_store_icon.png (512x512, KHONG nam trong APK — dung rieng de
      upload len Google Play Console luc tao listing)

ic_launcher_background van giu mau trang (#FFFFFF) khai bao san trong
android/app/src/main/res/values/ic_launcher_background.xml — phan padding
quanh ic_launcher_foreground se hien mau nay.
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Can cai Pillow: pip install Pillow")
    sys.exit(1)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.join(REPO_ROOT, 'icon', 'icon_game.png')
RES_DIR = os.path.join(REPO_ROOT, 'android', 'app', 'src', 'main', 'res')

# density -> he so nhan so voi kich thuoc goc mdpi (1x)
DENSITIES = {
    'mdpi': 1.0,
    'hdpi': 1.5,
    'xhdpi': 2.0,
    'xxhdpi': 3.0,
    'xxxhdpi': 4.0,
}
LEGACY_BASE = 48   # icon thuong (mdpi) = 48x48
FOREGROUND_BASE = 108  # canvas adaptive icon (mdpi) = 108x108dp
# Anh nguon la tranh full-bleed (co san nen pattern rieng, khong phai nhan vat
# tren nen trong suot) nen KHONG thu nho + them padding trang quanh no (se tao
# vien trang xau, lac long voi mau nen rieng cua tranh) — de nguyen full-bleed
# cho foreground, giong het legacy icon, chap nhan de he thong tu mask (tron/
# vuong bo goc/giot nuoc...) cat vien ngoai nhu da so app full-bleed khac.
FOREGROUND_SAFE_SCALE = 1.0


def load_square_source(path):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    if w != h:
        m = min(w, h)
        left = (w - m) // 2
        top = (h - m) // 2
        img = img.crop((left, top, left + m, top + m))
        print(f"  (anh nguon khong vuong {w}x{h} -> da crop giua thanh {m}x{m})")
    return img


def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.isfile(src_path):
        print(f"Khong tim thay anh nguon: {src_path}")
        sys.exit(1)

    print(f"Anh nguon: {src_path}")
    src = load_square_source(src_path)
    print(f"Kich thuoc sau xu ly: {src.size[0]}x{src.size[1]}")
    print()

    for density, scale in DENSITIES.items():
        out_dir = os.path.join(RES_DIR, f'mipmap-{density}')
        os.makedirs(out_dir, exist_ok=True)

        legacy_size = round(LEGACY_BASE * scale)
        legacy_img = src.resize((legacy_size, legacy_size), Image.LANCZOS)
        legacy_img.save(os.path.join(out_dir, 'ic_launcher.png'))
        legacy_img.save(os.path.join(out_dir, 'ic_launcher_round.png'))

        fg_size = round(FOREGROUND_BASE * scale)
        canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        art_size = round(fg_size * FOREGROUND_SAFE_SCALE)
        art = src.resize((art_size, art_size), Image.LANCZOS)
        offset = ((fg_size - art_size) // 2, (fg_size - art_size) // 2)
        canvas.paste(art, offset, art)
        canvas.save(os.path.join(out_dir, 'ic_launcher_foreground.png'))

        print(f"  {density:8s} legacy {legacy_size}x{legacy_size}  |  "
              f"foreground canvas {fg_size}x{fg_size} (artwork {art_size}x{art_size})")

    store_icon_path = os.path.join(REPO_ROOT, 'icon', 'play_store_icon.png')
    store_icon = src.resize((512, 512), Image.LANCZOS)
    store_icon.save(store_icon_path)
    print()
    print(f"Da xuat icon/play_store_icon.png (512x512) — dung rieng khi tao listing tren Play Console,")
    print("KHONG nam trong APK nen khong can dong bo vao www/.")
    print()
    print("Xong. Chay `npx cap sync android` roi build lai APK de thay icon moi.")


if __name__ == '__main__':
    main()
