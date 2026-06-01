/* ============================================
 * 厦门天气小程序 — 背景天气特效模块
 * ============================================ */

(function() {

    var canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, particles = [], clouds = [], effect = 'clear', flashAlpha = 0, frame = 0, bgThrottle = 0;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // ---- 雨配置 ----
    var rainCfg = {
        'drizzle':      { rate:2, vMin:4, vMax:8,  wMin:-0.5, wMax:-1.5, sMin:0.3, sMax:0.7, lMin:6,  lMax:10, color:'#bedaf0', splash:false },
        'rain-light':   { rate:4, vMin:8, vMax:13, wMin:-1,   wMax:-2.5, sMin:0.5, sMax:1.2, lMin:10, lMax:16, color:'#a8cff0', splash:false },
        'rain-medium':  { rate:6, vMin:13,vMax:19, wMin:-1.5, wMax:-3.5, sMin:0.8, sMax:2.0, lMin:15, lMax:24, color:'#8abae8', splash:true  },
        'rain-heavy':   { rate:9, vMin:18,vMax:28, wMin:-2,   wMax:-5,   sMin:1.2, sMax:3.0, lMin:20, lMax:32, color:'#7aade0', splash:true  },
        'thunderstorm': { rate:10,vMin:16,vMax:26, wMin:-2,   wMax:-5,   sMin:1.0, sMax:2.8, lMin:18, lMax:30, color:'#7aade0', splash:true  }
    };

    var rainBg = [
        ['#2c3e50','#3d566e','#4a6a8a'],
        ['#1e3040','#2d4660','#3a5a7a'],
        ['#141e2e','#1e2e44','#283a58'],
        ['#0d1520','#152238','#1e2e48']
    ];

    // ---- 粒子生成 ----
    function spawn() {
        var cfg;
        switch (effect) {
            case 'drizzle': case 'rain-light': case 'rain-medium': case 'rain-heavy': case 'thunderstorm':
                cfg = rainCfg[effect];
                particles.push({
                    x: Math.random()*W*1.35-W*0.15, y: -30,
                    vx: cfg.wMin+Math.random()*(cfg.wMax-cfg.wMin),
                    vy: cfg.vMin+Math.random()*(cfg.vMax-cfg.vMin),
                    life: 60+Math.random()*100,
                    size: cfg.sMin+Math.random()*(cfg.sMax-cfg.sMin),
                    len: Math.floor(cfg.lMin+Math.random()*(cfg.lMax-cfg.lMin)),
                    type: 'drop', color: cfg.color, splash: cfg.splash
                });
                break;
            case 'clear':
                if (Math.random() < 0.5) particles.push({
                    x: Math.random()*W, y: H+20,
                    vx: (Math.random()-0.5)*0.4, vy: -1-Math.random()*2.5,
                    life: 150+Math.random()*250, size: 3+Math.random()*6,
                    type: 'mote',
                    color: Math.random()<0.5?'#ffd700':'#ffeaa7'
                });
                break;
            case 'snow':
                particles.push({
                    x: Math.random()*W, y: -10,
                    vx: (Math.random()-0.5)*0.6, vy: 1+Math.random()*2,
                    life: 300+Math.random()*400, size: 2.5+Math.random()*4.5,
                    type: 'snow', sway: Math.random()*Math.PI*2,
                    swSp: 0.008+Math.random()*0.025, swAmp: 0.5+Math.random()*2
                });
                break;
            case 'fog':
                if (Math.random() < 0.25) particles.push({
                    x: W+50, y: Math.random()*H*0.7,
                    vx: -0.3-Math.random()*0.5, vy: (Math.random()-0.5)*0.2,
                    life: 400+Math.random()*400, size: 80+Math.random()*140,
                    type: 'fog', alpha: 0.025+Math.random()*0.05
                });
                break;
        }
    }

    // ---- 初始化云朵 ----
    function initClouds() {
        clouds = [];
        for (var i = 0; i < 10; i++) {
            var n = 5 + Math.floor(Math.random() * 8), segs = [], baseR = 30 + Math.random() * 60;
            for (var j = 0; j < n; j++) {
                segs.push({
                    ox: (Math.random()-0.5)*baseR*2.2,
                    oy: (Math.random()-0.5)*baseR*0.6 - j*2,
                    r: baseR*(0.4+Math.random()*0.9)
                });
            }
            clouds.push({
                x: Math.random()*W, y: Math.random()*H*0.5,
                vx: -0.2-Math.random()*0.45,
                segs: segs, alpha: 0.55+Math.random()*0.4,
                shadowY: 4 + Math.random()*8
            });
        }
    }

    // ---- 设置天气效果 (暴露到全局) ----
    window.setBgEffect = function(code) {
        var next = CODE_TO_EFFECT[code] || 'clear';
        if (next !== effect) {
            effect = next;
            particles = [];
            if (effect === 'cloudy') initClouds();
        }
    };

    // ---- 飞溅 ----
    function splashAt(x, y) {
        for (var i = 0; i < 3; i++) {
            particles.push({
                x: x, y: y, vx: (Math.random()-0.5)*4, vy: -3-Math.random()*6,
                life: 8+Math.random()*14, size: 1+Math.random()*2.2, type: 'splash'
            });
        }
    }

    var rates = {
        drizzle:2, 'rain-light':4, 'rain-medium':6, 'rain-heavy':9,
        thunderstorm:10, clear:1, snow:2, fog:1, cloudy:0
    };

    // ---- 更新 ----
    function update() {
        frame++;
        var rate = rates[effect] || 1;
        for (var i = 0; i < rate; i++) spawn();

        for (var i = particles.length-1; i >= 0; i--) {
            var p = particles[i];
            p.life--;
            if (p.life <= 0) { particles.splice(i,1); continue; }

            switch (p.type) {
                case 'drop':
                    p.x += p.vx; p.y += p.vy;
                    if (p.y > H + 30) { particles.splice(i,1); continue; }
                    if (p.splash && p.y > H * 0.78 && Math.random() < 0.18) splashAt(p.x, p.y);
                    break;
                case 'splash': p.x += p.vx; p.y += p.vy; p.vy += 0.35; break;
                case 'mote': p.x += p.vx; p.y += p.vy; break;
                case 'snow':
                    p.sway += p.swSp;
                    p.x += p.vx + Math.sin(p.sway)*p.swAmp;
                    p.y += p.vy;
                    if (p.y > H+20) particles.splice(i,1);
                    break;
                case 'fog':
                    p.x += p.vx;
                    p.y += p.vy + Math.sin(frame*0.005+p.x*0.01)*0.15;
                    if (p.x < -250) particles.splice(i,1);
                    break;
            }
        }

        if (effect === 'cloudy') {
            for (var c = 0; c < clouds.length; c++) {
                clouds[c].x += clouds[c].vx;
                if (clouds[c].x < -350) {
                    clouds[c].x = W + 100 + Math.random()*200;
                    clouds[c].y = Math.random()*H*0.65;
                }
            }
        }

        if (effect === 'thunderstorm') {
            if (flashAlpha > 0) flashAlpha -= 0.05;
            if (Math.random() < 0.006) flashAlpha = 0.25 + Math.random() * 0.55;
        }
    }

    // ---- 绘制云 ----
    function drawCloud(cx, cy, segs, alpha, shadowY) {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#8fa4b8';
        for (var i = 0; i < segs.length; i++) {
            ctx.beginPath();
            ctx.arc(cx+segs[i].ox+3, cy+segs[i].oy+shadowY, segs[i].r*0.9, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = alpha;
        var grad = ctx.createRadialGradient(cx, cy-30, 10, cx, cy+20, 100);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#f0f4f8');
        grad.addColorStop(1, '#dce4ec');
        for (var i = 0; i < segs.length; i++) {
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx+segs[i].ox, cy+segs[i].oy, segs[i].r, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ---- 绘制 ----
    function draw() {
        ctx.clearRect(0, 0, W, H);
        var grad = ctx.createLinearGradient(0, 0, 0, H), palettes = {
            clear: ['#1a4a7a','#2d7ab8','#5bafe0'],
            cloudy: ['#4a6274','#7b8fa1','#b0bec5'],
            drizzle: rainBg[0], 'rain-light': rainBg[1], 'rain-medium': rainBg[2],
            'rain-heavy': rainBg[3], thunderstorm: rainBg[3],
            snow: ['#c8d6e5','#dfe6e9','#b2bec3'],
            fog: ['#a4b0be','#ced6e0','#dfe4ea']
        };
        var p = palettes[effect] || palettes.clear;
        grad.addColorStop(0, p[0]); grad.addColorStop(0.5, p[1]); grad.addColorStop(1, p[2]);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

        // 晴天太阳
        if (effect === 'clear') {
            var sx = W * 0.78, sy = H * 0.18, sr = Math.min(W, H) * 0.14;
            var sg = ctx.createRadialGradient(sx, sy, sr*0.3, sx, sy, sr*1.8);
            sg.addColorStop(0, 'rgba(255,240,200,0.95)');
            sg.addColorStop(0.4, 'rgba(255,200,80,0.5)');
            sg.addColorStop(0.7, 'rgba(255,150,30,0.1)');
            sg.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(sx, sy, sr*1.8, 0, Math.PI*2); ctx.fill();
        }

        // 云
        if (effect === 'cloudy') {
            for (var c = 0; c < clouds.length; c++) {
                drawCloud(clouds[c].x, clouds[c].y, clouds[c].segs, clouds[c].alpha, clouds[c].shadowY);
            }
        }

        // 粒子
        for (var i = 0; i < particles.length; i++) {
            var pt = particles[i];
            var alpha = Math.min(1, pt.life / 50);
            ctx.globalAlpha = alpha;

            switch (pt.type) {
                case 'drop':
                    ctx.strokeStyle = pt.color; ctx.lineWidth = pt.size;
                    ctx.beginPath();
                    ctx.moveTo(pt.x, pt.y);
                    ctx.lineTo(pt.x - pt.vx * 3, pt.y - pt.len);
                    ctx.stroke();
                    break;
                case 'splash':
                    ctx.fillStyle = '#c0dff8';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
                    ctx.fill();
                    break;
                case 'mote':
                    ctx.fillStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = pt.size*5;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    break;
                case 'snow':
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
                    ctx.fill();
                    break;
                case 'fog':
                    ctx.fillStyle = 'rgba(255,255,255,'+pt.alpha+')';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
                    ctx.fill();
                    break;
            }
        }
        ctx.globalAlpha = 1;

        // 闪电
        if (flashAlpha > 0) {
            ctx.fillStyle = 'rgba(255,255,255,'+flashAlpha+')';
            ctx.fillRect(0, 0, W, H);
        }
    }

    // ---- 循环（每2帧更新一次 = 30fps逻辑） ----
    function loop() {
        bgThrottle++;
        if (bgThrottle % 2 === 0) update();
        draw();
        requestAnimationFrame(loop);
    }

    initClouds();
    loop();

})();
