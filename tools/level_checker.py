#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kiem tra level Cat's Yarn co giai duoc bang suy luan logic thuan (khong doan mo)
hay khong, truoc khi luu vao levels/*.json.

Mo phong DUNG theo thuat toan trong script.js:
  - dem so bay lan can 8 huong (loadLevel())
  - loang o count=0 (floodReveal())
  - suy luan deducedSafe / deducedMine (findHintCell())
  - luat "o ke Start luon an toan" (khong can doan o nuoc di dau tien)

Dinh dang o: S = xuat phat, E = dia ca, # = bay, . = o thuong,
C = o giau dom mau 1, D = o giau dom mau 2 (co che "tim mau cho meo", toi da 1
o C + 1 o D moi man — man chi co C: meo nhuom TOAN THAN; man co du ca C lan D:
meo nhuom NUA THAN moi mau). Ve mat solver, C/D deu la o thuong binh thuong
(khong bay) - KHONG kiem tra co suy luan toi duoc hay khong, vi day la co che
dat ngau nhien tren bat ky o khong phai bay nao.

Cach dung:
  python tools/level_checker.py levels/level01.json      # kiem 1 file JSON co san
  python tools/level_checker.py --all                    # kiem toan bo levels/*.json
  python tools/level_checker.py draft.txt                # kiem 1 ban nhap (moi dong la 1 hang)
  python tools/level_checker.py draft.txt --emit-json     # in luon JSON dung dinh dang de dan vao levels/
"""
import sys
import os
import json
import argparse

ALLOWED_CHARS = set('SE#.CD')
DIRS_8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
DIRS_4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]


class LevelError(Exception):
    pass


def parse_rows(rows):
    if not rows:
        raise LevelError("Level rong, khong co dong nao.")
    width = len(rows[0])
    if width == 0:
        raise LevelError("Dong dau tien rong.")
    for i, row in enumerate(rows):
        if len(row) != width:
            raise LevelError(
                f"Cac dong khong deu nhau ve do dai: dong 1 dai {width}, "
                f"dong {i + 1} dai {len(row)}. Luoi phai la hinh chu nhat.")
        for ch in row:
            if ch not in ALLOWED_CHARS:
                raise LevelError(f"Ky tu khong hop le '{ch}' o dong {i + 1}. Chi cho phep S, E, #, C, D, .")

    rows_count = len(rows)
    s_positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == 'S']
    e_positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == 'E']
    c_positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == 'C']
    d_positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == 'D']
    if len(s_positions) != 1:
        raise LevelError(f"Phai co dung 1 o 'S' (xuat phat), hien co {len(s_positions)}.")
    if len(e_positions) != 1:
        raise LevelError(f"Phai co dung 1 o 'E' (dia ca), hien co {len(e_positions)}.")
    if len(c_positions) > 1:
        raise LevelError(f"Toi da 1 o 'C' (giau mau 1), hien co {len(c_positions)}.")
    if len(d_positions) > 1:
        raise LevelError(f"Toi da 1 o 'D' (giau mau 2), hien co {len(d_positions)}.")

    return rows_count, width, s_positions[0], e_positions[0]


def build_grid(rows, rows_count, width):
    """type: 'S' | 'E' | 'B' (bay) | 'N' (thuong); count = so bay ke 8 huong."""
    grid = [[None] * width for _ in range(rows_count)]
    for r in range(rows_count):
        for c in range(width):
            ch = rows[r][c]
            if ch == 'S':
                t = 'S'
            elif ch == 'E':
                t = 'E'
            elif ch == '#':
                t = 'B'
            else:
                t = 'N'
            grid[r][c] = {'type': t, 'count': 0}

    for r in range(rows_count):
        for c in range(width):
            cnt = 0
            for dr, dc in DIRS_8:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows_count and 0 <= nc < width and grid[nr][nc]['type'] == 'B':
                    cnt += 1
            grid[r][c]['count'] = cnt
    return grid


def flood_reveal(grid, rows_count, width, revealed, r, c):
    queue = [(r, c)]
    while queue:
        cr, cc = queue.pop(0)
        for dr, dc in DIRS_8:
            nr, nc = cr + dr, cc + dc
            if not (0 <= nr < rows_count and 0 <= nc < width):
                continue
            if revealed[nr][nc] or grid[nr][nc]['type'] == 'B':
                continue
            revealed[nr][nc] = True
            if grid[nr][nc]['type'] == 'N' and grid[nr][nc]['count'] == 0:
                queue.append((nr, nc))


def collect_constraints(grid, rows_count, width, revealed, deduced_mine, deduced_safe):
    """Gom moi 'dau moi' hien co: {unknown: set toa do, remaining: so bay con lai}."""
    constraints = []
    for r in range(rows_count):
        for c in range(width):
            cell = grid[r][c]
            if not revealed[r][c] or cell['type'] != 'N':
                continue
            hidden = []
            for dr, dc in DIRS_8:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows_count and 0 <= nc < width and not revealed[nr][nc]:
                    hidden.append((nr, nc))
            if not hidden:
                continue
            known_mines = [k for k in hidden if k in deduced_mine]
            unknown = {k for k in hidden if k not in deduced_mine and k not in deduced_safe}
            if not unknown:
                continue
            constraints.append({'unknown': unknown, 'remaining': cell['count'] - len(known_mines)})
    return constraints


def deduce(grid, rows_count, width, revealed):
    """
    Y het findHintCell() trong script.js: constraint propagation cong don, gom 3 luat:
      Luat A/B (1 dau moi, tu no): het bay can tim -> con lai AN TOAN; so o chua biet
        dung bang so bay con lai -> con lai la BAY.
      Luat C (so sanh 2 dau moi CHONG LAN - pattern "1-2" kinh dien cua Minesweeper):
        neu vung o-chua-biet cua dau moi A la tap CON cua dau moi B, phan CHENH LECH
        (B tru A) phai chua dung (remaining_B - remaining_A) bay.
    """
    deduced_safe = set()
    deduced_mine = set()
    changed = True
    while changed:
        changed = False
        constraints = collect_constraints(grid, rows_count, width, revealed, deduced_mine, deduced_safe)

        # Luat A/B - tung dau moi tu no.
        for con in constraints:
            unknown, remaining = con['unknown'], con['remaining']
            if remaining == 0 and unknown:
                for k in unknown:
                    if k not in deduced_safe:
                        deduced_safe.add(k)
                        changed = True
            elif remaining == len(unknown) and unknown:
                for k in unknown:
                    if k not in deduced_mine:
                        deduced_mine.add(k)
                        changed = True

        # Luat C - so sanh tung cap dau moi, tim quan he tap con.
        for a in constraints:
            for b in constraints:
                if a is b or not a['unknown'] or len(a['unknown']) >= len(b['unknown']):
                    continue
                if not a['unknown'].issubset(b['unknown']):
                    continue
                diff_cells = b['unknown'] - a['unknown']
                diff_count = b['remaining'] - a['remaining']
                if diff_count == 0 and diff_cells:
                    for k in diff_cells:
                        if k not in deduced_safe:
                            deduced_safe.add(k)
                            changed = True
                elif diff_count == len(diff_cells) and diff_cells:
                    for k in diff_cells:
                        if k not in deduced_mine:
                            deduced_mine.add(k)
                            changed = True
    return deduced_safe, deduced_mine


def simulate(grid, rows_count, width, s_pos, e_pos):
    """
    Tra ve dict:
      first_move_bad: list cac o bay nam sat Start (vi pham luat "khong doan nuoc dau")
      reached_e: co toi duoc dia ca thuan tuy bang suy luan khong
      fully_solved: toan bo o khong-bay co duoc mo het khong (khong con o nao phai doan)
      stuck_cells: cac o thuong (khong phai bay) con bi ket lai, can doan mo
    """
    revealed = [[False] * width for _ in range(rows_count)]
    revealed[s_pos[0]][s_pos[1]] = True

    first_move_bad = []
    for dr, dc in DIRS_4:
        nr, nc = s_pos[0] + dr, s_pos[1] + dc
        if 0 <= nr < rows_count and 0 <= nc < width and grid[nr][nc]['type'] == 'B':
            first_move_bad.append((nr, nc))

    # Nuoc di dau tien luon duoc dam bao an toan theo thiet ke -> tu mo cac o ke Start
    # (chi tinh cac o khong phai bay; neu co bay canh Start thi da bao loi o tren roi).
    for dr, dc in DIRS_4:
        nr, nc = s_pos[0] + dr, s_pos[1] + dc
        if 0 <= nr < rows_count and 0 <= nc < width and not revealed[nr][nc] and grid[nr][nc]['type'] != 'B':
            revealed[nr][nc] = True
            if grid[nr][nc]['type'] == 'N' and grid[nr][nc]['count'] == 0:
                flood_reveal(grid, rows_count, width, revealed, nr, nc)

    def e_reachable():
        er, ec = e_pos
        if revealed[er][ec]:
            return True
        for dr, dc in DIRS_4:
            nr, nc = er + dr, ec + dc
            if 0 <= nr < rows_count and 0 <= nc < width and revealed[nr][nc]:
                return True
        return False

    reached_e = e_reachable()

    while True:
        deduced_safe, _ = deduce(grid, rows_count, width, revealed)
        newly_revealed = False
        for (r, c) in deduced_safe:
            if not revealed[r][c]:
                revealed[r][c] = True
                newly_revealed = True
                if grid[r][c]['type'] == 'N' and grid[r][c]['count'] == 0:
                    flood_reveal(grid, rows_count, width, revealed, r, c)
        if not reached_e:
            reached_e = e_reachable()
        if not newly_revealed:
            break

    stuck_cells = [
        (r, c)
        for r in range(rows_count) for c in range(width)
        if not revealed[r][c] and grid[r][c]['type'] != 'B'
    ]
    fully_solved = len(stuck_cells) == 0

    return {
        'first_move_bad': first_move_bad,
        'reached_e': reached_e,
        'fully_solved': fully_solved,
        'stuck_cells': stuck_cells,
    }


def cell_label(rc):
    r, c = rc
    return f"({r},{c})"


def check_rows(rows, name):
    """Chay toan bo kiem tra tren 1 level (list of row-strings), in bao cao, tra ve True/False."""
    print(f"=== {name} ===")
    try:
        rows_count, width, s_pos, e_pos = parse_rows(rows)
    except LevelError as e:
        print(f"  LOI DINH DANG: {e}")
        return False

    grid = build_grid(rows, rows_count, width)
    result = simulate(grid, rows_count, width, s_pos, e_pos)

    ok = True
    print(f"  Kich thuoc: {rows_count}x{width}  |  Start={cell_label(s_pos)}  Dia ca={cell_label(e_pos)}")

    if result['first_move_bad']:
        ok = False
        bad = ', '.join(cell_label(x) for x in result['first_move_bad'])
        print(f"  [FAIL] O canh Start co bay ({bad}) -> nuoc di dau tien phai doan mo, vi pham luat thiet ke.")
    else:
        print("  [OK] Cac o canh Start deu an toan (nuoc di dau khong phai doan).")

    if not result['reached_e']:
        ok = False
        print("  [FAIL] KHONG the suy luan toi duoc dia ca (E) - can doan mo o dau do tren duong di.")
    else:
        print("  [OK] Co the suy luan toi duoc dia ca hoan toan bang logic.")

    if not result['fully_solved']:
        stuck = ', '.join(cell_label(x) for x in result['stuck_cells'])
        # Khong tinh la FAIL cung neu da toi duoc E, nhung van canh bao vi nhung o
        # con lai nay se buoc nguoi choi doan mo neu ho di huong khac.
        print(f"  [CANH BAO] Con {len(result['stuck_cells'])} o thuong chua suy luan duoc, "
              f"neu nguoi choi di huong do se phai doan mo: {stuck}")
    else:
        print("  [OK] Toan bo ban co giai duoc het bang logic, khong o nao phai doan.")

    print(f"  => {'DAT' if ok else 'KHONG DAT'}")
    print()
    return ok


def load_json_rows(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, list) or not all(isinstance(x, str) for x in data):
        raise LevelError("File JSON phai la mang cac chuoi (vi du: [\"S....\", \".....\"]).")
    return data


def load_txt_rows(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = [line.rstrip('\n').rstrip('\r') for line in f]
    # Bo dong trong o dau/cuoi file cho tien soan draft, giu nguyen dong trong o giua (neu co, se bao loi do dai).
    while lines and lines[0].strip() == '':
        lines.pop(0)
    while lines and lines[-1].strip() == '':
        lines.pop()
    return lines


def emit_json(rows):
    print(json.dumps(rows, ensure_ascii=False, indent=2))


def levels_dir_path():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(repo_root, 'levels')


def list_level_files():
    levels_dir = levels_dir_path()
    if not os.path.isdir(levels_dir):
        return levels_dir, []
    files = sorted(f for f in os.listdir(levels_dir) if f.startswith('level') and f.endswith('.json'))
    return levels_dir, files


def resolve_arg_to_path(arg):
    """Chap nhan duong dan day du, hoac go tat: '5', '05', 'level05', 'level05.json'."""
    if os.path.isfile(arg):
        return arg
    levels_dir = levels_dir_path()
    if arg.isdigit():
        candidate = os.path.join(levels_dir, f"level{int(arg):02d}.json")
    else:
        stem = arg if arg.endswith('.json') else arg + '.json'
        candidate = os.path.join(levels_dir, stem)
    if os.path.isfile(candidate):
        return candidate
    raise LevelError(f"Khong tim thay level ung voi '{arg}' (da thu: {candidate}).")


def parse_pick_selection(choice, files):
    """'1,3,7' / '1-5' / 'all' -> list index (1-based) hop le trong pham vi files."""
    if choice.strip().lower() == 'all':
        return list(range(1, len(files) + 1))
    picked = set()
    for part in choice.split(','):
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            a, b = part.split('-', 1)
            a, b = int(a), int(b)
            picked.update(range(min(a, b), max(a, b) + 1))
        else:
            picked.add(int(part))
    return sorted(i for i in picked if 1 <= i <= len(files))


def interactive_pick():
    """Khong go tham so gi ca -> liet ke level trong thu muc levels/ cho chon."""
    levels_dir, files = list_level_files()
    if not files:
        print(f"Khong tim thay level nao trong thu muc {levels_dir}.")
        return []

    print(f"Cac level co trong {levels_dir}:")
    for i, f in enumerate(files, 1):
        print(f"  {i:2d}. {f}")
    print()
    print("Nhap so level muon kiem (vi du: 5  |  1,3,7  |  1-5  |  all de kiem het, Enter de huy):")
    try:
        choice = input('> ').strip()
    except EOFError:
        choice = ''
    if not choice:
        return []

    try:
        indices = parse_pick_selection(choice, files)
    except ValueError:
        print(f"  Lua chon khong hop le: '{choice}'")
        return []
    if not indices:
        print("  Khong co muc nao hop le trong lua chon.")
        return []
    return [os.path.join(levels_dir, files[i - 1]) for i in indices]


def main():
    parser = argparse.ArgumentParser(description="Kiem tra level Cat's Yarn co giai duoc bang logic thuan khong.")
    parser.add_argument('files', nargs='*',
                         help="File level: duong dan day du (.json/.txt), hoac go tat so/level (vi du: 5, level05)")
    parser.add_argument('--all', action='store_true', help="Kiem toan bo levels/level*.json trong repo")
    parser.add_argument('--emit-json', action='store_true',
                         help="Voi file .txt: in them JSON dung dinh dang de dan vao levels/")
    args = parser.parse_args()

    targets = []
    if args.all:
        levels_dir, files = list_level_files()
        targets.extend(os.path.join(levels_dir, f) for f in files)

    for arg in args.files:
        try:
            targets.append(resolve_arg_to_path(arg))
        except LevelError as e:
            print(f"=== {arg} ===")
            print(f"  {e}")
            print()

    if not targets and not args.all and not args.files:
        # Khong go tham so nao -> mo menu chon level tu thu muc levels/.
        targets = interactive_pick()

    if not targets:
        parser.print_help()
        sys.exit(1)

    all_ok = True
    for path in targets:
        name = os.path.basename(path)
        try:
            if path.endswith('.json'):
                rows = load_json_rows(path)
            else:
                rows = load_txt_rows(path)
        except (LevelError, OSError, json.JSONDecodeError) as e:
            print(f"=== {name} ===")
            print(f"  LOI DOC FILE: {e}")
            print()
            all_ok = False
            continue

        ok = check_rows(rows, name)
        all_ok = all_ok and ok

        if args.emit_json and not path.endswith('.json'):
            print("  --- JSON de dan vao levels/ ---")
            emit_json(rows)
            print()

    sys.exit(0 if all_ok else 1)


if __name__ == '__main__':
    main()
