/**
 * @author 鹿
 * @name 状态查询
 * @team xinz
 * @version 1.0.0
 * @description 系统资源监控插件，支持CPU、内存、磁盘等系统信息查询，支持自定义显示内容和自动删除时间
 * @rule ^(运行状态|status|系统状态)$
 * @admin true
 * @public true
 * @priority 9999
 * @disable false
 * @classification ["系统", "监控"]
 */


const os = require('os');
const { execSync } = require('child_process');
const si = require('systeminformation');

const jsonSchema = BncrCreateSchema.object({
  delMsgTime: BncrCreateSchema.number()
    .setTitle('消息自动删除时间')
    .setDescription('设置状态消息自动删除的时间（毫秒），0表示不自动删除')
    .setDefault(5000),
  showDiskInfo: BncrCreateSchema.boolean()
    .setTitle('显示磁盘信息')
    .setDescription('是否显示磁盘使用情况')
    .setDefault(true),
  showCpuTemp: BncrCreateSchema.boolean()
    .setTitle('显示CPU温度')
    .setDescription('是否显示CPU温度信息')
    .setDefault(true),
  showProcessInfo: BncrCreateSchema.boolean()
    .setTitle('显示进程信息')
    .setDescription('是否显示进程相关信息')
    .setDefault(true),
  debugMode: BncrCreateSchema.boolean()
    .setTitle('调试模式')
    .setDescription('是否开启调试模式，开启后会在控制台输出调试信息')
    .setDefault(false)
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

const delMsgTime = 5000; // 设置删除消息的时间为 5000 毫秒

/**
 * 获取系统运行时间
 */
function getUptime() {
    const uptimeInSeconds = os.uptime();
    const hours = Math.floor(uptimeInSeconds / 3600);
    const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
    return { hours, minutes };
}

/**
 * 获取系统负载信息
 */
function getLoadInfo() {
    const load = os.loadavg();
    return {
        '1分钟负载': load[0].toFixed(2),
        '5分钟负载': load[1].toFixed(2),
        '15分钟负载': load[2].toFixed(2),
        '最大负载': os.cpus().length,
        '负载限制': os.cpus().length * 2,
        '安全负载': os.cpus().length * 1.5,
    };
}

/**
 * 获取活动进程数量
 */
function getActiveProcessesCount() {
    const output = execSync('ps -e | wc -l').toString().trim();
    return parseInt(output, 10); // 返回活动进程数量
}

/**
 * 获取CPU信息
 */
async function getCpuInfo() {
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cpuUsage = await getCpuUsage();
    const cpuSpeed = cpus[0].speed; // CPU速度
    const cpuTemperature = await getCpuTemperature(); // 获取CPU温度
    return {
        'CPU型号': cpuModel,
        'CPU使用率': `${cpuUsage ? cpuUsage.toFixed(2) : '未获取'}%`,
        'CPU温度': cpuTemperature ? `${cpuTemperature} °C` : '未获取', // CPU温度
        'CPU具体运行状态': {
            '速度': cpuSpeed,
            '总进程数': process.pid,
            '活动进程数': getActiveProcessesCount(),
            '核心数': cpus.length,
        },
    };
}

/**
 * 获取CPU使用率
 */
async function getCpuUsage() {
    try {
        const cpuData = await si.currentLoad();
        return cpuData.currentLoad; // 返回当前 CPU 使用率
    } catch (error) {
        console.error('获取CPU使用率失败:', error);
        return null; // 返回null表示未获取到使用率
    }
}

/**
 * 获取CPU温度
 */
async function getCpuTemperature() {
    try {
        const data = await si.cpuTemperature();
        return data.main; // 返回主温度
    } catch (error) {
        console.error('获取CPU温度失败:', error);
        return null; // 返回null表示未获取到温度
    }
}

/**
 * 获取内存信息
 */
function getMemoryInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return {
        '总内存': `${(totalMemory / (1024 ** 3)).toFixed(2)} GB`,
        '可用内存': `${(freeMemory / (1024 ** 3)).toFixed(2)} GB`,
        '已用内存': `${(usedMemory / (1024 ** 3)).toFixed(2)} GB`,
    };
}

/**
 * 获取磁盘信息
 */
function getDiskInfo() {
    const diskInfo = execSync('df -h').toString();
    return diskInfo.split('\n').slice(1).map(line => {
        const parts = line.split(/\s+/);
        return {
            '文件系统': parts[0],
            '总大小': parts[1],
            '已用': parts[2],
            '可用': parts[3],
            '使用率': parts[4],
        };
    });
}

/**
 * 获取系统信息并发送
 */
async function getSystemInfo(s) {
    const config = await ConfigDB.get();
    const uptime = getUptime();
    const loadInfo = getLoadInfo();
    const cpuInfo = await getCpuInfo();
    const memoryInfo = getMemoryInfo();
    const diskInfo = getDiskInfo();

    // 格式化输出
    let systemInfo = `
📊 系统状态监控
━━━━━━━━━━━━━━
⏱️ 运行时间: ${uptime.hours}小时 ${uptime.minutes}分钟

💻 系统信息:
版本: ${process.version}
操作系统: ${os.type()} ${os.release()}

📈 系统负载:
1分钟负载: ${loadInfo['1分钟负载']}
5分钟负载: ${loadInfo['5分钟负载']}
15分钟负载: ${loadInfo['15分钟负载']}
最大负载: ${loadInfo['最大负载']}
负载限制: ${loadInfo['负载限制']}
安全负载: ${loadInfo['安全负载']}

🔄 CPU信息:
型号: ${cpuInfo['CPU型号']}
速度: ${cpuInfo['CPU具体运行状态']['速度']} MHz
核心数: ${cpuInfo['CPU具体运行状态']['核心数']}
使用率: ${cpuInfo['CPU使用率']}`;

    if (config.showCpuTemp) {
        systemInfo += `\n温度: ${cpuInfo['CPU温度']}`;
    }

    if (config.showProcessInfo) {
        systemInfo += `\n进程数: ${cpuInfo['CPU具体运行状态']['总进程数']}
活动进程: ${cpuInfo['CPU具体运行状态']['活动进程数']}`;
    }

    systemInfo += `\n\n💾 内存信息:
总内存: ${memoryInfo['总内存']}
可用内存: ${memoryInfo['可用内存']}
已用内存: ${memoryInfo['已用内存']}`;

    if (config.showDiskInfo) {
        systemInfo += `\n\n💿 磁盘信息:
文件系统: ${diskInfo[0]['文件系统']}
总大小: ${diskInfo[0]['总大小']}
已用: ${diskInfo[0]['已用']}
可用: ${diskInfo[0]['可用']}`;
    }

    const replyid = await s.reply(systemInfo);
    
    // 设置删除回复消息的延迟
    if (config.delMsgTime > 0) {
        setTimeout(async () => {
            try {
                await s.delMsg(replyid);
                console.log('状态消息已自动删除');
            } catch (error) {
                console.error('撤回消息失败:', error);
            }
        }, config.delMsgTime);
    }
}

// 插件入口
module.exports = async s => {
    try {
        // 获取配置
        const config = await ConfigDB.get();
        
        // 检查配置是否存在
        if (!config) {
            return await s.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置\n配置项：\n- 消息自动删除时间\n- 显示磁盘信息\n- 显示CPU温度\n- 显示进程信息\n- 调试模式');
        }

        // 调试日志
        if (config.debugMode) {
            console.log('---------- 状态查询插件调试信息 ----------');
            console.log('接收到的 s 对象:', s);
            console.log('s.msg 类型:', typeof s.msg, '值:', s.msg);
            console.log('------------------------------------');
        }

        await getSystemInfo(s);
    } catch (error) {
        console.error('获取系统信息失败:', error);
        await s.reply('获取系统信息失败，请稍后重试');
    }
};