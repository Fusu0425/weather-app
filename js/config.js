/* ============================================
 * 厦门天气小程序 — 全局配置常量
 * ============================================ */

// ---- 默认城市(厦门) ----
var DEFAULT_CITY = {
    name: '厦门',
    lat: 24.48,
    lon: 118.09
};

// ---- Open-Meteo API 端点 ----
var API = {
    weather: 'https://api.open-meteo.com/v1/forecast',
    airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality'
};

// ---- 天气代码映射表 ----
var WEATHER_CODES = {
    0:  ['晴',       '☀️'],
    1:  ['少云',     '🌤️'],
    2:  ['多云',     '⛅'],
    3:  ['阴',       '☁️'],
    45: ['雾',       '🌫️'],
    48: ['雾凇',     '🌫️'],
    51: ['小毛毛雨', '🌦️'],
    53: ['毛毛雨',   '🌦️'],
    55: ['大毛毛雨', '🌧️'],
    61: ['小雨',     '🌧️'],
    63: ['中雨',     '🌧️'],
    65: ['大雨',     '🌧️'],
    71: ['小雪',     '🌨️'],
    73: ['中雪',     '🌨️'],
    75: ['大雪',     '❄️'],
    77: ['雪粒',     '❄️'],
    80: ['阵雨',     '🌦️'],
    81: ['中阵雨',   '🌧️'],
    82: ['大阵雨',   '🌧️'],
    85: ['小阵雪',   '🌨️'],
    86: ['大阵雪',   '🌨️'],
    95: ['雷暴',     '⛈️'],
    96: ['冰雹雷暴', '⛈️'],
    99: ['大冰雹雷暴','⛈️']
};

// 天气代码 → 背景特效类型
var CODE_TO_EFFECT = {
    0: 'clear', 1: 'cloudy', 2: 'cloudy', 3: 'cloudy',
    45: 'fog', 48: 'fog',
    51: 'drizzle', 53: 'drizzle', 55: 'rain-light',
    61: 'rain-light', 63: 'rain-medium', 65: 'rain-heavy',
    71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
    80: 'rain-light', 81: 'rain-medium', 82: 'rain-heavy',
    85: 'snow', 86: 'snow',
    95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm'
};

// 天气代码 → 主题色 (晴天暖色，雨天冷色)
var CODE_TO_THEME = {
    0: ['#667eea', '#764ba2'],           // 晴 — 紫蓝
    1: ['#5b8cce', '#7eb3e6'],           // 少云
    2: ['#6b7b8d', '#8e9eab'],           // 多云
    3: ['#5a6c7d', '#7d8e9e'],           // 阴
    45: ['#8e9eab', '#b0bec5'],          // 雾
    48: ['#8e9eab', '#b0bec5'],          // 雾凇
    51: ['#4a6a8a', '#6b8fae'],          // 毛毛雨
    55: ['#3a5a7a', '#5a7a9a'],          // 大毛毛雨
    61: ['#3a5a7a', '#5a7a9a'],          // 小雨
    63: ['#2a4a6a', '#4a6a8a'],          // 中雨
    65: ['#1a3a5a', '#3a5a7a'],          // 大雨
    80: ['#3a5a7a', '#5a7a9a'],          // 阵雨
    95: ['#1a2a3a', '#2a3a4a'],          // 雷暴
    71: ['#9ec1cf', '#c8d6e5'],          // 小雪
    75: ['#c8d6e5', '#e8eef5']           // 大雪
};

// ---- AQI 等级 ----
var AQI_LEVELS = [
    { max: 50,   label: '优',   color: '#00e400', bg: '#e0f7e0' },
    { max: 100,  label: '良',   color: '#ffff00', bg: '#ffffe0' },
    { max: 150,  label: '轻度', color: '#ff7e00', bg: '#fff0e0' },
    { max: 200,  label: '中度', color: '#ff0000', bg: '#ffe0e0' },
    { max: 300,  label: '重度', color: '#99004c', bg: '#f5e0f0' },
    { max: 9999, label: '严重', color: '#7e0023', bg: '#f0d0d8' }
];

// ---- 游戏参数 ----
var GAME_CONFIG = {
    BASE_W: 400,
    BASE_H: 450,
    SPEED_BASE: 0.8,
    SPEED_PER_LEVEL: 0.28,
    SPAWN_RATE_BASE: 48,
    SPAWN_RATE_PER_LEVEL: 5,
    SPAWN_RATE_MIN: 14,
    LIGHTNING_BASE: 0.04,
    LIGHTNING_PER_LEVEL: 0.03,
    LIGHTNING_MAX: 0.28,
    TOUCH_SPEED_MUL: 1.35,
    SCORE_PER_DROP: 10,
    SCORE_PER_LEVEL: 100,
    SHIELD_FRAMES: 90,
    LEVEL_BONUS: 20
};

// ---- 自动刷新间隔 (毫秒) ----
var REFRESH_INTERVAL = 30 * 60 * 1000; // 30 分钟
