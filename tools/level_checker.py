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

G = cong dau (co che "cong dich chuyen" - an, KHONG gay thua, dam trung se bi
"hut" sang cong dich), P = cong dich (dung 1 o, lo dien san tu dau man nhu S/E).
Neu man co G thi PHAI co dung 1 P (va nguoc lai). Cong dau KHONG can suy luan
duoc chinh xac bang logic (khac bay) - script.js chi to tim mo bao "gan day co
cong" (khong lo so luong chinh xac), nen solver o day CHI kiem tra kha nang giai
duoc theo lop BAY nhu cu; count2 (so cong dau ke 8 huong) van duoc tinh trong
build_grid() de doi chieu neu can nhung khong dua vao deduce()/simulate().

'a'-'d' = bay LIEN KET nhom a/b/c/d (van la bay binh thuong ve moi mat - tinh vao
count, gay thua khi dam trung - chi THEM co nhom), 'w'-'z' = cong dau LIEN KET
CUNG nhom voi chu cai a-d tuong ung (w<->a, x<->b, y<->c, z<->d) nhung ban than
la CONG chu khong phai bay, '1'-'4' = o thuong LIEN KET nhom 1/2/3/4 (van la o
thuong binh thuong, chi them co nhom).

Co che Lien Ket la "CUNG KICH HOAT" (KHONG con "cung loai" nua - da bo Luat D):
1 nhom co the tron bay + cong dau, dam trung 1 o thi CAC O CON LAI trong nhom
cung "kich hoat" theo NGAY (bay tu thao ngoi, cong dau tu hut sang cong dich
that su) - xem revealLinkedPartners() trong script.js. VI VAY solver o day
KHONG suy luan duoc gi tu co nhom nua (chi con y nghia luc choi that, khong con
la cong cu ho tro logic) - nhom van phai co >= 2 o (khong thi vo nghia).

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

ALLOWED_CHARS = set('SE#.CDGPabcd1234wxyz^v<>')
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
    g_positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == 'G']
    p_positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == 'P']
    if len(s_positions) != 1:
        raise LevelError(f"Phai co dung 1 o 'S' (xuat phat), hien co {len(s_positions)}.")
    if len(e_positions) != 1:
        raise LevelError(f"Phai co dung 1 o 'E' (dia ca), hien co {len(e_positions)}.")
    if len(c_positions) > 1:
        raise LevelError(f"Toi da 1 o 'C' (giau mau 1), hien co {len(c_positions)}.")
    if len(d_positions) > 1:
        raise LevelError(f"Toi da 1 o 'D' (giau mau 2), hien co {len(d_positions)}.")
    if len(p_positions) > 1:
        raise LevelError(f"Toi da 1 o 'P' (cong dich), hien co {len(p_positions)}.")
    if g_positions and len(p_positions) != 1:
        raise LevelError(f"Co {len(g_positions)} o 'G' (cong dau) nhung khong co dung 1 o 'P' (cong dich) di kem.")
    if p_positions and not g_positions:
        raise LevelError("Co o 'P' (cong dich) nhung khong co o 'G' (cong dau) nao ca - vo nghia.")

    # Nhom lien ket: 'a'-'d' (bay) va 'w'-'z' (cong dau, w<->a x<->b y<->c z<->d)
    # CUNG 1 nhom - phai gop lai roi moi dem tong so o.
    gate_link_pair = {'w': 'a', 'x': 'b', 'y': 'c', 'z': 'd'}
    for canon in 'abcd':
        gate_char = [k for k, v in gate_link_pair.items() if v == canon][0]
        positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] in (canon, gate_char)]
        if positions and len(positions) < 2:
            raise LevelError(f"Nhom lien ket '{canon}' chi co 1 o ({positions[0]}) - phai >= 2 o moi co nghia.")
    for group_char in '1234':
        positions = [(r, c) for r in range(rows_count) for c in range(width) if rows[r][c] == group_char]
        if positions and len(positions) < 2:
            raise LevelError(f"Nhom lien ket '{group_char}' chi co 1 o ({positions[0]}) - phai >= 2 o moi co nghia.")

    return rows_count, width, s_positions[0], e_positions[0], g_positions, (p_positions[0] if p_positions else None)


