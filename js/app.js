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

    // ---- 反向地理编码（Nominatim 免费 API） ----
    function reverseGeocode(lat, lon, callback) {
        // 厦门附近直接返回，避免 API 请求
        if (Math.abs(lat - DEFAULT_CITY.lat) < 0.5 && Math.abs(lon - DEFAULT_CITY.lon) < 0.5) {
            callback(DEFAULT_CITY.name);
            return;
        }

        var url = 'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json&accept-language=zh&zoom=10';

        fetch(url, { headers: { 'User-Agent': 'XiamenWeatherApp/1.0' } })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.address) {
                    var addr = data.address;
                    // 优先取城市名，其次区县/乡镇
                    var city = addr.city || addr.town || addr.county || addr.state || addr.village;
                    if (city) {
                        // 去掉"市"、"区"、"县"、"镇"等后缀，让显示更干净
                        city = city.replace(/[市区县镇乡]$/, '');
                        callback(city);
                        return;
                    }
                }
                // API 返回了但解析不到 → 用坐标
                callback(lat.toFixed(2) + ',' + lon.toFixed(2));
            })
            .catch(function() {
                // 网络失败 → 用坐标兜底
                callback(lat.toFixed(2) + ',' + lon.toFixed(2));
            });
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

        // 全屏按钮
        var fsBtn = document.getElementById('fullscreenBtn');
        if (fsBtn) {
            fsBtn.addEventListener('click', toggleFullscreen);
            // 非 PWA 环境下才显示这个按钮，Chrome PWA 下隐藏
            if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
                fsBtn.style.display = 'none';
            }
        }
    }

    // ---- 全屏切换 ----
    function toggleFullscreen() {
        var el = document.documentElement;
        var supported = false;

        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // 尝试标准 Fullscreen API
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(function(){});
                supported = true;
            }
            if (!supported && el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
                supported = true;
            }
            // iOS Safari
            if (!supported && el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                supported = true;
            }
            if (!supported) {
                alert('当前浏览器不支持全屏。\n\n👉 建议用 Chrome 打开，添加到桌面后就是全屏 App。');
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    // ---- 注册 PWA ----
    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function() {});
        }
    }

    // ---- 随机暖心页脚 ----
    var warmMsgs = [
        '🌸 生活明朗，万物可爱',
        '☕ 愿你被世界温柔以待',
        '✨ 今天也要开心呀',
        '🍀 好事总会发生在下个转弯',
        '😊 记得微笑，不止今天',
        '🌈 风雨过后，总有彩虹',
        '💛 保持热爱，奔赴山海',
        '🌟 每一天都是限量版',
        '🎈 天气很好，心情也是',
        '🍃 清风徐来，水波不兴'
    ];

    function randomWarmMsg() {
        var el = document.getElementById('warmMsg');
        if (el) {
            var i = Math.floor(Math.random() * warmMsgs.length);
            el.textContent = warmMsgs[i];
        }
    }

    // ---- 启动 ----
    function init() {
        // 暖心页脚
        randomWarmMsg();

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
