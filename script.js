    // =============================================================================
// WEB AUDIO API SOUND GENERATOR (100% SCRIPT - NO ASSETS REQUIRED)
// =============================================================================
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// File nhạc chiến thắng có sẵn trong project — dùng thay cho pháo hoa tự tổng hợp.
const victorySound = new Audio('sfx/victory.mp3');
victorySound.preload = 'auto';

// Thêm bộ nhận diện Thao tác Vuốt (Swipe) trên Mobile.
// Ngưỡng để cao (50px) vì tap-vào-ô là cách di chuyển chính trên mobile — vuốt chỉ
// là lối tắt phụ, ngưỡng thấp dễ khiến 1 cái tap hơi run tay bị hiểu nhầm thành vuốt.
const SWIPE_THRESHOLD = 50;
let touchStartX = 0, touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, false);

document.addEventListener('touchend', e => {
    if (!playerPos || isWalking) return; // đang ở màn Home, hoặc mèo đang tự chạy tới ô xa
    let diffX = e.changedTouches[0].screenX - touchStartX;
    let diffY = e.changedTouches[0].screenY - touchStartY;
    let { r, c } = playerPos;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > SWIPE_THRESHOLD) {
            if (diffX > 0) handleMoveInput(r, c + 1); // Vuốt Phải
            else handleMoveInput(r, c - 1);           // Vuốt Trái
        }
    } else {
        if (Math.abs(diffY) > SWIPE_THRESHOLD) {
            if (diffY > 0) handleMoveInput(r + 1, c); // Vuốt Xuống
            else handleMoveInput(r - 1, c);           // Vuốt Lên
        }
    }
}, false);

// UI trên/dưới (top bar, status, nút bấm) giữ nguyên kích thước thật, không co giãn
// theo màn hình — chỉ vùng bàn cờ ở giữa mới tự co giãn để vừa khoảng trống còn lại
// (điện thoại nhỏ vẫn vừa khít, không bị tràn/cắt; layout bên trong bàn cờ vẫn giữ
// nguyên pixel cố định như cũ, chỉ scale toàn khối bằng transform).
function fitBoardToSpace() {
    const boardArea = document.getElementById('board-area');
    const boardOuter = document.getElementById('board-outer');
    const board = document.getElementById('game-board');
    if (!boardArea || !boardOuter || !board) return;
    if (getComputedStyle(document.getElementById('screen-game')).display === 'none') return;

    board.style.transform = 'scale(1)';
    const naturalW = board.offsetWidth;
    const naturalH = board.offsetHeight;

    const availW = boardArea.clientWidth - 12;
    const availH = boardArea.clientHeight - 12;
    const scale = Math.min(1, availW / naturalW, availH / naturalH);

    board.style.transform = `scale(${scale})`;
    boardOuter.style.width = Math.round(naturalW * scale) + 'px';
    boardOuter.style.height = Math.round(naturalH * scale) + 'px';
}
window.addEventListener('resize', fitBoardToSpace);
window.addEventListener('orientationchange', fitBoardToSpace);
window.addEventListener('load', fitBoardToSpace);
function toggleAudio() {
    soundEnabled = !soundEnabled;
    updateSoundToggleUI();
}

// Dùng chung cho cả nút loa trong settings-modal (màn chơi) lẫn home-settings-modal
// (màn Home) — 2 modal khác nhau nhưng cùng chia sẻ 1 trạng thái soundEnabled.
function updateSoundToggleUI() {
    document.querySelectorAll('.settings-toggle').forEach(btn => {
        btn.classList.toggle('muted', !soundEnabled);
    });
}

function showSettings() {
    updateSoundToggleUI();
    document.getElementById('settings-modal').classList.add('show');
}

function hideSettings() {
    document.getElementById('settings-modal').classList.remove('show');
}

function replayFromSettings() {
    hideSettings();
    loadLevel(currentLevelIdx);
}

// Settings riêng cho màn Home (Âm thanh + Nhạc "sắp có" + Privacy + Liên hệ) —
// không có "Chơi Lại" vì chưa vào màn nào để replay.
function showHomeSettings() {
    updateSoundToggleUI();
    document.getElementById('home-settings-modal').classList.add('show');
}

function hideHomeSettings() {
    document.getElementById('home-settings-modal').classList.remove('show');
}

document.getElementById('home-settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'home-settings-modal') hideHomeSettings();
});

document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') hideSettings();
});

function playSound(type) {
    if (!soundEnabled) return;

    if (type === 'win') {
        // Dùng file nhạc chiến thắng có sẵn trong project thay vì âm thanh tự tổng hợp.
        victorySound.currentTime = 0;
        victorySound.play().catch(() => { /* trình duyệt chặn autoplay trước tương tác, bỏ qua */ });
        return;
    }

    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'jump') {
        // Tiếng nhảy cưng xỉu
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
    else if (type === 'flag') {
        // Tiếng tích cắm/gỡ cờ
        osc.type = 'square';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
    }
    else if (type === 'pop') {
        // Tiếng "bụp" nhỏ, nhẹ — dùng lặp lại cho từng ô nổ lúc ăn mừng chiến thắng,
        // cao độ ngẫu nhiên 1 chút để nhiều tiếng chồng nhau nghe như lép bép chứ
        // không bị lặp y hệt nhau.
        const freq = 480 + Math.random() * 320;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.09);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
    }
    else if (type === 'surprise') {
        // Tiếng "hự, hết hồn!" khi mèo đi nhanh mà vẫn thoát nạn
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.07);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.16);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
    }
    else if (type === 'boom') {
        // Tiếng nổ bẫy: thud trầm + nhiễu nổ
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);

        const bufferSize = audioCtx.sampleRate * 0.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start(now);
        noise.stop(now + 0.2);
    }
}

// =============================================================================
// CANVAS PARTICLE SYSTEM
// =============================================================================
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrameId = null;
let fxAnimating = false; // true khi vòng lặp animateFX() đang chạy — để biết có cần khởi động lại không

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.logicalWidth = window.innerWidth;
    canvas.logicalHeight = window.innerHeight;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const FX_COLORS = ['#ff5964', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff85a1', '#f7aef8'];
const BOOM_COLORS = ['#4a3022', '#2e1b12', '#8c5a3c', '#d6cbba'];

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)];

        if (type === 'heart') {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.size = Math.random() * 10 + 12;
            this.gravity = 0.15;
            this.friction = 0.96;
            this.alpha = 1;
            this.decay = Math.random() * 0.015 + 0.008;
        } else if (type === 'ring') {
            // Vòng sóng xung kích bung ra rồi mờ dần — cho cảm giác "nổ" rõ ràng hơn.
            this.radius = 2;
            this.growSpeed = 3.4;
            this.alpha = 0.9;
            this.decay = 0.045;
            this.lineColor = '#ffffff';
        } else {
            this.x = Math.random() * canvas.logicalWidth;
            this.y = Math.random() * -canvas.logicalHeight * 0.5;
            this.vx = Math.random() * 4 - 2;
            this.vy = Math.random() * 4 + 3;
            this.size = Math.random() * 8 + 6;
            this.gravity = 0.05;
            this.friction = 0.99;
            this.alpha = 1;
            this.decay = 0.003;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = Math.random() * 0.1 - 0.05;
        }
    }

    update() {
        if (this.type === 'ring') {
            this.radius += this.growSpeed;
            this.alpha -= this.decay;
            return;
        }
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.type === 'confetti') this.rotation += this.rotSpeed;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);

        if (this.type === 'ring') {
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = this.lineColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.translate(this.x, this.y);

        if (this.type === 'heart') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            const topCurveHeight = this.size * 0.3;
            ctx.moveTo(0, topCurveHeight);
            ctx.bezierCurveTo(0, 0, -this.size / 2, 0, -this.size / 2, topCurveHeight);
            ctx.bezierCurveTo(-this.size / 2, (this.size + topCurveHeight) / 2, 0, this.size, 0, this.size);
            ctx.bezierCurveTo(0, this.size, this.size / 2, (this.size + topCurveHeight) / 2, this.size / 2, topCurveHeight);
            ctx.bezierCurveTo(this.size / 2, 0, 0, 0, 0, topCurveHeight);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
        }

        ctx.restore();
    }
}

function triggerWinFX(targetX, targetY) {
    particles = [];
    for (let i = 0; i < 60; i++) particles.push(new Particle(targetX, targetY, 'heart'));
    for (let i = 0; i < 100; i++) particles.push(new Particle(0, 0, 'confetti'));
    if (animFrameId) cancelAnimationFrame(animFrameId);
    fxAnimating = true;
    animateFX();
}

function triggerBoomFX(targetX, targetY) {
    particles = [];
    for (let i = 0; i < 50; i++) {
        const p = new Particle(targetX, targetY, 'confetti');
        p.x = targetX;
        p.y = targetY;
        p.vx = (Math.random() - 0.5) * 14;
        p.vy = (Math.random() - 0.5) * 14 - 3;
        p.gravity = 0.25;
        p.color = BOOM_COLORS[Math.floor(Math.random() * BOOM_COLORS.length)];
        particles.push(p);
    }
    if (animFrameId) cancelAnimationFrame(animFrameId);
    fxAnimating = true;
    animateFX();
}

// Nổ ĂN THÊM vào các particle đang bay (không xoá particle cũ) — dùng cho từng ô
// "nổ tung" lúc thắng, để nhiều ô nổ liên tiếp mà không cắt cụt hiệu ứng của ô trước.
// Gồm 1 vòng sóng xung kích bung nhanh + nhiều mảnh vụn bắn tung toé ra xa.
function addExplodeParticles(x, y) {
    const ring = new Particle(x, y, 'ring');
    ring.x = x;
    ring.y = y;
    particles.push(ring);

    for (let i = 0; i < 18; i++) {
        const p = new Particle(x, y, 'confetti');
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 6;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 3;
        p.gravity = 0.25;
        p.friction = 0.97;
        p.size = Math.random() * 8 + 7;
        particles.push(p);
    }
    if (!fxAnimating) {
        fxAnimating = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animateFX();
    }
}

