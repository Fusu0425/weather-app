"""生成桌面图标 ICO + PWA PNG 文件"""
from PIL import Image, ImageDraw, ImageFont
import os, math

DIR = r'C:\Users\28716\weather-app'
PNG_SIZES = [512, 192, 180, 152]

def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    m = size / 512

    r = int(100 * m)
    draw.rounded_rectangle([0, 0, size, size], radius=r, fill=(102, 126, 234, 255))

    for i in range(size//2, size):
        frac = (i - size//2) / (size//2)
        r_c = int(102 + (118 - 102) * frac)
        g_c = int(126 + (75 - 126) * frac)
        b_c = int(234 + (162 - 234) * frac)
        draw.rectangle([0, i, size, i+1], fill=(r_c, g_c, b_c, 255))

    cx, cy = int(280 * m), int(180 * m)
    r_sun = int(80 * m)
    draw.ellipse([cx - r_sun, cy - r_sun, cx + r_sun, cy + r_sun], fill=(255, 215, 0, 230))
    lw = max(1, int(10 * m))
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        x1 = cx + int(math.cos(rad) * r_sun * 1.15)
        y1 = cy + int(math.sin(rad) * r_sun * 1.15)
        x2 = cx + int(math.cos(rad) * (r_sun * 1.5))
        y2 = cy + int(math.sin(rad) * (r_sun * 1.5))
        draw.line([x1, y1, x2, y2], fill=(255, 215, 0, 180), width=lw)

    cloud_y = int(275 * m)
    for rx_off, ry_off, rr in [(-60, 10, 55), (-10, -10, 70), (50, 0, 60), (90, 15, 45)]:
        cx_c = int(220 * m + rx_off * m)
        cy_c = int(cloud_y + ry_off * m)
        r_c = int(rr * m)
        draw.ellipse([cx_c - r_c, cy_c - r_c, cx_c + r_c, cy_c + r_c], fill=(255, 255, 255, 242))

    try:
        font = ImageFont.truetype('C:\\Windows\\Fonts\\msyhbd.ttf', int(85 * m))
    except:
        try:
            font = ImageFont.truetype('C:\\Windows\\Fonts\\segoeuib.ttf', int(85 * m))
        except:
            font = ImageFont.load_default()
    bbox = draw.textbbox((0,0), '28°', font=font)
    tw = bbox[2] - bbox[0]; th = bbox[3] - bbox[1]
    tx = int((size - tw) / 2); ty = int(405 * m)
    draw.text((tx, ty), '28°', fill=(255,255,255,255), font=font)

    return img

# 生成 ICO
ico_sizes = [256, 128, 64, 48, 32, 16]
images = [draw_icon(s) for s in ico_sizes]
ico_path = os.path.join(DIR, 'icon.ico')
images[0].save(ico_path, format='ICO', sizes=[(s, s) for s in ico_sizes], append_images=images[1:])
print(f'ICO saved: {ico_path}')

# 生成 PNG（PWA + iOS）
for s in PNG_SIZES:
    img = draw_icon(s)
    png_path = os.path.join(DIR, f'icon-{s}.png')
    img.save(png_path, format='PNG')
    print(f'PNG {s}x{s} saved: {png_path}')

print('Done!')
