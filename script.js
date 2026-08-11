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
victorySound.volume = 0.6; // file gốc nghe to quá so với các SFX tự tổng hợp khác

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
    // Trước đây luôn chặn ở tối đa 1 (chỉ được thu nhỏ, không bao giờ phóng to) ->
    // level nhỏ (4x4, 5x5...) hoặc màn hình cao thừa nhiều khoảng trống dọc sẽ để
    // bàn cờ nằm bé tí, lọt thỏm co cụm giữa màn hình trông "thấp"/trống trải. Cho
    // phép phóng to vượt quá 1 khi còn dư chỗ, chặn ở 1.4 để không quá to/vỡ nét
    // trên grid rất nhỏ hoặc màn hình rất cao (tablet).
    const scale = Math.min(1.4, availW / naturalW, availH / naturalH);

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

// =============================================================================
// ĐA NGÔN NGỮ — chuỗi dịch nằm ở tools/locale.csv, build ra locales.js (biến
// global LOCALES) bằng `python tools/build_locales.py`. Đổi/thêm chuỗi thì sửa
// CSV rồi chạy lại lệnh đó, KHÔNG sửa tay locales.js (bị ghi đè mất công dịch).
// =============================================================================
const LANG_KEY = 'catYarnLang';
let currentLang = 'en'; // mặc định ban đầu (chưa từng đổi/lưu gì) là tiếng Anh

function loadLang() {
    try { currentLang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { currentLang = 'en'; }
}

// Tra chuỗi theo ngôn ngữ đang chọn — rơi về tiếng Việt nếu ngôn ngữ đó thiếu key
// (ví dụ vừa thêm ngôn ngữ mới nhưng chưa dịch hết), rồi rơi về chính cái key nếu
// tiếng Việt cũng không có (lúc đó là bug — quên thêm vào locale.csv).
// params (tuỳ chọn): thay các mốc "{tenBien}" trong chuỗi bằng giá trị tương ứng,
// ví dụ t('status_hint_locked', { level: 5 }) thay "{level}" -> 5.
function t(key, params) {
    const table = (typeof LOCALES !== 'undefined' && LOCALES[currentLang]) || {};
    let str = table[key] || (LOCALES.vi && LOCALES.vi[key]) || key;
    if (params) {
        for (const k in params) str = str.split('{' + k + '}').join(params[k]);
    }
    return str;
}

// Áp dụng ngôn ngữ hiện tại lên MỌI phần tử tĩnh có đánh dấu sẵn trong HTML
// (data-i18n = nội dung chữ, data-i18n-title = thuộc tính title) — gọi 1 lần lúc
// khởi động và mỗi lần đổi ngôn ngữ. Chữ được set ĐỘNG bằng JS (status lúc chơi,
// tutorial từng bước, modal thắng/thua...) KHÔNG nằm trong sweep này, vẫn còn
// tiếng Việt — sẽ làm sau ở đợt 2.
function applyLocale() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('.lang-icon').forEach(el => {
        el.textContent = currentLang.toUpperCase();
    });
}

function toggleLanguage() {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    try { localStorage.setItem(LANG_KEY, currentLang); } catch (e) { /* bỏ qua nếu bị chặn */ }
    applyLocale();
    renderHomeScreen(); // nút Chơi/Tiếp Tục/Sắp Ra Mắt set chữ ĐỘNG, ngoài sweep của applyLocale() -> phải tự vẽ lại
    if (typeof tutorialActive !== 'undefined' && tutorialActive) renderTutorialStep(); // bong bóng hướng dẫn đang hiện cũng là chữ động, cần vẽ lại tay
}

// Dùng chung cho cả nút loa trong settings-modal (màn chơi) lẫn home-settings-modal
// (màn Home) — 2 modal khác nhau nhưng cùng chia sẻ 1 trạng thái soundEnabled.
function updateSoundToggleUI() {
    document.querySelectorAll('.settings-toggle').forEach(btn => {
        btn.classList.toggle('muted', !soundEnabled);
    });
}

// =============================================================================
// DARK MODE — chỉ đổi nền trang (xem body.dark-mode trong style.css), mọi thứ
// khác (bàn cờ, ô, nút, modal...) giữ nguyên, không đụng vào.
// =============================================================================
const DARK_MODE_KEY = 'catYarnDarkMode';
let darkModeEnabled = false;

function loadDarkMode() {
    try {
        darkModeEnabled = localStorage.getItem(DARK_MODE_KEY) === '1';
    } catch (e) { darkModeEnabled = false; }
    applyDarkMode();
}

function toggleDarkMode() {
    darkModeEnabled = !darkModeEnabled;
    try { localStorage.setItem(DARK_MODE_KEY, darkModeEnabled ? '1' : '0'); } catch (e) { /* bỏ qua nếu bị chặn */ }
    applyDarkMode();
}