function animateFX() {
    ctx.clearRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.alpha <= 0 || p.y > canvas.logicalHeight + 50) particles.splice(index, 1);
    });
    if (particles.length > 0) {
        animFrameId = requestAnimationFrame(animateFX);
    } else {
        fxAnimating = false;
    }
}

// =============================================================================
// GAME LEVELS DATA (KIỂU MINESWEEPER: '.' = ô thường, '#' = bẫy, S = xuất phát, E = đĩa cá)
// Mỗi màn đã qua bộ giải logic (constraint propagation) kiểm chứng: luôn có ít
// nhất một ô kề suy luận được chắc chắn an toàn để bước tới, không cần đoán mò —
// và mỗi lần mở chỉ lộ ra một mảng nhỏ (không "1 phát ăn hết bàn cờ" như bản cũ).
// Ô cạnh Start luôn được đảm bảo không có bẫy để nước đi đầu tiên không phải may rủi.
// Dữ liệu từng level nằm riêng trong levels/level01.json .. levelNN.json (dễ thêm/sửa
// từng level mà không phải đụng vào file code chính) — nạp hết bằng fetch() song song
// lúc khởi động, xong mới init phần còn lại của game (xem loadLevels() cuối file).
// Thêm level mới -> tăng con số này, đảm bảo file levelNN.json tương ứng đã tồn tại
// (đặt tên đúng thứ tự liên tục, không để hổng số).
// =============================================================================
const TOTAL_LEVELS = 31;
let LEVELS = [];

async function loadLevels() {
    const files = Array.from({ length: TOTAL_LEVELS }, (_, i) =>
        `levels/level${String(i + 1).padStart(2, '0')}.json`);
    LEVELS = await Promise.all(files.map(f => fetch(f).then(r => r.json())));
}

let currentLevelIdx = 0;
// Kích thước lưới hiện tại — đổi theo từng level (5x5 -> 9x9), gán lại trong loadLevel().
let GRID_ROWS = 5, GRID_COLS = 5;
let grid, playerPos, history = [], isGameOver = false;
let catEl = null;
let pendingReveals = []; // ô vừa lộ diện trong nước đi này, dùng để bung có thứ tự (loang)
let pendingCelebratePop = false; // true khi đang bung kiểu ăn mừng (thắng) — mạnh/nảy hơn bung thường
let pendingBubbleLoad = false; // true khi đang bung TOÀN BỘ Ô lúc mới vào màn (kể cả ô ẩn)
let levelGeneration = 0; // tăng mỗi lần loadLevel() chạy — dùng để huỷ hiệu ứng/popup thắng dở dang nếu lỡ Replay giữa lúc đang ăn mừng
let usedReviveThisLevel = false; // mỗi lượt chơi 1 màn chỉ được hồi sinh 1 lần (xu hoặc xem QC)

// =============================================================================
// XU (economy) — nhận xu mỗi khi qua màn, lưu lại qua localStorage.
// =============================================================================
const COINS_KEY = 'catYarnCoins';
let coins = 0;

function loadCoins() {
    try {
        const saved = parseInt(localStorage.getItem(COINS_KEY), 10);
        coins = Number.isFinite(saved) ? saved : 0;
    } catch (e) { coins = 0; }
    updateCoinDisplay();
}

function saveCoins() {
    try { localStorage.setItem(COINS_KEY, String(coins)); } catch (e) { /* bỏ qua nếu bị chặn */ }
}

function updateCoinDisplay() {
    document.getElementById('coin-count').textContent = coins;
}

const LEVEL_COIN_REWARD = 40;

function computeCoinReward() {
    return LEVEL_COIN_REWARD;
}

function awardCoins(amount) {
    coins += amount;
    saveCoins();
    updateCoinDisplay();
    const badge = document.getElementById('coin-badge');
    badge.classList.remove('pop');
    void badge.offsetWidth;
    badge.classList.add('pop');
}

// =============================================================================
// KHO BOOSTER — "Lại" (Undo) và "Gợi Ý" (Hint) giờ là vật phẩm có SỐ LƯỢNG (không
// trừ thẳng xu mỗi lần dùng nữa). Hết thì nút hiện dấu "+", bấm vào sẽ mở popup
// mua thêm bằng xu hoặc xem quảng cáo.
// =============================================================================
const HINT_COUNT_KEY = 'catYarnHintCount';
const UNDO_COUNT_KEY = 'catYarnUndoCount';
const STARTER_BOOSTER_QTY = 3; // số lượng miễn phí ban đầu cho người chơi mới
const BOOSTER_BUY_COST = 100; // giá mua thêm 1 lượt (bằng xu)
const BOOSTER_BUY_QTY = 1;

let hintCount = STARTER_BOOSTER_QTY;
let undoCount = STARTER_BOOSTER_QTY;

function loadBoosterCounts() {
    try {
        const h = parseInt(localStorage.getItem(HINT_COUNT_KEY), 10);
        hintCount = Number.isFinite(h) ? h : STARTER_BOOSTER_QTY;
    } catch (e) { hintCount = STARTER_BOOSTER_QTY; }
    try {
        const u = parseInt(localStorage.getItem(UNDO_COUNT_KEY), 10);
        undoCount = Number.isFinite(u) ? u : STARTER_BOOSTER_QTY;
    } catch (e) { undoCount = STARTER_BOOSTER_QTY; }
    updateBoosterBadges();
}

function saveBoosterCounts() {
    try {
        localStorage.setItem(HINT_COUNT_KEY, String(hintCount));
        localStorage.setItem(UNDO_COUNT_KEY, String(undoCount));
    } catch (e) { /* bỏ qua nếu bị chặn */ }
}

function updateBoosterBadges() {
    const hintBadge = document.getElementById('hint-badge');
    const undoBadge = document.getElementById('undo-badge');
    if (hintBadge) {
        hintBadge.textContent = hintCount > 0 ? hintCount : '+';
        hintBadge.classList.toggle('empty', hintCount <= 0);
    }
    if (undoBadge) {
        undoBadge.textContent = undoCount > 0 ? undoCount : '+';
        undoBadge.classList.toggle('empty', undoCount <= 0);
    }
}

// Popup mua thêm booster khi đã dùng hết — mở khi bấm nút lúc số lượng = 0.
let boosterShopType = null; // 'hint' | 'undo'

function openBoosterShop(type) {
    boosterShopType = type;
    const isHint = type === 'hint';
    document.getElementById('booster-shop-icon').innerText = isHint ? '💡' : '↩️';
    document.getElementById('booster-shop-title').innerText = isHint ? 'Hết Gợi Ý Rồi!' : 'Hết Lượt Quay Lại Rồi!';
    document.getElementById('booster-shop-message').innerText = 'Mua thêm để dùng tiếp nhé!';
    const coinBtn = document.querySelector('#booster-shop-modal .btn-blue');
    const adBtn = document.querySelector('#booster-shop-modal .btn-green');
    coinBtn.disabled = false;
    coinBtn.innerText = `🪙 Mua (${BOOSTER_BUY_COST})`;
    adBtn.disabled = false;
    adBtn.innerText = '📺 Xem QC';
    document.getElementById('booster-shop-modal').classList.add('show');
}

function hideBoosterShop() {
    document.getElementById('booster-shop-modal').classList.remove('show');
    boosterShopType = null;
}

document.getElementById('booster-shop-modal').addEventListener('click', (e) => {
    if (e.target.id === 'booster-shop-modal') hideBoosterShop();
});

function grantBooster(type, qty) {
    if (type === 'hint') hintCount += qty; else undoCount += qty;
    saveBoosterCounts();
    updateBoosterBadges();
}

function buyBoosterWithCoins(btn) {
    if (!boosterShopType) return;
    if (coins < BOOSTER_BUY_COST) {
        btn.innerText = '🪙 Không đủ xu!';
        return;
    }
    coins -= BOOSTER_BUY_COST;
    saveCoins();
    updateCoinDisplay();
    grantBooster(boosterShopType, BOOSTER_BUY_QTY);
    hideBoosterShop();
}

// TODO: thay bằng rewarded ad thật (AdMob) khi có tài khoản quảng cáo — hiện mô
// phỏng tạm bằng 1 khoảng chờ ngắn để sẵn khung, chỉ cần cắm SDK thật vào chỗ này.
function buyBoosterWithAd(btn) {
    if (!boosterShopType) return;
    const type = boosterShopType;
    btn.disabled = true;
    btn.innerText = '⏳ Đang tải quảng cáo...';
    showRewardedAd(
        () => {
            grantBooster(type, BOOSTER_BUY_QTY);
            hideBoosterShop();
        },
        () => {
            btn.disabled = false;
            btn.innerText = '❌ Không có QC, thử lại';
        }
    );
}

// =============================================================================
// BOOSTER: GỢI Ý (Hint) — chỉ ra 1 ô suy luận được chắc chắn AN TOÀN dựa trên các
// đầu mối đang có, dùng đúng logic suy luận từng bước (như solver tạo level) chứ
// không "ăn gian" chỉ đường tối ưu — người chơi vẫn phải tự bước tới.
// =============================================================================

