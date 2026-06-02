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

    // ---- 反向地理编码（离线城市库，0 网络请求，国内可用） ----
    function reverseGeocode(lat, lon, callback) {
        // 厦门附近直接返回
        if (Math.abs(lat - DEFAULT_CITY.lat) < 0.5 && Math.abs(lon - DEFAULT_CITY.lon) < 0.5) {
            callback(DEFAULT_CITY.name);
            return;
        }

        // 离线匹配最近城市
        var city = findNearestCity(lat, lon);
        if (city) {
            callback(city);
        } else {
            // 非常偏远的地区 → 显示友好兜底
            callback('📍 当前定位');
        }
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
            csSyncRecent(currentCity);
        });
    }

    // ---- 绑定 UI 事件 ----
    function bindUI() {
        // 城市名按钮 → 打开选择器
        var cityBtn = document.getElementById('cityNameBtn');
        if (cityBtn) {
            cityBtn.addEventListener('click', function() { csOpen(); });
        }

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

    // ============================================
    //  城市选择器模块
    // ============================================
    var csState = {
        open: false,
        overlay: null,
        panel: null,
        input: null,
        list: null,
        recent: [],
        allCities: [],
        debounceTimer: null
    };

    function csInit() {
        // 从 CITY_DB 提取所有唯一城市名
        var seen = {};
        for (var i = 0; i < CITY_DB.length; i++) {
            var name = CITY_DB[i][0];
            if (!seen[name]) {
                seen[name] = true;
                csState.allCities.push(name);
            }
        }

        // 读 localStorage 最近城市
        try {
            var raw = localStorage.getItem(RECENT_CITIES_KEY);
            csState.recent = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(csState.recent)) csState.recent = [];
        } catch (e) {
            csState.recent = [];
        }

        // 创建 DOM
        csState.overlay = document.createElement('div');
        csState.overlay.className = 'city-selector-overlay';
        csState.overlay.innerHTML =
            '<div class="city-selector-panel">'
            + '<div class="cs-search-wrap">'
            + '<input class="cs-search-input" type="text" placeholder="搜索城市..." autocomplete="off">'
            + '<button class="cs-search-clear" type="button">✕</button>'
            + '</div>'
            + '<div class="cs-section-label cs-recent-label">最近访问</div>'
            + '<ul class="cs-city-list cs-recent-list"></ul>'
            + '<div class="cs-section-label">当前定位</div>'
            + '<ul class="cs-city-list">'
            + '<li data-action="locate"><span class="cs-city-icon">📍</span><span class="cs-city-name">当前定位</span></li>'
            + '</ul>'
            + '<div class="cs-empty" style="display:none"></div>'
            + '</div>';

        document.body.appendChild(csState.overlay);

        csState.panel = csState.overlay.querySelector('.city-selector-panel');
        csState.input = csState.overlay.querySelector('.cs-search-input');
        csState.list = csState.overlay.querySelector('.cs-recent-list');

        // 点击遮罩关闭
        csState.overlay.addEventListener('click', function(e) {
            if (e.target === csState.overlay) csClose();
        });

        // 清除按钮
        var clearBtn = csState.overlay.querySelector('.cs-search-clear');
        clearBtn.addEventListener('click', function() {
            csState.input.value = '';
            csShowRecent();
            csState.input.focus();
        });

        // 搜索输入
        csState.input.addEventListener('input', function() {
            clearTimeout(csState.debounceTimer);
            csState.debounceTimer = setTimeout(function() {
                csFilter(csState.input.value);
            }, 150);
        });

        // 定位按钮
        var locateItem = csState.overlay.querySelector('[data-action="locate"]');
        if (locateItem) {
            locateItem.addEventListener('click', function() {
                csClose();
                loadWithLocation();
            });
        }

        // ESC 关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && csState.open) csClose();
        });
    }

    function csOpen() {
        if (csState.open) return;
        csState.open = true;
        csState.input.value = '';
        csShowRecent();
        csState.overlay.classList.add('open');
        var btn = document.getElementById('cityNameBtn');
        if (btn) btn.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(function() {
            if (csState.input) csState.input.focus();
        }, 150);
    }

    function csClose() {
        if (!csState.open) return;
        csState.open = false;
        csState.overlay.classList.remove('open');
        var btn = document.getElementById('cityNameBtn');
        if (btn) btn.classList.remove('open');
        document.body.style.overflow = '';
    }

    function csShowRecent() {
        csState.list = csState.overlay.querySelector('.cs-recent-list');
        var label = csState.overlay.querySelector('.cs-recent-label');
        var empty = csState.overlay.querySelector('.cs-empty');
        label.style.display = '';
        empty.style.display = 'none';

        if (csState.recent.length === 0) {
            csState.list.innerHTML = '';
            label.style.display = 'none';
            empty.style.display = '';
            empty.textContent = '暂无最近访问城市';
            return;
        }
        csRenderList(csState.list, csState.recent, true);
    }

    function csFilter(query) {
        var results = searchCities(query);
        var label = csState.overlay.querySelector('.cs-recent-label');
        var empty = csState.overlay.querySelector('.cs-empty');
        var recentList = csState.overlay.querySelector('.cs-recent-list');
        var locateSection = csState.overlay.querySelectorAll('.cs-section-label')[1];

        if (!query || query.trim().length === 0) {
            csShowRecent();
            locateSection.style.display = '';
            return;
        }

        // 切换到搜索结果模式
        csState.list = recentList;
        label.textContent = '搜索结果';
        label.style.display = '';
        locateSection.style.display = 'none';
        // 隐藏定位列表项
        var locateLi = csState.overlay.querySelector('[data-action="locate"]');
        if (locateLi) locateLi.parentElement.style.display = 'none';

        if (results.length === 0) {
            csState.list.innerHTML = '';
            empty.style.display = '';
            empty.textContent = '未找到匹配城市，可尝试其他关键词';
        } else {
            empty.style.display = 'none';
            csRenderList(csState.list, results, false);
        }
    }

    function csRenderList(list, cities, showPin) {
        var html = '';
        for (var i = 0; i < cities.length; i++) {
            var name = cities[i];
            var isCurrent = (name === currentCity);
            html += '<li data-city="' + name.replace(/"/g, '&quot;') + '">'
                + '<span class="cs-city-icon">' + (showPin ? '📌' : '🏙️') + '</span>'
                + '<span class="cs-city-name">' + name + '</span>'
                + (isCurrent ? '<span class="cs-city-badge">当前</span>' : '')
                + '</li>';
        }
        list.innerHTML = html;

        // 绑定点击
        var items = list.querySelectorAll('li');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function() {
                var city = this.getAttribute('data-city');
                if (city) csSelect(city);
            });
        }
    }

    function csSelect(name) {
        // 在 CITY_DB 中查找
        var found = null;
        for (var i = 0; i < CITY_DB.length; i++) {
            if (CITY_DB[i][0] === name) {
                found = CITY_DB[i];
                break;
            }
        }

        if (found) {
            // 本地找到 → 直接加载
            currentCity = name;
            Weather.setCity(currentCity);
            Weather.load(found[1], found[2]);
            document.getElementById('cityName').textContent = currentCity;
            csSaveRecent(name);
            csClose();
        } else {
            // 不在本地库 → Open-Meteo 地理编码
            csClose();
            Weather.loadByName(name);
        }
    }

    function csSaveRecent(name) {
        // 去重
        var arr = csState.recent;
        var idx = arr.indexOf(name);
        if (idx !== -1) arr.splice(idx, 1);
        arr.unshift(name);
        if (arr.length > MAX_RECENT_CITIES) arr = arr.slice(0, MAX_RECENT_CITIES);
        csState.recent = arr;
        try {
            localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(arr));
        } catch (e) { /* 私密模式/配额满 → 忽略 */ }
    }

    function csSyncRecent(name) {
        // GPS 定位成功后同步到最近
        if (name && name !== '📍 当前定位' && name !== DEFAULT_CITY.name) {
            csSaveRecent(name);
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
        // 初始化城市选择器
        csInit();

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

        // 秒开：先用默认城市（厦门）加载天气，不等待 GPS
        Weather.load(DEFAULT_CITY.lat, DEFAULT_CITY.lon);
        scheduleRefresh();

        // GPS 后台静默定位，如果位置不同则自动切换
        getLocation(function(lat, lon, city) {
            var newCity = city || DEFAULT_CITY.name;
            // 只有与默认城市不同时才重新加载
            if (newCity !== DEFAULT_CITY.name) {
                currentCity = newCity;
                Weather.setCity(currentCity);
                Weather.load(lat, lon);
                document.getElementById('cityName').textContent = currentCity;
                csSyncRecent(currentCity);
            }
        });

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
        toggleDarkMode: toggleDarkMode,
        updateCityDisplay: function(name) {
            currentCity = name;
            var el = document.getElementById('cityName');
            if (el) el.textContent = name;
            csSaveRecent(name);
        },
        getCurrentCity: function() { return currentCity; },
        locateAndLoad: loadWithLocation
    };

})();

// ---- DOM Ready 启动 ----
document.addEventListener('DOMContentLoaded', function() {
    App.init();
    Game.init();
});
