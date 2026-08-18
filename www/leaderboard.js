// =============================================================================
// BẢNG XẾP HẠNG — dùng Firebase Firestore (gói Spark miễn phí) làm database chung
// lưu điểm giữa mọi người chơi. Điểm dùng = SỐ MÀN ĐÃ QUA (completedLevels.size
// trong script.js) — vì level tự sinh vô tận (xem ensureLevelGenerated()), không
// có "level cuối" cố định để so.
//
// Cấu hình project THẬT nằm ở firebase-config.js (không commit key thật kèm code
// mẫu — xem hướng dẫn tự tạo project trong chính file đó).
//
// RỦI RO CẦN BIẾT: điểm được gửi thẳng từ trình duyệt người chơi (client-side),
// không qua server kiểm chứng, nên về lý thuyết ai đó sửa code JS vẫn gửi được
// điểm giả. firestore.rules chặn được vài kiểu gian lận thô sơ (tự hạ điểm, gửi
// điểm âm/quá lớn, sửa field lạ) nhưng KHÔNG chống được việc tự nâng điểm giả lên
// mức "hợp lý". Chấp nhận được với 1 game hobby không cạnh tranh giải thưởng —
// muốn chống gian lận thật sự thì phải có backend riêng validate điểm.
//
// Toàn bộ hàm ở đây PHẢI im lặng bỏ qua (không throw, không chặn chơi game) nếu
// chưa cấu hình xong Firebase, mất mạng, hoặc Firestore rules chặn request —
// leaderboard là tính năng PHỤ, không được phép làm hỏng trải nghiệm chơi chính.
// =============================================================================

const LEADERBOARD_COLLECTION = 'leaderboard';
const LEADERBOARD_PLAYER_ID_KEY = 'catYarnLeaderboardPlayerId';
const LEADERBOARD_NAME_KEY = 'catYarnLeaderboardName';
const LEADERBOARD_TOP_N = 50;

let leaderboardDb = null;
let leaderboardReady = false;

// Gọi 1 lần lúc khởi động app (xem IIFE cuối script.js), giống initAds() —
// không await, không được làm chậm màn Home.
function initLeaderboard() {
    try {
        if (typeof firebase === 'undefined') return; // SDK chưa load được (mất mạng/bị chặn)
        if (typeof FIREBASE_CONFIG === 'undefined') return; // thiếu file firebase-config.js
        if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('DIEN_SAU') !== -1) return; // chưa điền config thật
        firebase.initializeApp(FIREBASE_CONFIG);
        leaderboardDb = firebase.firestore();
        leaderboardReady = true;
    } catch (e) {
        leaderboardDb = null;
        leaderboardReady = false;
    }
}

// ID ẩn danh riêng cho từng THIẾT BỊ (không phải tài khoản) — sinh 1 lần, lưu
// localStorage, dùng làm document ID trên Firestore để lần gửi điểm SAU đè lên
// (merge) đúng dòng của người chơi đó thay vì tạo dòng mới mỗi lần.
function getLeaderboardPlayerId() {
    try {
        let id = localStorage.getItem(LEADERBOARD_PLAYER_ID_KEY);
        if (!id) {
            id = (crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : ('p' + Date.now() + Math.random().toString(16).slice(2));
            localStorage.setItem(LEADERBOARD_PLAYER_ID_KEY, id);
        }
        return id;
    } catch (e) { return null; }
}

function getLeaderboardName() {
    try { return localStorage.getItem(LEADERBOARD_NAME_KEY) || ''; } catch (e) { return ''; }
}

function saveLeaderboardName(name) {
    try { localStorage.setItem(LEADERBOARD_NAME_KEY, name); } catch (e) { /* bỏ qua nếu bị chặn */ }
}

// Gọi mỗi khi qua màn (xem markLevelCompleted() trong script.js). Chỉ thật sự
// gửi lên server nếu người chơi ĐÃ đặt biệt danh (đặt tên = đồng ý tham gia xếp
// hạng, chưa đặt thì coi như chưa tham gia) VÀ Firebase đã sẵn sàng.
function submitLeaderboardScore(score) {
    if (!leaderboardReady || !leaderboardDb) return;
    const name = getLeaderboardName();
    if (!name) return;
    const playerId = getLeaderboardPlayerId();
    if (!playerId) return;
    leaderboardDb.collection(LEADERBOARD_COLLECTION).doc(playerId).set({
        name,
        score,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => { /* mất mạng/bị rules chặn -> bỏ qua, không chặn chơi */ });
}

// Luôn resolve (không bao giờ reject) — { ok, rows, myId } để UI tự quyết định
// hiện gì (danh sách / thông báo lỗi / trống).
async function fetchLeaderboard() {
    const myId = getLeaderboardPlayerId();
    if (!leaderboardReady || !leaderboardDb) return { ok: false, rows: [], myId };
    try {
        const snap = await leaderboardDb.collection(LEADERBOARD_COLLECTION)
            .orderBy('score', 'desc')
            .limit(LEADERBOARD_TOP_N)
            .get();
        const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { ok: true, rows, myId };
    } catch (e) {
        return { ok: false, rows: [], myId };
    }
}