def build_grid(rows, rows_count, width):
    """type: 'S' | 'E' | 'B' (bay) | 'G' (cong dau) | 'P' (cong dich) | 'N' (thuong);
    count = so bay ke 8 huong, count2 = so cong dau ke 8 huong (lop doc lap).
    link_group: None hoac ky tu nhom ('a'-'d' bay lien ket, '1'-'4' o thuong lien ket)."""
    grid = [[None] * width for _ in range(rows_count)]
    for r in range(rows_count):
        for c in range(width):
            ch = rows[r][c]
            link_group = None
            if ch == 'S':
                t = 'S'
            elif ch == 'E':
                t = 'E'
            elif ch == '#':
                t = 'B'
            elif ch == 'G':
                t = 'G'
            elif ch == 'P':
                t = 'P'
            elif ch in '^v<>':
                # O truot - luon lo dien san tu dau man nhu S/E/P (xem simulate()),
                # khong tinh vao count/count2 vi khong phai bay/cong dau.
                t = 'W'
            elif ch in 'abcd':
                t = 'B'
                link_group = ch
            elif ch in 'wxyz':
                t = 'G'
                link_group = {'w': 'a', 'x': 'b', 'y': 'c', 'z': 'd'}[ch]
            elif ch in '1234':
                t = 'N'
                link_group = ch
            else:
                t = 'N'
            grid[r][c] = {'type': t, 'count': 0, 'count2': 0, 'link_group': link_group}

    for r in range(rows_count):
        for c in range(width):
            cnt, cnt2 = 0, 0
            for dr, dc in DIRS_8:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows_count and 0 <= nc < width:
                    if grid[nr][nc]['type'] == 'B':
                        cnt += 1
                    if grid[nr][nc]['type'] == 'G':
                        cnt2 += 1
            grid[r][c]['count'] = cnt
            grid[r][c]['count2'] = cnt2
    return grid


def flood_reveal(grid, rows_count, width, revealed, r, c):
    queue = [(r, c)]
    while queue:
        cr, cc = queue.pop(0)
        for dr, dc in DIRS_8:
            nr, nc = cr + dr, cc + dc
            if not (0 <= nr < rows_count and 0 <= nc < width):
                continue
            if revealed[nr][nc] or grid[nr][nc]['type'] in ('B', 'G'):
                continue
            revealed[nr][nc] = True
            if grid[nr][nc]['type'] == 'N' and grid[nr][nc]['count'] == 0 and grid[nr][nc]['count2'] == 0:
                queue.append((nr, nc))


def collect_constraints(grid, rows_count, width, revealed, deduced_mine, deduced_safe, count_field):
    """Gom moi 'dau moi' hien co cho 1 LOP dem (count_field): {unknown: set toa do, remaining: so con lai}."""
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
            constraints.append({'unknown': unknown, 'remaining': cell[count_field] - len(known_mines)})
    return constraints


def deduce_layer(grid, rows_count, width, revealed, count_field, only_ab=False, rule_c_hits=None):
    """
    Y het findHintCell()/deduceLayer() trong script.js: constraint propagation cong don
    tren 1 LOP dem doc lap (count_field), gom 3 luat:
      Luat A/B (1 dau moi, tu no): het (bay/cong dau) can tim -> con lai AN TOAN; so o
        chua biet dung bang so con lai -> con lai la (bay/cong dau).
      Luat C (so sanh 2 dau moi CHONG LAN - pattern "1-2" kinh dien cua Minesweeper):
        neu vung o-chua-biet cua dau moi A la tap CON cua dau moi B, phan CHENH LECH
        (B tru A) phai chua dung (remaining_B - remaining_A) o loai nay.

    only_ab=True: TAT HAN Luat C (dung de do "level nay co THAT SU can Luat C moi
    giai het khong" - xem compute_difficulty() - so sanh ket qua co/khong Luat C).
    rule_c_hits (list, optional): neu truyen vao, MOI LAN Luat C thuc su suy ra
    duoc gi do (deduced_safe/deduced_mine moi) se append(1) vao day - dung de DEM
    so lan Luat C "ra tay" (xem compute_difficulty()), khong lien quan only_ab.
    """
    deduced_safe = set()
    deduced_mine = set()
    changed = True
    while changed:
        changed = False
        constraints = collect_constraints(grid, rows_count, width, revealed, deduced_mine, deduced_safe, count_field)

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
        if not only_ab:
            for a in constraints:
                for b in constraints:
                    if a is b or not a['unknown'] or len(a['unknown']) >= len(b['unknown']):
                        continue
                    if not a['unknown'].issubset(b['unknown']):
                        continue
                    diff_cells = b['unknown'] - a['unknown']
                    diff_count = b['remaining'] - a['remaining']
                    if diff_count == 0 and diff_cells:
                        newly = [k for k in diff_cells if k not in deduced_safe]
                        if newly:
                            deduced_safe.update(newly)
                            changed = True
                            if rule_c_hits is not None: rule_c_hits.append(1)
                    elif diff_count == len(diff_cells) and diff_cells:
                        newly = [k for k in diff_cells if k not in deduced_mine]
                        if newly:
                            deduced_mine.update(newly)
                            changed = True
                            if rule_c_hits is not None: rule_c_hits.append(1)

        # Luat D (suy luan theo nhom lien ket) DA BO - co che Lien Ket gio la "cung
        # kich hoat" chu khong con "cung loai" nua (xem ghi chu dau file), nen
        # khong the suy luan cheo giua cac o cung nhom duoc nua.
    return deduced_safe, deduced_mine


