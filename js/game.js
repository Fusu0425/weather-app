/* ============================================
 * 厦门天气小程序 — 接雨滴游戏模块
 * ============================================ */

var Game = (function() {

    var canvas, ctx, scoreEl, highScoreEl, gameOverEl;
    var BASE_W = GAME_CONFIG.BASE_W;
    var BASE_H = GAME_CONFIG.BASE_H;
    var W = BASE_W, H = BASE_H, scale = 1;

    var playerX, playerH;
    var score = 0, level = 0, highScore = 0;
    var gameOver = false, frame = 0;
    var shieldFrames = 0, levelUpFlash = 0;
    var drops = [], particles = [], floatTexts = [];
    var buildings = [];
    var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var keysDown = {};

    // ---- 辅助函数 ----
    function getSpeed() {
        return (GAME_CONFIG.SPEED_BASE + level * GAME_CONFIG.SPEED_PER_LEVEL) *
            (isTouch ? GAME_CONFIG.TOUCH_SPEED_MUL : 1.0);
    }

    function getSpawnRate() {
        return Math.max(
            GAME_CONFIG.SPAWN_RATE_MIN,
            GAME_CONFIG.SPAWN_RATE_BASE - level * GAME_CONFIG.SPAWN_RATE_PER_LEVEL
        );
    }

    function getLightningChance() {
        return Math.min(
            GAME_CONFIG.LIGHTNING_MAX,
            GAME_CONFIG.LIGHTNING_BASE + level * GAME_CONFIG.LIGHTNING_PER_LEVEL
        );
    }

    function spawnDrop() {
        var s = getSpeed();
        var isLightning = Math.random() < getLightningChance();
        return {
            x: Math.random() * (W - 30) + 15, y: -20,
            r: (isLightning ? 8 : 6) * scale,
            type: isLightning ? 'lightning' : 'rain',
            speed: (isLightning ? s * 1.4 : s * (0.6 + Math.random() * 0.7)) * scale
        };
    }

    function addParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var vel = (1.5 + Math.random() * 4) * scale;
            particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel - 2 * scale,
                life: 30 + Math.random() * 20,
                color: color,
                r: (1.5 + Math.random() * 2.5) * scale
            });
        }
    }

    function addFloatText(x, y, text, color) {
        floatTexts.push({ x: x, y: y, text: text, color: color, life: 100, vy: -0.8 * scale });
    }

    // ---- 高分管理 ----
    function loadHighScore() {
        try { return parseInt(localStorage.getItem('xiamen-weather-high-score')) || 0; }
        catch (e) { return 0; }
    }

    function saveHighScore() {
        try { localStorage.setItem('xiamen-weather-high-score', highScore); } catch (e) {}
    }

    function updateHighScore() {
        if (score > highScore) {
            highScore = score;
            saveHighScore();
            if (highScoreEl) highScoreEl.textContent = highScore;
        }
    }

    // ---- Canvas 尺寸调整 ----
    function resizeCanvas() {
        if (!canvas) return;
        var maxW = Math.min(canvas.parentElement.clientWidth - 24, BASE_W);
        scale = maxW / BASE_W;
        W = maxW;
        H = Math.floor(BASE_H * scale);
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = maxW + 'px';
        canvas.style.height = H + 'px';
        generateBuildings();
    }

    // ---- 建筑生成（预计算窗户状态，防闪烁） ----
    function generateBuildings(keepExisting) {
        if (!keepExisting) buildings = [];
        var bx = buildings.length > 0 ? buildings[buildings.length - 1].x + buildings[buildings.length - 1].w + 2 * scale : 0;
        while (bx < W + 120) {
            var bw = 18 * scale + Math.random() * 35 * scale;
            var bh = 25 * scale + Math.random() * 65 * scale;
            var wins = Math.floor(bw / (8 * scale));
            var litWindows = [];
            for (var wi = 0; wi < wins; wi++) {
                litWindows.push(Math.random() < 0.55);
            }
            buildings.push({ x: bx, w: bw, h: bh, wins: wins, lit: litWindows });
            bx += bw + 2 * scale;
        }
        // 剪枝：移除左侧完全离屏的建筑
        while (buildings.length > 0 && buildings[0].x + buildings[0].w < -20) {
            buildings.shift();
        }
    }

    // ---- 重置游戏 ----
    function reset() {
        resizeCanvas();
        playerX = W / 2;
        playerH = 50 * scale;
        score = 0; level = 0;
        gameOver = false; frame = 0;
        shieldFrames = 0; levelUpFlash = 0;
        drops = []; particles = []; floatTexts = [];
        if (scoreEl) scoreEl.textContent = '0';
    }

    // ---- 坐标计算 ----
    function getPos(e) {
        if (!canvas) return playerX;
        var rect = canvas.getBoundingClientRect();
        var cx = e.touches ? e.touches[0].clientX : e.clientX;
        return (cx - rect.left) * (W / rect.width);
    }

    // ---- 事件绑定 ----
    function bindEvents() {
        if (!canvas) return;

        canvas.addEventListener('mousemove', function(e) {
            if (!gameOver) playerX = getPos(e);
        });

        canvas.addEventListener('touchmove', function(e) {
            if (!gameOver) { e.preventDefault(); playerX = getPos(e); }
        }, { passive: false });

        canvas.addEventListener('touchstart', function(e) {
            if (!gameOver) { e.preventDefault(); playerX = getPos(e); }
        }, { passive: false });

        canvas.addEventListener('click', function() {
            if (gameOver) reset();
        });

        var restartBtn = document.getElementById('restartBtn');
        if (restartBtn) restartBtn.addEventListener('click', reset);

        // 键盘控制
        document.addEventListener('keydown', function(e) {
            keysDown[e.key] = true;
        });
        document.addEventListener('keyup', function(e) {
            keysDown[e.key] = false;
        });
    }

    // ---- 更新 ----
    function update() {
        if (gameOver) return;

        // 键盘移动
        var moveSpeed = 8 * scale;
        if (keysDown['ArrowLeft'] || keysDown['a'] || keysDown['A']) {
            playerX -= moveSpeed;
        }
        if (keysDown['ArrowRight'] || keysDown['d'] || keysDown['D']) {
            playerX += moveSpeed;
        }
        playerX = Math.max(20 * scale, Math.min(W - 20 * scale, playerX));

        frame++;
        if (shieldFrames > 0) shieldFrames--;
        if (levelUpFlash > 0) levelUpFlash--;

        if (frame % getSpawnRate() === 0) drops.push(spawnDrop());

        var cleared = false;
        for (var i = drops.length - 1; i >= 0; i--) {
            if (cleared) break;

            drops[i].y += drops[i].speed;
            if (drops[i].y > H + 25 * scale) { drops.splice(i, 1); continue; }

            var groundY = H - 28 * scale;
            var canopyCY = groundY - playerH + 10 * scale - 8 * scale;
            var dx = drops[i].x - playerX;
            var dy = drops[i].y - canopyCY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var catchDist = drops[i].r + 35 * scale;

            if (dist < catchDist) {
                if (drops[i].type === 'lightning') {
                    if (shieldFrames > 0) {
                        addParticles(drops[i].x, drops[i].y, '#ffdd00', 20);
                        addFloatText(drops[i].x, drops[i].y, '格挡!', '#ffdd00');
                        drops.splice(i, 1); continue;
                    }
                    gameOver = true;
                    updateHighScore();
                    drops.splice(i, 1); continue;
                }

                score += GAME_CONFIG.SCORE_PER_DROP;
                if (scoreEl) scoreEl.textContent = score;
                addParticles(drops[i].x, drops[i].y, '#4dc9f6', 6);
                drops.splice(i, 1);

                var newLevel = Math.floor(score / GAME_CONFIG.SCORE_PER_LEVEL);
                if (newLevel > level) {
                    level = newLevel;
                    shieldFrames = GAME_CONFIG.SHIELD_FRAMES;
                    levelUpFlash = 35;
                    addParticles(playerX, canopyCY, '#ffd700', 50);
                    addFloatText(W / 2, H / 2 - 15 * scale, 'LEVEL ' + (level + 1) + '!', '#ffd700');
                    addFloatText(W / 2, H / 2 + 15 * scale, '+20分 | 护盾3秒', '#ffffff');
                    score += GAME_CONFIG.LEVEL_BONUS;
                    if (scoreEl) scoreEl.textContent = score;
                    drops = []; cleared = true;
                }
            }
        }

        // 粒子更新
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // 浮动文字更新
        for (var i = floatTexts.length - 1; i >= 0; i--) {
            var ft = floatTexts[i];
            ft.y += ft.vy;
            ft.life--;
            if (ft.life <= 0) floatTexts.splice(i, 1);
        }
    }

    // ---- 绘制 ----
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);

        // 夜空渐变
        var skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        var intensity = Math.min(1, 0.12 + level * 0.06);
        skyGrad.addColorStop(0, '#0a0a1e');
        skyGrad.addColorStop(0.35, '#12122e');
        skyGrad.addColorStop(0.65, '#1a1a3a');
        skyGrad.addColorStop(1, 'rgba(18,25,44,' + (1 - intensity * 0.25) + ')');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // 月亮
        var mx = W - 55 * scale, my = 40 * scale, mr = 22 * scale;
        var moonGrad = ctx.createRadialGradient(mx - 3 * scale, my - 3 * scale, mr * 0.1, mx, my, mr * 1.3);
        moonGrad.addColorStop(0, '#fffef0');
        moonGrad.addColorStop(0.5, '#fef9d0');
        moonGrad.addColorStop(1, 'rgba(254,240,180,0)');
        ctx.fillStyle = moonGrad;
        ctx.beginPath(); ctx.arc(mx, my, mr * 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0a0a1e';
        ctx.beginPath(); ctx.arc(mx + mr * 0.25, my - mr * 0.15, mr, 0, Math.PI * 2); ctx.fill();

        // 星星
        ctx.fillStyle = '#fff';
        for (var i = 0; i < 35; i++) {
            var sx = (i * 173 + 37) % W, sy = (i * 89 + 13) % (H * 0.55);
            var twinkle = 0.25 + (Math.sin(frame * 0.015 + i * 2.7) + 1) * 0.4;
            ctx.globalAlpha = twinkle;
            var sr = (0.4 + (i % 3) * 0.45) * scale;
            ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
            if (i < 5 && sr > 0.8 * scale) {
                ctx.globalAlpha = twinkle * 0.5;
                ctx.beginPath(); ctx.arc(sx, sy, sr * 2.2, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // 雨滴和闪电
        for (var d = 0; d < drops.length; d++) {
            var drop = drops[d];
            if (drop.type === 'lightning') {
                ctx.fillStyle = '#ffdd00';
                ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 10 * scale;
                ctx.beginPath();
                var fy = drop.y, sr2 = 4 * scale;
                ctx.moveTo(drop.x - sr2, fy - 12 * scale);
                ctx.lineTo(drop.x + sr2 * 0.5, fy - 2 * scale);
                ctx.lineTo(drop.x - sr2 * 0.25, fy - 2 * scale);
                ctx.lineTo(drop.x + sr2 * 1.25, fy + 10 * scale);
                ctx.lineTo(drop.x - sr2 * 0.5, fy + 2 * scale);
                ctx.lineTo(drop.x + sr2 * 0.5, fy + 2 * scale);
                ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#5bb8f0'; ctx.beginPath();
                var r = drop.r;
                ctx.moveTo(drop.x, drop.y + r);
                ctx.arc(drop.x - r * 0.5, drop.y, r * 0.5, 0, Math.PI * 2);
                ctx.arc(drop.x + r * 0.5, drop.y, r * 0.5, 0, Math.PI * 2);
                ctx.moveTo(drop.x - r * 0.3, drop.y - r * 0.2);
                ctx.lineTo(drop.x, drop.y - r * 1.25);
                ctx.lineTo(drop.x + r * 0.3, drop.y - r * 0.2);
                ctx.fill();
            }
        }

        // 粒子
        for (var p = 0; p < particles.length; p++) {
            var pt = particles[p];
            ctx.globalAlpha = pt.life / 50; ctx.fillStyle = pt.color;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 浮动文字
        for (var f = 0; f < floatTexts.length; f++) {
            var ft = floatTexts[f];
            ctx.globalAlpha = Math.min(1, ft.life / 40);
            ctx.fillStyle = ft.color;
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y); ctx.textAlign = 'start';
        }
        ctx.globalAlpha = 1;

        // 升级闪光
        if (levelUpFlash > 0) {
            ctx.fillStyle = 'rgba(255,215,0,' + (levelUpFlash / 35 * 0.3) + ')';
            ctx.fillRect(0, 0, W, H);
        }

        // 地面
        var groundY = H - 28 * scale;
        var gndGrad = ctx.createLinearGradient(0, groundY, 0, H);
        gndGrad.addColorStop(0, '#1a1e2e');
        gndGrad.addColorStop(0.3, '#141824');
        gndGrad.addColorStop(1, '#0c0f18');
        ctx.fillStyle = gndGrad;
        ctx.fillRect(0, groundY, W, H - groundY);

        // 城市剪影（增量生成 + 预计算窗户，不闪烁）
        if (buildings.length === 0 || buildings[buildings.length - 1].x < W + 100) {
            generateBuildings(true);
        }
        // 剪枝：移除完全离屏的建筑
        while (buildings.length > 0 && buildings[0].x + buildings[0].w < -20) {
            buildings.shift();
        }
        ctx.fillStyle = '#0d1118';
        for (var b = 0; b < buildings.length; b++) {
            var bd = buildings[b];
            if (bd.x + bd.w < 0 || bd.x > W) continue;
            ctx.fillRect(bd.x, groundY - bd.h, bd.w, bd.h);
            if (bd.wins > 0 && bd.h > 25 * scale) {
                for (var wi = 0; wi < bd.wins; wi++) {
                    if (bd.lit[wi]) {
                        var wx = bd.x + 3 * scale + wi * (bd.w / bd.wins);
                        var wy = groundY - bd.h + 8 * scale + (wi % 2) * 14 * scale;
                        ctx.fillStyle = (wi % 3 === 0) ? '#ffe9a0' : '#fddc7a';
                        ctx.globalAlpha = 0.7;
                        ctx.fillRect(wx, wy, 2.5 * scale, 3.5 * scale);
                    }
                }
                ctx.globalAlpha = 1;
            }
        }
        ctx.fillStyle = '#0d1118';

        // === 雨伞 + 蜡笔小新 ===
        var ux = playerX;
        var umbrellaCY = groundY - playerH + 10 * scale - 8 * scale;
        var umbrellaR = 35 * scale;

        // 护盾光环
        if (shieldFrames > 0) {
            var sa = 0.25 + Math.sin(frame * 0.3) * 0.15;
            ctx.strokeStyle = 'rgba(255,215,0,' + sa + ')'; ctx.lineWidth = 4 * scale;
            ctx.beginPath(); ctx.arc(ux, umbrellaCY, 45 * scale, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 2 * scale;
            ctx.strokeStyle = 'rgba(255,255,255,' + (sa * 0.5) + ')';
            ctx.beginPath(); ctx.arc(ux, umbrellaCY, 43 * scale, 0, Math.PI * 2); ctx.stroke();
        }

        // 伞面
        ctx.fillStyle = '#e74c3c'; ctx.beginPath();
        ctx.arc(ux, umbrellaCY, umbrellaR, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#f39c12'; ctx.beginPath();
        ctx.arc(ux - 12 * scale, umbrellaCY, umbrellaR, Math.PI, Math.PI + 0.35);
        ctx.lineTo(ux - 10 * scale, umbrellaCY - 12 * scale); ctx.fill();
        ctx.fillStyle = '#c0392b'; ctx.beginPath();
        ctx.arc(ux + 12 * scale, umbrellaCY, umbrellaR, Math.PI - 0.35, 0);
        ctx.lineTo(ux + 10 * scale, umbrellaCY - 12 * scale); ctx.fill();

        // 伞杆
        ctx.strokeStyle = '#5a2d0c'; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.moveTo(ux, umbrellaCY); ctx.lineTo(ux, groundY - 16 * scale); ctx.stroke();

        // === 蜡笔小新 ===
        var sx = ux;
        var hdR = 10 * scale;
        var hdCX = sx, hdCY = groundY - 28 * scale;
        var skin = '#fddcb5', hair = '#1a1a1a';
        var shirtR = '#e74c3c', shortsY = '#f5c842';

        // 鞋
        ctx.fillStyle = '#f0d050';
        ctx.save(); ctx.translate(sx - 5 * scale, groundY - 1 * scale); ctx.scale(1, 0.55);
        ctx.beginPath(); ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(sx + 5 * scale, groundY - 1 * scale); ctx.scale(1, 0.55);
        ctx.beginPath(); ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();

        // 袜子白边
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx - 7 * scale, groundY - 6 * scale, 6 * scale, 2 * scale);
        ctx.fillRect(sx + 1 * scale, groundY - 6 * scale, 6 * scale, 2 * scale);

        // 腿
        ctx.fillStyle = skin;
        ctx.fillRect(sx - 7 * scale, groundY - 11 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(sx + 1 * scale, groundY - 11 * scale, 6 * scale, 6 * scale);

        // 黄短裤
        ctx.fillStyle = shortsY;
        ctx.beginPath();
        ctx.moveTo(sx - 9 * scale, groundY - 11 * scale);
        ctx.lineTo(sx + 9 * scale, groundY - 11 * scale);
        ctx.lineTo(sx + 11 * scale, groundY - 15 * scale);
        ctx.lineTo(sx + 8 * scale, groundY - 15 * scale);
        ctx.lineTo(sx - 8 * scale, groundY - 15 * scale);
        ctx.lineTo(sx - 11 * scale, groundY - 15 * scale);
        ctx.closePath(); ctx.fill();

        // 红T恤
        ctx.fillStyle = shirtR;
        ctx.beginPath();
        ctx.moveTo(sx - 9 * scale, groundY - 15 * scale);
        ctx.lineTo(sx + 9 * scale, groundY - 15 * scale);
        ctx.lineTo(sx + 7 * scale, groundY - 25 * scale);
        ctx.lineTo(sx - 7 * scale, groundY - 25 * scale);
        ctx.closePath(); ctx.fill();

        // 领口
        ctx.fillStyle = shortsY;
        ctx.beginPath();
        ctx.moveTo(sx - 5 * scale, groundY - 24 * scale);
        ctx.lineTo(sx + 5 * scale, groundY - 24 * scale);
        ctx.lineTo(sx, groundY - 20 * scale);
        ctx.closePath(); ctx.fill();

        // 左臂
        ctx.fillStyle = skin;
        ctx.save(); ctx.translate(sx - 11 * scale, groundY - 23 * scale); ctx.rotate(-0.6);
        ctx.fillRect(0, -2.5 * scale, 12 * scale, 5 * scale); ctx.restore();
        ctx.beginPath(); ctx.arc(sx - 20 * scale, groundY - 28 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();

        // 右臂
        ctx.save(); ctx.translate(sx + 11 * scale, groundY - 25 * scale); ctx.rotate(0.7);
        ctx.fillRect(0, -2.5 * scale, 10 * scale, 5 * scale); ctx.restore();
        ctx.beginPath(); ctx.arc(sx + 3 * scale, hdCY - 4 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();

        // 大圆脸
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(hdCX, hdCY, hdR, 0, Math.PI * 2); ctx.fill();

        // 耳朵
        ctx.beginPath(); ctx.arc(hdCX - hdR, hdCY - 1 * scale, 4 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hdCX + hdR, hdCY - 1 * scale, 4 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.8 * scale;
        ctx.beginPath(); ctx.arc(hdCX - hdR, hdCY - 1 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(hdCX + hdR, hdCY - 1 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.stroke();

        // 头发
        ctx.fillStyle = hair;
        ctx.beginPath();
        var ht = hdCY - hdR;
        ctx.moveTo(hdCX - hdR + 2 * scale, ht + 5 * scale);
        ctx.lineTo(hdCX - hdR + 3 * scale, ht - 2 * scale);
        ctx.lineTo(hdCX - 7 * scale, ht - 1 * scale);
        ctx.lineTo(hdCX - 5 * scale, ht - 5 * scale);
        ctx.lineTo(hdCX - 3 * scale, ht - 3 * scale);
        ctx.lineTo(hdCX, ht - 7 * scale);
        ctx.lineTo(hdCX + 2 * scale, ht - 3 * scale);
        ctx.lineTo(hdCX + 5 * scale, ht - 6 * scale);
        ctx.lineTo(hdCX + 7 * scale, ht - 1 * scale);
        ctx.lineTo(hdCX + hdR - 3 * scale, ht - 3 * scale);
        ctx.lineTo(hdCX + hdR - 1 * scale, ht + 4 * scale);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.arc(hdCX - hdR + 2 * scale, hdCY - 3 * scale, 5 * scale, 1.4 * Math.PI, 0.1 * Math.PI);
        ctx.arc(hdCX + hdR - 2 * scale, hdCY - 3 * scale, 5 * scale, 0.9 * Math.PI, 1.6 * Math.PI);
        ctx.fill();

        // 粗眉毛
        ctx.fillStyle = hair; ctx.lineWidth = 3.5 * scale; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hdCX - 9 * scale, hdCY - 0 * scale); ctx.lineTo(hdCX - 2 * scale, hdCY - 5 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hdCX + 9 * scale, hdCY - 0 * scale); ctx.lineTo(hdCX + 2 * scale, hdCY - 5 * scale); ctx.stroke();

        // 大眼睛
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(hdCX - 5 * scale, hdCY + 0.5 * scale, 3.5 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hdCX + 5 * scale, hdCY + 0.5 * scale, 3.5 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hair;
        ctx.beginPath(); ctx.arc(hdCX - 5 * scale, hdCY + 0.5 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hdCX + 5 * scale, hdCY + 0.5 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(hdCX - 3.5 * scale, hdCY - 1 * scale, 1 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hdCX + 6.5 * scale, hdCY - 1 * scale, 1 * scale, 0, Math.PI * 2); ctx.fill();

        // 鼻子
        ctx.fillStyle = hair;
        ctx.beginPath(); ctx.arc(hdCX, hdCY + 3 * scale, 1.2 * scale, 0, Math.PI * 2); ctx.fill();

        // 嘴巴
        ctx.strokeStyle = hair; ctx.lineWidth = 1.5 * scale; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(hdCX + 1 * scale, hdCY + 7 * scale, 3 * scale, 0.15 * Math.PI, 1.0 * Math.PI); ctx.stroke();
        ctx.lineWidth = 1 * scale;
        ctx.beginPath(); ctx.moveTo(hdCX + 3.5 * scale, hdCY + 9.5 * scale); ctx.lineTo(hdCX + 5 * scale, hdCY + 8.5 * scale); ctx.stroke();

        // 腮红
        ctx.fillStyle = 'rgba(255,140,130,0.4)';
        ctx.beginPath(); ctx.arc(hdCX - 8 * scale, hdCY + 4 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hdCX + 8 * scale, hdCY + 4 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();

        // === HUD ===
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        var hudW = W - 16 * scale, hudH = 44 * scale, hudX = 8 * scale, hudY = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(hudX + 12 * scale, hudY);
        ctx.lineTo(hudX + hudW - 12 * scale, hudY);
        ctx.quadraticCurveTo(hudX + hudW, hudY, hudX + hudW, hudY + 12 * scale);
        ctx.lineTo(hudX + hudW, hudY + hudH - 12 * scale);
        ctx.quadraticCurveTo(hudX + hudW, hudY + hudH, hudX + hudW - 12 * scale, hudY + hudH);
        ctx.lineTo(hudX + 12 * scale, hudY + hudH);
        ctx.quadraticCurveTo(hudX, hudY + hudH, hudX, hudY + hudH - 12 * scale);
        ctx.lineTo(hudX, hudY + 12 * scale);
        ctx.quadraticCurveTo(hudX, hudY, hudX + 12 * scale, hudY);
        ctx.fill();

        // LV 标签
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold ' + Math.floor(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Lv.' + (level + 1), hudX + 10 * scale, hudY + 18 * scale);

        // 进度条
        var barX = hudX + 58 * scale, barW = hudW - 120 * scale, barH = 5 * scale, barY = hudY + 13 * scale;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(barX + barH, barY);
        ctx.lineTo(barX + barW - barH, barY);
        ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + barH / 2);
        ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - barH, barY + barH);
        ctx.lineTo(barX + barH, barY + barH);
        ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH / 2);
        ctx.quadraticCurveTo(barX, barY, barX + barH, barY);
        ctx.fill();
        var progress = Math.min(1, (score % 100) / 100);
        if (progress > 0) {
            var pgGrad = ctx.createLinearGradient(barX, 0, barX + barW * progress, 0);
            pgGrad.addColorStop(0, '#667eea');
            pgGrad.addColorStop(1, '#a29bfe');
            ctx.fillStyle = pgGrad;
            var fillW = Math.max(barH * 2, barW * progress);
            ctx.beginPath();
            ctx.moveTo(barX + barH, barY);
            ctx.lineTo(barX + fillW - barH, barY);
            ctx.quadraticCurveTo(barX + fillW, barY, barX + fillW, barY + barH / 2);
            ctx.quadraticCurveTo(barX + fillW, barY + barH, barX + fillW - barH, barY + barH);
            ctx.lineTo(barX + barH, barY + barH);
            ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH / 2);
            ctx.quadraticCurveTo(barX, barY, barX + barH, barY);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = Math.floor(9 * scale) + 'px sans-serif';
        var remain = (level + 1) * 100 - score;
        ctx.fillText(remain + ' 分升级', barX + barW + 5 * scale, hudY + 18 * scale);

        // 护盾
        if (shieldFrames > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('🛡 ' + Math.ceil(shieldFrames / 30) + 's', W - 60 * scale, hudY + 18 * scale);
        }

        // Game Over
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.floor(28 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束', W / 2, H / 2 - 15 * scale);
            ctx.font = Math.floor(14 * scale) + 'px sans-serif';
            ctx.fillText('得分: ' + score + '  Lv.' + (level + 1), W / 2, H / 2 + 18 * scale);
            if (score >= highScore && score > 0) {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('🏆 新最高分!', W / 2, H / 2 + 45 * scale);
            } else {
                ctx.fillStyle = '#aaa';
                ctx.fillText('最高分: ' + highScore, W / 2, H / 2 + 45 * scale);
            }
            ctx.textAlign = 'start';
        }
    }

    // ---- 游戏循环（页面隐藏时暂停） ----
    function loop() {
        if (!document.hidden) {
            update();
            draw();
        }
        requestAnimationFrame(loop);
    }

    // ---- 初始化 ----
    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        scoreEl = document.getElementById('score');
        highScoreEl = document.getElementById('highScore');

        highScore = loadHighScore();
        if (highScoreEl) highScoreEl.textContent = highScore;

        resizeCanvas();
        playerX = W / 2;
        playerH = 50 * scale;
        generateBuildings();
        bindEvents();
        loop();
    }

    // ---- 分享战绩 ----
    function shareScore() {
        var text = '🏆 我在「厦门天气」接雨滴得了 ' + score + ' 分！Lv.' + (level + 1);
        if (score >= highScore && score > 0) {
            text += ' 🎉新纪录！';
        }
        text += ' 快来挑战我吧~ ☔\n\nhttps://fusu0425.github.io/weather-app/';

        // Web Share API（手机浏览器支持）
        if (navigator.share) {
            navigator.share({ title: '厦门天气 · 接雨滴', text: text }).catch(function(){});
            return;
        }

        // 桌面端回退：复制到剪贴板
        copyToClipboard(text);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('✅ 战绩已复制，去粘贴分享吧！');
            }).catch(function() {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('✅ 战绩已复制，去粘贴分享吧！'); }
        catch(e) { showToast('⚠️ 复制失败，请截图分享吧'); }
        document.body.removeChild(ta);
    }

    function showToast(msg) {
        var existing = document.getElementById('appToast');
        if (existing) { existing.remove(); }
        var t = document.createElement('div');
        t.id = 'appToast';
        t.textContent = msg;
        document.body.appendChild(t);
        t.offsetHeight;
        t.classList.add('show');
        setTimeout(function() {
            t.classList.remove('show');
            setTimeout(function() { if (t.parentNode) t.remove(); }, 400);
        }, 2000);
    }

    // ---- 数据导出 ----
    function exportAllData() {
        var data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            highScore: loadHighScore(),
            recentCities: (function() {
                try { return JSON.parse(localStorage.getItem('weather_recent_cities')) || []; }
                catch(e) { return []; }
            })(),
            catPetPos: (function() {
                try { return JSON.parse(localStorage.getItem('catpet_pos')) || null; }
                catch(e) { return null; }
            })()
        };

        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '厦门天气_数据备份_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('💾 数据已导出，请妥善保存');
    }

    // ---- 数据导入 ----
    function importAllData(callback) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', function() {
            var file = input.files[0];
            if (!file) { document.body.removeChild(input); return; }

            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    if (!data.version) throw new Error('无效的备份文件');

                    // 恢复数据
                    if (typeof data.highScore === 'number') {
                        var current = loadHighScore();
                        if (data.highScore > current) {
                            highScore = data.highScore;
                            saveHighScore();
                            if (highScoreEl) highScoreEl.textContent = highScore;
                        }
                    }
                    if (Array.isArray(data.recentCities)) {
                        localStorage.setItem('weather_recent_cities', JSON.stringify(data.recentCities));
                    }
                    if (data.catPetPos && typeof data.catPetPos.x === 'number') {
                        localStorage.setItem('catpet_pos', JSON.stringify(data.catPetPos));
                    }

                    showToast('✅ 数据恢复成功！刷新后小猫位置也会恢复~');
                    if (callback) callback();

                    // 刷新城市列表
                    if (window.App && App.refreshWeather) {
                        App.refreshWeather();
                    }
                } catch(err) {
                    showToast('⚠️ 文件格式不正确，请检查');
                }
            };
            reader.readAsText(file);
            document.body.removeChild(input);
        });

        input.click();
    }

    // 暴露到全局 (供 App 调用)
    return {
        init: init,
        shareScore: shareScore,
        exportData: exportAllData,
        importData: importAllData,
        isGameOver: function() { return gameOver; },
        getScore: function() { return score; },
        getLevel: function() { return level; },
        getHighScore: function() { return highScore; }
    };

})();
