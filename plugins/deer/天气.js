/**
 * @author deer
 * @name 天气
 * @team 鹿
 * @version 1.0.0
 * @description 基于和风天气API的天气查询插件
 * @rule ^(.+)(天气|weather)$
 * @admin false
 * @public true
 * @priority 1000
 * @disable false
 * @classification ["工具"]
 */

const jsonSchema = BncrCreateSchema.object({
  apiKey: BncrCreateSchema.string()
    .setTitle('和风天气API Key')
    .setDescription('请填入你的和风天气API Key')
    .setDefault(''),
  showAirQuality: BncrCreateSchema.boolean()
    .setTitle('显示空气质量')
    .setDescription('是否显示空气质量信息')
    .setDefault(true),
  debugMode: BncrCreateSchema.boolean()
    .setTitle('调试模式')
    .setDescription('是否开启调试模式，开启后会在控制台输出调试信息')
    .setDefault(false)
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

// 天气图标映射
const weatherIcons = {
  'Clear': '☀️',
  'Cloudy': '☁️',
  'Rain': '🌧️',
  'Snow': '❄️',
  'Thunder': '⛈️',
  'Fog': '🌫️',
  'Wind': '🌪️'
};

// 获取天气图标
function getWeatherIcon(weather) {
  for (const [key, icon] of Object.entries(weatherIcons)) {
    if (weather.includes(key)) return icon;
  }
  return '🌈';
}

// 获取天气数据
async function getWeatherData(city) {
  const config = await ConfigDB.get();
  if (!config || !config.apiKey) {
    return '请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置\n配置项：和风天气API Key';
  }

  try {
    // 获取城市ID
    const locationUrl = `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(city)}&key=${config.apiKey}`;
    const locationRes = await fetch(locationUrl);
    const locationData = await locationRes.json();
    
    if (locationData.code !== '200' || !locationData.location?.[0]) {
      return '未找到该城市，请检查城市名称是否正确';
    }

    const cityId = locationData.location[0].id;
    
    // 获取实时天气
    const weatherUrl = `https://devapi.qweather.com/v7/weather/now?location=${cityId}&key=${config.apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    // 获取空气质量
    const airUrl = `https://devapi.qweather.com/v7/air/now?location=${cityId}&key=${config.apiKey}`;
    const airRes = await fetch(airUrl);
    const airData = await airRes.json();

    return {
      location: locationData.location[0],
      now: weatherData.now,
      air: airData.now
    };
  } catch (error) {
    console.error('获取天气数据失败:', error);
    return '获取天气数据失败，请稍后重试';
  }
}

// 生成天气消息
async function generateWeatherMessage(weatherData) {
  const { now, location, air } = weatherData;
  const config = await ConfigDB.get();
  
  let message = [
    `📍 ${location.name} 天气信息`,
    '━━━━━━━━━━━━━━',
    `${getWeatherIcon(now.text)} 当前天气：${now.text}`,
    `🌡️ 温度：${now.temp}°C`,
    `💨 体感温度：${now.feelsLike}°C`,
    `💧 相对湿度：${now.humidity}%`,
    `🌬️ 风向：${now.windDir}`,
    `💨 风力等级：${now.windScale}级`
  ];

  if (config.showAirQuality && air) {
    message.push(
      '━━━━━━━━━━━━━━',
      '🌫️ 空气质量',
      `空气质量指数：${air.aqi}`,
      `空气质量：${air.category}`,
      `PM2.5：${air.pm2p5}`,
      `PM10：${air.pm10}`
    );
  }

  return message.join('\n');
}

// 插件入口
module.exports = async s => {
  try {
    // 获取配置
    const config = await ConfigDB.get();
    
    // 检查是否已配置API Key
    if (!config || !config.apiKey) {
      return await s.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置\n配置项：和风天气API Key');
    }

    // --- 调试日志开始 ---
    if (config.debugMode) {
      console.log('---------- 天气插件调试信息 ----------');
      console.log('接收到的 s 对象:', s);
      console.log('s.msg 类型:', typeof s.msg, '值:', s.msg);
      if (s && typeof s.param === 'function') {
          console.log('s.param 类型:', typeof s.param, '值:', s.param);
          console.log('s.param(1) 的类型和值:', typeof s.param(1), s.param(1));
      }
      console.log('------------------------------------');
    }
    // --- 调试日志结束 ---

    let city = '';
    // 从 s.param(1) 获取城市名 (对应正则的第一个捕获组)
    // 确保 s.param 存在且为函数，并且调用结果为字符串
    if (s && typeof s.param === 'function') {
        const paramResult = s.param(1); 
        if (typeof paramResult === 'string' && paramResult.trim().length > 0) {
            city = paramResult.trim();
        }
    }
    
    // --- 调试日志开始 ---
    if (config.debugMode) {
      console.log('提取的城市名 (city):', city);
      console.log('------------------------------------');
    }
    // --- 调试日志结束 ---

    if (!city) {
      return await s.reply('请指定城市名称，例如：北京天气');
    }
    
    // 获取天气数据
    const weatherData = await getWeatherData(city);
    if (typeof weatherData === 'string') {
      return await s.reply(weatherData);
    }

    // 生成并发送天气消息
    const message = await generateWeatherMessage(weatherData);
    return await s.reply(message);
  } catch (error) {
    console.error('天气插件运行错误:', error);
    // 确保在错误发生时也能回复用户，除非 s.reply 本身不可用
    if (s && typeof s.reply === 'function') {
      return await s.reply('天气查询失败，请稍后重试');
    }
  }
}; 