function findHintCell() {
    const deducedMine = new Set();
    const deducedSafe = new Set();
    let changed = true;
    while (changed) {
        changed = false;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const cell = grid[r][c];
                if (!cell.revealed || cell.type !== 'N') continue;
                const hidden = [];
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
                        if (!grid[nr][nc].revealed) hidden.push(nr + ',' + nc);
                    }
                }
                if (hidden.length === 0) continue;
                const knownMines = hidden.filter(k => deducedMine.has(k));
                // Loại cả ô đã suy ra là bẫy LẪN ô đã suy ra an toàn khỏi "còn chưa biết"
                // -> cho phép suy luận nhiều bước cộng dồn (giống hệt solver tạo level).
                const unknown = hidden.filter(k => !deducedMine.has(k) && !deducedSafe.has(k));
                const remaining = cell.count - knownMines.length;
                if (remaining === 0 && unknown.length > 0) {
                    for (const k of unknown) if (!deducedSafe.has(k)) { deducedSafe.add(k); changed = true; }
                } else if (remaining === unknown.length && unknown.length > 0) {
                    for (const k of unknown) if (!deducedMine.has(k)) { deducedMine.add(k); changed = true; }
                }
            }
        }
    }

    let best = null, bestDist = Infinity;
    for (const key of deducedSafe) {
        const [r, c] = key.split(',').map(Number);
        if (grid[r][c].flagged) continue; // lỡ cắm cờ nhầm lên ô này rồi thì bỏ qua
        const dist = Math.abs(r - playerPos.r) + Math.abs(c - playerPos.c);
        if (dist < bestDist) { bestDist = dist; best = { r, c }; }
    }
    return best;
}

// Ô đang được Gợi Ý trỏ tới (nếu có) — vòng tròn CHỈ biến mất khi mèo thật sự bước
// vào đúng ô này (xem revealAndMove()), không tự tắt theo thời gian.
let hintTargetCell = null;

function clearHint() {
    hintTargetCell = null;
    const ring = document.getElementById('hint-ring');
    if (ring) ring.classList.remove('show');
}

function useHint() {
    if (isGameOver || isWalking) return;
    if (tutorialActive) { nudgeTutorialGuide(); return; }
    if (hintCount <= 0) { openBoosterShop('hint'); return; }
    const target = findHintCell();
    if (!target) {
        updateStatus('🤔 Chưa đủ manh mối để gợi ý, khám phá thêm chút nữa nhé!');
        return;
    }
    hintCount--;
    saveBoosterCounts();
    updateBoosterBadges();
    updateStatus('💡 Ô đang nhấp nháy an toàn đó, thử bước tới xem!', '#1982c4');

    const el = document.querySelector(`[data-row="${target.r}"][data-col="${target.c}"]`);
    if (el) {
        hintTargetCell = { r: target.r, c: target.c };
        const rect = el.getBoundingClientRect();
        const ring = document.getElementById('hint-ring');
        ring.style.left = rect.left + 'px';
        ring.style.top = rect.top + 'px';
        ring.style.width = rect.width + 'px';
        ring.style.height = rect.height + 'px';
        ring.classList.remove('show');
        void ring.offsetWidth;
        ring.classList.add('show');
    }
}

// =============================================================================
// HỒI SINH khi dính bẫy — trả xu HOẶC xem quảng cáo (mỗi lượt chơi 1 màn chỉ được
// 1 lần), "tháo ngòi" đúng ô bẫy vừa dính để mèo đi tiếp từ đó thay vì chơi lại từ đầu.
// =============================================================================
const REVIVE_COST = 30;

function performRevive(r, c) {
    usedReviveThisLevel = true;
    grid[r][c].defused = true;
    isGameOver = false;
    hideResultModal();
    catEl.classList.remove('expr-dizzy');
    updateStatus('😺 Mèo hồi sinh rồi! Cẩn thận hơn nhé!', '#2a9d8f');
    render();
}

// TODO: thay bằng rewarded ad thật (AdMob) khi có tài khoản quảng cáo — hiện mô
// phỏng tạm bằng 1 khoảng chờ ngắn để sẵn khung, chỉ cần cắm SDK thật vào chỗ này.
function watchAdForRevive(r, c, myGeneration, btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Đang tải quảng cáo...';
    showRewardedAd(
        () => {
            if (myGeneration !== levelGeneration) return; // đã Replay/thoát giữa lúc xem quảng cáo
            performRevive(r, c);
        },
        () => {
            btn.disabled = false;
            btn.innerText = '❌ Không có quảng cáo, thử lại';
        }
    );
}

// =============================================================================
// MÀN HOME + TIẾN TRÌNH — màn N mở khoá khi đã qua màn N-1; màn 1 luôn mở sẵn.
// =============================================================================
const COMPLETED_LEVELS_KEY = 'catYarnCompletedLevels';
let completedLevels = new Set();

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(COMPLETED_LEVELS_KEY) || '[]');
        completedLevels = new Set(Array.isArray(saved) ? saved : []);
    } catch (e) { completedLevels = new Set(); }
}

function saveProgress() {
    try { localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify([...completedLevels])); } catch (e) { /* bỏ qua */ }
}

function markLevelCompleted(idx) {
    completedLevels.add(idx);
    saveProgress();
}

function isLevelUnlocked(idx) {
    return idx === 0 || completedLevels.has(idx - 1);
}

// Màn tiếp theo nên chơi = màn đầu tiên chưa qua (hoặc màn cuối nếu đã qua hết).
function getNextPlayableLevel() {
    let idx = 0;
    while (idx < LEVELS.length - 1 && completedLevels.has(idx)) idx++;
    return idx;
}

function renderHomeScreen() {
    document.getElementById('home-level-number').textContent = getNextPlayableLevel() + 1;
    updateCoinDisplay();
}

function playCurrentLevel() {
    startLevel(getNextPlayableLevel());
}

function showScreen(name) {
    document.getElementById('screen-loading').style.display = name === 'loading' ? 'flex' : 'none';
    document.getElementById('screen-home').style.display = name === 'home' ? 'flex' : 'none';
    document.getElementById('screen-game').style.display = name === 'game' ? 'flex' : 'none';
    fitBoardToSpace();
}

function startLevel(idx) {
    if (!LEVELS.length) return; // dữ liệu level (fetch từ levels/*.json) chưa nạp xong
    if (!isLevelUnlocked(idx)) return;
    showScreen('game');
    loadLevel(idx);
    fitBoardToSpace();
}

function goHome() {
    endGuidedTutorial();
    showScreen('home');
    renderHomeScreen();
}

// Nếu người chơi PHÂN VÂN không chọn ô nào trong ít nhất IDLE_THRESHOLD_MS, rồi sau
// đó bước đúng vào 1 ô còn chưa biết mà hoá ra an toàn -> bật hiệu ứng "mèo thưởng"
// (một mèo trang trí, KHÔNG phải mèo đang chơi) tại đúng ô đó, thuần tuý cho vui mắt.
const IDLE_THRESHOLD_MS = 5000;
const BONUS_CAT_EMOJIS = ['😻', '🙀', '😸'];
let lastMoveTime = Date.now();

// Kích thước hình học của lưới ô, khớp với #cells-layer trong style.css,
// dùng để tính toạ độ pixel cho mèo trượt mượt giữa các ô.
// BOARD_PAD = padding (14px) + border (4px) của #cells-layer — mèo được định vị
// tương đối theo #game-board (không có padding/border riêng) nên phải cộng cả 2.
const CELL_SIZE = 70, CELL_GAP = 8, BOARD_PAD = 18, CAT_SIZE = 56;

function loadLevel(idx) {
    endGuidedTutorial();
    levelGeneration++; // huỷ mọi hiệu ứng "nổ tung"/popup thắng dở dang từ ván trước
    isWalking = false; // đề phòng lỡ đang tự chạy dở dang từ màn trước, không để input bị kẹt khoá
    clearHint(); // vòng gợi ý (nếu có) thuộc về ván trước, không còn ý nghĩa ở màn mới
    if (catEl) catEl.classList.remove('expr-happy', 'expr-dizzy');
    currentLevelIdx = idx;
    const rows = LEVELS[currentLevelIdx];
    GRID_ROWS = rows.length;
    GRID_COLS = rows[0].length;
    grid = [];

    for (let r = 0; r < GRID_ROWS; r++) {
        grid.push([]);
        for (let c = 0; c < GRID_COLS; c++) {
            const ch = rows[r][c];
            let type = 'N';
            if (ch === 'S') type = 'S';
            else if (ch === 'E') type = 'E';
            else if (ch === '#') type = 'B';
            grid[r].push({ type, count: 0, revealed: false, flagged: false });
            if (type === 'S') playerPos = { r, c };
        }
    }

    // Tính số bẫy lân cận (8 hướng) cho từng ô, kiểu Minesweeper
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
                    if (grid[nr][nc].type === 'B') cnt++;
                }
            }
            grid[r][c].count = cnt;
        }
    }

    // Ô xuất phát và đĩa cá luôn lộ diện làm mốc, chỉ đường đi ở giữa là ẩn
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            if (grid[r][c].type === 'S' || grid[r][c].type === 'E') grid[r][c].revealed = true;
        }
    }

    history = [];
    isGameOver = false;
    lastMoveTime = Date.now();
    pendingReveals = [];
    usedReviveThisLevel = false;
    particles = [];
    ctx.clearRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);

    document.getElementById('level-title').innerText = `Level ${currentLevelIdx + 1}`;
    updateStatus('Mèo đang đói... Né bẫy tìm đường tới cá thôi! 🐾 (giữ ô để cắm cờ)');
    hideResultModal();

    // Hiệu ứng "bubble": tất cả các ô bung ra lần lượt theo thứ tự khi vừa vào màn, cho
    // sinh động thay vì cả bàn cờ hiện ra khô khan cùng lúc.
    const bubbleOrder = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) bubbleOrder.push({ r, c });
    }
    pendingReveals = bubbleOrder;
    pendingBubbleLoad = true;
    render(true);
    pendingBubbleLoad = false;
    // Mỗi level có thể khác kích thước lưới (5x5 -> 9x9) -> luôn co lại cho vừa màn
    // hình ngay khi vừa dựng xong bàn cờ mới, không chỉ lúc mở màn Game lần đầu.
    fitBoardToSpace();
}

