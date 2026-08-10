# Cat's Yarn 🐱💣

Game giải đố kiểu Minesweeper: điều khiển mèo đi qua lưới ô để tới đĩa cá, né các
bẫy ẩn dựa vào số gợi ý trên mỗi ô đã mở. Nhiều màn (5x5 → 9x9, số màn tự dò theo
file có trong `levels/` lúc khởi động), có hệ thống xu,
booster (Gợi Ý / Quay Lại), hồi sinh khi thua, quảng cáo AdMob (banner + rewarded).

Viết bằng HTML/CSS/JS thuần (không bundler), đóng gói thành app Android qua
[Capacitor](https://capacitorjs.com/).

## Yêu cầu môi trường

- [Node.js](https://nodejs.org/) (khuyến nghị bản LTS mới nhất)
- [Android Studio](https://developer.android.com/studio) (cài kèm Android SDK) — cần để build APK
- JDK (thường đi kèm sẵn trong Android Studio)

## Cài đặt lần đầu (sau khi `git clone`)

```bash
# 1. Cài dependency
npm install

# 2. Trỏ đường dẫn Android SDK trên máy này (KHÔNG commit file này lên git vì
#    mỗi máy 1 đường dẫn khác nhau). Sửa đường dẫn cho đúng máy bạn.
echo "sdk.dir=/duong/dan/toi/Android/Sdk" > android/local.properties
# Trên Windows thường là: C:/Users/<ten-may>/AppData/Local/Android/Sdk

# 3. Đồng bộ code web vào project Android
npx cap sync android
```

## Build & chạy thử

```bash
cd android
./gradlew assembleDebug
```

APK debug sẽ nằm ở `android/app/build/outputs/apk/debug/app-debug.apk` — cài
trực tiếp vào điện thoại/emulator để test.

## Luồng chỉnh sửa code

File nguồn thật nằm ở thư mục gốc:
- `Color_Flow_2.0_fixed.html` — HTML chính
- `script.js` — toàn bộ logic game
- `ads.js` — tích hợp AdMob (banner + rewarded ad)
- `style.css` — giao diện
- `levels/level01.json` … `levelNN.json` — dữ liệu từng màn (load bằng `fetch()` lúc khởi động, mỗi màn 1 file riêng cho dễ sửa). Game tự dò tuần tự `levelNN.json` tới khi gặp file không tồn tại thì dừng — thêm màn mới chỉ cần đặt đúng tên file kế tiếp theo thứ tự liên tục (không hổng số), không cần sửa code. Nên kiểm bằng `tools/level_checker.py` hoặc `tools/level_editor.html` trước khi thêm, để đảm bảo màn giải được bằng logic thuần.

Thư mục `www/` là **bản sao** mà Capacitor thực sự đóng gói vào app. Sau khi sửa
bất kỳ file nào ở trên, phải copy lại vào `www/` rồi sync trước khi build:

```bash
cp Color_Flow_2.0_fixed.html www/index.html
cp script.js www/script.js
cp ads.js www/ads.js
cp style.css www/style.css
cp -r levels/*.json www/levels/
npx cap sync android
cd android && ./gradlew assembleDebug
```

> Lưu ý: vì `script.js` dùng `fetch()` để tải level, mở thẳng file HTML bằng
> trình duyệt (`file://`) sẽ không chạy được do CORS. Muốn test nhanh trên
> desktop, chạy 1 local server đơn giản rồi mở qua `http://localhost`, ví dụ:
> `npx serve .`

## AdMob

ID quảng cáo thật nằm ở đầu file `ads.js` (App ID / Banner ID / Rewarded ID) và
`android/app/src/main/AndroidManifest.xml` (App ID). Khi test, **không tự bấm/
xem quảng cáo thật của chính mình nhiều lần** — AdMob tính là click gian lận,
có thể bị khoá tài khoản. Đăng ký thiết bị test qua mảng `AD_TEST_DEVICE_IDS`
trong `ads.js` để xem quảng cáo thật an toàn lúc phát triển.

## Cấu trúc thư mục

```
Color_Flow_2.0_fixed.html   HTML nguồn
script.js                   Logic game
ads.js                      Tích hợp AdMob
style.css                   Giao diện
levels/                     Dữ liệu từng màn (JSON), game tự dò số màn lúc khởi động
tools/                      Công cụ dev: kiểm/tạo level (không đóng gói vào app)
icon/                       Icon dùng trong UI
sfx/, victory.mp3           Âm thanh
www/                        Bản build Capacitor đóng gói vào app (sinh ra từ các file trên)
android/                    Project Android native (Capacitor)
```