def deduce(grid, rows_count, width, revealed, only_ab=False, rule_c_hits=None):
    """CHI suy luan theo lop BAY - dung y het deduceAll() trong script.js (cong dau
    khong can suy luan duoc chinh xac, xem ghi chu dau file)."""
    return deduce_layer(grid, rows_count, width, revealed, 'count', only_ab=only_ab, rule_c_hits=rule_c_hits)


def simulate(grid, rows_count, width, s_pos, e_pos, only_ab=False, rule_c_hits=None):
    """
    Tra ve dict:
      first_move_bad: list cac o bay nam sat Start (vi pham luat "khong doan nuoc dau")
      reached_e: co toi duoc dia ca thuan tuy bang suy luan khong
      fully_solved: toan bo o thuong co duoc mo het khong (khong con o nao phai doan)
      stuck_cells: cac o thuong (khong phai bay/cong dau) con bi ket lai, can doan mo

    only_ab/rule_c_hits: xem deduce_layer() - dung boi compute_difficulty() de danh
    gia level co THAT SU can Luat C moi giai het khong, khong dung boi check_rows().
    """
    revealed = [[False] * width for _ in range(rows_count)]
    revealed[s_pos[0]][s_pos[1]] = True
    # Cong dich (P) va o truot (W) luon lo dien san tu dau man, giong S/E.
    for r in range(rows_count):
        for c in range(width):
            if grid[r][c]['type'] in ('P', 'W'):
                revealed[r][c] = True

    first_move_bad = []
    for dr, dc in DIRS_4:
        nr, nc = s_pos[0] + dr, s_pos[1] + dc
        if 0 <= nr < rows_count and 0 <= nc < width and grid[nr][nc]['type'] == 'B':
            first_move_bad.append((nr, nc))

    # Nuoc di dau tien luon duoc dam bao an toan theo thiet ke -> tu mo cac o ke Start
    # (chi tinh cac o khong phai bay; neu co bay canh Start thi da bao loi o tren roi.
    # Cong dau (G) van KHONG tu mo o day - giong game that, khong bao gio tu lo ra
    # ma phai dam trung/khong con hidden - nhung co mat canh Start khong tinh la loi
    # vi khong gay thua, khac bay).
    for dr, dc in DIRS_4:
        nr, nc = s_pos[0] + dr, s_pos[1] + dc
        if 0 <= nr < rows_count and 0 <= nc < width and not revealed[nr][nc] and grid[nr][nc]['type'] not in ('B', 'G'):
            revealed[nr][nc] = True
            if grid[nr][nc]['type'] == 'N' and grid[nr][nc]['count'] == 0 and grid[nr][nc]['count2'] == 0:
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
        deduced_safe, _ = deduce(grid, rows_count, width, revealed, only_ab=only_ab, rule_c_hits=rule_c_hits)
        newly_revealed = False
        for (r, c) in deduced_safe:
            if not revealed[r][c]:
                revealed[r][c] = True
                newly_revealed = True
                if grid[r][c]['type'] == 'N' and grid[r][c]['count'] == 0 and grid[r][c]['count2'] == 0:
                    flood_reveal(grid, rows_count, width, revealed, r, c)
        if not reached_e:
            reached_e = e_reachable()
        if not newly_revealed:
            break

    stuck_cells = [
        (r, c)
        for r in range(rows_count) for c in range(width)
        if not revealed[r][c] and grid[r][c]['type'] not in ('B', 'G')
    ]
    fully_solved = len(stuck_cells) == 0

    return {
        'first_move_bad': first_move_bad,
        'reached_e': reached_e,
        'fully_solved': fully_solved,
        'stuck_cells': stuck_cells,
    }


