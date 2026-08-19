# Cat's Yarn — ghi chú cho Claude (và cho bạn chỉnh sửa thoải mái)

File này để Claude tự đọc lại mỗi khi mở project này ở bất kỳ máy nào (đã commit vào
git nên đi theo repo). Sửa/xoá/thêm tuỳ ý — không phải file hệ thống.

## Quy tắc làm việc trong repo này

- **Chỉ commit ở local, không tự push.** Người dùng tự push lấy — không cần hỏi
  xin push, và cũng đừng chủ động push dù được hỏi kiểu chung chung.
- **Commit message viết bằng tiếng Việt**, và **không** thêm dòng
  `Co-Authored-By: Claude ...` hay bất kỳ ghi chú tác giả nào là Claude.
- Sau khi sửa file gốc (`Color_Flow_2.0_fixed.html`, `script.js`, `ads.js`,
  `style.css`, `levels/*.json`), phải copy lại vào `www/` (không tự động đồng bộ)
  trước khi `npx cap sync android` / build.
- Thêm level mới: đặt tên file đúng thứ tự liên tục (không hổng số) → kiểm bằng
  `tools/level_checker.py` hoặc `tools/level_editor.html` (phải "ĐẠT" — giải được
  bằng logic thuần, không đoán mò) → copy JSON vào `www/levels/`. Game tự dò
  `levels/levelNN.json` lúc khởi động tới khi hết file (không còn khai báo số
  lượng level ở đâu trong code) — không cần sửa gì trong `script.js` nữa. Đang
  chạy sẵn game (browser) thì bấm nút "🔄 Làm Mới Danh Sách Level" trong cheat
  menu để dò lại ngay, khỏi cần tải lại trang.
- Máy dev hiện tại **không có Node/npm/JDK/Android Studio**, chỉ có Python. Test
  nhanh trên trình duyệt bằng `python -m http.server` rồi mở
  `http://localhost:<port>/Color_Flow_2.0_fixed.html` (không mở trực tiếp bằng
  `file://` vì `fetch()` load level sẽ bị chặn CORS).

## Trạng thái hiện tại (cập nhật 12/08/2026)

- **Kế hoạch phát hành (ưu tiên hiện tại)**: build APK/đăng Play Store **tạm
  gác lại** — do vướng AdMob cần liên kết Play Store listing trước mới đổ được
  quảng cáo (xem mục AdMob bên dưới), ưu tiên hiện tại là **đăng lên
  CrazyGames trước**. Play Store/APK vẫn còn nguyên trong plan, chỉ là để sau.
- **Tích hợp CrazyGames SDK**: đã làm (12/08/2026) — thẻ
  `<script src="https://sdk.crazygames.com/crazygames-sdk-v2.js">` trong
  `<head>` của `Color_Flow_2.0_fixed.html`. `ads.js` giờ tự nhận diện đang chạy
  AdMob (Capacitor) hay CrazyGames (`window.CrazyGames.SDK`), gọi đúng API
  tương ứng — `script.js` chỉ gọi các hàm chung (`initAds()`,
  `showRewardedAd()`, `notifyLoadingStart/Stop()`, `notifyGameplayStart/Stop()`,
  `notifyHappyMoment()`) không cần biết đang chạy nền tảng nào. Quảng cáo
  "midgame" (không thưởng) tự chèn mỗi `MIDGAME_AD_EVERY_N` (đang để 3) màn qua
  được — chỉnh số này trong `script.js` (`markLevelCompleted()`) nếu muốn
  dày/thưa hơn. **CHƯA test thật trên crazygames.com** (chưa submit game lên
  đó) — trên `localhost` SDK ở môi trường `'local'`, quảng cáo bị tắt nhưng các
  API khác gọi được an toàn (không throw) theo tài liệu SDK, nên code chạy êm
  lúc dev nhưng chưa xác nhận được luồng quảng cáo thật hoạt động đúng cho tới
  khi thật sự submit/preview trên CrazyGames.
