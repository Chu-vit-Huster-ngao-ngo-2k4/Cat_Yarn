// =============================================================================
// ADMOB — banner ở đáy màn hình thật + rewarded ad cho hồi sinh / x2 vàng / mua
// thêm booster. ĐANG DÙNG ID THẬT của tài khoản AdMob của bạn (app "Cat's Yarn").
//
// LƯU Ý: tài khoản/app AdMob mới thường cần Google duyệt trong ~24-48h mới đổ
// quảng cáo đều — vài ngày đầu có thể thấy "không có quảng cáo" (onFail), là
// bình thường, không phải lỗi code. TUYỆT ĐỐI không tự bấm/xem đi xem lại quảng
// cáo THẬT của chính mình nhiều lần để test — AdMob tính đó là click gian lận
// (invalid traffic), nhẹ thì mất tiền quảng cáo đó, nặng có thể khoá cả tài
// khoản. Muốn test thoải mái mà không sợ gì, đăng ký thiết bị của bạn làm
// "Test device" trong mục AdMob > Cài đặt hoặc thêm ID thiết bị vào mảng
// testingDevices bên dưới (ID thiết bị sẽ hiện trong log Logcat khi initialize
// chạy, dạng "Use RequestConfiguration.Builder.setTestDeviceIds(...)").
// =============================================================================
const ADMOB_APP_ID = 'ca-app-pub-6122741747538850~4725876316';
const ADMOB_BANNER_ID = 'ca-app-pub-6122741747538850/4805767362';
const ADMOB_REWARDED_ID = 'ca-app-pub-6122741747538850/5698232548';
const ADS_ARE_TEST = false;
const AD_TEST_DEVICE_IDS = []; // dán ID thiết bị vào đây (xem log Logcat) để test an toàn với ID thật

function getAdMob() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
}

// Gọi 1 lần lúc khởi động app — bật SDK quảng cáo + hiện banner đáy màn hình.
// Chạy ngoài app native (mở file HTML bằng trình duyệt thường) thì bỏ qua êm,
// không có quảng cáo, không lỗi gì cả.
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

let rewardedAdBusy = false;

// Xem quảng cáo có thưởng — dùng chung cho hồi sinh / x2 vàng / mua booster.
// onReward() CHỈ chạy khi xem xong thật sự (AdMob xác nhận). onFail() chạy khi
// không có quảng cáo / xem giữa chừng bỏ ngang / thiết bị không hỗ trợ.
async function showRewardedAd(onReward, onFail) {
    const AdMob = getAdMob();
    if (!AdMob || rewardedAdBusy) { if (onFail) onFail(); return; }
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
}