function showResultModal({ type, icon, title, message, actions, coinReward }) {
    const iconEl = document.getElementById('modal-icon');
    const cardEl = document.getElementById('modal-card');
    iconEl.innerText = icon;
    const titleEl = document.getElementById('modal-title');
    titleEl.innerText = title;
    titleEl.style.color = type === 'win' ? '#2a9d8f' : '#ff5964';
    document.getElementById('modal-message').innerText = message;

    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'btn-piffle ' + a.cls;
        btn.innerText = a.label;
        // Truyền thẳng nút bấm vào onClick -> các hành động "xem QC" có thể tự đổi
        // nhãn/khoá nút để báo trạng thái đang tải, vì banner trạng thái trong game
        // (updateStatus) nằm PHÍA SAU modal, người chơi không thấy được lúc này.
        btn.onclick = () => a.onClick(btn);
        actionsEl.appendChild(btn);
    });

    const coinRewardEl = document.getElementById('modal-coin-reward');
    if (coinReward) {
        document.getElementById('modal-coin-amount').textContent = coinReward;
        coinRewardEl.classList.remove('show');
        void coinRewardEl.offsetWidth;
        coinRewardEl.classList.add('show');
        awardCoins(coinReward);
    } else {
        coinRewardEl.classList.remove('show');
    }

    // Thắng thì bung mạnh + icon nhảy nhót + loé sáng + rung nhẹ màn hình cho đã mắt.
    cardEl.classList.toggle('win-pop', type === 'win');
    iconEl.classList.toggle('win-icon', type === 'win');
    if (type === 'win') {
        triggerWinFlash();
        triggerScreenShake();
    }

    document.getElementById('result-modal').classList.add('show');
}

function triggerWinFlash() {
    const flash = document.getElementById('win-flash');
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');
}

function triggerScreenShake() {
    const outer = document.getElementById('app');
    outer.classList.remove('screen-shake');
    void outer.offsetWidth;
    outer.classList.add('screen-shake');
}

function hideResultModal() {
    document.getElementById('result-modal').classList.remove('show');
}

// Hướng dẫn chơi lần đầu — modal giới thiệu nhanh, tự hiện ở lần mở game đầu
// tiên (nhớ qua localStorage), luôn có thể mở lại bằng nút ❓. Đóng modal lần
// đầu tiên sẽ bắt đầu luôn phần TẬP CHƠI TƯƠNG TÁC bên dưới.
const TUTORIAL_SEEN_KEY = 'catYarnTutorialSeen';
let pendingGuidedTutorial = false;

function showTutorial() {
    const btn = document.querySelector('#tutorial-modal .modal-actions button');
    if (btn) btn.textContent = pendingGuidedTutorial ? 'Bắt đầu tập chơi! 👆' : 'Đóng lại';
    document.getElementById('tutorial-modal').classList.add('show');
}

function hideTutorial() {
    document.getElementById('tutorial-modal').classList.remove('show');
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); } catch (e) { /* localStorage có thể bị chặn (ẩn danh...), bỏ qua */ }
}

function closeTutorialModal() {
    hideTutorial();
    if (pendingGuidedTutorial) {
        pendingGuidedTutorial = false;
        startLevel(0);
        startGuidedTutorial();
    }
}

function maybeShowTutorialOnFirstVisit() {
    let hasSeenTutorial = false;
    try { hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'; } catch (e) { /* bỏ qua */ }
    if (!hasSeenTutorial) {
        pendingGuidedTutorial = true;
        showTutorial();
    }
}

document.getElementById('tutorial-modal').addEventListener('click', (e) => {
    if (e.target.id === 'tutorial-modal') closeTutorialModal();
});

// =============================================================================
// TẬP CHƠI TƯƠNG TÁC: chỉ tay (👇) vào đúng ô cần bấm, khoanh vòng VÀNG vào ô SỐ
// dùng làm bằng chứng (clue) và vòng đỏ/xanh vào ô kết luận (target), giải thích
// rõ VÌ SAO suy ra được — không bắt người chơi "tin chay". Khoá các ô khác lại
// để không bấm nhầm, dắt qua trọn Level 1 thật. Toàn bộ suy luận dưới đây đã được
// tính đúng theo dữ liệu LEVELS[0] hiện tại (bẫy tại (2,1) và (3,4)):
//   (1,2)=1, quanh nó chỉ còn đúng 1 ô chưa mở (2,1)  -> (2,1) chắc chắn có bẫy
//   (2,2)=1, bẫy đó đã tính vào ô (2,1) rồi            -> (3,1)/(3,2)/(3,3) an toàn
//   (2,4)=1, quanh nó chỉ còn đúng 1 ô chưa mở (3,4)  -> (3,4) chắc chắn có bẫy
//   (3,3)=1, bẫy đó đã tính vào ô (3,4) rồi            -> (4,2)/(4,3) an toàn
// =============================================================================
const TUTORIAL_STEPS = [
    { action: 'move', target: { r: 0, c: 1 }, clue: null,
      msg: 'Chạm vào ô có bàn tay 👇 chỉ để mèo bước tới nhé!' },

    { action: 'click', target: null, clue: null,
      msg: 'Cả một vùng vừa mở ra! Số trên mỗi ô = số bẫy đang ẩn ở ĐÚNG 8 ô sát nó. Cùng xem ví dụ thật để đoán ra bẫy nhé!' },

    { action: 'click', target: { r: 2, c: 1 }, clue: { r: 1, c: 2 }, danger: true,
      msg: 'Ô VÀNG ghi số 1 = quanh nó có đúng 1 bẫy. Mà quanh ô đó chỉ còn DUY NHẤT 1 ô chưa mở (khoanh đỏ) — vậy chắc chắn ô đó có bẫy!' },

    { action: 'flag', target: { r: 2, c: 1 }, clue: { r: 1, c: 2 }, danger: true,
      msg: 'Giữ ngón tay lên ô khoanh đỏ (hoặc chuột phải trên máy tính) để cắm cờ 🚩 đánh dấu bẫy vừa đoán ra!' },

    { action: 'click', target: { r: 3, c: 3 }, clue: { r: 2, c: 2 },
      msg: 'Ô VÀNG này cũng ghi số 1 — mà bẫy đó chính là ô em vừa cắm cờ rồi! Vậy 3 ô trống còn lại quanh nó (kể cả ô khoanh xanh) đều AN TOÀN.' },

    { action: 'move', target: { r: 3, c: 3 }, clue: { r: 2, c: 2 },
      msg: 'Chạm vào ô khoanh xanh đó nhé, an toàn 100% rồi!' },

    { action: 'click', target: { r: 3, c: 4 }, clue: { r: 2, c: 4 }, danger: true,
      msg: 'Y hệt lúc nãy: ô VÀNG ghi số 1 và chỉ còn đúng 1 ô chưa mở cạnh nó (khoanh đỏ) — chắc chắn có bẫy ở đó, né xa ô này ra nhé!' },

    { action: 'click', target: { r: 4, c: 3 }, clue: { r: 3, c: 3 },
      msg: 'Ô VÀNG (chỗ em vừa đứng) ghi số 1 — bẫy đó chính là ô đỏ lúc nãy rồi. Vậy ô khoanh xanh này chắc chắn AN TOÀN!' },

    { action: 'move', target: { r: 4, c: 3 }, clue: { r: 3, c: 3 },
      msg: 'Chạm vào ô khoanh xanh nhé!' },

    { action: 'move', target: { r: 4, c: 4 }, clue: null,
      msg: 'Cuối cùng, dẫn mèo tới đĩa cá 🐟 để chiến thắng nhé!' }
];

let tutorialActive = false;
let tutorialStep = 0;

function startGuidedTutorial() {
    tutorialActive = true;
    tutorialStep = 0;
    renderTutorialStep();
}

function endGuidedTutorial() {
    if (!tutorialActive) return;
    tutorialActive = false;
    document.getElementById('tutorial-bar').classList.remove('show');
    document.getElementById('tutorial-hand').classList.remove('show');
    document.getElementById('tutorial-spotlight').classList.remove('show');
}

function advanceTutorial() {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_STEPS.length) {
        endGuidedTutorial();
    } else {
        renderTutorialStep();
    }
}

function renderTutorialStep() {
    const step = TUTORIAL_STEPS[tutorialStep];
    const bar = document.getElementById('tutorial-bar');
    bar.querySelector('.tutorial-bar-text').textContent = step.msg;
    document.getElementById('tutorial-continue-btn').style.display = (step.action === 'click') ? 'inline-flex' : 'none';
    bar.classList.add('show');
    positionTutorialUI();
}

function nudgeTutorialGuide() {
    const bar = document.getElementById('tutorial-bar');
    bar.classList.remove('shake');
    void bar.offsetWidth;
    bar.classList.add('shake');
}

