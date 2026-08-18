// =============================================================================
// CẤU HÌNH FIREBASE — điền config THẬT của project bạn tự tạo trên Firebase
// Console vào đây. Cho tới khi điền xong (còn giữ nguyên "DIEN_SAU" bất kỳ chỗ
// nào), leaderboard.js tự nhận ra là CHƯA cấu hình xong và im lặng tắt toàn bộ
// Bảng Xếp Hạng — không lỗi, không ảnh hưởng phần còn lại của game.
//
// Các bước lấy config (miễn phí, gói Spark là đủ dùng cho leaderboard):
//   1. Vào console.firebase.google.com -> "Add project" -> đặt tên tuỳ ý -> tạo.
//   2. Trong trang project, bấm biểu tượng "</>" (Add app -> Web) để đăng ký 1
//      web app -> đặt tên app tuỳ ý -> Register app.
//   3. Firebase hiện ra đúng object "firebaseConfig" -> copy các giá trị dán thay
//      vào FIREBASE_CONFIG bên dưới.
//   4. Vào menu Build -> Firestore Database -> Create database -> chọn chế độ
//      Production, khu vực gần người chơi nhất (vd asia-southeast1) -> tạo xong
//      sẽ có 1 database rỗng.
//   5. Vào tab "Rules" của Firestore Database, dán TOÀN BỘ nội dung file
//      firestore.rules (cùng thư mục gốc project) rồi bấm Publish — BẮT BUỘC,
//      nếu không mọi request đọc/ghi từ game sẽ bị Firestore chặn mặc định.
//   6. Nhớ copy file này (đã điền config thật) sang www/firebase-config.js trước
//      khi build/đóng gói, giống mọi file gốc khác — xem CLAUDE.md.
// =============================================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAFWJCBhpy1u6xAQ3uz3iUCnQ0XV4TkZfs",
    authDomain: "my-game-leaderboard-e41ba.firebaseapp.com",
    projectId: "my-game-leaderboard-e41ba",
    storageBucket: "my-game-leaderboard-e41ba.firebasestorage.app",
    messagingSenderId: "35923741586",
    appId: "1:35923741586:web:9c8c031e152981ebe50f4b",
    measurementId: "G-WSBR591DY7"
};