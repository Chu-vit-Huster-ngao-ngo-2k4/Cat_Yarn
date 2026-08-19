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

## Cơ chế "Cổng Dịch Chuyển" (thêm 19/08/2026)

Ô 'G' = cổng đầu (ẩn, nhiều ô/màn — thường 2-4), ô 'P' = cổng đích (đúng 1 ô/màn,
lộ diện sẵn từ đầu màn như S/E). Dẫm trúng cổng đầu KHÔNG gây thua (khác bẫy) —
mèo bị "hút" sang cổng đích sau 1 nhịp ngắn, cổng đầu đó thành ô thường (đi lại
qua không teleport nữa). Cổng đầu có SỐ RIÊNG (đếm cạnh 8 hướng, độc lập với số
bẫy) — cố ý: 1 ô số giờ cõng 2 lớp đếm độc lập (`count` = bẫy, `count2` = cổng
đầu), solver chạy `deduceLayer()` riêng cho từng lớp rồi giao (intersect) lại,
xem `deduceAll()` trong script.js và `tools/level_checker.py` (đã đồng bộ 2 file
— sửa 1 bên nhớ sửa bên kia). `tools/level_editor.html` CHƯA được cập nhật hỗ
trợ vẽ G/P (chỉ soạn tay JSON hoặc dùng level_checker.py để kiểm). Level ví dụ:
`levels/level51.json`.

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