// Định vị bàn tay chỉ + bong bóng thoại NGAY SAU khi board đã render xong, để
// getBoundingClientRect() lấy đúng toạ độ ô trên màn hình thật (đã qua scale).
function positionTutorialUI() {
    const hand = document.getElementById('tutorial-hand');
    const bar = document.getElementById('tutorial-bar');
    const spotlight = document.getElementById('tutorial-spotlight');
    if (!tutorialActive) {
        hand.classList.remove('show');
        bar.classList.remove('show');
        spotlight.classList.remove('show');
        return;
    }

    // Làm tối mọi thứ ngoài bàn cờ, chỉ chừa đúng khung bàn cờ sáng rõ (nới thêm
    // 1 chút để không cắt mất viền/bóng đổ 3D của bàn cờ).
    const boardRect = document.getElementById('cells-layer').getBoundingClientRect();
    const pad = 10;
    spotlight.style.left = (boardRect.left - pad) + 'px';
    spotlight.style.top = (boardRect.top - pad) + 'px';
    spotlight.style.width = (boardRect.width + pad * 2) + 'px';
    spotlight.style.height = (boardRect.height + pad * 2) + 'px';
    spotlight.classList.add('show');

    const step = TUTORIAL_STEPS[tutorialStep];
    let anchorRect;
    let hasHand = false;

    if (step.target) {
        const cellEl = document.querySelector(`[data-row="${step.target.r}"][data-col="${step.target.c}"]`);
        if (!cellEl) { hand.classList.remove('show'); return; }
        anchorRect = cellEl.getBoundingClientRect();
        hand.style.left = (anchorRect.left + anchorRect.width / 2) + 'px';
        hand.style.top = anchorRect.top + 'px';
        hand.classList.add('show');
        hasHand = true;
    } else {
        // Bước chỉ để đọc thông tin (không có ô cụ thể) -> neo bong bóng theo cả bàn cờ.
        hand.classList.remove('show');
        anchorRect = document.getElementById('cells-layer').getBoundingClientRect();
    }

    // Đủ chỗ phía trên thì đặt bong bóng bên trên ô/bàn tay, không thì đặt bên dưới
    // (tránh bị tràn ra ngoài mép trên màn hình khi ô mục tiêu ở hàng đầu bàn cờ).
    // Khi có bàn tay đang chỉ (nằm ngay phía trên ô), bong bóng phải chừa thêm chỗ
    // để không đè lên bàn tay — HAND_CLEARANCE ước lượng đủ chiều cao bàn tay + nảy.
    const HAND_CLEARANCE = 60;
    const placeBelow = anchorRect.top < (hasHand ? 210 : 170);
    bar.classList.toggle('below', placeBelow);
    bar.style.left = (anchorRect.left + anchorRect.width / 2) + 'px';
    if (placeBelow) {
        bar.style.top = (anchorRect.bottom + 16) + 'px';
    } else {
        bar.style.top = (anchorRect.top - (hasHand ? HAND_CLEARANCE : 16)) + 'px';
    }
}

function updateStatus(text, color = '#4a3022') {
    const el = document.getElementById('status');
    el.innerText = text;
    el.style.color = color;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
}