function applyDarkMode() {
    document.body.classList.toggle('dark-mode', darkModeEnabled);
    document.querySelectorAll('.settings-toggle').forEach(btn => {
        btn.classList.toggle('dark-active', darkModeEnabled);
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

// Mỗi kiểu sóng (sine/triangle/square/sawtooth) tự thân nghe to/nhỏ khác nhau dù
// cùng 1 mức gain số học (sóng vuông/răng cưa nhiều hoạ âm hơn nên nghe to hơn hẳn
// sóng sine cùng biên độ) — dùng hệ số bù theo loại sóng để MỌI SFX quy về cùng 1
// độ to cảm nhận, thay vì chỉnh gain cảm tính riêng lẻ từng tiếng như trước.
const SFX_BASE_GAIN = 0.22;
const SFX_WAVE_LOUDNESS = { sine: 1, triangle: 0.85, square: 0.65, sawtooth: 0.55 };
function sfxGain(waveType) {
    return SFX_BASE_GAIN * (SFX_WAVE_LOUDNESS[waveType] || 1);
}

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
        gain.gain.setValueAtTime(sfxGain('sine'), now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
    else if (type === 'flag') {
        // Tiếng tích cắm/gỡ cờ
        osc.type = 'square';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.06);
        gain.gain.setValueAtTime(sfxGain('square'), now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
    }
    else if (type === 'color') {
        // Tiếng "lấp lánh" ngắn khi mèo tìm thấy đốm màu giấu trong màn — vút lên
        // 3 nấc cho cảm giác vui, khác hẳn tiếng "tích" cắm cờ.
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(700, now + 0.08);
        osc.frequency.setValueAtTime(950, now + 0.16);
        gain.gain.setValueAtTime(sfxGain('sine'), now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.26);
        osc.start(now);
        osc.stop(now + 0.26);
    }
    else if (type === 'pop') {
        // Tiếng "bụp" nhỏ, nhẹ — dùng lặp lại cho từng ô nổ lúc ăn mừng chiến thắng,
        // cao độ ngẫu nhiên 1 chút để nhiều tiếng chồng nhau nghe như lép bép chứ
        // không bị lặp y hệt nhau.
        const freq = 480 + Math.random() * 320;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.09);
        gain.gain.setValueAtTime(sfxGain('triangle'), now);
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
        gain.gain.setValueAtTime(sfxGain('sine'), now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
    }
    else if (type === 'boom') {
        // Tiếng nổ bẫy: thud trầm + nhiễu nổ
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(sfxGain('sawtooth'), now);
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
        noiseGain.gain.setValueAtTime(sfxGain('sawtooth'), now);
        noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start(now);
        noise.stop(now + 0.2);
    }
    else if (type === 'click') {
        // Tiếng "póc" đơn giản, 1 nốt duy nhất tắt nhanh — khi chạm vào bất kỳ nút UI
        // nào (xem attachButtonPressFeedback()), không lấn át các SFX gameplay khác.
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(sfxGain('sine'), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.start(now);
        osc.stop(now + 0.045);
    }
    else if (type === 'bubble') {
        // Tiếng "lanh canh" nhẹ, cao — dùng lặp lại cho từng ô BUNG RA lúc vừa vào
        // màn (loadLevel()), khác hẳn tiếng 'pop' trầm/nặng hơn lúc ăn mừng chiến
        // thắng (ô NỔ biến mất). Cao độ ngẫu nhiên nhẹ để nhiều tiếng chồng nhau
        // (cách nhau đúng 30ms theo stagger của tile-bubble-pop) nghe lấp lánh chứ
        // không lặp y hệt nhau; gain giảm còn nửa mức chuẩn vì phát dồn dập liên tục.
        const freq = 700 + Math.random() * 500;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.05);
        gain.gain.setValueAtTime(sfxGain('sine') * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
    }
    else if (type === 'eat') {
        // Tiếng "meo meo" vui vẻ ngay lúc mèo cắn được cá — cao độ vút lên rồi hạ
        // xuống (dáng kêu thật của mèo), lặp lại 2 tiếng ngắn liên tiếp. Tách biệt
        // với nhạc chiến thắng (victory.mp3, phát trễ hơn lúc bàn cờ "nổ").
        const meow = (startTime, baseFreq) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(baseFreq, startTime);
            o.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, startTime + 0.08);
            o.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, startTime + 0.19);
            g.gain.setValueAtTime(0.0001, startTime);
            g.gain.exponentialRampToValueAtTime(sfxGain('sine'), startTime + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);
            o.start(startTime);
            o.stop(startTime + 0.2);
        };
        meow(now, 480);
        meow(now + 0.22, 540);
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
// Dữ liệu từng level nằm riêng trong levels/level01.json, level02.json,... (dễ thêm/sửa
// từng level mà không phải đụng vào file code chính). KHÔNG khai báo số lượng level ở
// đâu cả — loadLevels() tự dò tuần tự levelNN.json cho tới khi gặp file không tồn tại
// (404/lỗi) thì dừng, nên thêm level mới chỉ cần đặt đúng tên file kế tiếp theo thứ tự
// liên tục (không hổng số), không phải sửa code. Nút "Làm Mới Danh Sách Level" trong
// cheat menu (cheatRefreshLevels()) dò lại ngay trong lúc game đang chạy, tiện lúc đang
// test mà vừa thêm file level mới, khỏi phải tải lại trang.
// =============================================================================
let LEVELS = [];

async function fetchLevelFile(idx) {
    try {
        const res = await fetch(`levels/level${String(idx).padStart(2, '0')}.json`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null; // file không tồn tại hoặc lỗi mạng -> coi như hết level ở đây
    }
}

// Chỉ dùng để ƯỚC LƯỢNG % thanh loading (màn Loading) — KHÔNG giới hạn số level
// thật, loadLevels() vẫn tự dò tới khi hết file như cũ. Nếu số level thật vượt
// qua con số này, thanh chỉ dừng ở mức trần dưới (95%) chờ thêm chứ không báo sai
// "đã xong" sớm — xem clamp bên dưới.
const ESTIMATED_LEVEL_COUNT = 40;

async function loadLevels() {
    const found = [];
    let idx = 1;
    const fillEl = document.getElementById('loading-bar-fill');
    while (true) {
        const data = await fetchLevelFile(idx);
        if (!data) break;
        found.push(data);
        idx++;
        if (fillEl) {
            const pct = Math.min(95, Math.round((idx / ESTIMATED_LEVEL_COUNT) * 100));
            fillEl.style.width = pct + '%';
        }
    }
    LEVELS = found;
    if (fillEl) fillEl.style.width = '100%';
}

let currentLevelIdx = 0;
// Kích thước lưới hiện tại — đổi theo từng level (5x5 -> 9x9), gán lại trong loadLevel().
let GRID_ROWS = 5, GRID_COLS = 5;
let grid, playerPos, isGameOver = false;
let catEl = null;
let pendingReveals = []; // ô vừa lộ diện trong nước đi này, dùng để bung có thứ tự (loang)
let pendingCelebratePop = false; // true khi đang bung kiểu ăn mừng (thắng) — mạnh/nảy hơn bung thường
let pendingBubbleLoad = false; // true khi đang bung TOÀN BỘ Ô lúc mới vào màn (kể cả ô ẩn)
let levelGeneration = 0; // tăng mỗi lần loadLevel() chạy — dùng để huỷ hiệu ứng/popup thắng dở dang nếu lỡ Replay giữa lúc đang ăn mừng
let usedReviveThisLevel = false; // mỗi lượt chơi 1 màn chỉ được hồi sinh 1 lần (xu hoặc xem QC)
// Cơ chế "tìm màu cho mèo" — tối đa 2 đốm màu độc lập mỗi màn ('C' = màu 1,
// 'D' = màu 2). Màn chỉ có 'C' -> giữ nguyên hành vi cũ (nhuộm TOÀN THÂN mèo,
// tương thích ngược với level đã có). Màn có ĐỦ CẢ 'C' và 'D' -> mèo nhuộm NỬA
// THÂN mỗi màu, khớp màu tương ứng bên ô cá (xem checkColorPickup()/render()).
let foundColor1 = false;
let foundColor2 = false;
let levelNeedsColor1 = false; // màn có ô 'C' không (gán trong loadLevel())
let levelNeedsColor2 = false; // màn có ô 'D' không (gán trong loadLevel())

function allColorsFound() {
    return (!levelNeedsColor1 || foundColor1) && (!levelNeedsColor2 || foundColor2);
}

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

// =============================================================================
// MỞ KHOÁ BOOSTER DẦN THEO LEVEL — "Gợi Ý" mở từ Level 5, "Soi Bẫy" mở từ Level 9
// (số level ở đây tính từ 1, index trong LEVELS tính từ 0 nên trừ 1). Trước khi
// mở khoá thì ẨN HẲN nút đi (chưa cần biết tới), lúc vừa chạm mốc unlock thì hiện
// popup giới thiệu + BẮT dùng thử 1 lần MIỄN PHÍ (không trừ số lượt đang có) ngay
// trên bàn cờ hiện tại để người chơi biết ngay công dụng. Trạng thái đã unlock lưu
// localStorage, MỘT KHI đã unlock thì giữ mãi (kể cả lỡ quay lại chơi lại level đầu
// qua cheat menu), không ẩn lại nút.
// =============================================================================
const HINT_UNLOCK_LEVEL_IDX = 4; // Level 5
const BOMB_UNLOCK_LEVEL_IDX = 8; // Level 9
const HINT_UNLOCKED_KEY = 'catYarnHintUnlocked';
const BOMB_UNLOCKED_KEY = 'catYarnBombUnlocked';

let hintUnlocked = false;
let bombUnlocked = false;
let pendingUnlockPopups = []; // hàng đợi, phòng trường hợp cheat nhảy thẳng qua cả 2 mốc unlock cùng lúc

function loadBoosterUnlockState() {
    try { hintUnlocked = localStorage.getItem(HINT_UNLOCKED_KEY) === '1'; } catch (e) { hintUnlocked = false; }
    try { bombUnlocked = localStorage.getItem(BOMB_UNLOCKED_KEY) === '1'; } catch (e) { bombUnlocked = false; }
}

function updateBoosterUnlockUI() {
    const hintBtn = document.getElementById('hint-btn');
    const bombBtn = document.getElementById('bomb-reveal-btn');
    if (hintBtn) hintBtn.classList.toggle('booster-locked', !hintUnlocked);
    if (bombBtn) bombBtn.classList.toggle('booster-locked', !bombUnlocked);
}

// Gọi mỗi lần vào màn (loadLevel) — nếu vừa CHẠM MỐC unlock lần đầu thì đánh dấu
// đã unlock + xếp popup giới thiệu vào hàng đợi để hiện ngay sau khi bàn cờ vẽ xong.
function maybeUnlockBooster(type, unlockIdx) {
    const already = type === 'hint' ? hintUnlocked : bombUnlocked;
    if (already || currentLevelIdx < unlockIdx) return;
    if (type === 'hint') {
        hintUnlocked = true;
        try { localStorage.setItem(HINT_UNLOCKED_KEY, '1'); } catch (e) { /* bỏ qua */ }
    } else {
        bombUnlocked = true;
        try { localStorage.setItem(BOMB_UNLOCKED_KEY, '1'); } catch (e) { /* bỏ qua */ }
    }
    updateBoosterUnlockUI();
    pendingUnlockPopups.push(type);
}

function processNextUnlockPopup() {
    if (!pendingUnlockPopups.length) return;
    const type = pendingUnlockPopups.shift();
    const isHint = type === 'hint';
    document.getElementById('booster-unlock-icon').innerText = isHint ? '💡' : '💣';
    document.getElementById('booster-unlock-title').innerText = isHint ? t('unlock_hint_title') : t('unlock_bomb_title');
    document.getElementById('booster-unlock-message').innerText = isHint
        ? t('unlock_hint_message')
        : t('unlock_bomb_message');
    const btn = document.getElementById('booster-unlock-btn');
    btn.onclick = () => {
        document.getElementById('booster-unlock-modal').classList.remove('show');
        if (isHint) useHint(true); else revealRandomBomb(true);
        processNextUnlockPopup(); // còn cái nào trong hàng đợi thì hiện tiếp
    };
    document.getElementById('booster-unlock-modal').classList.add('show');
}

// Popup mua thêm booster khi đã dùng hết — mở khi bấm nút lúc số lượng = 0.
let boosterShopType = null; // 'hint' | 'undo'

function openBoosterShop(type) {
    boosterShopType = type;
    const isHint = type === 'hint';
    document.getElementById('booster-shop-icon').innerText = isHint ? '💡' : '💣';
    document.getElementById('booster-shop-title').innerText = isHint ? t('booster_shop_title_hint') : t('booster_shop_title_bomb');
    document.getElementById('booster-shop-message').innerText = t('booster_shop_default_message');
    const coinBtn = document.querySelector('#booster-shop-modal .btn-blue');
    const adBtn = document.querySelector('#booster-shop-modal .btn-green');
    coinBtn.disabled = false;
    coinBtn.innerText = t('shop_buy_coins_btn', { cost: BOOSTER_BUY_COST });
    adBtn.disabled = false;
    adBtn.innerText = t('booster_shop_buy_ad_btn');
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
        btn.innerText = t('action_no_coins');
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
    btn.innerText = t('action_loading_ad');
    showRewardedAd(
        () => {
            grantBooster(type, BOOSTER_BUY_QTY);
            hideBoosterShop();
        },
        () => {
            btn.disabled = false;
            btn.innerText = t('action_no_ad_retry');
        }
    );
}

// =============================================================================
// BOOSTER: GỢI Ý (Hint) — chỉ ra 1 ô suy luận được chắc chắn AN TOÀN dựa trên các
// đầu mối đang có, dùng đúng logic suy luận từng bước (như solver tạo level) chứ
// không "ăn gian" chỉ đường tối ưu — người chơi vẫn phải tự bước tới.
//
// 2 luật suy luận, lặp tới khi không suy thêm được gì (đúng như solver kiểm/tạo
// level trong tools/level_checker.py và tools/level_editor.html — PHẢI sửa cả 3
// nơi cùng lúc nếu đổi thuật toán, không thì Gợi Ý trong game có thể "bó tay" ở
// đúng chỗ mà solver lại bảo là giải được):
//   Luật A (1 ô số, tự nó): hết bẫy cần tìm quanh nó -> mọi ô chưa biết còn lại AN TOÀN.
//   Luật B (1 ô số, tự nó): số ô chưa biết còn lại đúng bằng số bẫy cần tìm -> tất cả là BẪY.
//   Luật C (so sánh 2 ô số CHỒNG LẤN — pattern "1-2" kinh điển của Minesweeper):
//     nếu vùng ô-chưa-biết của ô A là tập CON của vùng ô-chưa-biết của ô B, thì
//     phần CHÊNH LỆCH (B trừ A) phải chứa đúng (soBayConLaiCuaB - soBayConLaiCuaA)
//     bẫy — hết 0 thì phần chênh lệch toàn AN TOÀN, đúng bằng số ô chênh lệch thì
//     toàn BẪY. Mạnh hơn hẳn Luật A/B (vốn chỉ là trường hợp riêng khi A rỗng).
// =============================================================================

// Gom toàn bộ "đầu mối" hiện có (mỗi ô số đã mở, còn ô lân cận chưa biết) thành
// 1 danh sách {unknown: Set các toạ độ 'r,c', remaining: số bẫy còn lại cần tìm}
// — dùng chung cho cả Luật A/B (đơn) lẫn Luật C (so sánh cặp).
function collectConstraints(deducedMine, deducedSafe) {
    const constraints = [];
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
            const unknown = hidden.filter(k => !deducedMine.has(k) && !deducedSafe.has(k));
            if (unknown.length === 0) continue;
            constraints.push({ unknown: new Set(unknown), remaining: cell.count - knownMines.length });
        }
    }
    return constraints;
}

// Chạy 1 vòng suy luận đầy đủ (Luật A/B/C) tới khi không còn suy thêm được gì,
// gom kết quả vào deducedSafe/deducedMine (dùng chung cho Gợi Ý và có thể tái sử
// dụng ở nơi khác nếu cần sau này).
function deduceAll() {
    const deducedMine = new Set();
    const deducedSafe = new Set();
    let changed = true;
    while (changed) {
        changed = false;
        const constraints = collectConstraints(deducedMine, deducedSafe);

        // Luật A/B — từng đầu mối tự nó.
        for (const con of constraints) {
            if (con.remaining === 0 && con.unknown.size > 0) {
                for (const k of con.unknown) if (!deducedSafe.has(k)) { deducedSafe.add(k); changed = true; }
            } else if (con.remaining === con.unknown.size && con.unknown.size > 0) {
                for (const k of con.unknown) if (!deducedMine.has(k)) { deducedMine.add(k); changed = true; }
            }
        }

        // Luật C — so sánh từng cặp đầu mối, tìm quan hệ tập con.
        for (let i = 0; i < constraints.length; i++) {
            for (let j = 0; j < constraints.length; j++) {
                if (i === j) continue;
                const A = constraints[i], B = constraints[j];
                if (A.unknown.size === 0 || A.unknown.size >= B.unknown.size) continue;
                // A phải là tập CON THỰC SỰ của B (nhỏ hơn B) thì "chênh lệch" mới có nghĩa.
                let isSubset = true;
                for (const k of A.unknown) if (!B.unknown.has(k)) { isSubset = false; break; }
                if (!isSubset) continue;
                const diffCells = [...B.unknown].filter(k => !A.unknown.has(k));
                const diffCount = B.remaining - A.remaining;
                if (diffCount === 0 && diffCells.length > 0) {
                    for (const k of diffCells) if (!deducedSafe.has(k)) { deducedSafe.add(k); changed = true; }
                } else if (diffCount === diffCells.length && diffCells.length > 0) {
                    for (const k of diffCells) if (!deducedMine.has(k)) { deducedMine.add(k); changed = true; }
                }
            }
        }
    }
    return { deducedSafe, deducedMine };
}

function findHintCell() {
    const { deducedSafe } = deduceAll();

    let best = null, bestDist = Infinity;
    for (const key of deducedSafe) {
        const [r, c] = key.split(',').map(Number);
        if (grid[r][c].flagged) continue; // lỡ cắm cờ nhầm lên ô này rồi thì bỏ qua
        const dist = Math.abs(r - playerPos.r) + Math.abs(c - playerPos.c);
        if (dist < bestDist) { bestDist = dist; best = { r, c }; }
    }
    if (best) return best;

    // Chưa có ô số nào lộ ra để suy luận (vừa vào màn, chưa bước lần nào) -> deduceAll()
    // luôn trả về rỗng. Rơi về đúng bất biến của MỌI level (xem tools/level_checker.py:
    // "Cac o canh Start deu an toan"): nếu mèo còn đứng nguyên ở ô Start thì các ô KỀ nó
    // chắc chắn an toàn dù chưa có số nào chứng minh — quan trọng nhất là để popup "dùng
    // thử miễn phí" lúc vừa unlock Gợi Ý luôn có ô để chỉ, không rơi vào cảnh "chưa đủ
    // manh mối" ngay lần đầu tiên người chơi thấy tính năng này.
    if (grid[playerPos.r][playerPos.c].type === 'S') {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = playerPos.r + dr, c = playerPos.c + dc;
                if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
                if (grid[r][c].revealed || grid[r][c].flagged) continue;
                return { r, c };
            }
        }
    }
    return null;
}

