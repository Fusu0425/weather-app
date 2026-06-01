/* ============================================
 * 厦门天气小程序 — 主入口模块
 * ============================================ */

var App = (function() {

    var refreshTimer = null;
    var hintTimer = null;
    var nextRefresh = 0;
    var darkMode = false;
    var currentCity = DEFAULT_CITY.name;

    // ---- GPS 定位 ----
    function getLocation(callback) {
        if (!navigator.geolocation) {
            callback(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY.name);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function(pos) {
                var lat = pos.coords.latitude;
                var lon = pos.coords.longitude;
                // 反向地理编码尝试
                reverseGeocode(lat, lon, function(city) {
                    currentCity = city || DEFAULT_CITY.name;
                    Weather.setCity(currentCity);
                    callback(lat, lon, currentCity);
                });
            },
            function() {
                // 用户拒绝或失败 → 回退厦门
                callback(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY.name);
            },
            { timeout: 8000, enableHighAccuracy: false }
        );
    }

    // ---- 反向地理编码（使用 Open-Meteo 免费接口） ----
    function reverseGeocode(lat, lon, callback) {
        // 简单判断：坐标在厦门范围内就用厦门
        if (Math.abs(lat - DEFAULT_CITY.lat) < 0.5 && Math.abs(lon - DEFAULT_CITY.lon) < 0.5) {
            callback(DEFAULT_CITY.name);
            return;
        }
        // 否则用坐标表示
        callback(lat.toFixed(2) + ',' + lon.toFixed(2));
    }

    // ---- 刷新倒计时 ----
    function updateRefreshHint() {
        var hint = document.getElementById('refreshHint');
        if (!hint) return;
        var remain = Math.max(0, Math.ceil((nextRefresh - Date.now()) / 60000));
        hint.textContent = remain > 0 ? remain + '分钟后自动刷新' : '即将刷新...';
    }

    function scheduleRefresh() {
        nextRefresh = Date.now() + REFRESH_INTERVAL;
        updateRefreshHint();
    }

    // ---- 暗色模式 ----
    function detectDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function applyDarkMode(enable) {
        darkMode = enable;
        if (enable) {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark-mode');
        }
    }

    function toggleDarkMode() {
        applyDarkMode(!darkMode);
    }

    // ---- 刷新天气 ----
    function refreshWeather() {
        var coords = Weather.getCoords();
        Weather.load(coords.lat, coords.lon);
        scheduleRefresh();
    }

    // ---- 定位并加载 ----
    function loadWithLocation() {
        getLocation(function(lat, lon, city) {
            currentCity = city || DEFAULT_CITY.name;
            Weather.setCity(currentCity);
            Weather.load(lat, lon);
            document.getElementById('cityName').textContent = currentCity;
        });
    }

    // ---- 绑定 UI 事件 ----
    function bindUI() {
        // 刷新按钮
        var refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                this.classList.add('spinning');
                refreshWeather();
                setTimeout(function() { refreshBtn.classList.remove('spinning'); }, 800);
            });
        }

        // 定位按钮
        var locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.addEventListener('click', function() {
                loadWithLocation();
            });
        }

        // 暗色模式按钮
        var themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', function() {
                toggleDarkMode();
                this.textContent = darkMode ? '🌙' : '☀️';
            });
        }
    }

    // ---- 注册 PWA ----
    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function() {});
        }
    }

    // ---- 启动 ----
    function init() {
        // 暗色模式
        applyDarkMode(detectDarkMode());

        // 监听系统主题变化
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
                applyDarkMode(e.matches);
                var themeBtn = document.getElementById('themeBtn');
                if (themeBtn) themeBtn.textContent = e.matches ? '🌙' : '☀️';
            });
        }

        bindUI();
        registerSW();

        // 首次加载
        loadWithLocation();
        scheduleRefresh();

        // 定时刷新
        refreshTimer = setInterval(function() {
            refreshWeather();
        }, REFRESH_INTERVAL);

        // 每30秒更新倒计时
        hintTimer = setInterval(updateRefreshHint, 30000);
    }

    // 暴露公共方法
    return {
        init: init,
        refreshWeather: refreshWeather,
        toggleDarkMode: toggleDarkMode
    };

})();

// ---- DOM Ready 启动 ----
document.addEventListener('DOMContentLoaded', function() {
    App.init();
    Game.init();
});
