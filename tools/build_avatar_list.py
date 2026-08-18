# -*- coding: utf-8 -*-
"""Quet icon/ava/ (thu muc chua toan bo anh avatar cho phep nguoi choi chon) va
sinh ra avatars.js (bien PLAYER_AVATAR_FILES dung boi leaderboard.js).

Chay lai script nay MOI LAN them/xoa/doi ten anh trong icon/ava/:
    python tools/build_avatar_list.py

Sau do nho:
  1. Copy avatars.js vua sinh sang www/avatars.js (giong moi file goc khac).
  2. Copy anh moi trong icon/ava/ sang www/icon/ava/.
  3. Cap nhat danh sach cho phep trong firestore.rules (rules Firestore la text
     tinh, khong doc duoc file nay -> PHAI tu tay them ten file avatar moi vao
     mang trong request.resource.data.avatar in [...] roi Publish lai tren
     Firebase Console, khong thi avatar moi se bi Firestore tu choi luc ghi).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AVATAR_DIR = os.path.join(ROOT, 'icon', 'ava')
OUTPUT = os.path.join(ROOT, 'avatars.js')
VALID_EXT = ('.png', '.jpg', '.jpeg', '.webp')


def main():
    if not os.path.isdir(AVATAR_DIR):
        print(f"Khong thay thu muc {AVATAR_DIR}")
        return
    files = sorted(f for f in os.listdir(AVATAR_DIR) if f.lower().endswith(VALID_EXT))
    if not files:
        print(f"Thu muc {AVATAR_DIR} dang trong, khong co anh avatar nao.")
        return
    with open(OUTPUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(
            "// TỰ ĐỘNG SINH bởi tools/build_avatar_list.py — KHÔNG SỬA TAY, chạy lại\n"
            "// script đó (quét icon/ava/) mỗi khi thêm/xoá/đổi tên ảnh avatar, rồi nhớ\n"
            "// đồng bộ sang www/ + cập nhật danh sách cho phép trong firestore.rules\n"
            "// (xem hướng dẫn đầy đủ trong chính file build_avatar_list.py).\n"
        )
        f.write('const PLAYER_AVATAR_FILES = ' + json.dumps(files, ensure_ascii=False) + ';\n')
    print(f"Da xuat {OUTPUT}: {len(files)} avatar ({', '.join(files)})")


if __name__ == '__main__':
    main()
