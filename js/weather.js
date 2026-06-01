/* ============================================
 * 厦门天气小程序 — 天气 & AQI 模块
 * ============================================ */

var Weather = (function() {

    var currentLat = DEFAULT_CITY.lat;
    var currentLon = DEFAULT_CITY.lon;
    var cityName = DEFAULT_CITY.name;

    // ---- 工具函数 ----
    function formatDate(d) {
        var y = d.getFullYear();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        var h = d.getHours();
        var min = d.getMinutes();
        return y + '年' + (m<10?'0':'')+m + '月' + (day<10?'0':'')+day + '日 ' + (h<10?'0':'')+h + ':' + (min<10?'0':'')+min + ' 更新';
    }

    // ---- 获取天气 ----
    function fetchWeather(lat, lon) {
        lat = lat || currentLat;
        lon = lon || currentLon;

        var params = [
            'latitude=' + lat,
            'longitude=' + lon,
            'current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
            'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            'hourly=temperature_2m,weather_code',
            'timezone=Asia/Shanghai',
            'forecast_days=7',
            'forecast_hours=24'
        ].join('&');

        return fetch(API.weather + '?' + params)
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
    }

    // ---- 获取 AQI ----
    function fetchAQI(lat, lon) {
        lat = lat || currentLat;
        lon = lon || currentLon;

        var params = [
            'latitude=' + lat,
            'longitude=' + lon,
            'current=pm2_5,pm10,european_aqi',
            'timezone=Asia/Shanghai'
        ].join('&');

        return fetch(API.airQuality + '?' + params)
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
    }

    // ---- 获取 AQI 等级 ----
    function getAQILevel(eaqi) {
        for (var i = 0; i < AQI_LEVELS.length; i++) {
            if (eaqi <= AQI_LEVELS[i].max) return AQI_LEVELS[i];
        }
        return AQI_LEVELS[AQI_LEVELS.length - 1];
    }

    // ---- 获取背景主题色 ----
    function getThemeColors(code) {
        return CODE_TO_THEME[code] || CODE_TO_THEME[0];
    }

    // ---- 判断是否需要预警 ----
    function getAlert(code, precipProb) {
        if (code === 95 || code === 96 || code === 99) {
            return { text: '⚡ 雷暴预警：请减少户外活动', severe: true };
        }
        if (code >= 65 && code <= 82 || code === 55) {
            return { text: '🌧️ 大雨预警：出门请带好雨具', severe: false };
        }
        if (precipProb >= 70) {
            return { text: '☔ 高降雨概率 (' + precipProb + '%)，建议带伞', severe: false };
        }
        return null;
    }

    // ---- 渲染全部天气 ----
    function render(weatherData, aqiData) {
        var container = document.getElementById('weatherContent');
        if (!container) return;

        var html = '';
        var wc = weatherData.current.weather_code;
        var cd = WEATHER_CODES[wc] || ['未知', '❓'];

        // 天气预警
        var alert = getAlert(wc, weatherData.daily.precipitation_probability_max[0]);
        if (alert) {
            html += '<div class="alert-bar show">' + alert.text + '</div>';
        }

        // 当前天气
        html += '<div class="current-card">'
            + '<div class="current-main">'
            + '<span class="current-icon">' + cd[1] + '</span>'
            + '<span class="current-temp">' + weatherData.current.temperature_2m + '<sup>°C</sup></span>'
            + '</div>'
            + '<div class="current-desc">' + cityName + ' · ' + cd[0] + '</div>'
            + '<div class="current-details">'
            + '<div class="detail"><span class="detail-label">湿度</span><span class="detail-value">' + weatherData.current.relative_humidity_2m + '%</span></div>'
            + '<div class="detail"><span class="detail-label">风速</span><span class="detail-value">' + weatherData.current.wind_speed_10m + ' km/h</span></div>'
            + '</div></div>';

        // AQI
        if (aqiData && aqiData.current) {
            var aq = aqiData.current;
            var lvl = getAQILevel(aq.european_aqi || 0);
            html += '<div class="aqi-card">'
                + '<div class="aqi-header">🌬️ 空气质量</div>'
                + '<div class="aqi-value" style="color:' + lvl.color + '">' + Math.round(aq.european_aqi || 0) + '</div>'
                + '<div class="aqi-label" style="color:' + lvl.color + '">' + lvl.label + '</div>'
                + '<div class="aqi-details">'
                + '<span>PM2.5 ' + (aq.pm2_5 != null ? Math.round(aq.pm2_5) + ' µg/m³' : '--') + '</span>'
                + '<span>PM10 ' + (aq.pm10 != null ? Math.round(aq.pm10) + ' µg/m³' : '--') + '</span>'
                + '</div></div>';
        }

        // 逐时预报
        var hourly = weatherData.hourly;
        html += '<div class="hourly-section"><h2>未来 24 小时</h2><div class="hourly-strip">';
        var hLen = Math.min(hourly.time.length, 24);
        for (var i = 0; i < hLen; i++) {
            var hc = WEATHER_CODES[hourly.weather_code[i]] || ['未知', '❓'];
            var hHour = hourly.time[i].split('T')[1].split(':')[0];
            html += '<div class="hourly-item" style="flex:0 0 50px;text-align:center;border-right:1px solid rgba(0,0,0,0.07);padding:2px 0">'
                + '<div class="hourly-time" style="font-size:10px;color:#999;margin-bottom:6px">' + hHour + '</div>'
                + '<div class="hourly-icon" style="font-size:1.25rem;margin-bottom:6px;line-height:1">' + hc[1] + '</div>'
                + '<div class="hourly-temp" style="font-size:11px;font-weight:600;color:#333">' + Math.round(hourly.temperature_2m[i]) + '°</div>'
                + '</div>';
        }
        html += '</div></div>';

        // 7天预报
        var daily = weatherData.daily;
        html += '<h2>未来 7 天</h2><div class="forecast-grid">';
        for (var d = 0; d < daily.time.length; d++) {
            var dd = WEATHER_CODES[daily.weather_code[d]] || ['未知', '❓'];
            var shortDate = daily.time[d].slice(5).replace(/-/g, '/');
            html += '<div class="forecast-card">'
                + '<div class="forecast-date">' + shortDate + '</div>'
                + '<div class="forecast-icon">' + dd[1] + '</div>'
                + '<div class="forecast-desc">' + dd[0] + '</div>'
                + '<div class="forecast-temps">'
                + '<span class="temp-high">' + daily.temperature_2m_max[d] + '°</span>'
                + '<span class="temp-low">' + daily.temperature_2m_min[d] + '°</span>'
                + '</div>'
                + '<div class="forecast-rain">雨 ' + daily.precipitation_probability_max[d] + '%</div>'
                + '</div>';
        }
        html += '</div>';

        container.innerHTML = html;
    }

    // ---- 渲染错误 ----
    function renderError(errMsg) {
        var container = document.getElementById('weatherContent');
        if (!container) return;
        container.innerHTML = '<div class="error-card">'
            + '<h2>获取失败</h2>'
            + '<p>' + errMsg + '</p>'
            + '<button onclick="App.refreshWeather()">重新获取</button>'
            + '</div>';
    }

    // ---- 主加载函数 ----
    function load(lat, lon) {
        if (lat) { currentLat = lat; currentLon = lon; }

        var weatherPromise = fetchWeather(currentLat, currentLon);
        var aqiPromise = fetchAQI(currentLat, currentLon).catch(function() { return null; });

        Promise.all([weatherPromise, aqiPromise])
            .then(function(results) {
                var weatherData = results[0];
                var aqiData = results[1];

                document.getElementById('updateTime').textContent = formatDate(new Date());

                // 背景特效
                if (window.setBgEffect) {
                    window.setBgEffect(weatherData.current.weather_code);
                }

                // 主题色
                var theme = getThemeColors(weatherData.current.weather_code);
                document.body.style.setProperty('--bg-start', theme[0]);
                document.body.style.setProperty('--bg-end', theme[1]);

                render(weatherData, aqiData);
            })
            .catch(function(err) {
                renderError(err.message || '网络连接失败，请检查网络后重试');
            });
    }

    // ---- 更新城市名 ----
    function setCity(name) {
        if (name) cityName = name;
    }

    // ---- 获取当前坐标 ----
    function getCoords() {
        return { lat: currentLat, lon: currentLon };
    }

    // 公开 API
    return {
        load: load,
        setCity: setCity,
        getCoords: getCoords,
        refresh: function() { load(); }
    };

})();