- **Privacy Policy**: đã xong, host trên GitHub Pages —
  https://chu-vit-huster-ngao-ngo-2k4.github.io/Cat_Yarn/privacy-policy.html
  Sẵn sàng dán vào Play Console → App content → Privacy Policy. Nguồn:
  `privacy-policy.html` ở gốc repo. Đổi cách app thu thập dữ liệu (thêm tài
  khoản, cloud save, SDK mới...) thì phải sửa lại file này cho khớp trước khi
  submit lại (Play Console đối chiếu Data Safety với nội dung trang này).
- **AdMob**: tài khoản đăng ký khoảng 09/08/2026. Test bằng APK thật trên điện
  thoại (12/08/2026) chưa thấy quảng cáo — vào AdMob console kiểm tra thì KHÔNG
  phải do đang chờ duyệt 24-48h, mà do app báo "Việc phân phát quảng cáo bị hạn
  chế — Thêm thông tin cửa hàng để nâng hạn mức" (chính sách Google: app AdMob
  chưa liên kết với 1 listing trên Play Store thì bị giới hạn/không đổ quảng
  cáo, kể cả tài khoản đã duyệt). Người dùng CHƯA tạo app trên Play Console —
  cần tạo app ở đó trước (kể cả bản nháp/internal testing track cũng được,
  không cần public), lấy link rồi bấm "Thêm cửa hàng" trong AdMob console để
  gắn vào. Đây là việc ở phía tài khoản Google Play/AdMob, không phải sửa code.
  ID thật đã gắn sẵn trong `ads.js`/`AndroidManifest.xml` (`ADS_ARE_TEST =
  false`). Muốn kiểm tra luồng code có chạy đúng không (không cần chờ duyệt/
  gắn store) thì tạm đổi `ADS_ARE_TEST = true` để dùng ad unit test của Google,
  nhớ đổi lại `false` trước khi build bản release thật.
- **App icon**: đã thay icon Capacitor mặc định bằng icon riêng
  (`icon/icon_game.png`, mèo ôm cá). Sinh lại toàn bộ icon Android (mọi mật độ +
  icon Play Store 512x512) bằng `python tools/generate_icons.py` — đổi icon thì
  chỉ cần thay `icon/icon_game.png` rồi chạy lại script.
- **Đa ngôn ngữ (VI/EN)**: đã thêm — `tools/locale.csv` là nguồn, chạy
  `python tools/build_locales.py` để xuất ra `locales.js` (biến `LOCALES`).
  `t()`/`applyLocale()` trong `script.js` áp cho toàn bộ UI. Mặc định hiện đang
  là **tiếng Anh**, đổi được qua nút ngôn ngữ trong Cài Đặt — nếu thấy người
  chơi Việt vào bị "khó hiểu ban đầu" thì khả năng cao là do default tiếng Anh
  này, cân nhắc đổi default về tiếng Việt.
- **Lưu tiến trình giữa màn**: đã làm — tự lưu `localStorage` (ô đã mở/cắm cờ,
  vị trí mèo, đã tìm màu chưa...) sau mỗi thay đổi, tự khôi phục khi bấm
  "Tiếp Tục" ở Home (chỉ đúng lối vào đó mới thử khôi phục, Chơi Lại/qua màn
  mới/cheat nhảy level luôn bàn cờ mới). Xem `saveLevelProgress()`/
  `readSavedLevelProgress()` trong `script.js`.

## Công cụ dev trong `tools/` (không đóng gói vào app, không cần đồng bộ `www/`)

- `level_checker.py` — kiểm 1 hoặc nhiều level có giải được bằng logic thuần
  không (mô phỏng đúng thuật toán `findHintCell()`/`floodReveal()` trong
  `script.js`). Dùng: `python tools/level_checker.py` (menu chọn), hoặc
  `python tools/level_checker.py 5`, hoặc `--all`.
- `level_editor.html` — vẽ level trực quan bằng chuột, chấm logic ngay khi vẽ,
  xuất JSON đúng định dạng để dán vào `levels/`. Mở trực tiếp bằng trình duyệt
  (double-click), không cần server/Node/Python.
