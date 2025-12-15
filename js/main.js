/**
 * 時計と日付の表示更新
 */
class ClockDate {
    /**
     * @param {HTMLElement} clockEl
     * @param {HTMLElement} dateEl
     */
    constructor(clockEl, dateEl) {
        this.clockEl = clockEl;
        this.dateEl = dateEl;
        this.update();
        setInterval(() => this.update(), 500);
    }

    update() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const day = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
        this.dateEl.textContent = `${m}月${d}日(${day})`;
        this.clockEl.textContent = `${hh}:${mm}`;
    }

    onFiveMinuteInterval(callback) {
        this.element = document.createElement('div');
        setInterval(() => {
            const now = new Date();
            if (now.getMinutes() % 5 === 0 && now.getSeconds() === 0) {
                this.triggerCustomEvent('fiveMinuteInterval', { time: now });
            }
        }, 1000);
        this.element.addEventListener('fiveMinuteInterval', (e) => {
            callback(e.detail);
        });
    }

    triggerCustomEvent(eventName, data) {
        // CustomEventコンストラクタでイベントを生成
        const customEvent = new CustomEvent(eventName, {
            bubbles: true, // trueにすると親要素にイベントが伝播（バブリング）する
            cancelable: true, // trueにするとpreventDefault()でキャンセル可能になる
            detail: data, // イベントと一緒にデータを渡す
        });
        // イベントを発火
        this.element.dispatchEvent(customEvent);
        console.log(`イベント '${eventName}' を発火しました。データ:`, data);
    }
}

/**
 * UI自動非表示管理
 */
class UIAutoHide {
    /**
     * @param {HTMLElement} controlPanel
     * @param {HTMLElement} modeLabel
     * @param {number} timeout
     */
    constructor(controlPanel, modeLabel, timeout = 3000) {
        this.controlPanel = controlPanel;
        this.modeLabel = modeLabel;
        this.timeout = timeout;
        this.uiTimer = null;
        this.isAdjusting = false;
        ['pointerdown', 'touchstart'].forEach((evt) => {
            document.addEventListener(evt, () => this.showUI(), { passive: true });
        });
    }

    showUI() {
        console.log(this.isAdjusting);

        if (this.isAdjusting) return;

        this.controlPanel.style.opacity = '1';
        this.controlPanel.style.pointerEvents = 'auto';
        this.modeLabel.style.opacity = '1';
        this.resetUITimer();
    }

    hideUI() {
        this.controlPanel.style.opacity = '0';
        this.controlPanel.style.pointerEvents = 'none';
        this.modeLabel.style.opacity = '0';
    }

    resetUITimer() {
        clearTimeout(this.uiTimer);
        this.uiTimer = setTimeout(() => {
            if (!this.isAdjusting) this.hideUI();
        }, this.timeout);
    }
}

/**
 * モード管理
 */
class ModeManager {
    /**
     * @param {UIAutoHide} uiAutoHide
     */
    constructor(uiAutoHide) {
        this.uiAutoHide = uiAutoHide;

        this.mode = 'clock'; // clock | bg
        this.modeLabel = document.getElementById('modeLabel');

        // <button id="toggleMode">背景</button>
        this.togleModeButton = document.getElementById('toggleMode');
        this.togleModeButton.onclick = () => {
            this.mode = this.mode === 'clock' ? 'bg' : 'clock';
            this.modeLabel.textContent = this.mode === 'clock' ? '時計調整' : '背景調整';
            this.togleModeButton.textContent = this.mode === 'clock' ? '背景' : '時計';
            this.uiAutoHide.showUI();
        };
    }
}

/**
 * 背景画像管理
 */
class BackgroundImage {
    /**
     * @param {HTMLInputElement} bgInput
     * @param {HTMLElement} bgLayer
     */
    constructor(bgInput, bgLayer) {
        this.bgInput = bgInput;
        this.bgLayer = bgLayer;
        this.bgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            this.bgLayer.style.backgroundImage = `url('${url}')`;
        });
    }
}

/**
 * ドラッグ + ピンチ処理
 */