def compute_max_flood_region(grid, rows_count, width):
    """Vung LOANG TU DO lon nhat (cac o 'N' co count=0 VA count2=0, noi voi nhau
    qua 8 huong) - giong het genMaxFloodRegion() trong script.js, dung de danh gia
    do kho: vung nay cang lon thi cang nhieu o "mien phi" tu mo, cang de, ca khi
    bo qua ca cac chuoi suy luan can thiet o cho khac."""
    visited = [[False] * width for _ in range(rows_count)]
    best = 0
    for r in range(rows_count):
        for c in range(width):
            cell = grid[r][c]
            if visited[r][c] or cell['type'] != 'N' or cell['count'] != 0 or cell['count2'] != 0:
                continue
            size = 0
            stack = [(r, c)]
            visited[r][c] = True
            while stack:
                cr, cc = stack.pop()
                size += 1
                for dr, dc in DIRS_8:
                    nr, nc = cr + dr, cc + dc
                    if not (0 <= nr < rows_count and 0 <= nc < width) or visited[nr][nc]:
                        continue
                    ncell = grid[nr][nc]
                    if ncell['type'] != 'N' or ncell['count'] != 0 or ncell['count2'] != 0:
                        continue
                    visited[nr][nc] = True
                    stack.append((nr, nc))
            best = max(best, size)
    return best