// Ô đang được Gợi Ý trỏ tới (nếu có) — vòng tròn CHỈ biến mất khi mèo thật sự bước
// vào đúng ô này (xem revealAndMove()), không tự tắt theo thời gian.
let hintTargetCell = null;

// "Soi Quanh" — khoanh viền 8 ô lân cận vị trí mèo đang đứng, thuần công cụ ĐẾM
// (không suy luận hộ, không thêm thông tin gì cả) cho dễ nhìn thiếu/đủ trên bàn
// cờ lớn. Bật/tắt qua toggleNeighborHighlight(), tự tắt khi sang màn mới (không
// lưu localStorage — TODO sau này gắn thời gian dùng + quảng cáo, xem lúc đó có
// cần nhớ trạng thái không).
let neighborHighlightOn = false;

// Chỉ hiện khoanh vùng khi mèo ĐỨNG YÊN — ẩn hẳn trong lúc mèo đang trượt sang ô
// mới, tránh vòng khoanh "chạy trước" vị trí mèo thật (mèo trượt mất CAT_MOVE_MS,
// khớp đúng transition left/top của .cat-player trong style.css). Theo dõi bằng
// cách so sánh toạ độ pixel MỚI với toạ độ LẦN TRƯỚC trong updateCatPosition() —
// đổi khác nhau tức là vừa có 1 bước di chuyển thật.
const CAT_MOVE_MS = 260;
// Người chơi bấm di chuyển liên tục (nhiều ô/giây) thì hẹn giờ NGAY SAU KHI TRƯỢT
// XONG (chỉ CAT_MOVE_MS) khiến khoanh vùng chớp nháy hiện lên giữa các lần bấm rồi
// tắt ngay khi bấm tiếp — riêng cho việc HIỆN khoanh vùng, chờ thêm 1 khoảng ĐỨNG
// YÊN THẬT SỰ trước khi hiện, để không bị chớp nháy khi đang di chuyển dồn dập.
const NEIGHBOR_HIGHLIGHT_DELAY_MS = 500;
let catIsMoving = false;
let lastCatX = null, lastCatY = null;
let catMoveSettleTimer = null;

function toggleNeighborHighlight() {
    neighborHighlightOn = !neighborHighlightOn;
    document.getElementById('neighbor-highlight-btn').classList.toggle('active', neighborHighlightOn);
    if (grid) applyNeighborHighlight(); // chỉ có DOM ô để cập nhật khi đang giữa 1 màn chơi
    hideNeighborBtnHint(); // người chơi vừa tự bấm nút -> hết cần chỉ tay/nhắc chữ nữa
}

function clearHint() {
    hintTargetCell = null;
    const ring = document.getElementById('hint-ring');
    if (ring) ring.classList.remove('show');
}

// free = true: lượt dùng thử MIỄN PHÍ khi vừa mở khoá (xem processNextUnlockPopup()),
// không trừ vào số lượt hintCount đang có của người chơi.
function useHint(free) {
    if (isGameOver || isWalking) return;
    if (tutorialActive) { nudgeTutorialGuide(); return; }
    if (!free && !hintUnlocked) {
        updateStatus(t('status_hint_locked', { level: HINT_UNLOCK_LEVEL_IDX + 1 }), '#ff5964');
        return;
    }
    if (!free && hintCount <= 0) { openBoosterShop('hint'); return; }
    const target = findHintCell();
    if (!target) {
        updateStatus(t('status_hint_no_clue'));
        return;
    }
    if (!free) {
        hintCount--;
        saveBoosterCounts();
        updateBoosterBadges();
    }
    updateStatus(t('status_hint_shown'), '#1982c4');

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
    updateStatus(t('status_revived'), '#2a9d8f');
    render();
}

