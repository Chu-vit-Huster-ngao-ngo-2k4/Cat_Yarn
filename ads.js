// =============================================================================
// QUẢNG CÁO — hỗ trợ 2 nền tảng, TỰ NHẬN DIỆN đang chạy ở đâu, không cần script.js
// biết đang chạy nền tảng nào (chỉ gọi initAds()/showRewardedAd()/notify*() chung):
//   1) ADMOB (app Android đóng gói qua Capacitor) — banner đáy màn hình thật +
//      rewarded ad cho hồi sinh/x2 vàng/mua booster.
//   2) CRAZYGAMES SDK (game chạy trong iframe trên crazygames.com, xem thẻ
//      <script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"> trong
//      <head>) — rewarded/midgame ad qua CG.ad.requestAd(), banner/quảng cáo bao
//      quanh trang do chính CrazyGames tự lo (không cần code gì thêm), cộng thêm
//      vài API "vòng đời" (loading/gameplay start-stop, happytime) SDK yêu cầu
//      gọi để họ biết lúc nào game đang tải/đang chơi/vừa có khoảnh khắc đáng ăn
//      mừng — AdMob không có khái niệm tương đương nên các hàm notify*() dưới
//      đây chỉ thật sự làm gì đó khi đang chạy trên CrazyGames.
// Mở bằng trình duyệt thường (dev/test) hoặc domain khác thì mọi hàm ở đây im
// lặng bỏ qua hết — không có quảng cáo, không lỗi gì, không được làm hỏng game.
// =============================================================================

// ----- AdMob (Android/Capacitor) -----
// LƯU Ý: tài khoản/app AdMob mới thường cần Google duyệt trong ~24-48h mới đổ
// quảng cáo đều — vài ngày đầu có thể thấy "không có quảng cáo" (onFail), là
// bình thường, không phải lỗi code. TUYỆT ĐỐI không tự bấm/xem đi xem lại quảng
// cáo THẬT của chính mình nhiều lần để test — AdMob tính đó là click gian lận
// (invalid traffic), nhẹ thì mất tiền quảng cáo đó, nặng có thể khoá cả tài
// khoản. Muốn test thoải mái mà không sợ gì, đăng ký thiết bị của bạn làm
// "Test device" trong mục AdMob > Cài đặt hoặc thêm ID thiết bị vào mảng
// testingDevices bên dưới (ID thiết bị sẽ hiện trong log Logcat khi initialize
// chạy, dạng "Use RequestConfiguration.Builder.setTestDeviceIds(...)").
const ADMOB_APP_ID = 'ca-app-pub-6122741747538850~4725876316';
const ADMOB_BANNER_ID = 'ca-app-pub-6122741747538850/4805767362';
const ADMOB_REWARDED_ID = 'ca-app-pub-6122741747538850/5698232548';
const ADS_ARE_TEST = false;
const AD_TEST_DEVICE_IDS = []; // dán ID thiết bị vào đây (xem log Logcat) để test an toàn với ID thật

function getAdMob() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
}

// ----- CrazyGames SDK (web) -----
// Chỉ thật sự "sống" khi getEnvironment() === 'crazygames'. Ở domain khác
// ('disabled') SDK ném lỗi khi gọi API — nên MỌI lời gọi CG.* ở file này đều bọc
// try/catch, không tin tưởng môi trường theo kiểu chỉ check "tồn tại object".
function getCrazyGamesSDK() {
    return window.CrazyGames && window.CrazyGames.SDK;
}

let rewardedAdBusy = false;

// Gọi 1 lần lúc khởi động app — bật SDK quảng cáo + hiện banner đáy màn hình
// (chỉ AdMob cần, CrazyGames tự có banner bao quanh trang của họ rồi).
async function initAds() {
    const AdMob = getAdMob();
    if (!AdMob) return;
    try {
        await AdMob.initialize({
            initializeForTesting: ADS_ARE_TEST,
            testingDevices: AD_TEST_DEVICE_IDS
        });
        await AdMob.showBanner({
            adId: ADMOB_BANNER_ID,
            adSize: 'ADAPTIVE_BANNER',
            position: 'BOTTOM_CENTER',
            isTesting: ADS_ARE_TEST
        });
    } catch (e) {
        // Không có mạng / chưa cấu hình xong AdMob thật -> im lặng bỏ qua, không
        // được để lỗi quảng cáo làm hỏng trải nghiệm chơi game.
    }
}

