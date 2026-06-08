/* ============================================
 * 厦门天气小程序 — 天气小猫桌宠模块
 * SVG 萌猫 + 拖拽 + 天气反应 + 气泡
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

    // ---- SVG 猫咪（大头大眼萌猫） ----
    var CAT_SVG = '' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="cat-svg">' +
    '<defs>' +
    '<radialGradient id="bodyGrad" cx="50%" cy="30%" r="70%">' +
    '<stop offset="0%" stop-color="#FFFDF7"/>' +
    '<stop offset="60%" stop-color="#F5EDE0"/>' +
    '<stop offset="100%" stop-color="#E8DDCE"/>' +
    '</radialGradient>' +
    '<radialGradient id="headGrad" cx="50%" cy="30%" r="70%">' +
    '<stop offset="0%" stop-color="#FFFEFA"/>' +
    '<stop offset="70%" stop-color="#F7F0E6"/>' +
    '<stop offset="100%" stop-color="#EDE3D5"/>' +
    '</radialGradient>' +
    '<radialGradient id="bellyGrad" cx="50%" cy="40%">' +
    '<stop offset="0%" stop-color="#FFFEFC"/>' +
    '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>' +
    '</radialGradient>' +
    '<radialGradient id="eyeShine" cx="35%" cy="25%">' +
    '<stop offset="0%" stop-color="#69C8E8"/>' +
    '<stop offset="50%" stop-color="#4DA8C8"/>' +
    '<stop offset="100%" stop-color="#2E6A80"/>' +
    '</radialGradient>' +
    '<filter id="softShadow">' +
    '<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.08"/>' +
    '</filter>' +
    '</defs>' +

    '<!-- 地面阴影 -->' +
    '<ellipse cx="100" cy="226" rx="45" ry="7" fill="rgba(0,0,0,0.07)" class="cat-shadow-svg"/>' +

    '<!-- === 尾巴 === -->' +
    '<g class="cat-tail-svg">' +
    '<path d="M56,186 Q18,170 15,130 Q12,100 28,85" ' +
    'fill="none" stroke="url(#bodyGrad)" stroke-width="13" stroke-linecap="round"/>' +
    '<path d="M28,85 Q34,78 30,70" ' +
    'fill="none" stroke="#FFFDF8" stroke-width="10" stroke-linecap="round"/>' +
    '</g>' +

    '<!-- === 身体 === -->' +
    '<g filter="url(#softShadow)">' +
    '<ellipse cx="100" cy="178" rx="48" ry="36" fill="url(#bodyGrad)"/>' +
    '</g>' +

    '<!-- 肚皮毛 -->' +
    '<ellipse cx="100" cy="170" rx="28" ry="22" fill="url(#bellyGrad)"/>' +

    '<!-- 身体花纹 -->' +
    '<ellipse cx="84" cy="165" rx="14" ry="10" fill="rgba(210,190,165,0.12)"/>' +
    '<ellipse cx="116" cy="180" rx="10" ry="8" fill="rgba(210,190,165,0.1)"/>' +

    '<!-- === 爪子 === -->' +
    '<g class="cat-paws-svg">' +
    '<!-- 左爪 -->' +
    '<ellipse cx="72" cy="202" rx="18" ry="13" fill="#FFFEFC"/>' +
    '<ellipse cx="72" cy="206" rx="6" ry="3.5" fill="#FFD2D2" opacity="0.5"/>' +
    '<!-- 左趾缝 -->' +
    '<line x1="63" y1="200" x2="63" y2="209" stroke="#EEE" stroke-width="0.8"/>' +
    '<line x1="72" y1="200" x2="72" y2="210" stroke="#EEE" stroke-width="0.8"/>' +
    '<line x1="81" y1="200" x2="81" y2="209" stroke="#EEE" stroke-width="0.8"/>' +
    '<!-- 右爪 -->' +
    '<ellipse cx="128" cy="202" rx="18" ry="13" fill="#FFFEFC"/>' +
    '<ellipse cx="128" cy="206" rx="6" ry="3.5" fill="#FFD2D2" opacity="0.5"/>' +
    '<line x1="119" y1="200" x2="119" y2="209" stroke="#EEE" stroke-width="0.8"/>' +
    '<line x1="128" y1="200" x2="128" y2="210" stroke="#EEE" stroke-width="0.8"/>' +
    '<line x1="137" y1="200" x2="137" y2="209" stroke="#EEE" stroke-width="0.8"/>' +
    '</g>' +

    '<!-- === 头 === -->' +
    '<g class="cat-head-svg">' +
    '<ellipse cx="100" cy="88" rx="62" ry="56" fill="url(#headGrad)" filter="url(#softShadow)"/>' +

    '<!-- 额头花纹 -->' +
    '<ellipse cx="100" cy="52" rx="24" ry="16" fill="rgba(210,190,165,0.13)"/>' +
    '<ellipse cx="88" cy="56" rx="10" ry="8" fill="rgba(210,190,165,0.1)"/>' +
    '<ellipse cx="112" cy="56" rx="10" ry="8" fill="rgba(210,190,165,0.1)"/>' +

    '<!-- === 耳朵 === -->' +
    '<g class="cat-ears-svg">' +
    '<!-- 左耳 -->' +
    '<polygon points="40,60 22,8 72,42" fill="url(#bodyGrad)"/>' +
    '<polygon points="42,54 30,18 64,42" fill="#FFDADA"/>' +
    '<!-- 右耳 -->' +
    '<polygon points="160,60 178,8 128,42" fill="url(#bodyGrad)"/>' +
    '<polygon points="158,54 170,18 136,42" fill="#FFDADA"/>' +
    '</g>' +

    '<!-- === 眼睛（巨大✨bulingbuling✨） === -->' +
    '<g class="cat-eyes-svg">' +
    '<!-- 左眼 -->' +
    '<ellipse cx="72" cy="82" rx="18" ry="20" fill="#FFF" stroke="rgba(0,0,0,0.05)" stroke-width="1"/>' +
    '<ellipse cx="74" cy="85" rx="12.5" ry="14.5" fill="url(#eyeShine)"/>' +
    '<ellipse cx="75" cy="87" rx="7" ry="9.5" fill="#1A1525"/>' +
    '<!-- 左眼高光 -->' +
    '<circle cx="67" cy="76" r="5.5" fill="#FFF"/>' +
    '<circle cx="79" cy="79.5" r="3" fill="#FFF"/>' +
    '<circle cx="71" cy="91" r="2" fill="rgba(255,255,255,0.5)"/>' +
    '<circle cx="82" cy="88" r="1" fill="rgba(255,255,255,0.3)"/>' +
    '<!-- 右眼 -->' +
    '<ellipse cx="128" cy="82" rx="18" ry="20" fill="#FFF" stroke="rgba(0,0,0,0.05)" stroke-width="1"/>' +
    '<ellipse cx="126" cy="85" rx="12.5" ry="14.5" fill="url(#eyeShine)"/>' +
    '<ellipse cx="125" cy="87" rx="7" ry="9.5" fill="#1A1525"/>' +
    '<!-- 右眼高光 -->' +
    '<circle cx="133" cy="76" r="5.5" fill="#FFF"/>' +
    '<circle cx="121" cy="79.5" r="3" fill="#FFF"/>' +
    '<circle cx="129" cy="91" r="2" fill="rgba(255,255,255,0.5)"/>' +
    '<circle cx="118" cy="88" r="1" fill="rgba(255,255,255,0.3)"/>' +
    '</g>' +

    '<!-- === 鼻子（粉色小心形） === -->' +
    '<path d="M100,104 L96,108 A2 2 0 0 1 98,106 L100,108 L102,106 A2 2 0 0 1 104,108 Z" ' +
    'fill="#FFAFAF" transform="translate(0, 1)"/>' +

    '<!-- === 嘴巴（W形） === -->' +
    '<g class="cat-mouth-svg">' +
    '<path d="M92,113 Q96,119 100,113 Q104,119 108,113" ' +
    'fill="none" stroke="#C5B5A5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</g>' +

    '<!-- === 腮红 === -->' +
    '<ellipse cx="46" cy="98" rx="13" ry="7.5" fill="#FFD6D6" opacity="0.55"/>' +
    '<ellipse cx="154" cy="98" rx="13" ry="7.5" fill="#FFD6D6" opacity="0.55"/>' +

    '<!-- === 胡须 === -->' +
    '<g stroke="#D8D0C5" stroke-width="1.2" stroke-linecap="round" opacity="0.6">' +
    '<line x1="18" y1="96" x2="56" y2="102"/>' +
    '<line x1="16" y1="108" x2="54" y2="108"/>' +
    '<line x1="18" y1="120" x2="56" y2="114"/>' +
    '<line x1="182" y1="96" x2="144" y2="102"/>' +
    '<line x1="184" y1="108" x2="146" y2="108"/>' +
    '<line x1="182" y1="120" x2="144" y2="114"/>' +
    '</g>' +
    '</g>' +

    '<!-- === 项圈 + 铃铛 === -->' +
    '<g class="cat-collar-svg">' +
    '<path d="M54,138 Q100,150 146,138" fill="none" stroke="#FF9E9E" stroke-width="7" stroke-linecap="round"/>' +
    '<circle cx="100" cy="148" r="9" fill="#FFCD4D"/>' +
    '<circle cx="100" cy="148" r="6" fill="#FFE97A"/>' +
    '<circle cx="97" cy="145" r="2.5" fill="rgba(255,255,255,0.6)"/>' +
    '<circle cx="100" cy="153" r="1.5" fill="#C89820"/>' +
    '</g>' +
    '</svg>';


    // ---- 创建 DOM ----
    function createDOM() {
        var pet = document.createElement('div');
        pet.className = 'cat-pet';
        pet.id = 'catPet';
        pet.setAttribute('aria-label', '天气小猫');
        pet.innerHTML =
            '<div class="cat-speech" id="catSpeech"></div>' +
            '<div class="cat-svg-wrap">' + CAT_SVG + '</div>' +
            '<div class="cat-outfit" id="catOutfit"></div>';

        document.body.appendChild(pet);

        dom.pet      = pet;
        dom.speech   = pet.querySelector('#catSpeech');
        dom.svgWrap  = pet.querySelector('.cat-svg-wrap');
        dom.head     = pet.querySelector('.cat-head-svg');
        dom.eyes     = pet.querySelector('.cat-eyes-svg');
        dom.mouth    = pet.querySelector('.cat-mouth-svg');
        dom.tail     = pet.querySelector('.cat-tail-svg');
        dom.bodyWrap = pet.querySelector('.cat-svg-wrap');
        dom.outfit   = pet.querySelector('#catOutfit');

        // 延迟添加尾巴动画
        setTimeout(function() {
            if (dom.tail) dom.tail.classList.add('idle');
        }, 100);
    }

    // ---- 位置初始化 ----
    function initPosition() {
        isMobile = window.innerWidth < 640;
        var pw = isMobile ? 70 : 100;
        var ph = isMobile ? 84 : 120;

        var saved = null;
        try {
            var raw = localStorage.getItem('catpet_pos');
            if (raw) saved = JSON.parse(raw);
        } catch(e) {}

        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var bottomMargin = isMobile ? 70 : 120;
        var rightMargin = isMobile ? 6 : 12;

        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            pos.x = Math.max(0, Math.min(saved.x, vw - pw));
            pos.y = Math.max(0, Math.min(saved.y, vh - ph));
        } else {
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
        if (dx < 8 && dy < 8) {
            onTap();
        }
    }

    function clampPos() {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var pw = isMobile ? 70 : 100;
        var ph = isMobile ? 84 : 120;
        pos.x = Math.max(-18, Math.min(pos.x, vw - pw + 18));
        pos.y = Math.max(-10, Math.min(pos.y, vh - ph + 10));
    }

    // ---- 互动 ----
    function onTap() {
        dom.pet.classList.add('bouncing');
        setTimeout(function() { dom.pet.classList.remove('bouncing'); }, 500);
        spawnHearts();

        // 开心脸
        dom.pet.classList.add('happy-face');
        setTimeout(function() { dom.pet.classList.remove('happy-face'); }, 600);

        if (Math.random() < 0.5) {
            say(randomMsg(weatherCat), 2500);
        }
    }

    function spawnHearts() {
        var rect = dom.pet.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + 24;
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
        // 重置表情
        dom.pet.classList.remove('sleepy-face', 'scared-face', 'happy-face', 'thunder-mode');

        var scale = isMobile ? 0.7 : 1;
        function es(size, top) {
            return 'font-size:' + Math.round(size * scale) + 'px;top:' + Math.round(top * scale) + 'px;';
        }

        switch (weatherCat) {
            case 'sunny':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(26, -4) + '">😎</span>';
                break;
            case 'partly':
                acc.innerHTML = '';
                break;
            case 'cloudy':
                dom.pet.classList.add('sleepy-face');
                acc.innerHTML = '';
                break;
            case 'fog':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(22, 10) + '">🧣</span>';
                break;
            case 'drizzle':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(20, -2) + '">🧢</span>';
                break;
            case 'rain':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(24, -12) + '">☂️</span>';
                break;
            case 'snow':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(26, -14) + '">🎩</span>';
                break;
            case 'thunder':
                dom.pet.classList.add('scared-face');
                dom.pet.classList.add('thunder-mode');
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(20, -2) + '">⚡</span>';
                break;
            default:
                acc.innerHTML = '';
        }
    }

    // ---- 闲时动作 ----
    var idleActions = [
        function() { say(randomMsg(weatherCat), 3000); },
        function() {
            if (dom.tail) {
                dom.tail.classList.remove('idle');
                dom.tail.classList.add('wag');
                setTimeout(function() {
                    dom.tail.classList.remove('wag');
                    dom.tail.classList.add('idle');
                }, 1400);
            }
        },
        function() { dom.pet.classList.add('blink-once'); setTimeout(function(){ dom.pet.classList.remove('blink-once'); }, 300); },
        function() { dom.pet.classList.add('bouncing'); setTimeout(function(){ dom.pet.classList.remove('bouncing'); }, 500); },
        function() { dom.pet.classList.add('tilt-head'); setTimeout(function(){ dom.pet.classList.remove('tilt-head'); }, 800); },
        function() { /* 安静 */ }
    ];

    function startIdle() {
        clearInterval(idleTimer);
        idleTimer = setInterval(function() {
            if (dragging) return;
            var action = idleActions[Math.floor(Math.random() * idleActions.length)];
            action();
        }, 8000 + Math.random() * 12000);
    }

    // ---- 窗口大小变化 ----
    function onResize() {
        var wasMobile = isMobile;
        isMobile = window.innerWidth < 640;
        clampPos();
        applyPos(false);
        if (!isMobile) savePosition();
        // 设备类型变了 → 刷新配饰尺寸
        if (wasMobile !== isMobile) applyOutfit();
    }

    // ---- 公开方法 ----
    function init() {
        createDOM();
        initPosition();
        applyOutfit();
        startIdle();

        dom.pet.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove',  onMove,  { passive: false });
        document.addEventListener('touchend',   onEnd);
        dom.pet.addEventListener('mousedown',  onStart);
        window.addEventListener('mousemove',   onMove);
        window.addEventListener('mouseup',     onEnd);
        window.addEventListener('resize', onResize);

        setTimeout(function() {
            say('嗨!我是天气小猫~ 喵呜! 💕', 3500);
        }, 2000);
    }

    function setWeather(code) {
        updateWeather(code);
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

document.addEventListener('DOMContentLoaded', function() {
    CatPet.init();
});