// TODO: thay bằng rewarded ad thật (AdMob) khi có tài khoản quảng cáo — hiện mô
// phỏng tạm bằng 1 khoảng chờ ngắn để sẵn khung, chỉ cần cắm SDK thật vào chỗ này.
function watchAdForRevive(r, c, myGeneration, btn) {
    btn.disabled = true;
    btn.innerText = t('action_loading_ad');
    showRewardedAd(
        () => {
            if (myGeneration !== levelGeneration) return; // đã Replay/thoát giữa lúc xem quảng cáo
            performRevive(r, c);
        },
        () => {
            btn.disabled = false;
            btn.innerText = t('action_no_ad_retry_full');
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

// =============================================================================
// LƯU TIẾN TRÌNH GIỮA MÀN — trước đây thoát app dở màn (chưa qua) là mất sạch,
// phải chơi lại từ đầu màn đó. Giờ tự lưu lại state (ô nào mở/cắm cờ, mèo đứng
// đâu, đã tìm màu chưa...) sau MỖI thay đổi, và khôi phục lại khi loadLevel(idx,
// true) được gọi VỚI Ý ĐỊNH RÕ RÀNG là tiếp tục (chỉ playCurrentLevel() truyền
// true — xem startLevel()) — LUÔN đọc THẲNG từ localStorage mỗi lần cần (KHÔNG
// cache 1 lần lúc mở app rồi tiêu thụ dần): app là single-page, người chơi có thể
// Play -> Home -> Play nhiều lần trong CÙNG 1 phiên mà không tải lại trang, nếu
// cache-rồi-tiêu-thụ thì lần bấm "Tiếp Tục" thứ 2 trở đi sẽ không còn gì để đọc
// nữa dù dữ liệu vẫn còn nguyên trong localStorage (đây chính là bug đã gặp).
// Chỉ lưu ĐÚNG những gì không tự suy ra lại được từ LEVELS[idx] (type/count/
// hasColor luôn tính lại y hệt mỗi lần loadLevel()).
// =============================================================================
const LEVEL_PROGRESS_KEY = 'catYarnLevelProgress';

function readSavedLevelProgress() {
    try {
        return JSON.parse(localStorage.getItem(LEVEL_PROGRESS_KEY));
    } catch (e) { return null; }
}

function saveLevelProgress() {
    if (!grid || isGameOver || tutorialActive) return; // Level 1 (tutorial) tự kịch bản riêng theo TUTORIAL_STEPS, không lưu step dở dang
    try {
        localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify({
            levelIdx: currentLevelIdx,
            playerPos,
            foundColor1,
            foundColor2,
            usedReviveThisLevel,
            cells: grid.map(row => row.map(cell => ({
                revealed: cell.revealed, flagged: cell.flagged, defused: !!cell.defused
            })))
        }));
    } catch (e) { /* bỏ qua nếu localStorage bị chặn/đầy */ }
}

function clearLevelProgress() {
    try { localStorage.removeItem(LEVEL_PROGRESS_KEY); } catch (e) { /* bỏ qua */ }
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

// Đã chơi qua hết toàn bộ level hiện có (kể cả level cuối) chưa.
function areAllLevelsCompleted() {
    return LEVELS.length > 0 && completedLevels.has(LEVELS.length - 1);
}

function renderHomeScreen() {
    // Ô số level giữ nguyên như cũ (luôn hiện số level, kể cả khi đã chơi hết) —
    // chỉ nút Chơi đổi trạng thái khi hết level.
    document.getElementById('home-level-number').textContent = getNextPlayableLevel() + 1;

    const playBtn = document.querySelector('.home-play-btn');
    if (areAllLevelsCompleted()) {
        playBtn.textContent = t('home_coming_soon');
        playBtn.disabled = true;
    } else {
        playBtn.textContent = hasInProgressLevel() ? t('home_play_btn_continue') : t('home_play_btn');
        playBtn.disabled = false;
    }
    updateCoinDisplay();
}

// Có đúng 1 tiến trình dở dang khớp với level SẼ được vào (getNextPlayableLevel())
// hay không — đọc thẳng localStorage (không dựa vào pendingResumeProgress, vì biến
// đó đã bị null hoá ngay sau lượt loadLevel() đầu tiên, không còn phản ánh đúng
// trạng thái nếu người chơi quay lại Home rồi vào lại nhiều lần trong 1 phiên).
function hasInProgressLevel() {
    const data = readSavedLevelProgress();
    return !!data && data.levelIdx === getNextPlayableLevel();
}

// Không cần tự setTimeout riêng ở đây nữa — attachButtonClickDelay() (cuối file)
// đã chặn CHUNG cho mọi nút UI, đợi hiệu ứng bấm chạy xong rồi mới thật sự gọi
// hàm onclick, nên hàm này chạy như bình thường không cần biết gì về độ trễ.
function playCurrentLevel() {
    if (areAllLevelsCompleted()) return; // chưa có thêm level mới, chờ bản cập nhật sau
    startLevel(getNextPlayableLevel(), true); // true = thử khôi phục tiến trình dở dang nếu có
}

function showScreen(name) {
    document.getElementById('screen-loading').style.display = name === 'loading' ? 'flex' : 'none';
    document.getElementById('screen-home').style.display = name === 'home' ? 'flex' : 'none';
    document.getElementById('screen-game').style.display = name === 'game' ? 'flex' : 'none';
    fitBoardToSpace();
}

// tryResume = true: cho phép khôi phục tiến trình dở dang nếu localStorage đang
// có sẵn đúng khớp level này (chỉ playCurrentLevel() truyền true — nút "Tiếp Tục"
// ở Home). Mọi lối vào khác (tutorial lần đầu...) mặc định false = luôn bàn cờ mới.
function startLevel(idx, tryResume) {
    if (!LEVELS.length) return; // dữ liệu level (fetch từ levels/*.json) chưa nạp xong
    if (!isLevelUnlocked(idx)) return;
    showScreen('game');
    loadLevel(idx, tryResume);
    fitBoardToSpace();
}

function goHome() {
    endGuidedTutorial();
    hideResultModal(); // popup thắng/thua là lớp phủ riêng, không tự ẩn theo màn hình
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

function loadLevel(idx, tryResume) {
    endGuidedTutorial();
    levelGeneration++; // huỷ mọi hiệu ứng "nổ tung"/popup thắng dở dang từ ván trước
    isWalking = false; // đề phòng lỡ đang tự chạy dở dang từ màn trước, không để input bị kẹt khoá
    clearHint(); // vòng gợi ý (nếu có) thuộc về ván trước, không còn ý nghĩa ở màn mới
    if (catEl) catEl.classList.remove('expr-happy', 'expr-dizzy', 'cat-colored', 'cat-split-colored', 'cat-found-color1', 'cat-found-color2');
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
            // 'C'/'D' = ô giấu màu 1/màu 2 (cơ chế "tìm màu cho mèo") — vẫn là ô
            // thường (N), chỉ thêm cờ, không đổi cách tính số bẫy lân cận.
            const hasColor = (ch === 'C');
            const hasColor2 = (ch === 'D');
            grid[r].push({ type, count: 0, revealed: false, flagged: false, hasColor, hasColor2 });
            if (type === 'S') playerPos = { r, c };
        }
    }
    foundColor1 = false;
    foundColor2 = false;
    neighborHighlightOn = false;
    document.getElementById('neighbor-highlight-btn').classList.remove('active');
    // Huỷ bộ đếm "mèo vừa trượt xong" của màn CŨ — không thì lỡ nó bắn sau khi đã
    // sang màn mới, applyNeighborHighlight() sẽ dùng nhầm playerPos/kích thước lưới
    // của màn mới để tính toạ độ, có thể khoanh sai ô.
    catIsMoving = false;
    lastCatX = null;
    lastCatY = null;
    clearTimeout(catMoveSettleTimer);

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

    isGameOver = false;
    lastMoveTime = Date.now();
    pendingReveals = [];
    usedReviveThisLevel = false;
    particles = [];
    ctx.clearRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);

    // Khôi phục tiến trình dở dang (nếu có) — CHỈ khi được gọi với ý định rõ ràng
    // (tryResume=true, xem startLevel()), và phải ĐÚNG level này + đúng kích thước
    // lưới (phòng khi level đã bị sửa lại từ lần chơi trước). Đọc THẲNG localStorage
    // ngay lúc này (không dùng biến cache từ trước) để hoạt động đúng cả khi người
    // chơi Play -> Home -> Play nhiều lần trong CÙNG 1 phiên không tải lại trang.
    const savedProgress = tryResume ? readSavedLevelProgress() : null;
    const resume = (savedProgress && savedProgress.levelIdx === idx &&
        Array.isArray(savedProgress.cells) &&
        savedProgress.cells.length === GRID_ROWS &&
        savedProgress.cells[0] && savedProgress.cells[0].length === GRID_COLS)
        ? savedProgress : null;
    if (resume) {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const saved = resume.cells[r][c];
                grid[r][c].revealed = grid[r][c].revealed || !!saved.revealed; // S/E vốn đã revealed sẵn, giữ nguyên
                grid[r][c].flagged = !!saved.flagged;
                if (saved.defused) grid[r][c].defused = true;
            }
        }
        playerPos = resume.playerPos;
        foundColor1 = !!resume.foundColor1;
        foundColor2 = !!resume.foundColor2;
        usedReviveThisLevel = !!resume.usedReviveThisLevel;
    }

    document.getElementById('level-title').innerText = t('level_title', { n: currentLevelIdx + 1 });
    // Màn có giấu đốm màu -> báo ngay từ đầu (khớp màu cá đang thấy trên bàn cờ),
    // đỡ để người chơi tự dò tới tận ô cá mới biết cần tìm gì.
    levelNeedsColor1 = grid.some(row => row.some(cell => cell.hasColor));
    levelNeedsColor2 = grid.some(row => row.some(cell => cell.hasColor2));
    updateStatus(
        (levelNeedsColor1 && levelNeedsColor2)
            ? t('status_level_start_dual_color')
            : (levelNeedsColor1 || levelNeedsColor2)
                ? t('status_level_start_single_color')
                : t('status_level_start_normal'));
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

    // Rải tiếng "lanh canh" (xem playSound('bubble')) đúng nhịp từng ô bung ra
    // (30ms/ô, khớp stagger của .tile-bubble-pop trong render()) — chỉ phát cách 1
    // ô (idx chẵn) để đỡ dồn dập với bàn cờ lớn (9x9 = 81 ô); huỷ nếu lỡ Replay/đổi
    // màn giữa lúc animation còn dở dang.
    const myBubbleGeneration = levelGeneration;
    bubbleOrder.forEach((_, idx) => {
        if (idx % 2 !== 0) return;
        setTimeout(() => {
            if (myBubbleGeneration !== levelGeneration) return;
            playSound('bubble');
        }, idx * 30);
    });

    // Vừa khôi phục tiến trình -> đã tìm màu từ trước rồi thì tô lại mèo NGAY (không
    // đợi "tìm thấy" mới tô, vì onColorFound() chỉ chạy đúng lúc VỪA mở trúng ô màu —
    // xem checkColorPickup()), khớp y hệt hiệu ứng onColorFound() nhưng bỏ âm thanh/
    // thông báo (không phải vừa tìm được, chỉ là đang tải lại đúng trạng thái cũ). Phải
    // làm SAU render(true) ở trên vì catEl chỉ thực sự được tạo trong updateCatPosition()
    // (gọi từ trong render()) — trước đó catEl vẫn null với 1 phiên trình duyệt mới mở.
    if (resume && catEl) {
        const dual = levelNeedsColor1 && levelNeedsColor2;
        if (dual) {
            if (foundColor1) catEl.classList.add('cat-split-colored', 'cat-found-color1');
            if (foundColor2) catEl.classList.add('cat-split-colored', 'cat-found-color2');
        } else if (foundColor1 || foundColor2) {
            catEl.classList.add('cat-colored');
        }
    }
    // Mỗi level có thể khác kích thước lưới (5x5 -> 9x9) -> luôn co lại cho vừa màn
    // hình ngay khi vừa dựng xong bàn cờ mới, không chỉ lúc mở màn Game lần đầu.
    fitBoardToSpace();
    maybeShowColorTutorial();
    hideStartSafeHint(); // dọn tàn dư từ màn trước, tránh dính sang màn không cần
    hideNeighborBtnHint();
    if (currentLevelIdx === 1) {
        // Level 2 (index 1): nhắc luật "cạnh Start luôn an toàn" + tự bật luôn "Soi
        // Quanh" (neighborHighlightOn vừa bị reset về false ở trên) để người chơi
        // thấy ngay hiệu ứng khoanh 8 ô quanh mèo hoạt động thế nào ở màn thật.
        showStartSafeHint();
        neighborHighlightOn = true;
        document.getElementById('neighbor-highlight-btn').classList.add('active');
        applyNeighborHighlight();
    }
    if (currentLevelIdx === 2) showNeighborBtnHint(); // Level 3 (index 2): lần này để người chơi TỰ bấm bật, chỉ trỏ tay gợi ý

    updateBoosterUnlockUI();
    maybeUnlockBooster('hint', HINT_UNLOCK_LEVEL_IDX);
    maybeUnlockBooster('bomb', BOMB_UNLOCK_LEVEL_IDX);
    processNextUnlockPopup();
}

// Bong bóng chữ dùng transform: translateX(-50%) để CANH GIỮA quanh toạ độ "left"
// được gán — nếu ô/nút mục tiêu nằm quá gần rìa màn hình (màn hẹp, DevTools thu
// nhỏ viewport...), nửa bong bóng phía ngoài sẽ bị tràn ra khỏi màn hình. Ghim lại
// trong khoảng [nửa bề rộng bong bóng + lề, bề rộng màn hình - nửa bề rộng - lề]
// để LUÔN nằm gọn trong màn hình, bất kể mục tiêu ở đâu.
function clampBarCenterX(bar, desiredCenterX) {
    const margin = 10;
    const halfWidth = bar.offsetWidth / 2;
    const min = halfWidth + margin;
    const max = window.innerWidth - halfWidth - margin;
    if (max < min) return window.innerWidth / 2; // màn quá hẹp so với bong bóng -> đành canh giữa màn
    return Math.min(Math.max(desiredCenterX, min), max);
}

// Gợi ý ngắn cho Level 3: KHÔNG tự bật "Soi Quanh" như Level 2 nữa (để người chơi
// tự chủ động bấm) — chỉ chỉ tay + nhắc chữ vào đúng nút, ẩn ngay khi bấm nút đó
// (xem toggleNeighborHighlight()). Dùng #level-hint-hand riêng (không phải
// #tutorial-hand) vì positionTutorialUI() gọi sau MỌI lần render() sẽ tự ẩn
// #tutorial-hand đi khi tutorialActive === false, không hợp cho việc này.
function showNeighborBtnHint() {
    const btn = document.getElementById('neighbor-highlight-btn');
    const hand = document.getElementById('level-hint-hand');
    const rect = btn.getBoundingClientRect();
    // Chỉ NGANG (👉) từ bên trái nút, canh giữa theo chiều dọc của nút — tự nhiên
    // hơn hẳn kiểu chỉ từ trên xuống vì nút nằm ngang hàng chữ, không phải 1 ô vuông.
    hand.style.left = rect.left + 'px';
    hand.style.top = (rect.top + rect.height / 2) + 'px';
    hand.classList.add('show', 'point-right');

    const bar = document.getElementById('level-hint-bar');
    bar.querySelector('.tutorial-bar-text').textContent = t('hint_bar_neighbor_btn');
    bar.classList.toggle('below', rect.top < 170);
    bar.style.top = rect.top < 170 ? (rect.bottom + 16) + 'px' : (rect.top - 16) + 'px';
    bar.classList.add('show'); // phải add('show') TRƯỚC khi đo offsetWidth (display:none thì width luôn = 0)
    bar.style.left = clampBarCenterX(bar, rect.left + rect.width / 2) + 'px';
}