function render(instant) {
    const board = document.getElementById('cells-layer');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${CELL_SIZE}px)`;
    board.style.gridTemplateRows = `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`;

    // Ô nào vừa lộ diện trong nước đi này thì bung ra theo đúng thứ tự loang
    // (BFS), ô mở sau bung trễ hơn 1 chút -> cảm giác lan toả thay vì hiện hết cùng lúc.
    const revealOrder = new Map();
    pendingReveals.forEach(({ r, c }, idx) => revealOrder.set(r + ',' + c, idx));

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = grid[r][c];
            const el = document.createElement('div');
            el.classList.add('cell');
            el.dataset.row = r;
            el.dataset.col = c;

            if (cheatShowTraps && !cell.revealed && cell.type === 'B') {
                el.classList.add('cheat-trap-reveal');
            }

            if (tutorialActive) {
                const step = TUTORIAL_STEPS[tutorialStep];
                if (step.target && step.target.r === r && step.target.c === c) {
                    el.classList.add('tutorial-target');
                    if (step.danger) el.classList.add('tutorial-target-danger');
                }
                if (step.clue && step.clue.r === r && step.clue.c === c) {
                    el.classList.add('tutorial-clue');
                }
            }

            let contentHTML = '';

            if (!cell.revealed) {
                if (cell.flagged) {
                    el.classList.add('flagged');
                    contentHTML = FLAG_ICON_HTML;
                } else {
                    el.classList.add('hidden-tile');
                }
            } else if (cell.type === 'B') {
                // Bẫy đã được "tháo ngòi" nhờ hồi sinh -> vẫn hiện hình bẫy để nhớ vị trí
                // (khỏi phải đoán lại) nhưng tô màu an toàn, không phải cảnh báo nguy hiểm.
                el.classList.add(cell.defused ? 'defused-cell' : 'bomb-cell');
                contentHTML = `
                    <svg viewBox="0 0 40 40" style="width:32px; height:32px;">
                        <line x1="22" y1="10" x2="28" y2="4" stroke="#4a3022" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="29" cy="3" r="3" fill="#ffca3a"/>
                        <circle cx="19" cy="23" r="14" fill="${cell.defused ? '#8ac926' : '#2e1b12'}" stroke="#4a3022" stroke-width="3"/>
                        <circle cx="14" cy="18" r="3" fill="#ffffff" opacity="0.5"/>
                    </svg>`;
            } else if (cell.type === 'E') {
                el.classList.add('revealed-safe');
                contentHTML = `
                    <div class="fish-plate">
                        <svg viewBox="0 0 50 30" style="width:30px; height:20px;">
                            <path d="M 5 15 C 15 5, 35 5, 40 15 C 35 25, 15 25, 5 15 Z" fill="#ff5964" stroke="#4a3022" stroke-width="3"/>
                            <polygon points="5,15 0,5 0,25" fill="#ff5964" stroke="#4a3022" stroke-width="3" stroke-linejoin="round"/>
                            <circle cx="32" cy="12" r="2" fill="#4a3022"/>
                        </svg>
                    </div>`;
            } else {
                el.classList.add('revealed-safe');
                if (cell.type === 'N' && cell.count > 0) {
                    // Số hiển thị bình thường, to/giữa ô — kể cả khi mèo đang đứng lên ô
                    // đó thì cứ để mèo che, đơn giản và dễ nhìn hơn là thu nhỏ vào góc.
                    contentHTML = `<span class="num-badge num-${cell.count}">${cell.count}</span>`;
                }
            }

            const inner = document.createElement('div');
            inner.className = 'cell-inner';
            inner.innerHTML = contentHTML;
            el.appendChild(inner);

            const revealIdx = revealOrder.get(r + ',' + c);
            if (revealIdx !== undefined) {
                // Bung .cell (lớp NGOÀI), không phải .cell-inner — vì nền/viền/màu của ô
                // (ẩn, an toàn, bẫy...) đều nằm ở .cell, còn .cell-inner nhiều khi RỖNG
                // (ô ẩn, ô trống không số...). Animate .cell-inner sẽ không thấy gì cả.
                let popClass = 'tile-pop';
                let stagger = 45;
                if (pendingBubbleLoad) { popClass = 'tile-bubble-pop'; stagger = 30; }
                else if (pendingCelebratePop) { popClass = 'tile-celebrate-pop'; stagger = 90; }
                el.classList.add(popClass);
                el.style.animationDelay = (revealIdx * stagger) + 'ms';
            }

            attachCellPressHandlers(el, r, c);
            board.appendChild(el);
        }
    }

    pendingReveals = [];
    updateCatPosition(instant);
    positionTutorialUI();
}

// Khớp với màu chữ .num-1..num-8 trong style.css, dùng cho số hiện trên mặt mèo.
const NUM_COLORS = {
    1: '#1976d2', 2: '#388e3c', 3: '#d32f2f', 4: '#7b1fa2',
    5: '#795548', 6: '#00838f', 7: '#212121', 8: '#757575'
};

// Dùng chung cho cả render() và toggleFlag() (cập nhật tại chỗ không render lại cả bàn).
const FLAG_ICON_HTML = `
    <svg viewBox="0 0 40 40" style="width:26px; height:26px;">
        <line x1="10" y1="6" x2="10" y2="34" stroke="#4a3022" stroke-width="4" stroke-linecap="round"/>
        <path d="M 10 8 L 32 14 L 10 20 Z" fill="#ff5964" stroke="#4a3022" stroke-width="3" stroke-linejoin="round"/>
    </svg>`;

function updateCatPosition(instant) {
    if (!catEl) {
        catEl = document.createElement('div');
        catEl.classList.add('cat-player');
        catEl.id = 'cat-character';
        // Thân/tai/chân vẫn để trắng (fill="#ffffff") — đây là màu "gốc" sẽ đổi khi
        // có tính năng đổi màu/skin sau này, nên KHÔNG hardcode màu khác cho các
        // phần này. Ria mép/chân/đuôi chỉ thêm NÉT (stroke màu cacao) cho có dáng
        // mèo hơn, không đụng tới phần fill sẽ đổi màu.
        catEl.innerHTML = `
            <svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 4px 0 #4a3022);">
                <path class="cat-body" d="M 20 30 L 10 5 L 42 18 Z" fill="#ffffff" stroke="#4a3022" stroke-width="7" stroke-linejoin="round"/>
                <path class="cat-body" d="M 80 30 L 90 5 L 58 18 Z" fill="#ffffff" stroke="#4a3022" stroke-width="7" stroke-linejoin="round"/>
                <rect class="cat-body" x="12" y="18" width="76" height="72" rx="24" fill="#ffffff" stroke="#4a3022" stroke-width="7"/>
                <ellipse class="cat-body" cx="29" cy="89" rx="11" ry="8" fill="#ffffff" stroke="#4a3022" stroke-width="6"/>
                <ellipse class="cat-body" cx="71" cy="89" rx="11" ry="8" fill="#ffffff" stroke="#4a3022" stroke-width="6"/>
                <g class="cat-eyes cat-eyes-normal">
                    <ellipse cx="36" cy="48" rx="6" ry="7" fill="#4a3022"/>
                    <ellipse cx="64" cy="48" rx="6" ry="7" fill="#4a3022"/>
                </g>
                <g class="cat-eyes cat-eyes-happy">
                    <path d="M 29 49 Q 36 39 43 49" fill="none" stroke="#4a3022" stroke-width="4" stroke-linecap="round"/>
                    <path d="M 57 49 Q 64 39 71 49" fill="none" stroke="#4a3022" stroke-width="4" stroke-linecap="round"/>
                </g>
                <g class="cat-eyes cat-eyes-dizzy">
                    <path d="M 31 43 L 41 53 M 41 43 L 31 53" stroke="#4a3022" stroke-width="3.5" stroke-linecap="round"/>
                    <path d="M 59 43 L 69 53 M 69 43 L 59 53" stroke="#4a3022" stroke-width="3.5" stroke-linecap="round"/>
                </g>
                <circle class="cat-face-detail" cx="26" cy="58" r="7" fill="#ff85a1" opacity="0.6"/>
                <circle class="cat-face-detail" cx="74" cy="58" r="7" fill="#ff85a1" opacity="0.6"/>
                <polygon class="cat-face-detail" points="50,54 45,60 55,60" fill="#ff85a1" stroke="#4a3022" stroke-width="3" stroke-linejoin="round"/>
                <path class="cat-mouth cat-mouth-normal" d="M 50 60 Q 44 66 38 62 M 50 60 Q 56 66 62 62" fill="none" stroke="#4a3022" stroke-width="3" stroke-linecap="round"/>
                <path class="cat-mouth cat-mouth-dizzy" d="M 42 65 Q 50 60 58 65" fill="none" stroke="#4a3022" stroke-width="3" stroke-linecap="round"/>
                <text class="cat-number-overlay" id="cat-number-overlay" x="50" y="58" text-anchor="middle" dominant-baseline="middle" font-family="'Fredoka', cursive, sans-serif" font-weight="700" font-size="37"></text>
            </svg>`;
        document.getElementById('game-board').appendChild(catEl);
    }

    const x = BOARD_PAD + playerPos.c * (CELL_SIZE + CELL_GAP) + (CELL_SIZE - CAT_SIZE) / 2;
    const y = BOARD_PAD + playerPos.r * (CELL_SIZE + CELL_GAP) + (CELL_SIZE - CAT_SIZE) / 2;

    // Đứng lên ô có số -> mắt/mũi/miệng biến mất, số hiện ngay tại chỗ mặt vừa mất.
    const standingCell = grid[playerPos.r][playerPos.c];
    const onNumber = standingCell.type === 'N' && standingCell.revealed && standingCell.count > 0;
    catEl.classList.toggle('cat-on-number', onNumber);
    const numberOverlay = catEl.querySelector('#cat-number-overlay');
    if (onNumber) {
        numberOverlay.textContent = standingCell.count;
        numberOverlay.style.fill = NUM_COLORS[standingCell.count] || '#4a3022';
    }

    if (instant) {
        catEl.style.transition = 'none';
        catEl.style.left = x + 'px';
        catEl.style.top = y + 'px';
        void catEl.offsetWidth;
        catEl.style.transition = '';
    } else {
        catEl.style.left = x + 'px';
        catEl.style.top = y + 'px';
    }
}

function triggerSquashAnimation() {
    const cat = document.getElementById('cat-character');
    if (cat) {
        cat.classList.remove('cat-squash');
        void cat.offsetWidth;
        cat.classList.add('cat-squash');
    }
}

// Mèo TRANG TRÍ (khác con mèo đang chơi) bật lên ngay tại ô vừa đi đúng, thuần
// hiệu ứng cho vui mắt — không đụng gì tới mèo/animation của người chơi.
function triggerBonusCatFX(r, c) {
    const cellEl = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (!cellEl) return;
    const rect = cellEl.getBoundingClientRect();

    const fx = document.createElement('div');
    fx.className = 'bonus-cat-fx';
    fx.textContent = BONUS_CAT_EMOJIS[Math.floor(Math.random() * BONUS_CAT_EMOJIS.length)];
    fx.style.left = (rect.left + rect.width / 2) + 'px';
    fx.style.top = (rect.top + rect.height / 2) + 'px';
    document.body.appendChild(fx);

    playSound('surprise');
    fx.addEventListener('animationend', () => fx.remove(), { once: true });
}

function toggleFlag(r, c, el) {
    const cell = grid[r][c];
    if (cell.revealed) return;

    if (tutorialActive && TUTORIAL_STEPS[tutorialStep].action !== 'flag') {
        // Đang ở bước hướng dẫn khác (không phải bước cắm cờ) -> tạm khoá để tránh rối.
        nudgeTutorialGuide();
        return;
    }

    cell.flagged = !cell.flagged;
    playSound('flag');

    // Cập nhật TRỰC TIẾP đúng ô này thôi (không render lại cả bàn cờ) khi có sẵn
    // phần tử DOM — vì lúc này có thể đang GIỮA 1 cú long-press dở dang (ngón tay
    // còn chạm màn hình); render() sẽ xoá/tạo lại toàn bộ ô, khiến touchend sau đó
    // không còn nhắm đúng phần tử ban đầu nữa (bug khiến cắm cờ xong không thấy cờ).
    if (el) {
        // hidden-tile/flagged là 2 trạng thái loại trừ lẫn nhau của 1 ô ẩn (giống
        // logic trong render()) — phải cập nhật CẢ HAI, nếu không ô vừa gỡ cờ có thể
        // mất luôn class hidden-tile (do 1 lần render() trước đó vẽ nó chỉ với class
        // flagged) và mất màu nền.
        el.classList.toggle('flagged', cell.flagged);
        el.classList.toggle('hidden-tile', !cell.flagged);
        const inner = el.querySelector('.cell-inner');
        if (inner) inner.innerHTML = cell.flagged ? FLAG_ICON_HTML : '';
    } else {
        render();
    }

    if (tutorialActive) {
        const step = TUTORIAL_STEPS[tutorialStep];
        if (step.action === 'flag' && cell.flagged && step.target.r === r && step.target.c === c) {
            advanceTutorial();
        }
    }
}

function handleCellClick(r, c) {
    if (isGameOver || isWalking) return;

    const dr = r - playerPos.r, dc = c - playerPos.c;
    if (Math.abs(dr) + Math.abs(dc) === 1) {
        handleMoveInput(r, c);
        return;
    }

    // Chạm vào 1 ô ĐÃ MỞ ở xa (không kề playerPos) -> mèo tự tìm đường và chạy 1 mạch
    // qua các ô đã biết, đỡ phải bấm từng bước khi bàn cờ lớn (7x7 -> 9x9). Vùng CHƯA
    // mở vẫn phải khám phá từng ô một như cũ — không cho "nhảy cóc" vào chỗ chưa biết.
    if (tutorialActive || !grid[r][c].revealed) return;
    const path = findPathThroughRevealed(playerPos.r, playerPos.c, r, c);
    if (!path || !path.length) return;
    isWalking = true;
    walkPath(path, 0, levelGeneration);
}

let isWalking = false;
const WALK_STEP_MS = 170;

// BFS tìm đường ngắn nhất từ (fromR,fromC) tới (toR,toC), CHỈ đi qua các ô đã revealed
// (đã biết chắc an toàn) — không có đường nếu phải băng qua ô còn ẩn.
function findPathThroughRevealed(fromR, fromC, toR, toC) {
    const key = (r, c) => r + ',' + c;
    const startKey = key(fromR, fromC);
    const visited = new Set([startKey]);
    const prev = new Map();
    const queue = [[fromR, fromC]];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length) {
        const [r, c] = queue.shift();
        if (r === toR && c === toC) {
            const path = [];
            let curKey = key(toR, toC);
            while (curKey !== startKey) {
                const [pr, pc] = curKey.split(',').map(Number);
                path.push({ r: pr, c: pc });
                curKey = prev.get(curKey);
            }
            path.reverse();
            return path;
        }
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
            const nk = key(nr, nc);
            if (visited.has(nk) || !grid[nr][nc].revealed) continue;
            visited.add(nk);
            prev.set(nk, key(r, c));
            queue.push([nr, nc]);
        }
    }
    return null;
}

function walkPath(path, idx, myGeneration) {
    // Nếu đã Replay/đổi màn giữa lúc đang đi (levelGeneration đổi) thì huỷ luôn, không
    // được chạy tiếp trên state của màn MỚI bằng toạ độ tính từ màn CŨ.
    if (idx >= path.length || isGameOver || myGeneration !== levelGeneration) {
        isWalking = false;
        return;
    }
    try {
        const { r, c } = path[idx];
        handleMoveInput(r, c);
    } catch (e) {
        // Lỡ có lỗi bất ngờ giữa đường vẫn PHẢI mở khoá lại input, không thì mọi thao
        // tác (tap/vuốt/phím/Undo/Hint) sẽ bị treo im re mãi vì isWalking kẹt ở true.
        isWalking = false;
        throw e;
    }
    if (isGameOver) { isWalking = false; return; } // vừa dính bẫy/tới cá giữa đường -> dừng
    setTimeout(() => walkPath(path, idx + 1, myGeneration), WALK_STEP_MS);
}

// Giữ ngón tay trên 1 ô ẩn để cắm/gỡ cờ (mobile), hoặc chuột phải (desktop) —
// thay cho nút bật/tắt "chế độ đánh dấu" riêng, chỉ còn đúng 1 thao tác duy nhất.
const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE = 12;
let longPressTimer = null;
let longPressFired = false;
let pressStartX = 0, pressStartY = 0;

function attachCellPressHandlers(el, r, c) {
    const cancelLongPress = () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        el.classList.remove('pressing');
    };

    el.addEventListener('touchstart', (e) => {
        if (isGameOver) return;
        const t = e.changedTouches[0];
        pressStartX = t.screenX;
        pressStartY = t.screenY;
        longPressFired = false;
        cancelLongPress();
        if (!grid[r][c].revealed) el.classList.add('pressing');
        longPressTimer = setTimeout(() => {
            longPressFired = true;
            el.classList.remove('pressing');
            toggleFlag(r, c, el);
            if (navigator.vibrate) navigator.vibrate(12);
        }, LONG_PRESS_MS);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        const t = e.changedTouches[0];
        if (Math.abs(t.screenX - pressStartX) > LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.screenY - pressStartY) > LONG_PRESS_MOVE_TOLERANCE) {
            cancelLongPress();
        }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        cancelLongPress();
        if (longPressFired) {
            // Chặn sự kiện click "ảo" phát sinh sau đó, tránh vừa cắm cờ vừa di chuyển.
            e.preventDefault();
        }
    });

    el.addEventListener('touchcancel', cancelLongPress);

    // Desktop: chuột phải để cắm/gỡ cờ, giống quy ước Minesweeper gốc.
    // LƯU Ý: trên WebView Android, giữ tay đủ lâu cũng tự khiến trình duyệt bắn ra
    // sự kiện "contextmenu" (dù mình đã preventDefault để menu không hiện lên) —
    // nếu không chặn, nó sẽ gọi toggleFlag() THÊM 1 LẦN NỮA ngay sau khi bộ đếm
    // touch của mình vừa gọi rồi, khiến cờ bật lên rồi tắt ngay lập tức (như bị
    // "giữ 2 lần"). longPressFired đã true từ touch thì bỏ qua, không gọi lại.
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (isGameOver) return;
        if (longPressFired) return;
        toggleFlag(r, c, el);
    });

    el.addEventListener('click', () => {
        if (longPressFired) { longPressFired = false; return; }
        handleCellClick(r, c);
    });
}

function handleMoveInput(targetR, targetC) {
    if (isGameOver) return;
    if (targetR < 0 || targetR >= GRID_ROWS || targetC < 0 || targetC >= GRID_COLS) return;
    const dr = targetR - playerPos.r;
    const dc = targetC - playerPos.c;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;

    const targetCell = grid[targetR][targetC];
    if (targetCell.flagged) {
        updateStatus('🚩 Ô này đang cắm cờ! Gỡ cờ trước khi bước vào nhé!', '#ff5964');
        return;
    }

    if (tutorialActive) {
        const step = TUTORIAL_STEPS[tutorialStep];
        if (step.action === 'click') {
            // Đang ở bước đọc thông tin -> phải bấm "Tiếp tục" trước đã.
            nudgeTutorialGuide();
            return;
        }
        const isGuidedTarget = step.target && step.target.r === targetR && step.target.c === targetC;
        if (!targetCell.revealed && !isGuidedTarget) {
            // Chưa tới lượt khám phá ô này -> chặn lại, tránh lỡ dính bẫy trong lúc học.
            nudgeTutorialGuide();
            return;
        }
    }

    const wasUnknownCell = !targetCell.revealed;
    const wasIdleBeforeThisMove = (Date.now() - lastMoveTime) >= IDLE_THRESHOLD_MS;

    history.push({ grid: JSON.parse(JSON.stringify(grid)), playerPos: { ...playerPos } });

    playSound('jump');
    revealAndMove(targetR, targetC);
    render();
    triggerSquashAnimation();

    // Phân vân khá lâu (>=5s) không chọn ô nào, rồi bước đúng vào 1 ô còn chưa biết
    // mà hoá ra an toàn -> bật hiệu ứng mèo thưởng cho vui mắt.
    if (wasUnknownCell && !isGameOver && wasIdleBeforeThisMove) {
        triggerBonusCatFX(targetR, targetC);
    }
    lastMoveTime = Date.now();

    if (tutorialActive) {
        const step = TUTORIAL_STEPS[tutorialStep];
        if (step.action === 'move' && step.target && step.target.r === targetR && step.target.c === targetC) {
            advanceTutorial();
        }
    }
}

function revealAndMove(r, c) {
    playerPos = { r, c };
    const cell = grid[r][c];
    const wasHidden = !cell.revealed;
    cell.revealed = true;
    cell.flagged = false;
    if (wasHidden) pendingReveals.push({ r, c });

    if (hintTargetCell && hintTargetCell.r === r && hintTargetCell.c === c) clearHint();

    if (cell.type === 'B') {
        if (cell.defused) return; // đã hồi sinh qua đúng ô này rồi -> giờ an toàn, đi xuyên qua bình thường

        playSound('boom');
        updateStatus('💥 Bụp! Mèo dính bẫy rồi! Bấm Replay để thử lại nhé!', '#ff5964');
        isGameOver = true;
        catEl.classList.add('expr-dizzy');
        setTimeout(() => {
            const cellEl = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cellEl) {
                const rect = cellEl.getBoundingClientRect();
                triggerBoomFX(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        }, 80);
        setTimeout(() => {
            const myGeneration = levelGeneration;
            const actions = [];
            if (!usedReviveThisLevel) {
                actions.push({
                    cls: 'btn-blue', label: `🪙 Hồi Sinh (${REVIVE_COST})`, onClick: (btn) => {
                        if (myGeneration !== levelGeneration) return;
                        if (coins < REVIVE_COST) {
                            btn.innerText = '🪙 Không đủ xu!';
                            return;
                        }
                        coins -= REVIVE_COST;
                        saveCoins();
                        updateCoinDisplay();
                        performRevive(r, c);
                    }
                });
                actions.push({
                    cls: 'btn-green', label: '📺 Hồi Sinh (xem QC)', onClick: (btn) => {
                        if (myGeneration !== levelGeneration) return;
                        watchAdForRevive(r, c, myGeneration, btn);
                    }
                });
            }
            actions.push({ cls: 'btn-pink', label: '🔄 Thử Lại', onClick: () => loadLevel(currentLevelIdx) });

            showResultModal({
                type: 'lose',
                icon: '💥',
                title: 'Bụp! Dính Bẫy Rồi!',
                message: usedReviveThisLevel
                    ? 'Mèo cần cẩn thận hơn đó. Thử lại nhé!'
                    : 'Mèo cần cẩn thận hơn đó. Hồi sinh để đi tiếp, hoặc thử lại từ đầu!',
                actions
            });
        }, 650);
        return;
    }

    if (cell.type === 'E') {
        const myGeneration = levelGeneration;
        // Nhạc chiến thắng (victory.mp3) KHÔNG phát ngay ở đây — dời vào lúc ô đầu
        // tiên bắt đầu nổ trong celebrateWinReveal(), để không bị "sớm" so với hiệu ứng.
        updateStatus('😻 MỀM LÒNG! Mèo đã né hết bẫy và ăn được cá! 🎉', '#2a9d8f');
        isGameOver = true;
        catEl.classList.add('expr-happy');

        markLevelCompleted(currentLevelIdx);

        const hasNextLevel = currentLevelIdx < LEVELS.length - 1;

        setTimeout(() => {
            if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa chừng
            const cellEl = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cellEl) {
                const rect = cellEl.getBoundingClientRect();
                triggerWinFX(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        }, 100);

        // Sau khi ăn cá 1 nhịp ngắn, cả bàn cờ "nổ tung" banh hết các ô còn ẩn (kể cả
        // bẫy — hết nguy hiểm rồi), rồi mới hiện popup thắng.
        setTimeout(() => {
            if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa chừng
            const burstDuration = celebrateWinReveal();

            setTimeout(() => {
                if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa chừng
                const reward = computeCoinReward();
                let doubled = false;
                const actions = [];
                actions.push({
                    cls: 'btn-blue', label: '📺 x2 Vàng', onClick: (btn) => {
                        if (doubled || myGeneration !== levelGeneration) return;
                        btn.disabled = true;
                        btn.innerText = '⏳ Đang tải quảng cáo...';
                        showRewardedAd(
                            () => {
                                if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa lúc xem quảng cáo
                                doubled = true;
                                awardCoins(reward);
                                document.getElementById('modal-coin-amount').textContent = reward * 2;
                                btn.innerText = '✅ Đã nhận x2!';
                            },
                            () => {
                                btn.disabled = false;
                                btn.innerText = '❌ Không có QC, thử lại';
                            }
                        );
                    }
                });
                if (hasNextLevel) {
                    actions.push({ cls: 'btn-green', label: '⏩ Màn Tiếp', onClick: () => nextLevel() });
                } else {
                    // Màn cuối cùng, không còn "Màn Tiếp" -> vẫn cần 1 lối ra khỏi popup
                    // (result-modal không có nút đóng/tap-ra-ngoài riêng).
                    actions.push({ cls: 'btn-green', label: '🏠 Về Trang Chủ', onClick: () => goHome() });
                }

                showResultModal({
                    type: 'win',
                    icon: hasNextLevel ? '😻' : '🏆',
                    title: hasNextLevel ? 'Mềm Lòng!' : 'Xuất Sắc!',
                    message: hasNextLevel
                        ? 'Mèo đã né hết bẫy và ăn được cá! 🐟'
                        : 'Mèo đã ăn hết cá ở mọi màn rồi! Quá đỉnh! 🎉',
                    actions,
                    coinReward: reward
                });
            }, burstDuration + 200);
        }, 300);
        return;
    }

    // Ô thường: nếu không có bẫy lân cận nào, tự mở loang các ô an toàn xung quanh.
    // Chỉ áp dụng cho ô loại N — ô xuất phát (S) không được loang lại mỗi khi mèo quay về đó.
    if (cell.type === 'N' && cell.count === 0) {
        floodReveal(r, c);
    }
}

// Lúc thắng: toàn bộ ô CHƯA từng mở sẽ MỞ RA (hiện đúng số/bẫy bên trong, như mở
// bình thường), đợi 1 nhịp ngắn để nhìn thấy, rồi mới "NỔ" (particle văng ra + tiếng
// bụp + tự thu nhỏ biến mất) — theo thứ tự xáo trộn ngẫu nhiên cho cảm giác nổ khắp
// bàn cờ. Trả về tổng thời gian (ms) để biết lúc nào an toàn hiện popup thắng.
function celebrateWinReveal() {
    const myGeneration = levelGeneration;
    const cellsToClear = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            if (!grid[r][c].revealed) cellsToClear.push({ r, c });
        }
    }
    if (cellsToClear.length === 0) {
        // Không còn ô nào để nổ -> không có mốc "bắt đầu nổ" để đợi, phát nhạc ngay.
        playSound('win');
        return 0;
    }

    for (let i = cellsToClear.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellsToClear[i], cellsToClear[j]] = [cellsToClear[j], cellsToClear[i]];
    }

    // Giai đoạn 1: mở hết ra (hiện số/bẫy thật) theo đúng thứ tự xáo trộn — bung
    // kiểu ăn mừng (mạnh/nảy hơn bung thường lúc chơi) để rõ là hiệu ứng đặc biệt.
    cellsToClear.forEach(({ r, c }) => {
        grid[r][c].revealed = true;
        grid[r][c].flagged = false;
    });
    pendingReveals = cellsToClear;
    pendingCelebratePop = true;
    render();
    pendingCelebratePop = false;

    const OPEN_STAGGER_MS = 90;
    const OPEN_TO_EXPLODE_GAP_MS = 550; // đợi lâu hơn để thấy rõ số/bẫy trước khi nổ
    const EXPLODE_ANIM_MS = 520;

    // Giai đoạn 2: từng ô lần lượt "nổ" (VFX + SFX) rồi tự biến mất hẳn.
    cellsToClear.forEach(({ r, c }, idx) => {
        const delay = idx * OPEN_STAGGER_MS + OPEN_TO_EXPLODE_GAP_MS;
        setTimeout(() => {
            if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa chừng
            const el = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            addExplodeParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
            playSound('pop');
            el.classList.add('tile-vanish');
        }, delay);
    });

    const totalDuration = (cellsToClear.length - 1) * OPEN_STAGGER_MS + OPEN_TO_EXPLODE_GAP_MS + EXPLODE_ANIM_MS;

    // Nhạc chiến thắng (victory.mp3) phát ngay trước khi TẤT CẢ các ô nổ xong hẳn
    // (sớm hơn 0.3s so với mốc kết thúc).
    setTimeout(() => {
        if (myGeneration !== levelGeneration) return;
        playSound('win');
    }, Math.max(0, totalDuration - 300));

    return totalDuration;
}

function floodReveal(startR, startC) {
    const queue = [[startR, startC]];
    while (queue.length) {
        const [cr, cc] = queue.shift();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = cr + dr, nc = cc + dc;
                if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
                const n = grid[nr][nc];
                if (n.revealed || n.type === 'B') continue;
                n.revealed = true;
                n.flagged = false;
                pendingReveals.push({ r: nr, c: nc });
                if (n.type === 'N' && n.count === 0) queue.push([nr, nc]);
            }
        }
    }
}

function nextLevel() {
    if (currentLevelIdx < LEVELS.length - 1) {
        loadLevel(currentLevelIdx + 1);
    }
}

function undo() {
    if (!history.length || isGameOver || isWalking) return;
    if (tutorialActive) { nudgeTutorialGuide(); return; }
    if (undoCount <= 0) { openBoosterShop('undo'); return; }
    undoCount--;
    saveBoosterCounts();
    updateBoosterBadges();
    const last = history.pop();
    grid = last.grid;
    playerPos = last.playerPos;
    lastMoveTime = Date.now();
    updateStatus('Mèo quay lại bước trước...');
    render();
    triggerSquashAnimation();
}

// =============================================================================
// DEV CHEAT MENU — chỉ dành cho lúc phát triển/test, KHÔNG lộ ra với người chơi
// thường: phải mở Settings TRONG LÚC CHƠI (bấm ⚙️ như bình thường) rồi bấm liên
// tiếp 7 lần vào chữ tiêu đề "Cài Đặt" bên trong modal đó, trong vòng 1.5s, mới
// mở được (xem attachCheatMenuTrigger()). Settings ở màn Home không có logic
// này. Code vẫn nằm trong bản build bình thường (không cần bước loại trừ khỏi
// www/ riêng) vì hoàn toàn im lìm nếu không ai biết thao tác bí mật.
// =============================================================================
const CHEAT_TAP_COUNT = 7;
const CHEAT_TAP_WINDOW_MS = 1500;
let cheatTapCount = 0;
let cheatTapLastTime = 0;
let cheatShowTraps = false;

function attachCheatMenuTrigger() {
    const title = document.getElementById('game-settings-title');
    if (!title) return;
    title.addEventListener('click', () => {
        const now = Date.now();
        if (now - cheatTapLastTime > CHEAT_TAP_WINDOW_MS) cheatTapCount = 0;
        cheatTapLastTime = now;
        cheatTapCount++;
        if (cheatTapCount >= CHEAT_TAP_COUNT) {
            cheatTapCount = 0;
            hideSettings();
            openCheatMenu();
        }
    });
}

function populateCheatLevelSelect() {
    const select = document.getElementById('cheat-level-select');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 0; i < LEVELS.length; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Level ${i + 1}`;
        select.appendChild(opt);
    }
    select.value = currentLevelIdx;
}