// Xem quảng cáo có thưởng — dùng chung cho hồi sinh / x2 vàng / mua booster.
// onReward() CHỈ chạy khi xem xong thật sự. onFail() chạy khi không có quảng
// cáo / xem giữa chừng bỏ ngang / thiết bị không hỗ trợ / không nền tảng nào có sẵn.
async function showRewardedAd(onReward, onFail) {
    const AdMob = getAdMob();
    if (AdMob) {
        if (rewardedAdBusy) { if (onFail) onFail(); return; }
        rewardedAdBusy = true;
        try {
            await AdMob.prepareRewardVideoAd({ adId: ADMOB_REWARDED_ID, isTesting: ADS_ARE_TEST });
            await AdMob.showRewardVideoAd();
            onReward();
        } catch (e) {
            if (onFail) onFail();
        } finally {
            rewardedAdBusy = false;
        }
        return;
    }

    const CG = getCrazyGamesSDK();
    if (CG && !rewardedAdBusy) {
        rewardedAdBusy = true;
        requestCrazyGamesAd(CG, 'rewarded', onReward, onFail);
        return;
    }

    if (onFail) onFail();
}

// Quảng cáo "midgame" — KHÔNG có thưởng, chèn vào đúng lúc nghỉ tự nhiên (qua
// màn) — chỉ CrazyGames mới gọi tới hàm này (xem markLevelCompleted() trong
// script.js), AdMob không dùng loại quảng cáo này trong game.
function showMidgameAd() {
    const CG = getCrazyGamesSDK();
    if (!CG || rewardedAdBusy) return; // dùng chung cờ bận với rewarded, tránh chồng 2 quảng cáo cùng lúc
    rewardedAdBusy = true;
    requestCrazyGamesAd(CG, 'midgame', () => {}, () => {});
}

// Dùng chung cho cả rewarded/midgame — tắt tiếng game lúc quảng cáo chạy (yêu
// cầu bắt buộc của CrazyGames), tạm dừng "gameplay" (SDK dùng để biết lúc nào
// cần tiết kiệm tài nguyên), rồi khôi phục lại đúng như cũ khi xong/lỗi.
function requestCrazyGamesAd(CG, adType, onReward, onFail) {
    try { CG.game.gameplayStop(); } catch (e) { /* bỏ qua nếu SDK chưa sẵn sàng */ }
    const setMute = (active) => { if (typeof setAdMuteActive === 'function') setAdMuteActive(active); };
    const finishUp = () => {
        rewardedAdBusy = false;
        setMute(false);
        try { CG.game.gameplayStart(); } catch (e) { /* bỏ qua */ }
    };
    try {
        CG.ad.requestAd(adType, {
            adStarted: () => setMute(true),
            adFinished: () => { finishUp(); onReward(); },
            adError: () => { finishUp(); if (onFail) onFail(); }
        });
    } catch (e) {
        finishUp();
        if (onFail) onFail();
    }
}

// ----- API "vòng đời" game mà CrazyGames SDK yêu cầu gọi (AdMob không có khái
// niệm tương đương nên các hàm này chỉ thật sự làm gì đó trên CrazyGames) -----
function notifyLoadingStart() {
    const CG = getCrazyGamesSDK();
    if (CG) try { CG.game.sdkGameLoadingStart(); } catch (e) { /* bỏ qua */ }
}

function notifyLoadingStop() {
    const CG = getCrazyGamesSDK();
    if (CG) try { CG.game.sdkGameLoadingStop(); } catch (e) { /* bỏ qua */ }
}

function notifyGameplayStart() {
    const CG = getCrazyGamesSDK();
    if (CG) try { CG.game.gameplayStart(); } catch (e) { /* bỏ qua */ }
}

function notifyGameplayStop() {
    const CG = getCrazyGamesSDK();
    if (CG) try { CG.game.gameplayStop(); } catch (e) { /* bỏ qua */ }
}

// Khoảnh khắc "đáng ăn mừng" — theo tài liệu CrazyGames chỉ nên gọi HIẾM, giữ nó
// đặc biệt (không phải cứ qua màn là gọi) -> hiện chỉ gọi lúc chơi hết TOÀN BỘ
// level hiện có (xem markLevelCompleted() trong script.js).
function notifyHappyMoment() {
    const CG = getCrazyGamesSDK();
    if (CG) try { CG.game.happytime(); } catch (e) { /* bỏ qua */ }
}