function hideNeighborBtnHint() {
    document.getElementById('level-hint-hand').classList.remove('show');
    document.getElementById('level-hint-bar').classList.remove('show');
}

// Gợi ý ngắn cho Level 2 (không phải tutorial dắt tay đầy đủ như Level 1): khoanh
// xanh các ô sát Start + 1 dòng chữ nhắc luật "cạnh Start luôn an toàn" (bất biến
// của mọi level, xem tools/level_checker.py: "Cac o canh Start deu an toan"), để
// người chơi mạnh dạn bước ngay ô đầu tiên thay vì đoán mò/sợ sệt. Tự ẩn khi mèo
// bước đi (xem handleMoveInput) — không dùng chung DOM/state với hệ tutorial dắt
// tay đầy đủ (#tutorial-bar/tutorialActive) vì đó là 1 cơ chế lớn hơn nhiều.
function showStartSafeHint() {
    const cells = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = playerPos.r + dr, c = playerPos.c + dc;
            if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
            cells.push({ r, c });
        }
    }
    if (!cells.length) return;
    cells.forEach(({ r, c }) => {
        const el = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (el) el.classList.add('start-safe-hint');
    });

    const bar = document.getElementById('level-hint-bar');
    bar.querySelector('.tutorial-bar-text').textContent = t('hint_bar_start_safe', { count: cells.length });
    const boardRect = document.getElementById('cells-layer').getBoundingClientRect();
    const pad = 10;
    const placeBelow = boardRect.top < 170;
    bar.classList.toggle('below', placeBelow);
    bar.style.top = placeBelow ? (boardRect.bottom + pad + 16) + 'px' : (boardRect.top - pad - 16) + 'px';
    bar.classList.add('show'); // phải add('show') TRƯỚC khi đo offsetWidth (display:none thì width luôn = 0)
    bar.style.left = clampBarCenterX(bar, boardRect.left + boardRect.width / 2) + 'px';
}

function hideStartSafeHint() {
    document.querySelectorAll('.cell.start-safe-hint').forEach(el => el.classList.remove('start-safe-hint'));
    document.getElementById('level-hint-bar').classList.remove('show');
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

// Popup giới thiệu cơ chế "tìm màu cho mèo" — chỉ hiện đúng 1 lần, đúng lúc vào
// màn ĐẦU TIÊN có cơ chế này (không phải lần đầu mở app như tutorial chính).
const COLOR_TUTORIAL_SEEN_KEY = 'catYarnColorTutorialSeen';

function maybeShowColorTutorial() {
    if (!levelNeedsColor1 && !levelNeedsColor2) return;
    let hasSeen = false;
    try { hasSeen = localStorage.getItem(COLOR_TUTORIAL_SEEN_KEY) === '1'; } catch (e) { /* bỏ qua */ }
    if (hasSeen) return;
    document.getElementById('color-tutorial-modal').classList.add('show');
}

function hideColorTutorial() {
    document.getElementById('color-tutorial-modal').classList.remove('show');
    try { localStorage.setItem(COLOR_TUTORIAL_SEEN_KEY, '1'); } catch (e) { /* localStorage có thể bị chặn, bỏ qua */ }
}

document.getElementById('color-tutorial-modal').addEventListener('click', (e) => {
    if (e.target.id === 'color-tutorial-modal') hideColorTutorial();
});

// =============================================================================
// TẬP CHƠI TƯƠNG TÁC: chỉ tay (👇) vào đúng ô cần bấm, khoanh vòng CAM vào ô SỐ
// dùng làm bằng chứng (clue) và vòng đỏ/xanh vào ô kết luận (target), giải thích
// rõ VÌ SAO suy ra được — không bắt người chơi "tin chay". Khoá các ô khác lại
// để không bấm nhầm, dắt qua trọn Level 1 thật. Toàn bộ suy luận dưới đây đã được
// tính đúng theo dữ liệu LEVELS[0] hiện tại (bẫy tại (2,1) và (3,4)):
//   (1,2)=1, quanh nó chỉ còn đúng 1 ô chưa mở (2,1)  -> (2,1) chắc chắn có bẫy
//   (2,2)=1, bẫy đó đã tính vào ô (2,1) rồi            -> (3,1)/(3,2)/(3,3) an toàn
//   (2,4)=1, quanh nó chỉ còn đúng 1 ô chưa mở (3,4)  -> (3,4) chắc chắn có bẫy
//   (3,3)=1, bẫy đó đã tính vào ô (3,4) rồi            -> (4,2)/(4,3) an toàn
// =============================================================================
// msgKey (không phải chuỗi chữ trực tiếp) — tra qua t() ngay lúc HIỂN THỊ từng
// bước (renderTutorialStep()), vì mảng này chỉ được tạo 1 LẦN lúc script.js chạy
// (còn quá sớm để biết đúng currentLang, và đổi ngôn ngữ giữa chừng cũng không
// cập nhật lại được nếu bake sẵn chuỗi ở đây).
const TUTORIAL_STEPS = [
    { action: 'move', target: { r: 0, c: 1 }, clue: null,
      msgKey: 'tutorial_step_1' },

    { action: 'click', target: null, clue: null,
      msgKey: 'tutorial_step_2' },

    { action: 'move', target: { r: 1, c: 2 }, clue: null,
      msgKey: 'tutorial_step_3' },

    { action: 'click', target: { r: 2, c: 1 }, clue: { r: 1, c: 2 }, danger: true,
      msgKey: 'tutorial_step_4' },

    { action: 'flag', target: { r: 2, c: 1 }, clue: { r: 1, c: 2 }, danger: true,
      msgKey: 'tutorial_step_5' },

    { action: 'move', target: { r: 2, c: 2 }, clue: null,
      msgKey: 'tutorial_step_6' },

    { action: 'click', target: { r: 3, c: 3 }, clue: { r: 2, c: 2 },
      msgKey: 'tutorial_step_7' },

    { action: 'move', target: { r: 3, c: 3 }, clue: { r: 2, c: 2 },
      msgKey: 'tutorial_step_8' },

    { action: 'move', target: { r: 2, c: 4 }, clue: null,
      msgKey: 'tutorial_step_9' },

    { action: 'click', target: { r: 3, c: 4 }, clue: { r: 2, c: 4 }, danger: true,
      msgKey: 'tutorial_step_10' },

    { action: 'move', target: { r: 3, c: 3 }, clue: null,
      msgKey: 'tutorial_step_11' },

    { action: 'click', target: { r: 4, c: 3 }, clue: { r: 3, c: 3 },
      msgKey: 'tutorial_step_12' },

    { action: 'move', target: { r: 4, c: 3 }, clue: { r: 3, c: 3 },
      msgKey: 'tutorial_step_13' },

    { action: 'move', target: { r: 4, c: 4 }, clue: null,
      msgKey: 'tutorial_step_14' }
];

let tutorialActive = false;
let tutorialStep = 0;

function startGuidedTutorial() {
    tutorialActive = true;
    tutorialStep = 0;
    // Bật sẵn "Soi Quanh" để người chơi mới biết ngay tính năng này tồn tại,
    // thay vì phải tự mò nút — loadLevel() vừa tắt nó khi vào màn nên phải bật lại ở đây.
    neighborHighlightOn = true;
    document.getElementById('neighbor-highlight-btn').classList.add('active');
    applyNeighborHighlight();
    renderTutorialStep();
}

function endGuidedTutorial() {
    if (!tutorialActive) return;
    tutorialActive = false;
    document.getElementById('tutorial-bar').classList.remove('show');
    document.getElementById('tutorial-hand').classList.remove('show');
    document.getElementById('tutorial-spotlight').classList.remove('show');
    // Chỉ tự bật "Soi Quanh" để dạy trong tutorial -> hết tutorial (kể cả tới đích
    // ăn cá luôn kết thúc luôn) thì tắt lại, không để dính mãi sang lúc chơi thường.
    neighborHighlightOn = false;
    document.getElementById('neighbor-highlight-btn').classList.remove('active');
    applyNeighborHighlight();
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
    bar.querySelector('.tutorial-bar-text').textContent = t(step.msgKey);
    document.getElementById('tutorial-continue-btn').style.display = (step.action === 'click') ? 'inline-flex' : 'none';
    bar.classList.add('show');
    positionTutorialUI();
    // Chuyển bước KHÔNG PHẢI lúc nào cũng đi kèm 1 nước đi thật (bước 'click'/'flag'
    // không làm mèo bước tới) -> render() (nơi trước đây gắn class tutorial-target/
    // tutorial-clue) không được gọi lại, khiến vòng khoanh/nhấp nháy vẫn dính ở Ô
    // của BƯỚC CŨ. Phải chủ động refresh riêng ở đây mỗi khi đổi bước.
    applyTutorialHighlights();
}

// Gắn/gỡ class tutorial-target(-danger)/tutorial-clue lên ĐÚNG ô của bước hiện tại,
// tách khỏi vòng lặp vẽ ô trong render() (giống applyNeighborHighlight()) để gọi
// riêng được mỗi khi tutorialStep đổi mà không cần vẽ lại cả bàn cờ.
function applyTutorialHighlights() {
    document.querySelectorAll('.cell.tutorial-target, .cell.tutorial-target-danger, .cell.tutorial-clue')
        .forEach(el => el.classList.remove('tutorial-target', 'tutorial-target-danger', 'tutorial-clue'));
    if (!tutorialActive) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (step.target) {
        const el = document.querySelector(`[data-row="${step.target.r}"][data-col="${step.target.c}"]`);
        if (el) {
            el.classList.add('tutorial-target');
            if (step.danger) el.classList.add('tutorial-target-danger');
        }
    }
    if (step.clue) {
        const el = document.querySelector(`[data-row="${step.clue.r}"][data-col="${step.clue.c}"]`);
        if (el) el.classList.add('tutorial-clue');
    }
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

    if (step.target) {
        const cellEl = document.querySelector(`[data-row="${step.target.r}"][data-col="${step.target.c}"]`);
        if (!cellEl) { hand.classList.remove('show'); return; }
        const targetRect = cellEl.getBoundingClientRect();
        hand.style.left = (targetRect.left + targetRect.width / 2) + 'px';
        hand.style.top = targetRect.top + 'px';
        hand.classList.add('show');
    } else {
        hand.classList.remove('show');
    }

    // Bong bóng chữ LUÔN neo theo mép TRÊN/DƯỚI của cả bàn cờ (không phải theo ô
    // mục tiêu/clue riêng lẻ) -> không bao giờ đè lên vòng khoanh vàng/đỏ/xanh
    // đang giải thích trên ô, bất kể ô đó nằm ở đâu trong bàn cờ.
    const placeBelow = boardRect.top < 170;
    bar.classList.toggle('below', placeBelow);
    if (placeBelow) {
        bar.style.top = (boardRect.bottom + pad + 16) + 'px';
    } else {
        bar.style.top = (boardRect.top - pad - 16) + 'px';
    }
    bar.classList.add('show'); // phải add('show') TRƯỚC khi đo offsetWidth (display:none thì width luôn = 0)
    bar.style.left = clampBarCenterX(bar, boardRect.left + boardRect.width / 2) + 'px';
}

function updateStatus(text, color = '#4a3022') {
    const el = document.getElementById('status');
    el.innerText = text;
    el.style.color = color;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
}

// render() vẽ lại TOÀN BỘ bàn cờ mỗi lần mèo bước (xoá/tạo lại DOM), nên ::after
// (hiệu ứng nhấp nháy ô cá) bị huỷ+tạo mới liên tục -> animation cứ giật về đầu
// chu kỳ thay vì chạy liền mạch. Gán sẵn 1 độ trễ ÂM tính theo thời gian thực để
// chu kỳ mới của phần tử mới luôn "vào giữa" đúng chỗ nó lẽ ra đang ở.
const COLOR_GLOW_CYCLE_MS = 1600; // phải khớp đúng thời lượng @keyframes color-cell-glow trong style.css
function setColorGlowDelay(el) {
    const elapsed = performance.now() % COLOR_GLOW_CYCLE_MS;
    el.style.setProperty('--glow-delay', `-${elapsed}ms`);
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
                // Màn có cơ chế tìm màu -> ô cá LUÔN có sẵn màu cần tìm ngay từ đầu màn
                // (không đợi tìm thấy mới đổi) — để người chơi biết ngay cần tìm màu gì.
                // Đủ cả 2 màu -> tách nửa ô (khớp mèo tách nửa thân); chỉ 1 màu -> tô
                // nguyên ô như cũ (tương thích ngược với level chỉ có 'C').
                if (levelNeedsColor1 && levelNeedsColor2) el.classList.add('color-cell-split');
                else if (levelNeedsColor1) el.classList.add('color-cell-tinted');
                else if (levelNeedsColor2) el.classList.add('color-cell-tinted-2');
                else el.classList.add('fish-cell-plain'); // level thường (không cần tìm màu) -> vẫn cho ô cá nổi bật nhẹ, không để trắng trơn như ô số
                setColorGlowDelay(el);
                contentHTML = `<img class="fish-icon" src="icon/fissh.png" alt="cá">`;
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

            // Đốm màu giấu trong ô (nếu có) -> hiện chấm tròn nhỏ ở góc khi ô đã mở,
            // ĐÚNG màu tương ứng bên ô cá, để người chơi liên tưởng ngay "màu này khớp
            // màu cá cần". Gắn trực tiếp vào .cell (không phải .cell-inner) để không
            // dính lỗi stacking-context khi .cell-inner có transform riêng.
            if (cell.revealed && (cell.hasColor || cell.hasColor2)) {
                const colorBadge = document.createElement('span');
                colorBadge.className = cell.hasColor2 ? 'color-badge color-badge-2' : 'color-badge';
                el.appendChild(colorBadge);
            }

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

    // Lúc mới vào màn (pendingBubbleLoad), ô nó đứng lên cũng bung theo đúng thứ tự
    // loang như mọi ô khác -> nếu để mèo hiện NGAY LẬP TỨC (như trước) thì nó lộ ra
    // trước cả khi ô của nó kịp bung, trông như "mèo tự dưng có sẵn trên nền trống".
    // Tính đúng độ trễ (khớp stagger 30ms của tile-bubble-pop) rồi truyền cho
    // updateCatPosition() để mèo chỉ hiện ra SAU khi ô nó đứng đã bung xong.
    let catBubbleDelay = null;
    if (pendingBubbleLoad) {
        const idx = revealOrder.get(playerPos.r + ',' + playerPos.c);
        if (idx !== undefined) catBubbleDelay = idx * 30;
    }
    pendingReveals = [];
    updateCatPosition(instant, catBubbleDelay);
    applyTutorialHighlights();
    applyNeighborHighlight();
    positionTutorialUI();
    saveLevelProgress(); // lưu lại sau MỌI lần vẽ (di chuyển/cắm cờ/dùng booster...) để thoát app dở màn vẫn tiếp tục được
}

// Cập nhật khoanh vùng "Soi Quanh" (8 ô lân cận mèo) — tách riêng khỏi vòng lặp vẽ
// ô trong render() để có thể gọi LẠI RIÊNG hàm này (không đụng gì tới DOM các ô
// khác) mỗi khi mèo vừa trượt xong, thay vì phải render() lại TOÀN BỘ bàn cờ —
// nếu không, những ô đang chờ tới lượt animation-delay của nó (mảng loang lớn,
// stagger 45ms/ô) sẽ bị xoá mất giữa chừng lúc chưa kịp chạy animation.
function applyNeighborHighlight() {
    document.querySelectorAll('.cell.neighbor-highlight').forEach(el => el.classList.remove('neighbor-highlight'));
    if (!neighborHighlightOn || catIsMoving || !playerPos) return;
    // Trong lúc hướng dẫn, ô đang là "bằng chứng"/"kết luận" (viền cam/đỏ/xanh) phải
    // được ưu tiên tuyệt đối — bỏ qua, không tô viền xanh Soi Quanh đè lên, nếu
    // không người chơi không phân biệt được đâu là ô đang được giải thích.
    const step = tutorialActive ? TUTORIAL_STEPS[tutorialStep] : null;
    const isTutorialHighlighted = (r, c) =>
        step && ((step.target && step.target.r === r && step.target.c === c) ||
                 (step.clue && step.clue.r === r && step.clue.c === c));
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = playerPos.r + dr, c = playerPos.c + dc;
            if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
            if (isTutorialHighlighted(r, c)) continue;
            const el = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (!el) continue;
            el.classList.add('neighbor-highlight');
            const order = (dr + 1) * 3 + (dc + 1);
            el.style.setProperty('--neighbor-pop-delay', `${order * 30}ms`);
        }
    }
}

