import requests

XIAMEN_LAT = 24.48
XIAMEN_LON = 118.09
API_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_CODES = {
    0:  ("晴", "☀️"),
    1:  ("少云", "🌤️"),
    2:  ("多云", "⛅"),
    3:  ("阴", "☁️"),
    45: ("雾", "🌫️"),
    48: ("雾凇", "🌫️"),
    51: ("小毛毛雨", "🌦️"),
    53: ("毛毛雨", "🌦️"),
    55: ("大毛毛雨", "🌧️"),
    61: ("小雨", "🌧️"),
    63: ("中雨", "🌧️"),
    65: ("大雨", "🌧️"),
    71: ("小雪", "🌨️"),
    73: ("中雪", "🌨️"),
    75: ("大雪", "❄️"),
    77: ("雪粒", "❄️"),
    80: ("阵雨", "🌦️"),
    81: ("中阵雨", "🌧️"),
    82: ("大阵雨", "🌧️"),
    85: ("小阵雪", "🌨️"),
    86: ("大阵雪", "🌨️"),
    95: ("雷暴", "⛈️"),
    96: ("冰雹雷暴", "⛈️"),
    99: ("大冰雹雷暴", "⛈️"),
}


def get_weather():
    params = {
        "latitude": XIAMEN_LAT,
        "longitude": XIAMEN_LON,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "timezone": "Asia/Shanghai",
        "forecast_days": 7,
    }

    resp = requests.get(API_URL, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    current = data["current"]
    current_code = current["weather_code"]
    current_desc, current_icon = WEATHER_CODES.get(current_code, ("未知", "❓"))

    daily = data["daily"]
    days = []
    for i in range(len(daily["time"])):
        code = daily["weather_code"][i]
        desc, icon = WEATHER_CODES.get(code, ("未知", "❓"))
        days.append({
            "date": daily["time"][i],
            "icon": icon,
            "desc": desc,
            "temp_max": daily["temperature_2m_max"][i],
            "temp_min": daily["temperature_2m_min"][i],
            "precip_prob": daily["precipitation_probability_max"][i],
        })

    return {
        "current": {
            "temp": current["temperature_2m"],
            "humidity": current["relative_humidity_2m"],
            "wind_speed": current["wind_speed_10m"],
            "icon": current_icon,
            "desc": current_desc,
        },
        "daily": days,
    }