def compute_difficulty(rows, rows_count, width, s_pos, e_pos, g_positions, p_pos):
    """
    Cham diem do kho TUONG DOI (KHONG phai do kho "cam nhan con nguoi" tuyet doi)
    dua tren cac chi so tinh duoc tu chinh bo giai:
      - Mat do bay (cang cao cang kho).
      - Kich thuoc ban (cang to cang kho - nhieu dau moi phai theo doi cung luc).
      - Co THAT SU can Luat C moi giai het khong (so sanh ket qua co/khong Luat C
        - day la tin hieu ro nhat cho "phai suy luan nhieu buoc", khong chi la
        dem so/mo o don gian) + so lan Luat C thuc su "ra tay".
      - Ty le vung loang tu do lon nhat / tong o (cang nho cang kho - it o "mien
        phi", phai suy luan chat che hon).
      - Ty le o con "ket" (phai doan) - CANH BAO rieng, khong cong vao diem chinh
        vi day la dau hieu THIEU CONG BANG (doan mo) chu khong phai "kho" dung
        nghia, dua vao de tham khao rieng.
    Tra ve dict co 'score' (0-100, cang cao cang kho) va 'tier' (De/Vua/Kho) cung
    toan bo chi so thanh phan de in ra giai thich VI SAO ra diem do (khong phai
    hop den).
    """
    grid = build_grid(rows, rows_count, width)
    total_cells = rows_count * width
    bomb_count = sum(1 for r in range(rows_count) for c in range(width) if grid[r][c]['type'] == 'B')
    density = bomb_count / total_cells

    rule_c_hits_full = []
    sim_full = simulate(grid, rows_count, width, s_pos, e_pos, only_ab=False, rule_c_hits=rule_c_hits_full)

    grid_ab = build_grid(rows, rows_count, width)  # bo giai rieng, tranh dinh trang thai voi ban tren
    sim_ab = simulate(grid_ab, rows_count, width, s_pos, e_pos, only_ab=True)
    # Luat C "can thiet that" neu thieu no thi KHONG con toi duoc dia ca bang suy
    # luan thuan tuy nua, hoac so o con ket tang len ro ret.
    needs_rule_c = (sim_full['reached_e'] and not sim_ab['reached_e']) or \
        (len(sim_ab['stuck_cells']) > len(sim_full['stuck_cells']))

    max_flood = compute_max_flood_region(grid, rows_count, width)
    flood_ratio = max_flood / total_cells if total_cells else 0

    mechanic_count = 0
    if g_positions or p_pos: mechanic_count += 1
    text = ''.join(rows)
    if any(ch in text for ch in 'abcdwxyz1234'): mechanic_count += 1
    if 'C' in text or 'D' in text: mechanic_count += 1
    if any(ch in text for ch in '^v<>'): mechanic_count += 1

    stuck_ratio = len(sim_full['stuck_cells']) / total_cells if total_cells else 0

    # Cong thuc CHAM DIEM - trong so tuy chinh duoc, uu tien Luat C (tin hieu manh
    # nhat cho "chuoi suy luan dai") va mat do bay (yeu to co ban nhat cua Minesweeper).
    size_score = min(1.0, (max(rows_count, width) - 5) / 5)  # 5x5 -> 0, 10x10 -> 1
    density_score = min(1.0, density / 0.35)  # 0.35 xap xi tran mat do cua bo sinh hien tai
    rule_c_score = (0.6 + 0.4 * min(1.0, len(rule_c_hits_full) / 6)) if needs_rule_c else 0.0
    flood_score = 1.0 - min(1.0, flood_ratio / 0.22)  # 0.22 = GEN_MAX_FLOOD_RATIO trong script.js
    mechanic_score = min(1.0, mechanic_count / 3)

    score = 100 * (
        0.20 * size_score +
        0.20 * density_score +
        0.35 * rule_c_score +
        0.15 * flood_score +
        0.10 * mechanic_score
    )
    # KHONG dung dau tieng Viet (Kho/Vua/De) - console Windows (cp1258) khong go
    # duoc 1 so ky tu, tung gap loi UnicodeEncodeError voi cac script khac trong
    # tools/ (vd build_avatar_list.py) - ca file nay deu co tinh chi dung ASCII
    # thuan luc in ra console.
    tier = 'Kho' if score >= 60 else ('Vua' if score >= 32 else 'De')

    return {
        'score': round(score, 1),
        'tier': tier,
        'density': density,
        'needs_rule_c': needs_rule_c,
        'rule_c_hits': len(rule_c_hits_full),
        'flood_ratio': flood_ratio,
        'mechanic_count': mechanic_count,
        'stuck_ratio': stuck_ratio,
    }


def cell_label(rc):
    r, c = rc
    return f"({r},{c})"


def check_rows(rows, name):
    """Chay toan bo kiem tra tren 1 level (list of row-strings), in bao cao, tra ve True/False."""
    print(f"=== {name} ===")
    try:
        rows_count, width, s_pos, e_pos, g_positions, p_pos = parse_rows(rows)
    except LevelError as e:
        print(f"  LOI DINH DANG: {e}")
        return False

    grid = build_grid(rows, rows_count, width)
    result = simulate(grid, rows_count, width, s_pos, e_pos)

    ok = True
    extra = f"  |  Cong dau={len(g_positions)}  Cong dich={cell_label(p_pos)}" if g_positions else ""
    link_chars_used = sorted(set(ch for row in rows for ch in row if ch in 'abcd1234wxyz'))
    if link_chars_used:
        extra += f"  |  Nhom lien ket: {', '.join(link_chars_used)}"
    slide_count = sum(row.count(ch) for row in rows for ch in '^v<>')
    if slide_count:
        extra += f"  |  O truot: {slide_count}"
    print(f"  Kich thuoc: {rows_count}x{width}  |  Start={cell_label(s_pos)}  Dia ca={cell_label(e_pos)}{extra}")

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

    if ok:
        diff = compute_difficulty(rows, rows_count, width, s_pos, e_pos, g_positions, p_pos)
        rule_c_note = f"CO can ({diff['rule_c_hits']} lan)" if diff['needs_rule_c'] else "khong can"
        print(f"  [DO KHO] {diff['tier']} (diem {diff['score']}/100) - "
              f"mat do bay {diff['density']*100:.0f}%, Luat C {rule_c_note}, "
              f"vung loang lon nhat {diff['flood_ratio']*100:.0f}% ban co, "
              f"{diff['mechanic_count']} co che phu, "
              f"{diff['stuck_ratio']*100:.0f}% o phai doan neu lac huong")

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