- `generate_icons.py` — sinh lại toàn bộ icon Android từ `icon/icon_game.png`.

## Cheat menu dev (đã có sẵn trong game, ẩn với người chơi thường)

Bấm liên tiếp **7 lần** vào chữ tiêu đề bên trong modal **Cài Đặt lúc đang chơi**
(bấm ⚙️ trong màn Chơi để mở Settings trước, rồi tap dồn dập vào tiêu đề đó
trong vòng 1.5s) để mở — **không phải** tiêu đề "CAT'S YARN" ở màn Home, Settings
ở màn Home không có logic này. Có: nhảy tới level bất kỳ (nhập số, không phải
dropdown), +9999 xu, đầy Gợi Ý/Soi Bẫy, hiện vị trí bẫy trên bàn cờ. Toàn bộ code
nằm trong file build bình thường (không cần bước loại trừ khỏi `www/`) vì im
lìm nếu không biết thao tác bí mật.

## Việc cần làm để đăng lên CrazyGames (ưu tiên SỐ 1 hiện tại, cập nhật 12/08/2026)

1. **Tạo tài khoản developer trên CrazyGames** (developer.crazygames.com) — chưa làm.
2. **Đóng gói bản HTML5 để nộp** — zip nội dung `www/` (đây là bản build thật sẽ
   chạy, nhớ đồng bộ mọi file gốc vào `www/` trước khi zip — xem mục Quy tắc ở
   trên). Chưa kiểm tra kỹ giới hạn kỹ thuật của CrazyGames (dưới 50MB tổng, dưới
   1500 file — repo hiện khá nhỏ nên khả năng cao là ổn, nhưng chưa đo chính xác).
3. **Chuẩn bị metadata nộp game**: mô tả game, hướng dẫn chơi, ảnh thumbnail/cover
   theo đúng kích thước CrazyGames yêu cầu (chưa có ảnh nào chuẩn bị riêng cho
   việc này, `icon/icon_game.png` hiện tại là icon Android, có thể cần ảnh khác
   tỉ lệ/kích thước cho CrazyGames listing).
4. **Dùng Preview tool** (developer.crazygames.com) để test thử game chạy trong
   iframe/môi trường CrazyGames thật trước khi submit chính thức — code tích hợp
   SDK đã xong (xem mục "Tích hợp CrazyGames SDK" ở trên) nhưng CHƯA test thật
   trên đó, chỉ mới test được trên `localhost` (SDK ở môi trường `'local'`,
   quảng cáo tự tắt).
5. Submit game — quy trình 2 giai đoạn: **Basic Launch** (test lượng nhỏ người
   chơi, 7-21 ngày, CHƯA bật kiếm tiền, chỉ cần tích hợp cơ bản — cái này gần
   như đã đủ điều kiện về mặt code) → **Full Launch** (phát hành toàn cầu, bật
   kiếm tiền, cần tích hợp đầy đủ + qua vòng QA review của CrazyGames).
6. Cân nhắc lại default ngôn ngữ (đang là tiếng Anh) nếu muốn nhắm cả người chơi
   Việt trên CrazyGames — xem mục "Đa ngôn ngữ" ở trên.

## Cơ chế "Cổng Dịch Chuyển" (thêm 19/08/2026) — TẠM DỪNG phát triển thêm

Đã hoạt động đầy đủ, không xoá code, nhưng KHÔNG tích hợp thêm/mở rộng nữa cho
tới khi được yêu cầu lại (người dùng bảo "tạm dừng cơ chế này lại" khi chuyển
sang làm cơ chế Liên Kết bên dưới).

Ô 'G' = cổng đầu (ẩn, nhiều ô/màn — thường 2-4), ô 'P' = cổng đích (đúng 1 ô/màn,
lộ diện sẵn từ đầu màn như S/E). Dẫm trúng cổng đầu KHÔNG gây thua (khác bẫy) —
mèo bị "hút" sang cổng đích sau 1 nhịp ngắn (tự hé lộ thêm vài ô an toàn quanh
cổng đích lúc đó để có manh mối suy luận tiếp), cổng đầu đó thành ô thường (đi
lại qua không teleport nữa, vẫn hiện số bẫy bình thường nếu có).

