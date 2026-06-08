/* ============================================
 * 厦门天气小程序 — 天气小猫桌宠模块
 * CSS 橘猫 + 拖拽 + 天气反应 + 气泡
 * ============================================ */

var CatPet = (function() {
    'use strict';

    // ---- 内部状态 ----
    var pos = { x: 0, y: 0 };
    var dragging = false;
    var dragStart = {};
    var weatherCode = 0;
    var weatherCat = 'sunny';
    var bubbleTimer = null;
    var idleTimer = null;
    var actionTimer = null;
    var heartPool = [];
    var isMobile = false;

    var dom = {};

    // ---- 天气分类 ----
    function getWeatherCat(code) {
        if (code === 0)                       return 'sunny';
        if (code >= 1  && code <= 2)          return 'partly';
        if (code === 3)                       return 'cloudy';
        if (code >= 45 && code <= 48)         return 'fog';
        if (code >= 51 && code <= 55)         return 'drizzle';
        if (code >= 61 && code <= 65)         return 'rain';
        if (code >= 71 && code <= 86)         return 'snow';
        if (code >= 80 && code <= 82)         return 'rain';
        if (code >= 95 && code <= 99)         return 'thunder';
        return 'sunny';
    }

    // ---- 气泡文案库 ----
    var SPEECH = {
        sunny:   ['今天阳光真好喵~ ☀️','晒太阳好舒服~','记得涂防晒喵!','暖洋洋的喵~','阳光好刺眼喵 😎'],
        partly:  ['天气还不错喵~','云朵像棉花糖! ☁️','适合出去玩喵!','微风轻轻吹~'],
        cloudy:  ['阴沉沉的天...','想睡觉喵~ 😴','太阳躲起来了...','灰蒙蒙的喵~'],
        fog:     ['雾好大喵...小心走路!','看不清路了喵~ 🌫️','慢慢走别跑喵~'],
        drizzle: ['下小雨了喵~ 🌧️','毛毛雨好温柔~','空气好清新喵!'],
        rain:    ['下雨了喵!记得带伞! ☂️','小心路滑喵~','踩水坑好好玩!','雨声好好听喵~'],
        snow:    ['下雪了好漂亮喵~ ❄️','堆雪人吧! ⛄','雪花飘飘喵~','好冷喵~但好美!'],
        thunder: ['打雷好可怕喵!! ⚡','快躲起来!','不要出门喵!','躲进被窝!'],
        generic: ['摸摸头~ ✨','今天也要开心喵! 💕','喵呜~','呼噜呼噜~','好喜欢你喵~','(伸懒腰)','盯——','蹭蹭~']
    };

    function randomMsg(cat) {
        var pool = (SPEECH[cat] || []).concat(SPEECH.generic);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ---- 创建 DOM ----
    function createDOM() {
        var pet = document.createElement('div');
        pet.className = 'cat-pet';
        pet.id = 'catPet';
        pet.setAttribute('aria-label', '天气小猫');
        pet.innerHTML =
            '<div class="cat-speech" id="catSpeech"></div>' +
            '<div class="cat-body-wrap">' +
                '<div class="cat-shadow"></div>' +
                '<div class="cat-body"></div>' +
                '<div class="cat-ear cat-ear-l"></div>' +
                '<div class="cat-ear cat-ear-r"></div>' +
                '<div class="cat-face">' +
                    '<div class="cat-eye cat-eye-l">' +
                        '<div class="cat-iris">' +
                            '<div class="cat-pupil"></div>' +
                            '<div class="cat-glint-1"></div>' +
                            '<div class="cat-glint-2"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="cat-eye cat-eye-r">' +
                        '<div class="cat-iris">' +
                            '<div class="cat-pupil"></div>' +
                            '<div class="cat-glint-1"></div>' +
                            '<div class="cat-glint-2"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="cat-nose"></div>' +
                    '<div class="cat-mouth"></div>' +
                    '<div class="cat-blush cat-blush-l"></div>' +
                    '<div class="cat-blush cat-blush-r"></div>' +
                    '<div class="cat-whiskers cat-whiskers-l">' +
                        '<i></i><i></i><i></i>' +
                    '</div>' +
                    '<div class="cat-whiskers cat-whiskers-r">' +
                        '<i></i><i></i><i></i>' +
                    '</div>' +
                '</div>' +
                '<div class="cat-collar"><div class="cat-bell"></div></div>' +
                '<div class="cat-paws">' +
                    '<div class="cat-paw cat-paw-l"></div>' +
                    '<div class="cat-paw cat-paw-r"></div>' +
                '</div>' +
                '<div class="cat-tail"></div>' +
                '<div class="cat-outfit" id="catOutfit"></div>' +
            '</div>';

        document.body.appendChild(pet);

        dom.pet    = pet;
        dom.speech = pet.querySelector('#catSpeech');
        dom.face   = pet.querySelector('.cat-face');
        dom.outfit = pet.querySelector('#catOutfit');
        dom.eyeL   = pet.querySelector('.cat-eye-l');
        dom.eyeR   = pet.querySelector('.cat-eye-r');
        dom.mouth  = pet.querySelector('.cat-mouth');
        dom.tail   = pet.querySelector('.cat-tail');
        dom.body   = pet.querySelector('.cat-body-wrap');

        // 延迟添加无限动画，避免 innerHTML 闪烁
        setTimeout(function() {
            if (dom.tail) dom.tail.classList.add('idle');
        }, 100);
    }

    // ---- 位置初始化 ----
    function initPosition() {
        isMobile = window.innerWidth < 640;
        var pw = isMobile ? 66 : 90;
        var ph = isMobile ? 84 : 115;

        var saved = null;
        try {
            var raw = localStorage.getItem('catpet_pos');
            if (raw) saved = JSON.parse(raw);
        } catch(e) {}

        var vw = window.innerWidth;
        var vh = window.innerHeight;
        // 手机端考虑安全区域和底部导航栏
        var bottomMargin = isMobile ? 80 : 130;
        var rightMargin = isMobile ? 8 : 14;

        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            pos.x = Math.max(0, Math.min(saved.x, vw - pw));
            pos.y = Math.max(0, Math.min(saved.y, vh - ph));
        } else {
            // 默认右下角
            pos.x = vw - pw - rightMargin;
            pos.y = vh - ph - bottomMargin;
        }
        applyPos(false);
    }

    function applyPos(animate) {
        var t = 'left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
        if (animate === false) {
            dom.pet.style.transition = 'none';
        } else {
            dom.pet.style.transition = t;
        }
        // 手机端用更短的过渡时间，触感更好
        if (isMobile && animate !== false) {
            dom.pet.style.transition = 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
        dom.pet.style.left = pos.x + 'px';
        dom.pet.style.top  = pos.y + 'px';
        if (animate === false) {
            dom.pet.offsetHeight;
            if (isMobile) {
                dom.pet.style.transition = 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
            } else {
                dom.pet.style.transition = t;
            }
        }
    }

    function savePosition() {
        try { localStorage.setItem('catpet_pos', JSON.stringify(pos)); } catch(e) {}
    }

    // ---- 事件处理 ----
    function getXY(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onStart(e) {
        if (dragging) return;
        var pt = getXY(e);
        dragging = true;
        dragStart.px = pos.x;
        dragStart.py = pos.y;
        dragStart.cx = pt.x;
        dragStart.cy = pt.y;
        dom.pet.classList.add('dragging');
        dom.pet.style.transition = 'none';
        e.preventDefault();
    }

    function onMove(e) {
        if (!dragging) return;
        var pt = getXY(e);
        var dx = pt.x - dragStart.cx;
        var dy = pt.y - dragStart.cy;
        pos.x = dragStart.px + dx;
        pos.y = dragStart.py + dy;
        clampPos();
        applyPos(false);
        e.preventDefault();
    }

    function onEnd(e) {
        if (!dragging) return;
        var dx = Math.abs(pos.x - dragStart.px);
        var dy = Math.abs(pos.y - dragStart.py);
        dragging = false;
        dom.pet.classList.remove('dragging');
        clampPos();
        applyPos(true);
        savePosition();

        // 短距离点击 → 互动反馈
        if (dx < 8 && dy < 8) {
            onTap();
        }
    }

    function clampPos() {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var pw = isMobile ? 66 : 90;
        var ph = isMobile ? 84 : 115;
        pos.x = Math.max(-18, Math.min(pos.x, vw - pw + 18));
        pos.y = Math.max(-10, Math.min(pos.y, vh - ph + 10));
    }

    // ---- 互动 ----
    function onTap() {
        // 弹跳
        dom.pet.classList.add('bouncing');
        setTimeout(function() { dom.pet.classList.remove('bouncing'); }, 500);

        // 冒爱心
        spawnHearts();

        // 表情反应
        dom.face.classList.add('happy');
        setTimeout(function() { dom.face.classList.remove('happy'); }, 600);

        // 有时说话
        if (Math.random() < 0.5) {
            say(randomMsg(weatherCat), 2500);
        }
    }

    function spawnHearts() {
        var rect = dom.pet.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + 20;
        var emojis = ['💕','💖','✨','💝','🐾','💛'];

        for (var i = 0; i < 5; i++) {
            var heart = document.createElement('span');
            heart.className = 'cat-heart';
            heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            heart.style.left = cx + (Math.random() - 0.5) * 60 + 'px';
            heart.style.top  = cy + 'px';
            heart.style.fontSize = (14 + Math.random() * 14) + 'px';
            heart.style.animationDuration = (0.8 + Math.random() * 0.8) + 's';
            heart.style.animationDelay = Math.random() * 0.15 + 's';
            document.body.appendChild(heart);
            heartPool.push(heart);

            // 自动清理
            setTimeout(function() {
                if (heart.parentNode) heart.parentNode.removeChild(heart);
                var idx = heartPool.indexOf(heart);
                if (idx >= 0) heartPool.splice(idx, 1);
            }, 1600 + i * 50);
        }
    }

    // ---- 气泡 ----
    function say(msg, duration) {
        if (!msg) return;
        duration = duration || 3000;
        clearTimeout(bubbleTimer);

        dom.speech.textContent = msg;
        dom.speech.classList.add('show');

        bubbleTimer = setTimeout(function() {
            dom.speech.classList.remove('show');
        }, duration);
    }

    // ---- 天气更新 ----
    function updateWeather(code) {
        if (code == null) return;
        weatherCode = code;
        weatherCat = getWeatherCat(code);
        applyOutfit();
    }

    function applyOutfit() {
        var acc = dom.outfit;
        // 重置
        dom.face.classList.remove('sleepy', 'scared', 'happy');
        dom.body.classList.remove('shaking');
        dom.pet.classList.remove('thunder-mode');

        // 手机端饰品缩小
        var scale = isMobile ? 0.7 : 1;
        var emojiStyle = function(size, top) {
            return 'font-size:' + Math.round(size * scale) + 'px;top:' + Math.round(top * scale) + 'px;';
        };

        switch (weatherCat) {
            case 'sunny':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + emojiStyle(24, 0) + '">😎</span>';
                break;
            case 'partly':
                acc.innerHTML = '';
                break;
            case 'cloudy':
                dom.face.classList.add('sleepy');
                acc.innerHTML = '';
                break;
            case 'fog':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + emojiStyle(20, 18) + '">🧣</span>';
                break;
            case 'drizzle':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + emojiStyle(18, 2) + '">🧢</span>';
                break;
            case 'rain':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + emojiStyle(22, -6) + '">☂️</span>';
                break;
            case 'snow':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + emojiStyle(24, -8) + '">🎩</span>';
                break;
            case 'thunder':
                dom.face.classList.add('scared');
                dom.body.classList.add('shaking');
                dom.pet.classList.add('thunder-mode');
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + emojiStyle(18, 0) + '">⚡</span>';
                break;
            default:
                acc.innerHTML = '';
        }
    }

    // ---- 闲时动作 ----
    var idleActions = [
        function() { say(randomMsg(weatherCat), 3000); },
        function() { dom.tail.classList.remove('idle'); dom.tail.classList.add('wag'); setTimeout(function(){ dom.tail.classList.remove('wag'); dom.tail.classList.add('idle'); }, 1400); },
        function() { dom.face.classList.add('blink-once'); setTimeout(function(){ dom.face.classList.remove('blink-once'); }, 300); },
        function() { dom.pet.classList.add('bouncing'); setTimeout(function(){ dom.pet.classList.remove('bouncing'); }, 500); },
        function() { dom.face.classList.add('tilt'); setTimeout(function(){ dom.face.classList.remove('tilt'); }, 800); },
        function() { /* 安静一会 */ }
    ];

    function startIdle() {
        clearInterval(idleTimer);
        idleTimer = setInterval(function() {
            if (dragging) return;
            var action = idleActions[Math.floor(Math.random() * idleActions.length)];
            action();
        }, 8000 + Math.random() * 12000);
    }

    // ---- 窗口大小变化处理 ----
    function onResize() {
        // 手机端：检测是否从桌面切换到手机（横屏等）
        var wasMobile = isMobile;
        isMobile = window.innerWidth < 640;
        // 如果设备类型变了，更新所有配件尺寸
        if (wasMobile !== isMobile) {
            // 设备类型变了，重新计算位置
            clampPos();
        } else {
            clampPos();
        }
        applyPos(false);
        // 手机端不保存 resize 产生的位置（避免地址栏收起导致位置偏移保存）
        if (!isMobile) {
            savePosition();
        }
    }

    // ---- 公开方法 ----
    function init() {
        createDOM();
        initPosition();
        applyOutfit();
        startIdle();

        // 绑定事件
        dom.pet.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove',  onMove,  { passive: false });
        document.addEventListener('touchend',   onEnd);
        dom.pet.addEventListener('mousedown',  onStart);
        window.addEventListener('mousemove',   onMove);
        window.addEventListener('mouseup',     onEnd);

        window.addEventListener('resize', onResize);

        // 初始问候
        setTimeout(function() {
            say('嗨!我是天气小猫~ 喵呜! 💕', 3500);
        }, 2000);
    }

    function setWeather(code) {
        updateWeather(code);
        // 天气变化时说句话
        var msgs = SPEECH[weatherCat];
        if (msgs && msgs.length > 0 && Math.random() < 0.6) {
            setTimeout(function() {
                say(msgs[Math.floor(Math.random() * msgs.length)], 3000);
            }, 500);
        }
    }

    return {
        init: init,
        setWeather: setWeather,
        say: say
    };

})();

// ---- 自动初始化（DOM Ready 后） ----
document.addEventListener('DOMContentLoaded', function() {
    CatPet.init();
});
