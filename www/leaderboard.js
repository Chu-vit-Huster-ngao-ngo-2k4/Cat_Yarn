// =============================================================================
// HỒ SƠ NGƯỜI CHƠI (tên + avatar, xem PLAYER_NAME_KEY/PLAYER_AVATAR_KEY) + BẢNG
// XẾP HẠNG. Hồ sơ là khái niệm CHUNG cho cả game (mở từ nút avatar góc trên-trái
// màn Home — xem openProfileModal() trong script.js), KHÔNG phải thứ riêng của
// tab Xếp Hạng — bảng xếp hạng chỉ là 1 nơi ĐỌC LẠI đúng tên/avatar đã lưu ở đây
// để hiện lên, không sở hữu dữ liệu này.
//
// Bảng xếp hạng dùng Firebase Firestore (gói Spark miễn phí) làm database chung
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
// Toàn bộ hàm liên quan Firestore ở đây PHẢI im lặng bỏ qua (không throw, không
// chặn chơi game) nếu chưa cấu hình xong Firebase, mất mạng, hoặc Firestore rules
// chặn request — bảng xếp hạng là tính năng PHỤ, không được phép làm hỏng trải
// nghiệm chơi chính. Riêng hồ sơ (tên/avatar) vẫn hoạt động HOÀN TOÀN OFFLINE
// (chỉ lưu localStorage) kể cả khi Firebase chưa sẵn sàng.
// =============================================================================

// ----- ID thiết bị -----
// ID ẩn danh riêng cho từng THIẾT BỊ (không phải tài khoản) — sinh 1 lần, lưu
// localStorage, dùng làm document ID trên Firestore để lần gửi điểm SAU đè lên
// (merge) đúng dòng của người chơi đó thay vì tạo dòng mới mỗi lần.
const PLAYER_ID_KEY = 'catYarnPlayerId';

function getPlayerId() {
    try {
        let id = localStorage.getItem(PLAYER_ID_KEY);
        if (!id) {
            id = (crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : ('p' + Date.now() + Math.random().toString(16).slice(2));
            localStorage.setItem(PLAYER_ID_KEY, id);
        }
        return id;
    } catch (e) { return null; }
}

// ----- Tên -----
const PLAYER_NAME_KEY = 'catYarnPlayerName';

function getPlayerName() {
    try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; } catch (e) { return ''; }
}

function savePlayerName(name) {
    try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch (e) { /* bỏ qua nếu bị chặn */ }
}

// ----- Avatar -----
// Toàn bộ ảnh avatar cho phép chọn nằm trong thư mục icon/ava/ — danh sách file
// (PLAYER_AVATAR_FILES) KHÔNG khai báo tay ở đây nữa mà đọc từ avatars.js (nạp
// bằng thẻ <script> TRƯỚC file này trong index.html), file đó tự sinh bằng lệnh
// `python tools/build_avatar_list.py` (quét icon/ava/) — MUỐN THÊM AVATAR MỚI,
// chỉ cần bỏ ảnh vào icon/ava/ rồi chạy lại lệnh đó (xem hướng dẫn đầy đủ + bước
// đồng bộ www/ + cập nhật firestore.rules trong chính file build_avatar_list.py).
//
// Chỉ lưu TÊN FILE (không kèm đường dẫn) trong localStorage/Firestore — ghép
// đường dẫn đầy đủ lúc hiển thị qua playerAvatarPath().
const PLAYER_AVATAR_KEY = 'catYarnPlayerAvatar';

function playerAvatarPath(file) {
    return 'icon/ava/' + file;
}

// Avatar MẶC ĐỊNH theo hash playerId (dùng khi người chơi chưa tự chọn, hoặc để
// hiện avatar của NGƯỜI KHÁC trên bảng xếp hạng nếu vì lý do gì đó doc của họ
// thiếu field avatar — vd tài khoản tạo trước khi tính năng này ra đời).
function pickDefaultPlayerAvatar(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return PLAYER_AVATAR_FILES[hash % PLAYER_AVATAR_FILES.length];
}

function getPlayerAvatar() {
    try {
        return localStorage.getItem(PLAYER_AVATAR_KEY) || '';
    } catch (e) { return ''; }
}

function savePlayerAvatar(file) {
    try { localStorage.setItem(PLAYER_AVATAR_KEY, file); } catch (e) { /* bỏ qua nếu bị chặn */ }
}

// ----- Bảng xếp hạng (Firestore) -----
const LEADERBOARD_COLLECTION = 'leaderboard';
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

// Gọi mỗi khi qua màn (xem markLevelCompleted() trong script.js) HOẶC khi lưu
// hồ sơ (xem savePlayerProfile() trong script.js). Chỉ thật sự gửi lên server
// nếu người chơi ĐÃ đặt biệt danh (đặt tên = đồng ý hiện lên bảng xếp hạng, chưa
// đặt thì coi như chưa tham gia) VÀ Firebase đã sẵn sàng.
function submitLeaderboardScore(score) {
    if (!leaderboardReady || !leaderboardDb) return;
    const name = getPlayerName();
    if (!name) return;
    const playerId = getPlayerId();
    if (!playerId) return;
    const avatar = getPlayerAvatar() || pickDefaultPlayerAvatar(playerId);
    leaderboardDb.collection(LEADERBOARD_COLLECTION).doc(playerId).set({
        name,
        score,
        avatar,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => { /* mất mạng/bị rules chặn -> bỏ qua, không chặn chơi */ });
}

// Luôn resolve (không bao giờ reject) — { ok, rows, myId } để UI tự quyết định
// hiện gì (danh sách / thông báo lỗi / trống).
async function fetchLeaderboard() {
    const myId = getPlayerId();
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
