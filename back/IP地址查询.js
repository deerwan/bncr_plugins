/**
 * @author 鹿
 * @name IP地址查询
 * @team deer
 * @version 1.0.2
 * @description 查询当前公网IPv4地址
 * @rule ^(IP查询|ip查询)$
 * @admin true
 * @public true
 * @priority 9999
 * @disable false
 * @classification ["工具","网络"]
 */


/**
 * 获取公网IPv4信息 (使用多个备用API)
 */
async function getPublicIPv4Info() {
    const { default: got } = await import('got');
    const apis = [
        'https://api.ipify.org',
        'https://ipinfo.io/ip',
        'https://icanhazip.com',
        'https://api.my-ip.io/ip',
        'https://checkip.amazonaws.com'
    ];

    for (const apiUrl of apis) {
        try {
            const response = await got(apiUrl, { timeout: { request: 5000 } });
            const ip = response.body.trim();
            // 验证IP地址格式
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                return {
                    ip: ip,
                    // 其他字段不再需要，但保留结构以备将来扩展
                    country: '未知',
                    region: '未知',
                    city: '未知',
                    isp: '未知'
                };
            }
        } catch (error) {
            console.error(`从 ${apiUrl} 获取公网IPv4信息失败:`, error.message || error);
        }
    }
    return null;
}

/**
 * 格式化IP信息输出
 */
function formatIPInfo(publicIPv4) {
    let output = '📡 公网IPv4地址信息\n\n';

    // 只显示公网IPv4地址
    if (publicIPv4 && publicIPv4.ip) {
        output += `IPv4: ${publicIPv4.ip}\n`;
    } else {
        output += '无法获取公网IPv4信息\n';
    }

    return output;
}

// 插件入口
module.exports = async s => {
    let publicIPv4 = null;

    try {
        // 尝试获取公网IPv4信息
        publicIPv4 = await getPublicIPv4Info();
    } catch (error) {
        console.error('插件主函数获取公网IPv4信息失败:', error);
    }
    
    // 格式化并发送信息
    const ipInfo = formatIPInfo(publicIPv4);
    await s.reply(ipInfo);
}; 