function openCheatMenu() {
    populateCheatLevelSelect();
    document.getElementById('cheat-toggle-traps-btn').innerText = cheatShowTraps ? '👁️ Hiện Bẫy: BẬT' : '👁️ Hiện Bẫy: TẮT';
    document.getElementById('cheat-modal').classList.add('show');
}

function hideCheatMenu() {
    document.getElementById('cheat-modal').classList.remove('show');
}

document.getElementById('cheat-modal').addEventListener('click', (e) => {
    if (e.target.id === 'cheat-modal') hideCheatMenu();
});

function cheatGoToLevel() {
    const select = document.getElementById('cheat-level-select');
    const idx = parseInt(select.value, 10);
    if (!LEVELS.length || isNaN(idx) || idx < 0 || idx >= LEVELS.length) return;
    hideCheatMenu();
    showScreen('game');
    loadLevel(idx);
    fitBoardToSpace();
}

function cheatAddCoins() {
    awardCoins(9999);
}

function cheatRefillBoosters() {
    hintCount = 99;
    undoCount = 99;
    saveBoosterCounts();
    updateBoosterBadges();
}

function cheatToggleShowTraps() {
    cheatShowTraps = !cheatShowTraps;
    document.getElementById('cheat-toggle-traps-btn').innerText = cheatShowTraps ? '👁️ Hiện Bẫy: BẬT' : '👁️ Hiện Bẫy: TẮT';
    if (grid) render(); // chi re-render neu dang o giua 1 man choi (grid da duoc khoi tao)
}