class TransformController {
    /**
     * @param {HTMLElement} target
     * @param {string} storageKey
     * @param {ModeManager} modeManager
     * @param {UIAutoHide} uiAutoHide
     */
    constructor(target, storageKey, modeManager, uiAutoHide) {
        this.target = target;
        this.storageKey = storageKey;
        this.modeManager = modeManager;
        this.uiAutoHide = uiAutoHide;
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.pointers = new Map();
        this.lastDistance = null;

        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const d = JSON.parse(saved);
                this.x = d.x ?? 0;
                this.y = d.y ?? 0;
                this.scale = d.scale ?? 1;
            } catch (_) {}
        }
        this.apply();

        this.target.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.target.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.target.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.target.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }
    apply() {
        this.target.style.setProperty('--x', `${this.x}px`);
        this.target.style.setProperty('--y', `${this.y}px`);
        this.target.style.setProperty('--scale', this.scale);
    }
    onPointerDown(e) {
        if ((this.modeManager.mode === 'clock' && this.target !== clockContainer) || (this.modeManager.mode === 'bg' && this.target !== bgLayer)) return;
        this.uiAutoHide.isAdjusting = true;
        this.uiAutoHide.hideUI();
        this.target.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    onPointerMove(e) {
        if (!this.pointers.has(e.pointerId)) return;
        const prev = this.pointers.get(e.pointerId);
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size === 1) {
            this.x += dx;
            this.y += dy;
        } else if (this.pointers.size === 2) {
            const pts = Array.from(this.pointers.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (this.lastDistance !== null) {
                this.scale *= dist / this.lastDistance;
                this.scale = Math.min(Math.max(this.scale, 0.2), 6);
            }
            this.lastDistance = dist;
        }
        this.apply();
    }
    onPointerUp(e) {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) this.lastDistance = null;
        localStorage.setItem(this.storageKey, JSON.stringify({ x: this.x, y: this.y, scale: this.scale }));
        if (this.pointers.size === 0) {
            this.uiAutoHide.isAdjusting = false;
            this.uiAutoHide.showUI();
            this.uiAutoHide.resetUITimer();
        }
    }
}

/**
 * ダブルタップで全画面切替
 */
class FullscreenController {
    constructor() {
        this.lastTap = 0;
        this.touchCount = 0;
        document.addEventListener('touchstart', (e) => {
            this.touchCount = e.touches.length;
        });

        document.addEventListener('touchend', () => {
            if (this.touchCount > 1) {
                this.lastTap = 0;
                return;
            }
            const now = Date.now();
            if (now - this.lastTap < 300) {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
                this.lastTap = 0;
            } else {
                this.lastTap = now;
            }
        });
    }
}

/**
 * 天気情報管理
 */
class WeatherManager {
    constructor() {
        this.lat = null;
        this.lon = null;
        this.temperature = null;
        this.resJson = null;
    }

    async init() {
        try {
            const position = await this.getCurrentPosition();
            this.ongetCurrentPositionSuccess(position);
            this.updateWeather();
        } catch (error) {
            console.error('位置情報の取得に失敗しました:', error.message);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => reject(error)
            );
        });
    }

    ongetCurrentPositionSuccess(position) {
        this.lat = position.coords.latitude;
        this.lon = position.coords.longitude;
        console.log(`緯度: ${this.lat}, 経度: ${this.lon}`);
    }

    getWeatherAPIUrl() {
        return `https://api.open-meteo.com/v1/forecast?latitude=${this.lat}&longitude=${this.lon}&current=temperature_2m,weather_code&timezone=Asia%2FTokyo&forecast_days=1`;
    }

    async getWeatherData() {
        const res = await fetch(this.getWeatherAPIUrl());
        const json = await res.json();
        return json;
    }

    async updateWeather() {
        this.resJson = await this.getWeatherData();
        this.temperature = this.resJson.current.temperature_2m;
        document.getElementById('temperature').textContent = `${this.temperature.toFixed(1)}℃`;
    }
}

async function init() {
    // 時計と日付の初期化
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    const clockDate = new ClockDate(clockEl, dateEl);

    // UI自動非表示の初期化
    const uiAutoHide = new UIAutoHide(document.querySelector('.control-panel'), document.getElementById('modeLabel'));

    // モード管理の初期化
    const modeManager = new ModeManager(uiAutoHide);

    // 背景画像の初期化
    const bgInput = document.getElementById('bgInput');
    const bgLayer = document.getElementById('bgLayer');
    new BackgroundImage(bgInput, bgLayer);

    // ドラッグ + ピンチ処理の初期化
    const clockContainer = document.getElementById('clockContainer');
    new TransformController(clockContainer, 'clockTransform', modeManager, uiAutoHide);
    new TransformController(bgLayer, 'bgTransform', modeManager, uiAutoHide);

    // ダブルタップで全画面の初期化
    const fullscreenController = new FullscreenController();

    // 天気情報の初期化
    const weatherManager = new WeatherManager();
    await weatherManager.init();

    // 5分毎に天気情報更新
    clockDate.onFiveMinuteInterval(async () => {
        await weatherManager.updateWeather();
    });
}
window.onload = init;
