from PIL import Image, ImageDraw
import math, os

SIZES = [256, 128, 64, 48, 32, 16]
OUTPUT = os.path.join(os.path.dirname(__file__), "static", "app.ico")


def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = size
    h = size
    r = w / 2

    # 背景圆 - 天空渐变 (用多层同心圆模拟渐变)
    sky_colors = [
        (79, 172, 254), (0, 190, 254), (0, 210, 240), (67, 210, 180)
    ]
    steps = len(sky_colors)
    for i, color in enumerate(sky_colors):
        rr = r * (1 - i / (steps * 1.3))
        d.ellipse([r - rr, r - rr * 0.85, r + rr, r + rr * 0.85], fill=color)

    # 太阳 - 右上角
    sun_cx = int(w * 0.32)
    sun_cy = int(h * 0.28)
    sun_r = int(w * 0.14)
    # 光芒
    ray_len = int(sun_r * 1.55)
    for angle_deg in range(0, 360, 45):
        rad = math.radians(angle_deg)
        x1 = sun_cx + sun_r * 0.95 * math.cos(rad)
        y1 = sun_cy + sun_r * 0.95 * math.sin(rad)
        x2 = sun_cx + ray_len * math.cos(rad)
        y2 = sun_cy + ray_len * math.sin(rad)
        d.line([x1, y1, x2, y2], fill=(255, 154, 0, 220), width=max(2, size // 30))
    d.ellipse([sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r],
              fill=(255, 154, 0, 250))

    # 云
    cloud_cx = int(w * 0.6)
    cloud_cy = int(h * 0.3)
    cr = int(w * 0.08)
    d.ellipse([cloud_cx - cr * 1.5, cloud_cy - cr * 0.5, cloud_cx + cr * 1.5, cloud_cy + cr * 0.5],
              fill=(255, 255, 255, 230))
    d.ellipse([cloud_cx - cr * 0.8, cloud_cy - cr, cloud_cx + cr * 0.8, cloud_cy + cr * 0.3],
              fill=(255, 255, 255, 230))

    # 白鹭剪影
    egret_pts = []
    ex = w * 0.28
    ey = h * 0.35
    scale = size / 256
    body_pts = [
        (ex + 8 * scale, ey - 2 * scale),
        (ex + 30 * scale, ey - 2 * scale),
        (ex + 32 * scale, ey + 6 * scale),
        (ex + 6 * scale, ey + 6 * scale),
        (ex + 10 * scale, ey - 8 * scale),
        (ex + 40 * scale, ey - 16 * scale),
        (ex + 45 * scale, ey - 20 * scale),
        (ex + 38 * scale, ey - 8 * scale),
    ]
    for px, py in body_pts:
        d.point((px, py), fill=(255, 255, 255, 255))

    # 简化白鹭 - 用几个椭圆拼出身体和翅膀
    body_x = int(w * 0.18)
    body_y = int(h * 0.25)
    bw = int(w * 0.18)
    bh = int(w * 0.06)
    # 身体
    d.ellipse([body_x, body_y, body_x + bw, body_y + bh], fill=(255, 255, 255, 240))
    # 头
    head_x = body_x + int(bw * 0.65)
    head_y = body_y - int(bh * 0.8)
    d.ellipse([head_x, head_y, head_x + int(bw * 0.35), head_y + int(bh * 0.9)],
              fill=(255, 255, 255, 240))
    # 喙
    beak_w = int(bw * 0.3)
    beak_x = head_x + int(bw * 0.25)
    beak_y = head_y + int(bh * 0.25)
    d.polygon([beak_x, beak_y, beak_x + beak_w, beak_y + int(bh * 0.15),
               beak_x, beak_y + int(bh * 0.2)], fill=(255, 102, 0, 240))
    # 翅膀
    wing_x = body_x + int(bw * 0.2)
    wing_y = body_y - int(bh * 1.2)
    wing_w = int(bw * 0.9)
    wing_h = int(bh * 1.8)
    d.ellipse([wing_x, wing_y, wing_x + wing_w, wing_y + wing_h],
              fill=(255, 255, 255, 220))
    # 腿
    leg_h = int(bh * 0.8)
    d.line([body_x + int(bw * 0.5), body_y + bh, body_x + int(bw * 0.45), body_y + bh + leg_h],
           fill=(255, 102, 0, 200), width=max(1, size // 60))
    d.line([body_x + int(bw * 0.65), body_y + bh, body_x + int(bw * 0.7), body_y + bh + leg_h],
           fill=(255, 102, 0, 200), width=max(1, size // 60))

    # 海浪
    wave_y = int(h * 0.72)
    wave_colors = [(0, 102, 204, 200), (0, 136, 221, 180), (0, 170, 255, 140)]
    for wi, wc in enumerate(wave_colors):
        wy = wave_y + wi * int(h * 0.06)
        amp = int(h * 0.03)
        pts = []
        for px in range(0, w + 2, 2):
            py = wy + int(amp * math.sin(px / w * math.pi * 3 + wi * 1.5))
            pts.append((px, py))
        pts.append((w, h))
        pts.append((0, h))
        d.polygon(pts, fill=wc)

    return img


images = []
for size in SIZES:
    im = draw_icon(size)
    images.append(im)

images[0].save(OUTPUT, format="ICO", sizes=[(s, s) for s in SIZES], append_images=images[1:])
print(f"Icon saved: {OUTPUT}")