// Khớp với màu chữ .num-1..num-8 trong style.css, dùng cho số hiện trên mặt mèo.
const NUM_COLORS = {
    1: '#1976d2', 2: '#388e3c', 3: '#d32f2f', 4: '#7b1fa2',
    5: '#795548', 6: '#00838f', 7: '#212121', 8: '#757575'
};

// Dùng chung cho cả render() và toggleFlag() (cập nhật tại chỗ không render lại cả bàn).
const FLAG_ICON_HTML = `
    <svg class="flag-icon" viewBox="0 0 40 40" style="width:45px; height:45px;">
        <line x1="10" y1="6" x2="10" y2="34" stroke="#4a3022" stroke-width="4" stroke-linecap="round"/>
        <path class="flag-cloth" d="M 10 8 L 32 14 L 10 20 Z" fill="#ff5964" stroke="#4a3022" stroke-width="3" stroke-linejoin="round"/>
    </svg>`;

function updateCatPosition(instant, bubbleDelayMs) {
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
                <defs>
                    <!-- Gradient tách nửa thân dùng cho cơ chế "tìm ĐỦ 2 màu" (.cat-split-colored)
                         — gradientUnits="userSpaceOnUse" + toạ độ theo đúng viewBox (0-100) để mốc
                         tách luôn nằm giữa CON MÈO (x=50), không lệch theo từng hình con (tai/thân/
                         chân) như mặc định "objectBoundingBox" sẽ làm. Màu lấy qua CSS custom
                         property, mặc định trắng (khớp màu gốc), đổi màu khi .cat-found-color1/2. -->
                    <linearGradient id="cat-color-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
                        <stop offset="50%" class="cat-gradient-stop-1"/>
                        <stop offset="50%" class="cat-gradient-stop-2"/>
                    </linearGradient>
                </defs>
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
                <text class="cat-number-overlay" id="cat-number-overlay" x="50" y="58" text-anchor="middle" dominant-baseline="middle" font-family="'Fredoka', cursive, sans-serif" font-weight="700" font-size="50"></text>
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
        if (bubbleDelayMs !== null && bubbleDelayMs !== undefined) catEl.style.opacity = '0';
        catEl.style.left = x + 'px';
        catEl.style.top = y + 'px';
        void catEl.offsetWidth;
        catEl.style.transition = '';
        if (bubbleDelayMs !== null && bubbleDelayMs !== undefined) {
            // Chờ đúng lúc ô nó đứng bung xong (xem render()) rồi mới cho mèo hiện ra.
            setTimeout(() => { catEl.style.opacity = '1'; }, bubbleDelayMs);
        } else {
            catEl.style.opacity = '1';
        }
        catIsMoving = false; // vào màn mới/tức thì -> không tính là "đang di chuyển"
        clearTimeout(catMoveSettleTimer);
    } else {
        catEl.style.opacity = '1'; // phòng khi còn đang chờ hiện ra dở (bubbleDelayMs) từ lượt trước
        catEl.style.left = x + 'px';
        catEl.style.top = y + 'px';
        // Chỉ HẸN GIỜ tắt catIsMoving ở đây thôi — việc BẬT (catIsMoving = true) phải
        // làm TRƯỚC khi render() build lại danh sách ô (xem handleMoveInput()),
        // vì hàm này (updateCatPosition) luôn chạy SAU vòng lặp vẽ ô trong render() —
        // bật catIsMoving ở đây thì đã trễ mất 1 lượt render, không kịp ẩn khoanh vùng.
        if (lastCatX !== null && (x !== lastCatX || y !== lastCatY)) {
            clearTimeout(catMoveSettleTimer);
            catMoveSettleTimer = setTimeout(() => {
                catIsMoving = false;
                applyNeighborHighlight(); // KHÔNG gọi render() ở đây — sẽ xoá mất các ô đang chờ animation-delay dở dang
            }, NEIGHBOR_HIGHLIGHT_DELAY_MS);
        }
    }
    lastCatX = x;
    lastCatY = y;
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
    saveLevelProgress(); // toggleFlag() không phải lúc nào cũng gọi render() (xem bên dưới) -> phải tự lưu riêng ở đây

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
        if (inner) {
            inner.innerHTML = cell.flagged ? FLAG_ICON_HTML : '';
            // Chỉ lúc này (vừa thật sự CẮM cờ mới) mới cho bung/xoay, xem lý do ở
            // .flag-icon-pop trong style.css.
            if (cell.flagged) {
                const flagEl = inner.querySelector('.flag-icon');
                if (flagEl) flagEl.classList.add('flag-icon-pop');
            }
        }
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

    // Trong lúc tutorial, chỉ cho tự chạy tới ô Ở XA nếu ô đó ĐÃ MỞ (luôn an toàn,
    // không phá logic hướng dẫn) hoặc đúng là ô mục tiêu của 1 bước 'move' đang
    // hướng dẫn — không cho tự chạy vào ô mục tiêu của bước 'click'/'flag' (đó là
    // ô nguy hiểm đang MINH HOẠ, chưa tới lúc bước vào).
    if (tutorialActive) {
        const step = TUTORIAL_STEPS[tutorialStep];
        const isGuidedMoveTarget = step.action === 'move' && step.target &&
            step.target.r === r && step.target.c === c;
        if (!grid[r][c].revealed && !isGuidedMoveTarget) return;
    }

    if (grid[r][c].revealed) {
        // Chạm vào 1 ô ĐÃ MỞ ở xa -> mèo tự tìm đường và chạy 1 mạch qua các ô đã
        // biết, đỡ phải bấm từng bước khi bàn cờ lớn.
        const path = findPathThroughRevealed(playerPos.r, playerPos.c, r, c);
        if (!path || !path.length) return;
        isWalking = true;
        walkPath(path, 0, levelGeneration);
        return;
    }

    // Chạm vào 1 ô CHƯA MỞ ở xa -> mèo tự đi tới 1 ô KỀ nó (chỉ qua vùng đã biết,
    // không "nhảy cóc" xuyên vùng ẩn) rồi bước nốt bước cuối để mở luôn — gộp 2
    // thao tác "đi lại gần" + "bấm mở" thành 1 lần chạm cho đỡ phải làm 2 bước.
    if (grid[r][c].flagged) return; // đang cắm cờ thì để handleMoveInput tự báo khi bước tới
    const approachPath = findPathToAdjacentRevealed(playerPos.r, playerPos.c, r, c);
    if (!approachPath) return;
    isWalking = true;
    walkPath(approachPath.concat([{ r, c }]), 0, levelGeneration);
}