**Cổng đầu KHÔNG có số riêng** (đã thử rồi bỏ — 2 số/ô gây rối, xem lịch sử
commit) — chỉ suy luận theo lớp BẪY như cũ (`deduceAll()` trong script.js /
`deduce()` trong `tools/level_checker.py` chỉ dùng field `count`, field `count2`
vẫn được tính ở `loadLevel()`/`build_grid()` nhưng CHỈ để tô màu, không dùng để
suy luận). Ô 'N' đã mở mà có `count2 > 0` (cổng đầu kề cạnh) → tô nền TÍM MỜ
(class `gate-nearby`) báo "gần đây có cổng", không lộ chính xác bao nhiêu. Đúng
ô cổng đầu vừa dẫm trúng → tô nền ĐEN (class `gate-origin-cell`), số bẫy (nếu
có) viền trắng để đọc rõ — phân biệt hẳn với các ô tím mờ xung quanh (bản thân
không phải cổng). Vì không cần suy luận được cổng đầu bằng logic (không gây
thua), level_checker.py cũng KHÔNG bắt buộc gate phải "giải được" như bẫy, chỉ
bẫy mới bắt buộc.

Đã tích hợp vào cả 3 nơi tạo level:
- Level tĩnh tay: `levels/level51-53.json` (52-53 là 9x9 khó, cổng đầu đặt xa
  cổng đích nhất có thể — dùng Chebyshev distance).
- `tools/level_editor.html` — có 2 mode vẽ riêng ("🌀 Cổng Đầu", "🎯 Cổng Đích"),
  soát lỗi đúng 1 P khi có G (và ngược lại), xuất/nạp JSON có G/P bình thường.
- Level tự sinh vô tận (`generateProceduralLevel()`/`genPlaceGates()` trong
  script.js) — ~35% level tự sinh có cơ chế này (`GEN_GATE_CHANCE`), 2-4 cổng
  đầu, đặt xa cổng đích nhất có thể (cùng thuật toán Chebyshev như level tay).

## Cơ chế "Liên Kết" (thêm 19/08/2026, đổi thiết kế cùng ngày) — TẠM DỪNG phát triển thêm

**Bản đầu** (đã bỏ): các ô cùng nhóm LUÔN cùng loại (toàn bẫy/toàn an toàn), có
Luật D hỗ trợ suy luận. Nhận định sau khi làm xong: chỉ làm game DỄ hơn (biết
trước "cùng phe" qua màu là giải quyết hết), không tăng thử thách — xem lịch sử
commit nếu cần đọc lại chi tiết bản này.

**Bản hiện tại** ("CÙNG KÍCH HOẠT" thay vì "cùng loại"): 1 nhóm giờ có thể TRỘN
LẪN loại ô — ký tự `a`-`d` = bẫy trong nhóm a/b/c/d, `w`-`z` = cổng đầu CÙNG
nhóm với chữ cái tương ứng (w↔a, x↔b, y↔c, z↔d, ban thân là cổng chứ không phải
bẫy), `1`-`4` = ô thường trong nhóm 1/2/3/4 (chỉ để mở chuỗi, không có hiệu ứng
gì đặc biệt). Tối thiểu 2 ô/nhóm (đếm gộp cả biến thể bẫy lẫn cổng của cùng 1
nhóm). Đã BỎ HẲN Luật D — nhóm không còn ý nghĩa hỗ trợ suy luận nữa, `deduceAll()`/
`deduce()` chỉ còn đúng Luật A/B/C như trước khi có cơ chế này.

