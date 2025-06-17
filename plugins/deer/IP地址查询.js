/**
 * @author 鹿
 * @name IP地址查询
 * @team deer
 * @version 1.0.0
 * @description 查询当前公网IPv4地址
 * @rule ^(IP查询|ip查询)$
 * @admin true
 * @public true
 * @priority 9999
 * @disable false
 * @classification ["工具","网络"]
 */

const got = require('got'); // 引入 got 库

/**
 * 获取公网IPv4信息 (使用 api.ipify.org 和 reallyfreegeoip.org)
 */
async function getPublicIPv4Info() {
    let publicIp = null;

    try {
        // 1. 从 4.ipw.cn 获取公网 IPv4 地址
        const ipifyResponse = await got('https://4.ipw.cn/');
        // 尝试从响应中提取IPv4地址
        const ipMatch = ipifyResponse.body.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        if (ipMatch && ipMatch[0]) {
            publicIp = ipMatch[0];
        }

        // 即使只需要IP，我们也可能需要调用 reallyfreegeoip.org 来确认IP是否有效，
        // 但为了极致简化，这里假设 4.ipw.cn 返回的IP是可信的。
        // 如果需要更复杂的验证和信息，可以重新引入 reallyfreegeoip.org。

        if (publicIp) {
            return {
                ip: publicIp,
                // 其他字段不再需要，但保留结构以备将来扩展
                country: '未知',
                region: '未知',
                city: '未知',
                isp: '未知'
            };
        }
    } catch (error) {
        console.error('获取公网IPv4信息失败:', error.message || error);
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