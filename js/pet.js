/* ============================================
 * 天气小猫桌宠 — SVG萌猫 + 眼神跟踪 + 拖拽变形 + 天气体态 + 多表情
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
    var cursorX = -999, cursorY = -999;   // 全局光标位置（眼神跟踪用）
    var lastTapTime = 0;                   // 双击检测
    var faceState = '';                    // 当前表情状态

    // 🆕 天气数据 + 情绪 + 自动走路 + 撸猫
    var weatherNow = null;          // { temp, humidity, feelsLike, desc }
    var hourlyData = null;          // 逐时预报（下雨预警用）
    var mood = 'happy';             // energetic / happy / lazy / sleepy / scared
    var isPurring = false;
    var petStrokeCount = 0;
    var petStrokeLastX = 0;
    var petStrokeLastTime = 0;
    var autoWalkTimer = null;
    var greetingDone = false;

    var dom = {};

    // ---- 天气分类 ----
    function getWeatherCat(code) {
        if (code === 0) return 'sunny';
        if (code >= 1  && code <= 2)  return 'partly';
        if (code === 3) return 'cloudy';
        if (code >= 45 && code <= 48) return 'fog';
        if (code >= 51 && code <= 55) return 'drizzle';
        if (code >= 61 && code <= 82) return 'rain';
        if (code >= 71 && code <= 86) return 'snow';
        if (code >= 95 && code <= 99) return 'thunder';
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

    // 🆕 撸猫反馈
    var PET_MSGS = [
        '呼噜呼噜~ 好舒服喵~ 💕','喵呜~ 再摸一下!','咕噜咕噜~','好开心喵! 🥰',
        '眯眼~ 就是那里~','喵呜——!','(幸福地打滚)','蹭蹭你的手~'
    ];

    // 🆕 心情 → 体态映射
    var MOOD_POSE = {
        energetic: 'stretch-mode',
        happy:     '',
        lazy:      'squish-mode',
        sleepy:    'sleepy-face',
        scared:    'squish-mode'
    };

    // ---- SVG 猫咪（带 pupil ID 用于眼神跟踪） ----
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
    '</defs>' +

    // 地面阴影
    '<ellipse cx="100" cy="222" rx="40" ry="6" fill="rgba(0,0,0,0.06)"/>' +

    // 尾巴
    '<g class="cat-tail-svg">' +
    '<path d="M58,186 Q18,172 15,130 Q12,100 28,85" ' +
    'fill="none" stroke="url(#bodyGrad)" stroke-width="12" stroke-linecap="round"/>' +
    '<path d="M28,85 Q34,78 30,70" ' +
    'fill="none" stroke="#FFFDF8" stroke-width="9" stroke-linecap="round"/>' +
    '</g>' +

    // 身体
    '<ellipse cx="100" cy="175" rx="46" ry="34" fill="url(#bodyGrad)" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>' +
    '<ellipse cx="100" cy="168" rx="26" ry="20" fill="url(#bellyGrad)"/>' +
    '<ellipse cx="84" cy="162" rx="12" ry="8" fill="rgba(210,190,165,0.1)"/>' +
    '<ellipse cx="116" cy="176" rx="8" ry="6" fill="rgba(210,190,165,0.08)"/>' +

    // 爪子
    '<ellipse cx="72" cy="200" rx="17" ry="12" fill="#FFFEFC"/>' +
    '<ellipse cx="72" cy="204" rx="5.5" ry="3" fill="#FFD2D2" opacity="0.5"/>' +
    '<ellipse cx="128" cy="200" rx="17" ry="12" fill="#FFFEFC"/>' +
    '<ellipse cx="128" cy="204" rx="5.5" ry="3" fill="#FFD2D2" opacity="0.5"/>' +

    // 项圈
    '<path d="M56,137 Q100,148 144,137" fill="none" stroke="#FF9E9E" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="100" cy="146" r="8" fill="#FFCD4D"/>' +
    '<circle cx="100" cy="146" r="5" fill="#FFE97A"/>' +
    '<circle cx="97" cy="143" r="2" fill="rgba(255,255,255,0.6)"/>' +

    // 头部
    '<ellipse id="catHeadEl" cx="100" cy="98" rx="56" ry="52" fill="url(#headGrad)" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>' +
    '<ellipse cx="100" cy="65" rx="20" ry="12" fill="rgba(210,190,165,0.1)"/>' +

    // 耳朵
    '<polygon points="44,72 28,20 70,52" fill="url(#bodyGrad)"/>' +
    '<polygon points="46,66 34,30 64,52" fill="#FFDADA"/>' +
    '<polygon points="156,72 172,20 130,52" fill="url(#bodyGrad)"/>' +
    '<polygon points="154,66 166,30 136,52" fill="#FFDADA"/>' +

    // 眼睛
    '<g class="cat-eyes-svg">' +
    // 左眼
    '<ellipse cx="72" cy="100" rx="16" ry="18" fill="#FFF" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>' +
    '<ellipse id="catIrisL" cx="74" cy="103" rx="11" ry="13" fill="url(#eyeShine)"/>' +
    '<ellipse id="catPupilL" cx="75" cy="105" rx="6" ry="8.5" fill="#1A1525"/>' +
    '<circle cx="67" cy="94" r="4.5" fill="#FFF"/>' +
    '<circle cx="79" cy="97" r="2.5" fill="#FFF"/>' +
    '<circle cx="71" cy="108" r="1.5" fill="rgba(255,255,255,0.5)"/>' +
    // 右眼
    '<ellipse cx="128" cy="100" rx="16" ry="18" fill="#FFF" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>' +
    '<ellipse id="catIrisR" cx="126" cy="103" rx="11" ry="13" fill="url(#eyeShine)"/>' +
    '<ellipse id="catPupilR" cx="125" cy="105" rx="6" ry="8.5" fill="#1A1525"/>' +
    '<circle cx="133" cy="94" r="4.5" fill="#FFF"/>' +
    '<circle cx="121" cy="97" r="2.5" fill="#FFF"/>' +
    '<circle cx="129" cy="108" r="1.5" fill="rgba(255,255,255,0.5)"/>' +
    '</g>' +

    // 鼻子
    '<path id="catNose" d="M100,117 L97,120 A1.5 1.5 0 0 1 99,118 L100,120 L101,118 A1.5 1.5 0 0 1 103,120 Z" fill="#FFAFAF"/>' +

    // 嘴巴
    '<path id="catMouth" d="M94,122 Q100,130 106,122" fill="none" stroke="#C5B5A5" stroke-width="1.6" stroke-linecap="round"/>' +

    // 舌头（默认隐藏）
    '<ellipse id="catTongue" cx="100" cy="128" rx="4" ry="5" fill="#FF8888" opacity="0" style="transition:opacity 0.2s"/>' +

    // 腮红
    '<ellipse cx="46" cy="112" rx="11" ry="6" fill="#FFD6D6" opacity="0.5"/>' +
    '<ellipse cx="154" cy="112" rx="11" ry="6" fill="#FFD6D6" opacity="0.5"/>' +

    '</svg>';


    // ==============================================
    //  🆕 心情系统
    // ==============================================
    function updateMood() {
        var h = new Date().getHours();
        var code = weatherCode;
        var old = mood;

        if (code >= 95 && code <= 99)     mood = 'scared';
        else if (code >= 61 && code <= 82) mood = 'sleepy';
        else if (code >= 51 && code <= 55) mood = 'lazy';
        else if (code === 3)               mood = 'lazy';
        else if (code === 0 && h >= 6 && h < 18) mood = 'energetic';
        else if (h >= 22 || h < 6)         mood = 'sleepy';
        else                               mood = 'happy';

        if (mood !== old) applyMoodPose();
    }

    function applyMoodPose() {
        // 清除所有体态
        dom.pet.classList.remove('stretch-mode','squish-mode','sleepy-face','scared-face',
            'thunder-mode','shiver-mode');
        if (dom.tongue) dom.tongue.setAttribute('opacity','0');
        if (dom.mouth) dom.mouth.setAttribute('d','M94,122 Q100,130 106,122');

        if (mood === 'energetic') {
            dom.pet.classList.add('stretch-mode');
        } else if (mood === 'sleepy') {
            dom.pet.classList.add('sleepy-face');
        } else if (mood === 'scared') {
            dom.pet.classList.add('scared-face');
            dom.pet.classList.add('squish-mode');
        } else if (mood === 'lazy') {
            dom.pet.classList.add('squish-mode');
        }
    }

    // ==============================================
    //  🆕 天气速览（点猫显示）
    // ==============================================
    function showWeatherSummary() {
        if (!weatherNow) {
            say(randomMsg(weatherCat), 3000);
            return;
        }
        var summary = weatherNow.desc + ' ' + weatherNow.temp + '°C';
        summary += ' · 湿度 ' + weatherNow.humidity + '%';
        summary += ' · 体感 ' + weatherNow.feelsLike + '°C';
        say(summary, 4000);
    }

    // ==============================================
    //  🆕 雨天主动预警
    // ==============================================
    function checkRainWarning() {
        if (!hourlyData || !hourlyData.time) return;

        var now = new Date();
        var warningTime = null;
        var warningCode = null;

        var len = Math.min(hourlyData.time.length, 4);
        for (var i = 0; i < len; i++) {
            var code = hourlyData.weather_code[i];
            if (code >= 51 && code <= 82 || code >= 95) {
                warningTime = new Date(hourlyData.time[i]);
                warningCode = code;
                break;
            }
        }

        if (!warningTime) return;

        var minutes = Math.round((warningTime - now) / 60000);
        var msg;
        if (minutes <= 0) {
            msg = '喵！现在在下雨，记得带伞！☂️';
        } else if (minutes < 60) {
            msg = '喵！' + minutes + '分钟后可能下雨，收衣服啦！🌧️';
        } else {
            msg = '喵~ ' + Math.round(minutes / 60) + '小时左右有雨，出门带伞哦~ ☔';
        }

        setTimeout(function() {
            say(msg, 5000);
            if (warningCode >= 95) setExpression('scared', 3000);
        }, 5000);
    }

    // ==============================================
    //  🆕 自动走路
    // ==============================================
    function scheduleAutoWalk() {
        clearTimeout(autoWalkTimer);
        if (mood === 'sleepy' || mood === 'scared') {
            // 犯困/害怕时不爱动，间隔更长
            autoWalkTimer = setTimeout(doWalk, 45000 + Math.random() * 60000);
            return;
        }
        var delay = 18000 + Math.random() * 35000;
        autoWalkTimer = setTimeout(doWalk, delay);
    }

    function doWalk() {
        if (dragging || isPurring) { scheduleAutoWalk(); return; }

        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var pw = isMobile ? 70 : 100;
        var ph = isMobile ? 84 : 120;
        var bottomMargin = isMobile ? 70 : 120;

        var targetX = 10 + Math.random() * (vw - pw - 20);
        var targetY = 20 + Math.random() * (vh - ph - bottomMargin);

        var dist = Math.sqrt(Math.pow(targetX - pos.x, 2) + Math.pow(targetY - pos.y, 2));
        if (dist < 80) { scheduleAutoWalk(); return; }

        dom.pet.classList.add('cat-walking');
        pos.x = targetX;
        pos.y = targetY;
        applyPos(true);

        setTimeout(function() {
            dom.pet.classList.remove('cat-walking');
            savePosition();
            scheduleAutoWalk();
        }, isMobile ? 700 : 1000);
    }

    // ==============================================
    //  🆕 早晚问候
    // ==============================================
    function morningGreeting() {
        if (greetingDone) return;
        greetingDone = true;

        var today = new Date().toDateString();
        try {
            var last = localStorage.getItem('catpet_last_greet');
            if (last === today) return;
            localStorage.setItem('catpet_last_greet', today);
        } catch(e) { return; }

        var h = new Date().getHours();
        var greeting = '';
        if (h >= 5 && h < 10) {
            greeting = '早安喵~ ☀️ 今天也要元气满满！';
            if (weatherNow) greeting += ' 最高' + weatherNow.temp + '°C~';
        } else if (h >= 18 && h < 22) {
            greeting = '晚上好喵~ 🌙 辛苦一天了，放松一下吧~';
        } else {
            return;
        }

        setTimeout(function() {
            dom.pet.classList.add('bouncing');
            setTimeout(function() { dom.pet.classList.remove('bouncing'); }, 500);
            spawnHearts(8);
            say(greeting, 4500);
        }, 3000);
    }

    // ==============================================
    //  🆕 撸猫检测 + 反馈
    // ==============================================
    function detectPetStroke(clientX, clientY) {
        var now = Date.now();
        var dx = Math.abs(clientX - petStrokeLastX);
        var dt = now - petStrokeLastTime;

        petStrokeLastX = clientX;
        petStrokeLastTime = now;

        // 快速滑动（100ms 内移动 > 25px）= 一次撸猫
        if (dt < 120 && dx > 22 && !isPurring) {
            petStrokeCount++;
            if (petStrokeCount >= 2) {
                triggerPurr();
                petStrokeCount = 0;
            }
        }

        // 超时重置计数
        if (dt > 500) petStrokeCount = 0;
    }

    function triggerPurr() {
        if (isPurring) return;
        isPurring = true;

        // 表情：开心眯眼
        setExpression('happy', 1200);

        // 爱心
        spawnHearts(6);

        // 呼噜气泡
        var msg = PET_MSGS[Math.floor(Math.random() * PET_MSGS.length)];
        say(msg, 2000);

        // 手机震动
        if (navigator.vibrate) {
            try { navigator.vibrate([15, 25, 15]); } catch(e) {}
        }

        // 身体微微抖动
        dom.svgWrap.style.transform = 'scaleX(1.06) scaleY(0.94)';
        setTimeout(function() {
            dom.svgWrap.style.transform = '';
            isPurring = false;
        }, 150);
    }

    // ==============================================
    //  🆕 游戏破纪录联动
    // ==============================================
    function onNewHighScore(score) {
        dom.pet.classList.add('bouncing');
        dom.pet.classList.add('double-tap-pop');
        setTimeout(function() { dom.pet.classList.remove('double-tap-pop'); }, 700);
        spawnHearts(18);
        setExpression('stars', 2500);
        say('喵!! ' + score + '分! 太厉害了!! 🏆🎉', 4000);
    }

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
        dom.head     = pet.querySelector('#catHeadEl');
        dom.eyes     = pet.querySelector('.cat-eyes-svg');
        dom.tail     = pet.querySelector('.cat-tail-svg');
        dom.bodyWrap = pet.querySelector('.cat-svg-wrap');
        dom.outfit   = pet.querySelector('#catOutfit');
        dom.pupilL   = pet.querySelector('#catPupilL');
        dom.pupilR   = pet.querySelector('#catPupilR');
        dom.irisL    = pet.querySelector('#catIrisL');
        dom.irisR    = pet.querySelector('#catIrisR');
        dom.mouth    = pet.querySelector('#catMouth');
        dom.tongue   = pet.querySelector('#catTongue');
        dom.nose     = pet.querySelector('#catNose');

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

    // ==============================================
    //  👀 眼神跟踪：瞳孔跟随光标/手指移动
    // ==============================================
    function updateEyeTracking() {
        if (!dom.pupilL || !dom.pupilR) return;

        var rect = dom.pet.getBoundingClientRect();
        var petCX = rect.left + rect.width / 2;
        var petCY = rect.top + rect.height * 0.42; // 眼睛大概在42%高度
        var svgScale = rect.width / 200; // SVG viewBox 是200宽

        // 光标到猫中心的偏移
        var dx = (cursorX - petCX) / svgScale;
        var dy = (cursorY - petCY) / svgScale;

        // 限制瞳孔移动半径（最多 4 SVG 单位）
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = 4.5;
        if (dist > maxDist) {
            dx = dx / dist * maxDist;
            dy = dy / dist * maxDist;
        }

        // 只在光标靠近时跟踪（200px 以内）
        var screenDist = Math.sqrt(
            Math.pow(cursorX - petCX, 2) + Math.pow(cursorY - petCY, 2)
        );
        if (screenDist > 250 || screenDist < 0) {
            // 光标太远 → 回正
            dx = 0; dy = 0;
        }

        // 更新瞳孔和虹膜位置
        var baseLX = 75, baseLY = 105;
        var baseRX = 125, baseRY = 105;
        dom.pupilL.setAttribute('cx', (baseLX + dx).toFixed(1));
        dom.pupilL.setAttribute('cy', (baseLY + dy).toFixed(1));
        dom.pupilR.setAttribute('cx', (baseRX + dx).toFixed(1));
        dom.pupilR.setAttribute('cy', (baseRY + dy).toFixed(1));
        dom.irisL.setAttribute('cx', (74 + dx * 0.7).toFixed(1));
        dom.irisL.setAttribute('cy', (103 + dy * 0.7).toFixed(1));
        dom.irisR.setAttribute('cx', (126 + dx * 0.7).toFixed(1));
        dom.irisR.setAttribute('cy', (103 + dy * 0.7).toFixed(1));
    }

    // ==============================================
    //  事件处理
    // ==============================================
    function getXY(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // 全局光标跟踪（不限于拖动）
    function onPointerMove(e) {
        var pt = getXY(e);
        cursorX = pt.x;
        cursorY = pt.y;
        if (!dragging) updateEyeTracking();
    }

    function onStart(e) {
        if (dragging) return;
        var pt = getXY(e);
        dragging = true;
        dragStart.px = pos.x;
        dragStart.py = pos.y;
        dragStart.cx = pt.x;
        dragStart.cy = pt.y;
        dragStart.lastX = pt.x;
        dragStart.lastY = pt.y;
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

        // 🆕 撸猫检测
        detectPetStroke(pt.x, pt.y);

        // 🏃 拖拽拉伸变形
        var moveDX = pt.x - dragStart.lastX;
        var moveDY = pt.y - dragStart.lastY;
        var speed = Math.sqrt(moveDX * moveDX + moveDY * moveDY);
        if (speed > 2) {
            var stretchX = 1 + Math.min(speed * 0.004, 0.15) * (moveDX > 0 ? 1 : -1);
            var stretchY = 1 - Math.min(speed * 0.003, 0.1);
            dom.svgWrap.style.transform = 'scaleX(' + stretchX.toFixed(2) + ') scaleY(' + stretchY.toFixed(2) + ')';
        }
        dragStart.lastX = pt.x;
        dragStart.lastY = pt.y;

        clampPos();
        applyPos(false);
        updateEyeTracking();
        e.preventDefault();
    }

    function onEnd(e) {
        if (!dragging) return;
        var dx = Math.abs(pos.x - dragStart.px);
        var dy = Math.abs(pos.y - dragStart.py);
        dragging = false;
        dom.pet.classList.remove('dragging');

        // 回弹
        dom.svgWrap.style.transform = 'scaleX(1.1) scaleY(0.9)';
        setTimeout(function() {
            dom.svgWrap.style.transform = '';
        }, 80);

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

    // ==============================================
    //  互动
    // ==============================================
    function onTap() {
        var now = Date.now();

        // 🎯 双击检测（500ms 内两次点击）
        if (now - lastTapTime < 500) {
            onDoubleTap();
            lastTapTime = 0;
            return;
        }
        lastTapTime = now;

        // 单次点击 → 天气速览
        dom.pet.classList.add('bouncing');
        setTimeout(function() { dom.pet.classList.remove('bouncing'); }, 500);

        spawnHearts(5);
        setExpression('happy', 600);
        showWeatherSummary();
    }

    function onDoubleTap() {
        // 大爱心爆发！
        spawnHearts(14);
        dom.pet.classList.add('double-tap-pop');
        setTimeout(function() { dom.pet.classList.remove('double-tap-pop'); }, 700);

        // 星星眼 ✨
        setExpression('stars', 1200);

        say('好开心喵!! 💖💖', 2500);
    }

    function spawnHearts(count) {
        count = count || 5;
        var rect = dom.pet.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + 24;
        var emojis = ['💕','💖','✨','💝','🐾','💛','💗','🩷','🌸','⭐'];

        for (var i = 0; i < count; i++) {
            var heart = document.createElement('span');
            heart.className = 'cat-heart';
            heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            heart.style.left = cx + (Math.random() - 0.5) * 80 + 'px';
            heart.style.top  = cy + 'px';
            heart.style.fontSize = (14 + Math.random() * 16) + 'px';
            heart.style.animationDuration = (0.6 + Math.random() * 1.2) + 's';
            heart.style.animationDelay = Math.random() * 0.2 + 's';
            document.body.appendChild(heart);
            heartPool.push(heart);

            setTimeout(function() {
                if (heart.parentNode) heart.parentNode.removeChild(heart);
                var idx = heartPool.indexOf(heart);
                if (idx >= 0) heartPool.splice(idx, 1);
            }, 2000 + i * 40);
        }
    }

    // ==============================================
    //  🎭 表情系统
    // ==============================================
    function setExpression(expr, duration) {
        // 清除旧表情
        dom.pet.classList.remove('happy-face', 'scared-face', 'sleepy-face', 'stars-face', 'tongue-face', 'dizzy-face');

        // 重置舌头
        if (dom.tongue) dom.tongue.setAttribute('opacity', '0');

        // 重置嘴巴
        if (dom.mouth) dom.mouth.setAttribute('d', 'M94,122 Q100,130 106,122');

        faceState = expr;

        switch (expr) {
            case 'happy':
                dom.pet.classList.add('happy-face');
                break;
            case 'scared':
                dom.pet.classList.add('scared-face');
                break;
            case 'sleepy':
                dom.pet.classList.add('sleepy-face');
                break;
            case 'stars':
                dom.pet.classList.add('stars-face');
                break;
            case 'tongue':
                dom.pet.classList.add('tongue-face');
                if (dom.tongue) dom.tongue.setAttribute('opacity', '1');
                break;
            case 'dizzy':
                dom.pet.classList.add('dizzy-face');
                break;
        }

        if (duration && duration > 0) {
            setTimeout(function() {
                if (faceState === expr) setExpression('', 0);
            }, duration);
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

    // ==============================================
    //  🌤️ 天气更新（配饰 + 体态 + 表情）
    // ==============================================
    function updateWeather(code, wxData) {
        if (code == null) return;
        weatherCode = code;
        weatherCat = getWeatherCat(code);
        if (wxData) weatherNow = wxData;
        updateMood();
        applyOutfit();
    }

    // 🆕 存储逐时数据（外部调用）
    function setHourlyData(hourly) {
        if (!hourly) return;
        hourlyData = hourly;
        checkRainWarning();
    }

    function applyOutfit() {
        var acc = dom.outfit;
        dom.pet.classList.remove('sleepy-face', 'scared-face', 'happy-face', 'stars-face', 'tongue-face',
            'dizzy-face', 'thunder-mode', 'shiver-mode', 'stretch-mode', 'squish-mode');

        if (dom.tongue) dom.tongue.setAttribute('opacity', '0');
        if (dom.mouth) dom.mouth.setAttribute('d', 'M94,122 Q100,130 106,122');

        var scale = isMobile ? 0.7 : 1;
        function es(size, top) {
            return 'font-size:' + Math.round(size * scale) + 'px;top:' + Math.round(top * scale) + 'px;';
        }

        switch (weatherCat) {
            case 'sunny':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(26, -4) + '">😎</span>';
                dom.pet.classList.add('stretch-mode'); // 晴天舒展
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
                dom.pet.classList.add('squish-mode'); // 雨天缩起来
                break;

            case 'snow':
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(26, -14) + '">🎩</span>';
                dom.pet.classList.add('shiver-mode'); // 雪天发抖
                break;

            case 'thunder':
                dom.pet.classList.add('scared-face');
                dom.pet.classList.add('thunder-mode');
                dom.pet.classList.add('squish-mode');
                acc.innerHTML = '<span class="cat-acc-emoji" style="' + es(20, -2) + '">⚡</span>';
                break;

            default:
                acc.innerHTML = '';
        }
    }

    // ==============================================
    //  🎬 闲时动作（更丰富）
    // ==============================================
    var idleActions = [
        function() { say(randomMsg(weatherCat), 3000); },
        function() {
            if (dom.tail) {
                dom.tail.classList.remove('idle');
                dom.tail.classList.add('wag');
                setTimeout(function(){ dom.tail.classList.remove('wag'); dom.tail.classList.add('idle'); }, 1400);
            }
        },
        function() { dom.pet.classList.add('blink-once'); setTimeout(function(){ dom.pet.classList.remove('blink-once'); }, 300); },
        function() { dom.pet.classList.add('bouncing'); setTimeout(function(){ dom.pet.classList.remove('bouncing'); }, 500); },
        function() { dom.pet.classList.add('tilt-head'); setTimeout(function(){ dom.pet.classList.remove('tilt-head'); }, 800); },
        // 新增闲时动作
        function() {
            // 打哈欠
            setExpression('tongue', 1500);
            dom.pet.classList.add('bouncing');
            setTimeout(function(){ dom.pet.classList.remove('bouncing'); }, 400);
        },
        function() {
            // 转圈圈
            dom.pet.classList.add('dizzy-face');
            setTimeout(function(){ dom.pet.classList.remove('dizzy-face'); }, 2000);
        },
        function() {
            // 快速眨眼两次
            dom.pet.classList.add('blink-once');
            setTimeout(function(){
                dom.pet.classList.remove('blink-once');
                setTimeout(function(){
                    dom.pet.classList.add('blink-once');
                    setTimeout(function(){ dom.pet.classList.remove('blink-once'); }, 250);
                }, 200);
            }, 300);
        },
        function() { /* 安静 */ }
    ];

    function startIdle() {
        clearInterval(idleTimer);
        idleTimer = setInterval(function() {
            if (dragging) return;
            var action = idleActions[Math.floor(Math.random() * idleActions.length)];
            action();
        }, 7000 + Math.random() * 11000);
    }

    // ---- 窗口大小变化 ----
    function onResize() {
        var wasMobile = isMobile;
        isMobile = window.innerWidth < 640;
        clampPos();
        applyPos(false);
        if (!isMobile) savePosition();
        if (wasMobile !== isMobile) applyOutfit();
    }

    // ==============================================
    //  🚀 初始化
    // ==============================================
    function init() {
        createDOM();
        initPosition();
        applyOutfit();
        startIdle();

        // 触摸/鼠标事件
        dom.pet.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove',  onMove,  { passive: false });
        document.addEventListener('touchend',   onEnd);
        dom.pet.addEventListener('mousedown',  onStart);
        window.addEventListener('mousemove',   onMove);
        window.addEventListener('mouseup',     onEnd);

        // 👀 眼神跟踪：监听全局光标
        window.addEventListener('mousemove',  onPointerMove);
        document.addEventListener('touchmove', onPointerMove, { passive: true });

        // 眼睛跟踪循环（60fps）
        var eyeLoop = function() {
            if (!dragging) updateEyeTracking();
            requestAnimationFrame(eyeLoop);
        };
        requestAnimationFrame(eyeLoop);

        window.addEventListener('resize', onResize);

        scheduleAutoWalk();
        morningGreeting();

        setTimeout(function() {
            say('嗨!我是天气小猫~ 喵呜! 💕', 3500);
        }, 2000);
    }

    function setWeather(code, wxData) {
        updateWeather(code, wxData);
        var msgs = SPEECH[weatherCat];
        if (msgs && msgs.length > 0 && Math.random() < 0.3) {
            setTimeout(function() {
                say(msgs[Math.floor(Math.random() * msgs.length)], 3000);
            }, 500);
        }
    }

    return {
        init: init,
        setWeather: setWeather,
        setHourlyData: setHourlyData,
        onNewHighScore: onNewHighScore,
        say: say
    };

})();

document.addEventListener('DOMContentLoaded', function() {
    CatPet.init();
});