// Tìm đường ngắn nhất (chỉ qua ô đã revealed) từ (fromR,fromC) tới 1 trong 4 ô
// KỀ (toR,toC) — dùng để "đi tới sát" 1 ô chưa mở trước khi bước bước cuối vào nó.
function findPathToAdjacentRevealed(fromR, fromC, toR, toC) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let best = null;
    for (const [dr, dc] of dirs) {
        const nr = toR + dr, nc = toC + dc;
        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
        if (!grid[nr][nc].revealed) continue;
        const path = findPathThroughRevealed(fromR, fromC, nr, nc);
        if (path && (!best || path.length < best.length)) best = path;
    }
    return best;
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
        // tác (tap/phím/Undo/Hint) sẽ bị treo im re mãi vì isWalking kẹt ở true.
        isWalking = false;
        throw e;
    }
    if (isGameOver) { isWalking = false; return; } // vừa dính bẫy/tới cá giữa đường -> dừng
    setTimeout(() => walkPath(path, idx + 1, myGeneration), WALK_STEP_MS);
}

// Giữ ngón tay trên 1 ô ẩn để cắm/gỡ cờ (mobile), hoặc chuột phải (desktop) —
// thay cho nút bật/tắt "chế độ đánh dấu" riêng, chỉ còn đúng 1 thao tác duy nhất.
const LONG_PRESS_MS = 420;
// Buông tay TRƯỚC mốc này -> chắc chắn là 1 cú CHẠM nhanh, cho đi/mở ô bình thường.
// Buông tay SAU mốc này nhưng CHƯA đủ LONG_PRESS_MS -> rơi vào "vùng mập mờ": người
// chơi nhiều khả năng đang cố GIỮ để cắm cờ nhưng buông hụt tay 1 chút, không phải
// đang cố tap nhanh (tap thật thường rất ngắn, dưới mốc này). Coi khoảng này là cắm
// cờ HỤT -> HUỶ LUÔN, không đi/mở ô, vì đi nhầm trúng bẫy nặng hơn nhiều so với việc
// phải bấm lại. Không tự động cắm cờ luôn ở đây vì vẫn chưa đủ chắc chắn ý định.
const TAP_MAX_MS = 180;
const LONG_PRESS_MOVE_TOLERANCE = 12;
let longPressTimer = null;
let longPressFired = false;
let pressStartX = 0, pressStartY = 0;
let pressStartTime = 0;

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
        pressStartTime = Date.now();
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
            return;
        }
        // Giữ lâu hơn 1 cú tap thật nhưng chưa đủ để cắm cờ (xem TAP_MAX_MS ở trên)
        // -> huỷ luôn, không cho 'click' chạy tiếp (không đi/mở ô).
        if (Date.now() - pressStartTime > TAP_MAX_MS) e.preventDefault();
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
        updateStatus(t('status_flagged_blocked'), '#ff5964');
        return;
    }

    if (targetCell.type === 'E' && !allColorsFound()) {
        updateStatus(t('status_need_color'), '#ff5964');
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

    hideStartSafeHint(); // mèo vừa bước đi thật -> gợi ý "cạnh Start an toàn" hết cần thiết nữa
    playSound('jump');
    catIsMoving = true; // phải bật TRƯỚC render() để vòng lặp vẽ ô kịp ẩn "Soi Quanh" ngay
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

// Cơ chế "tìm màu cho mèo": 1-2 ô an toàn trong màn giấu sẵn màu (cell.hasColor /
// cell.hasColor2), hiện ra ngay khi ô đó được mở (dù mở trực tiếp hay bị loang
// trúng) — không cần đoán mò thêm. Chưa tìm đủ màu cần thì chưa được bước vào ô
// cá (xem handleMoveInput). Màn chỉ có 1 màu -> mèo nhuộm TOÀN THÂN (như cũ);
// màn có ĐỦ 2 màu -> mèo nhuộm NỬA THÂN mỗi màu (xem onColorFound()).
function checkColorPickup(r, c, cell) {
    if (cell.hasColor && !foundColor1) {
        foundColor1 = true;
        onColorFound(r, c, 1);
    }
    if (cell.hasColor2 && !foundColor2) {
        foundColor2 = true;
        onColorFound(r, c, 2);
    }
}

function onColorFound(r, c, which) {
    playSound('color');
    const dual = levelNeedsColor1 && levelNeedsColor2;
    if (catEl) {
        if (dual) {
            catEl.classList.add('cat-split-colored', which === 1 ? 'cat-found-color1' : 'cat-found-color2');
        } else {
            catEl.classList.add('cat-colored');
        }
    }
    updateStatus(
        dual
            ? (allColorsFound()
                ? t('status_color_dual_found_all')
                : t('status_color_dual_found_half'))
            : t('status_color_found_single'),
        '#8ac926');
    const cellEl = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (cellEl) {
        const rect = cellEl.getBoundingClientRect();
        addColorSparkleParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
}

function addColorSparkleParticles(x, y) {
    for (let i = 0; i < 14; i++) {
        const p = new Particle(x, y, 'confetti');
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 3;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 2;
        p.gravity = 0.2;
        p.friction = 0.96;
        p.size = Math.random() * 6 + 5;
        particles.push(p);
    }
    if (!fxAnimating) {
        fxAnimating = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animateFX();
    }
}

function revealAndMove(r, c) {
    playerPos = { r, c };
    const cell = grid[r][c];
    const wasHidden = !cell.revealed;
    cell.revealed = true;
    cell.flagged = false;
    if (wasHidden) pendingReveals.push({ r, c });
    checkColorPickup(r, c, cell);

    if (hintTargetCell && hintTargetCell.r === r && hintTargetCell.c === c) clearHint();

    if (cell.type === 'B') {
        if (cell.defused) return; // đã hồi sinh qua đúng ô này rồi -> giờ an toàn, đi xuyên qua bình thường

        playSound('boom');
        updateStatus(t('status_boom'), '#ff5964');
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
                    cls: 'btn-blue', label: t('action_revive_coins', { cost: REVIVE_COST }), onClick: (btn) => {
                        if (myGeneration !== levelGeneration) return;
                        if (coins < REVIVE_COST) {
                            btn.innerText = t('action_no_coins');
                            return;
                        }
                        coins -= REVIVE_COST;
                        saveCoins();
                        updateCoinDisplay();
                        performRevive(r, c);
                    }
                });
                actions.push({
                    cls: 'btn-green', label: t('action_revive_ad'), onClick: (btn) => {
                        if (myGeneration !== levelGeneration) return;
                        watchAdForRevive(r, c, myGeneration, btn);
                    }
                });
            }
            actions.push({ cls: 'btn-pink', label: t('action_retry'), onClick: () => loadLevel(currentLevelIdx) });

            showResultModal({
                type: 'lose',
                icon: '💥',
                title: t('lose_title'),
                message: usedReviveThisLevel
                    ? t('lose_message_used_revive')
                    : t('lose_message_no_revive'),
                actions
            });
        }, 650);
        return;
    }

    if (cell.type === 'E') {
        const myGeneration = levelGeneration;
        // Nhạc chiến thắng (victory.mp3) KHÔNG phát ngay ở đây — dời vào lúc ô đầu
        // tiên bắt đầu nổ trong celebrateWinReveal(), để không bị "sớm" so với hiệu ứng.
        playSound('eat'); // tiếng cắn cá ngay lúc này, phân biệt với nhạc chiến thắng phát sau
        updateStatus(t('status_win'), '#2a9d8f');
        isGameOver = true;
        catEl.classList.add('expr-happy');

        markLevelCompleted(currentLevelIdx);
        clearLevelProgress(); // vừa qua màn -> không còn "chơi dở" nữa, dọn sạch tránh khôi phục nhầm màn đã xong

        const hasNextLevel = currentLevelIdx < LEVELS.length - 1;

        setTimeout(() => {
            if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa chừng
            const cellEl = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cellEl) {
                const rect = cellEl.getBoundingClientRect();
                triggerWinFX(rect.left + rect.width / 2, rect.top + rect.height / 2);
                cellEl.classList.add('fish-cell-bump'); // ô cá lồi lên/xuống 1 nhịp ngay lúc mèo vừa ăn được cá
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
                    cls: 'btn-blue', label: t('action_double_gold'), onClick: (btn) => {
                        if (doubled || myGeneration !== levelGeneration) return;
                        btn.disabled = true;
                        btn.innerText = t('action_loading_ad');
                        showRewardedAd(
                            () => {
                                if (myGeneration !== levelGeneration) return; // đã Replay/đổi màn giữa lúc xem quảng cáo
                                doubled = true;
                                awardCoins(reward);
                                document.getElementById('modal-coin-amount').textContent = reward * 2;
                                btn.innerText = t('action_double_gold_done');
                            },
                            () => {
                                btn.disabled = false;
                                btn.innerText = t('action_no_ad_retry');
                            }
                        );
                    }
                });
                if (hasNextLevel) {
                    actions.push({ cls: 'btn-green', label: t('action_next_level'), onClick: () => nextLevel() });
                } else {
                    // Màn cuối cùng, không còn "Màn Tiếp" -> vẫn cần 1 lối ra khỏi popup
                    // (result-modal không có nút đóng/tap-ra-ngoài riêng).
                    actions.push({ cls: 'btn-green', label: t('action_go_home'), onClick: () => goHome() });
                }

                showResultModal({
                    type: 'win',
                    icon: hasNextLevel ? '😻' : '🏆',
                    title: hasNextLevel ? t('win_title_next') : t('win_title_last'),
                    message: hasNextLevel
                        ? t('win_message_next')
                        : t('win_message_last'),
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
                checkColorPickup(nr, nc, n);
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

// Trước đây là booster "Đi Lại" (undo bước vừa đi) — bỏ vì lệch logic: nếu người
// chơi vừa GIẪM TRÚNG bẫy thì isGameOver đã true, undo() bị chặn ngay dòng đầu,
// không cứu được gì cả (chỉ hữu ích lúc còn sống, tự lùi 1 bước AN TOÀN, không
// liên quan gì tới việc vừa thua) — dễ gây hiểu lầm là "undo được cả cái chết".
// Đổi hẳn thành booster MỞ NGẪU NHIÊN 1 BẪY còn ẩn trên bàn cờ (tháo ngòi luôn,
// giống ô bẫy sau khi hồi sinh — xem performRevive()) để né được thật, đúng vai
// trò 1 "cứu cánh" hữu ích. Giữ nguyên biến/khoá lưu trữ (undoCount, undo-badge,
// UNDO_COUNT_KEY, boosterShopType 'undo'...) để không phải migrate dữ liệu đã lưu.
// free = true: lượt dùng thử MIỄN PHÍ khi vừa mở khoá (xem processNextUnlockPopup()),
// không trừ vào số lượt undoCount đang có của người chơi.
function revealRandomBomb(free) {
    if (isGameOver || isWalking) return;
    if (tutorialActive) { nudgeTutorialGuide(); return; }
    if (!free && !bombUnlocked) {
        updateStatus(t('status_bomb_locked', { level: BOMB_UNLOCK_LEVEL_IDX + 1 }), '#ff5964');
        return;
    }
    if (!free && undoCount <= 0) { openBoosterShop('undo'); return; }

    const candidates = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = grid[r][c];
            if (cell.type === 'B' && !cell.revealed && !cell.flagged) candidates.push({ r, c });
        }
    }
    if (!candidates.length) {
        updateStatus(t('status_bomb_none_left'), '#2a9d8f');
        return;
    }

    if (!free) {
        undoCount--;
        saveBoosterCounts();
        updateBoosterBadges();
    }

    const { r, c } = candidates[Math.floor(Math.random() * candidates.length)];
    grid[r][c].revealed = true;
    grid[r][c].defused = true; // tháo ngòi luôn -> mèo đi ngang qua vẫn an toàn, không chỉ để "biết vị trí"
    pendingReveals.push({ r, c });
    updateStatus(t('status_bomb_revealed'), '#ff5964');
    render();
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

// Nhập số trực tiếp thay vì chọn dropdown — dropdown liệt kê hết mọi level sẽ rất
// khó lướt khi lên tới 100-200 level. Chỉ cần ghim max = tổng số level hiện có +
// điền sẵn level đang chơi, còn lại người dùng tự gõ số.
function syncCheatLevelInput() {
    const input = document.getElementById('cheat-level-input');
    if (!input) return;
    input.max = LEVELS.length;
    input.value = currentLevelIdx + 1;
}

// Dò lại levels/levelNN.json ngay trong lúc game đang chạy (không cần tải lại trang) —
// tiện lúc đang test mà vừa thêm file level mới vào thư mục levels/.
async function cheatRefreshLevels(btn) {
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '⏳ Đang dò...';
    await loadLevels();
    syncCheatLevelInput();
    renderHomeScreen();
    btn.innerText = `✅ Tìm thấy ${LEVELS.length} level!`;
    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    }, 1500);
}

