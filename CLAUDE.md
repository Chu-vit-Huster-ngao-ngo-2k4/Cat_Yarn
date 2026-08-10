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

## Trạng thái hiện tại (cập nhật 10/08/2026)

- **Privacy Policy**: đã xong, host trên GitHub Pages —
  https://chu-vit-huster-ngao-ngo-2k4.github.io/Cat_Yarn/privacy-policy.html
  Sẵn sàng dán vào Play Console → App content → Privacy Policy. Nguồn:
  `privacy-policy.html` ở gốc repo. Đổi cách app thu thập dữ liệu (thêm tài
  khoản, cloud save, SDK mới...) thì phải sửa lại file này cho khớp trước khi
  submit lại (Play Console đối chiếu Data Safety với nội dung trang này).
- **AdMob**: tài khoản mới đăng ký khoảng 09/08/2026, đang chờ Google duyệt
  (~24-48h). ID thật đã gắn sẵn trong `ads.js`/`AndroidManifest.xml`
  (`ADS_ARE_TEST = false`). Build APK thử mà chưa thấy quảng cáo trong vài ngày
  đầu là bình thường, không phải lỗi code. Muốn kiểm tra luồng code có chạy đúng
  không (không cần chờ duyệt) thì tạm đổi `ADS_ARE_TEST = true` để dùng ad unit
  test của Google, nhớ đổi lại `false` trước khi build bản release thật.
- **App icon**: đã thay icon Capacitor mặc định bằng icon riêng
  (`icon/icon_game.png`, mèo ôm cá). Sinh lại toàn bộ icon Android (mọi mật độ +
  icon Play Store 512x512) bằng `python tools/generate_icons.py` — đổi icon thì
  chỉ cần thay `icon/icon_game.png` rồi chạy lại script.

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

Bấm liên tiếp **7 lần** vào tiêu đề "CAT'S YARN" ở màn Home (trong vòng 1.5s) để
mở. Có: nhảy tới level bất kỳ, +9999 xu, đầy Gợi Ý/Lại, hiện vị trí bẫy trên bàn
cờ. Toàn bộ code nằm trong file build bình thường (không cần bước loại trừ khỏi
`www/`) vì im lìm nếu không biết thao tác bí mật.

## Việc còn thiếu (đã note với người dùng, ưu tiên giảm dần)

1. Màn "Chọn Level" cho người chơi thường — hiện chỉ chơi tuần tự được, không
   quay lại chơi màn cũ (trừ dev qua cheat menu).
2. Tiến trình giữa màn không lưu `localStorage` — thoát app dở màn là mất, phải
   chơi lại từ đầu màn đó.
3. Chưa có nhạc nền (chỉ SFX tổng hợp + 1 track thắng).
4. Chưa có analytics/crash reporting.
5. Chỉ tiếng Việt, chưa đa ngôn ngữ.