window.addEventListener('keydown', (e) => {
    if (!playerPos || isWalking) return; // đang ở màn Home, hoặc mèo đang tự chạy tới ô xa
    let { r, c } = playerPos;
    if (e.key === 'ArrowUp') handleMoveInput(r - 1, c);
    if (e.key === 'ArrowDown') handleMoveInput(r + 1, c);
    if (e.key === 'ArrowLeft') handleMoveInput(r, c - 1);
    if (e.key === 'ArrowRight') handleMoveInput(r, c + 1);
});

// =============================================================================
// NÚT BACK VẬT LÝ / CỬ CHỈ ANDROID (qua @capacitor/app) — chỉ hoạt động khi chạy
// trong app native (window.Capacitor tồn tại), bỏ qua khi mở bằng trình duyệt.
// Ưu tiên: đóng popup đang mở > thoát tập chơi hướng dẫn > về Home > thoát app.
// =============================================================================
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
        const settingsModal = document.getElementById('settings-modal');
        const homeSettingsModal = document.getElementById('home-settings-modal');
        const tutorialModal = document.getElementById('tutorial-modal');
        const resultModal = document.getElementById('result-modal');

        if (settingsModal.classList.contains('show')) {
            hideSettings();
            return;
        }
        if (homeSettingsModal.classList.contains('show')) {
            hideHomeSettings();
            return;
        }
        if (tutorialModal.classList.contains('show')) {
            closeTutorialModal();
            return;
        }
        if (resultModal.classList.contains('show')) {
            return; // để người chơi tự bấm nút trong modal (Replay/Màn tiếp...)
        }
        if (tutorialActive) {
            endGuidedTutorial();
            goHome();
            return;
        }
        const onGameScreen = document.getElementById('screen-game').style.display !== 'none';
        if (onGameScreen) {
            goHome();
            return;
        }
        window.Capacitor.Plugins.App.exitApp();
    });
}

(async () => {
    showScreen('loading');
    await loadLevels();
    loadCoins();
    loadBoosterCounts();
    loadProgress();
    renderHomeScreen();
    showScreen('home');
    maybeShowTutorialOnFirstVisit();
    attachCheatMenuTrigger();
    initAds(); // không await — banner load nền, không được làm chậm màn Home
})();
  