// Mốc thời gian vừa mở cheat menu — chặn tap-ra-ngoài-để-đóng trong 1 khoảng ngắn
// ngay sau đó (xem CHEAT_MENU_CLOSE_GUARD_MS bên dưới), vì mở menu này cần bấm
// LIÊN TIẾP 7 lần rất nhanh vào đúng 1 điểm trên màn hình -> lỡ tay bấm dư thêm
// 1-2 cái sau lần thứ 7 (spam theo quán tính) sẽ rơi trúng ngay lớp nền cheat-modal
// vừa hiện ra tại đúng vị trí đó, đóng menu lại ngay lập tức, phải mở lại từ đầu.
let cheatMenuOpenedAt = 0;
const CHEAT_MENU_CLOSE_GUARD_MS = 500;

function openCheatMenu() {
    syncCheatLevelInput();
    document.getElementById('cheat-toggle-traps-btn').innerText = cheatShowTraps ? '👁️ Hiện Bẫy: BẬT' : '👁️ Hiện Bẫy: TẮT';
    document.getElementById('cheat-modal').classList.add('show');
    cheatMenuOpenedAt = Date.now();
}

function hideCheatMenu() {
    document.getElementById('cheat-modal').classList.remove('show');
}

document.getElementById('cheat-modal').addEventListener('click', (e) => {
    if (e.target.id !== 'cheat-modal') return;
    if (Date.now() - cheatMenuOpenedAt < CHEAT_MENU_CLOSE_GUARD_MS) return; // vẫn còn tap dư từ lúc spam mở menu, bỏ qua
    hideCheatMenu();
});

function cheatGoToLevel() {
    const input = document.getElementById('cheat-level-input');
    const idx = parseInt(input.value, 10) - 1; // input là số level 1-based (Level 1, 2, 3...), grid/mảng LEVELS dùng idx 0-based
    if (!LEVELS.length || isNaN(idx) || idx < 0 || idx >= LEVELS.length) return;
    // Cheat nhảy tới level nào thì ĐẶT LẠI HOÀN TOÀN tiến trình cho khớp đúng level
    // đó: 0..idx-1 coi như đã qua, từ idx trở đi CHƯA qua — để quay về Home thấy
    // đúng level vừa nhảy tới. Phải xoá sạch rồi gán lại từ đầu (không chỉ .add()
    // thêm) — nếu không, nhảy LÙI về level nhỏ hơn sẽ không "reset" được: các level
    // lớn hơn từng cheat-test/qua trước đó vẫn còn nằm trong completedLevels (set
    // này chỉ cộng dồn, không tự xoá), khiến Home vẫn hiện level cũ lớn hơn.
    completedLevels = new Set();
    for (let i = 0; i < idx; i++) completedLevels.add(i);
    saveProgress();
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

// Mọi nút UI bấm được (nút thường, icon tròn, nút đóng popup, khối chọn level)
// — dùng chung cho cả 2 cơ chế bên dưới: hiệu ứng lõm khi giữ tay, VÀ độ trễ
// trước khi hành động thật sự chạy.
const PRESSABLE_SELECTOR = '.btn-piffle, .modal-close-btn, .icon-btn, .home-level-display';

// Hiệu ứng "lõm xuống" khi bấm nút — không chỉ dựa vào :active CSS thuần (không
// đáng tin cậy trên vài WebView Android, nhất là nút vừa hiện trong popup) mà tự
// toggle class .btn-pressed song song, y hệt bài học từ .pressing của ô bàn cờ
// (attachCellPressHandlers()). Gắn trên document (event delegation) nên tự động
// bắt luôn cả nút tạo động trong popup thắng/thua (showResultModal()).
function attachButtonPressFeedback() {
    // Thiết bị cảm ứng vẫn tự phát sinh thêm 'mousedown' ngay sau 'touchstart' cho
    // CÙNG 1 lần chạm -> nếu không chặn, mọi hiệu ứng/âm thanh trong press() chạy
    // 2 LẦN mỗi cú bấm trên Android WebView. Ghi lại mốc touchstart gần nhất, bỏ
    // qua mousedown nào tới ngay sau đó (khoảng cách quá ngắn để là chuột thật).
    let lastTouchTime = 0;
    const press = (e) => {
        if (e.type === 'touchstart') lastTouchTime = Date.now();
        else if (e.type === 'mousedown' && Date.now() - lastTouchTime < 800) return;
        const btn = e.target.closest(PRESSABLE_SELECTOR);
        if (!btn || btn.disabled) return;
        btn.classList.add('btn-pressed');
        playSound('click');
    };
    const release = () => {
        document.querySelectorAll('.btn-pressed').forEach(b => {
            // #neighbor-highlight-btn (Soi Quanh) lõm xuống thường trực khi BẬT (.active,
            // xem style.css) — y hệt dáng .btn-pressed lúc đang giữ. Nếu vừa bấm để BẬT
            // (chưa .active), thả tay ra bình thường sẽ nảy lên rồi 150ms sau (khi
            // attachButtonClickDelay() phát lại click, xem bên dưới) mới lõm lại theo
            // .active -> nhìn giật cục "lõm - nảy lên - lõm lại". Giữ nguyên .btn-pressed
            // trong lúc chờ (không nảy lên) để tránh cú nảy thừa đó; lúc bấm để TẮT thì
            // vẫn nảy lên bình thường vì đó đúng là hướng chuyển động cuối cùng.
            if (b.id === 'neighbor-highlight-btn' && !b.classList.contains('active')) return;
            b.classList.remove('btn-pressed');
        });
    };
    document.addEventListener('touchstart', press, { passive: true });
    document.addEventListener('touchend', release, { passive: true });
    document.addEventListener('touchcancel', release, { passive: true });
    document.addEventListener('mousedown', press);
    document.addEventListener('mouseup', release);
}

// Chặn CHUNG mọi cú bấm nút UI, đợi đúng bằng thời lượng hiệu ứng lõm-rồi-nổi-lên
// (CLICK_DELAY_MS, khớp transition 0.1s của .btn-piffle + chút dư) rồi mới thật
// sự cho hành động (onclick) chạy — để người chơi luôn kịp THẤY nút trở về trạng
// thái ban đầu trước khi màn hình/trạng thái đổi theo, thay vì bị cắt cụt hiệu
// ứng như khi hành động chạy ngay lập tức. Dùng capturing phase để chặn được
// TRƯỚC khi sự kiện chạm tới onclick của chính phần tử, rồi "phát lại" đúng 1
// lần bằng .click() sau khi hết giờ — cờ trong `replaying` để lần phát lại đó
// không bị chính cơ chế này chặn tiếp (không thì lặp vô hạn).
const CLICK_DELAY_MS = 150;
const replayingClicks = new WeakSet();

function attachButtonClickDelay() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest(PRESSABLE_SELECTOR);
        if (!btn || btn.disabled) return;
        if (replayingClicks.has(btn)) { replayingClicks.delete(btn); return; } // lần phát lại -> cho qua bình thường

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setTimeout(() => {
            replayingClicks.add(btn);
            btn.click();
        }, CLICK_DELAY_MS);
    }, true); // true = capturing phase, chặn trước khi tới onclick của phần tử
}

(async () => {
    loadDarkMode(); // áp trước tiên, tránh nháy nền sáng rồi mới tối lại
    loadLang();
    applyLocale(); // áp ngay cả trước khi vào Home, để màn Loading cũng hiện đúng ngôn ngữ
    showScreen('loading');
    await loadLevels();
    loadCoins();
    loadBoosterCounts();
    loadBoosterUnlockState();
    loadProgress();
    renderHomeScreen();
    showScreen('home');
    maybeShowTutorialOnFirstVisit();
    attachCheatMenuTrigger();
    attachButtonPressFeedback();
    attachButtonClickDelay();
    initAds(); // không await — banner load nền, không được làm chậm màn Home
})();
  