Dẫm trúng 1 ô trong nhóm → CÁC Ô CÒN LẠI cùng nhóm "kích hoạt" theo NGAY
(`revealLinkedPartners()` trong script.js), mỗi ô lãnh ĐÚNG hiệu ứng của loại nó:
- Ô bẫy trong nhóm: LÃNH NGUYÊN 1 lần trúng bẫy thật (`applyBombHit()` — tách
  riêng từ nhánh `cell.type === 'B'` cũ trong `revealAndMove()` để dùng lại
  được) — dẫm trúng 1 ô link với N quả bẫy khác thì mất đúng N+1 tym dồn lại,
  KHÔNG còn tự tháo ngòi miễn phí như bản đầu nữa (theo yêu cầu "trừ tym dồn").
  `revealAndMove()` tự dừng ngay (`if (isGameOver) return;`) nếu tổ hợp bẫy
  link khiến thua giữa chừng, tránh gọi `applyBombHit()` 2 lần lên chính ô vừa
  bước vào (nếu bản thân nó cũng là 1 ô bẫy) → tránh hiện popup Thua lặp lại.
- Ô cổng đầu trong nhóm: kích hoạt teleport THẬT SỰ (gọi lại `triggerGateTeleport()`
  y hệt lúc dẫm trực tiếp) — vd dẫm trúng bẫy link với cổng thì vừa mất mạng/nổ
  bẫy VỪA bị hút sang cổng đích luôn, 2 hậu quả cộng dồn.
- Ô thường trong nhóm: mở bình thường (tự loang tiếp nếu count=0).

Ngoại lệ AN TOÀN: booster "Soi Bẫy" (`revealRandomBomb()`) gọi
`revealLinkedPartners(r, c, true)` — tham số `forceSafe=true` khiến bẫy/cổng
trong nhóm CHỈ lộ ra + tháo ngòi/không teleport thật, không áp hậu quả thật —
vì booster đó cam kết luôn an toàn tuyệt đối, dùng nó không được phép bị trừ
mạng ngoài ý muốn.

Hành vi khác giữ nguyên từ bản đầu: màu nền nhóm (tông lạnh, `LINK_COLOR_PALETTE`)
hiện sẵn khi còn ẩn, mất tint khi mở ra; cắm/gỡ cờ 1 ô đồng bộ cả nhóm
(`toggleFlag()`). Bộ tự sinh (`genPlaceLinkGroup()`) và `levels/level54.json`
hiện CHƯA cập nhật theo bản thiết kế mới (vẫn chỉ tạo nhóm đồng nhất loại a-d/1-4,
không tạo combo bẫy+cổng) — vẫn chạy được bình thường (vẫn là 1 trường hợp con
hợp lệ của thiết kế mới) nhưng chưa khai thác hết khả năng combo. `tools/level_editor.html`
CHƯA hỗ trợ vẽ nhóm liên kết (chỉ soạn tay JSON hoặc dùng level_checker.py).

Không xoá code, nhưng KHÔNG tích hợp thêm/mở rộng nữa cho tới khi được yêu cầu lại.

## Nghi vấn: cơ chế "ăn nhiều cá" (multi-stage) từng làm nhưng đã biến mất

Trước đây (phiên làm việc trước) đã từng implement 1 cơ chế map nhiều giai đoạn
("ăn cá xong bị hút sang map con tiếp theo") — nhưng code đó CHƯA BAO GIỜ được
commit, và tới giờ không còn tồn tại trong `script.js` (đã grep xác nhận không
còn `buildStageGrid`/`currentStageIdx`/`normalizeLevelData` gì cả). Nhiều khả
năng bị mất khi các commit Leaderboard/Profile/Tabs (làm độc lập, không liên
quan) ghi đè lên đúng những file đó trước khi kịp commit phần multi-stage. Nếu
muốn cơ chế này quay lại thì coi như làm lại từ đầu.

## Việc còn thiếu (ưu tiên giảm dần, không gấp bằng mục CrazyGames ở trên)

1. Màn "Chọn Level" cho người chơi thường — hiện chỉ chơi tuần tự được, không
   quay lại chơi màn cũ (trừ dev qua cheat menu).
2. Chưa có nhạc nền (chỉ SFX tổng hợp + 1 track thắng).
3. Chưa có analytics/crash reporting.
