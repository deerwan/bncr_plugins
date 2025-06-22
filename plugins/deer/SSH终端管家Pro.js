/**
 * @author 鹿
 * @name SSH终端管家Pro
 * @team xinz
 * @version 2.2
 * @description 增加可视化配置
 * @rule ^(ssh|SSH)$
 * @priority 10000
 * @admin true
 * @public true
 * @disable false
 * @classification ["工具","系统"]
 */
    /*

    更新日志：
    2.2
    - 新增Web可视化配置功能
    - 添加配置模式，支持通过Web界面管理SSH设备
    - 优化设备选择界面，提升用户体验
    - 增强安全连接稳定性
    - 改进命令执行结果展示
    

    
    */
sysMethod.testModule(['ssh2'], { install: true });
const Client = require('ssh2').Client;
const { exec } = require('child_process');

// 设备配置Schema
const jsonSchema = BncrCreateSchema.object({
    devices: BncrCreateSchema.array(
        BncrCreateSchema.object({
            name: BncrCreateSchema.string().setTitle("设备名称").setDescription("SSH设备的名称，如：家庭NAS").setDefault("家庭NAS"),
            host: BncrCreateSchema.string().setTitle("主机地址").setDescription("SSH服务器的IP地址或域名").setDefault("192.168.1.1"),
            port: BncrCreateSchema.number().setTitle("SSH端口").setDescription("SSH服务的端口号，默认为22").setDefault(22),
            username: BncrCreateSchema.string().setTitle("用户名").setDescription("SSH登录用户名").setDefault("root"),
            password: BncrCreateSchema.string().setTitle("密码").setDescription("SSH登录密码").setDefault(""),
            icon: BncrCreateSchema.string().setTitle("图标").setDescription("设备图标，使用emoji表情").setDefault("🖥️")
        })
    ).setTitle("SSH设备列表")
    .setDescription("点击右下角+增加更多设备")
    .setDefault([
        {
            name: "🏠 家庭NAS",
            host: "192.168.3.0",
            port: 22,
            username: "admin",
            password: "sadmin",
            icon: "🖥️"
        },
        {
            name: "☁️ 云服务器",
            host: "103.107.198.12",
            port: 58222,
            username: "root",
            password: "Cloud@2023",
            icon: "🌐"
        }
    ]),
    timeouts: BncrCreateSchema.object({
        selection: BncrCreateSchema.number().setTitle("设备选择超时").setDescription("设备选择超时时间(秒)").setDefault(30),
        command: BncrCreateSchema.number().setTitle("命令输入超时").setDescription("命令输入超时时间(秒)").setDefault(120),
        connect: BncrCreateSchema.number().setTitle("连接超时").setDescription("SSH连接超时时间(毫秒)").setDefault(10000)
    }).setTitle("超时配置")
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

// 设备配置中心 - 默认值，将被配置覆盖
const DEFAULT_DEVICES = [
    {
        name: '🏠 家庭NAS',
        host: '192.168.3.0',
        port: 22,
        username: 'admin',
        password: 'sadmin',
        icon: '🖥️'
    },
    {
        name: '☁️ 云服务器',
        host: '103.107.198.12',
        port: 58222,
        username: 'root',
        password: 'Cloud@2023',
        icon: '🌐'
    }
];

// 超时配置 - 默认值，将被配置覆盖
const DEFAULT_TIMEOUTS = {
    selection: 30,    // 设备选择超时(秒)
    command: 120,     // 命令输入超时
    connect: 10000    // 连接超时(毫秒)
};

// 数据库实例
const db = new BncrDB("ssh_terminal");

module.exports = async s => {
    try {
        // 获取配置
        await ConfigDB.get();
        
        // 如果没有配置，提示用户配置
        if (!Object.keys(ConfigDB.userConfig).length) {
            return await s.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成SSH终端管家Pro的配置');
        }
        
        // 从配置中获取设备和超时设置
        const DEVICES = ConfigDB.userConfig.devices || DEFAULT_DEVICES;
        const TIMEOUTS = ConfigDB.userConfig.timeouts || DEFAULT_TIMEOUTS;
        
        // 初始化会话记录
        const session = {
            startTime: Date.now(),
            commandCount: 0,
            lastActivity: null
        };

        // 设备选择流程
        const device = await showDeviceMenu(s, DEVICES, TIMEOUTS);
        
        // 连接验证流程
        await verifyConnection(s, device);
        
        // 建立SSH连接
        const conn = await createConnection(s, device, TIMEOUTS);
        
        // 进入命令循环
        await commandLoop(s, device, conn, session, TIMEOUTS);

    } catch (error) {
        handleSystemError(s, error);
    }
};

// ========== 核心功能模块 ==========
async function showDeviceMenu(s, DEVICES, TIMEOUTS) {
    const menu = [
        "🔧 SSH终端管家 - 设备列表",
        "────────────────",
        ...DEVICES.map((d, i) => 
            `${i+1}. ${d.icon} ${d.name}\n   ▸ ${d.host}:${d.port}`
        ),
        "────────────────",
        "输入序号选择设备 (q退出)",
        "输入'config'进入配置界面"
    ].join('\n');

    const choice = await getInput(s, menu, TIMEOUTS.selection);
    if (choice.toLowerCase() === 'q') throw new Error('USER_EXIT');
    if (choice.toLowerCase() === 'config') {
        await s.reply('请发送"修改无界配置"或前往前端web"插件配置"来管理SSH设备');
        throw new Error('CONFIG_MODE');
    }

    const index = parseInt(choice) - 1;
    validateDeviceIndex(index, DEVICES);
    
    return DEVICES[index];
}

async function commandLoop(s, device, conn, session, TIMEOUTS) {
    try {
        while (true) {
            session.lastActivity = Date.now();
            
            const command = await getCommandInput(s, device, session, TIMEOUTS);
            
            // 退出处理
            if (command.toLowerCase() === 'exit') {
                await showExitMessage(s, device, session);
                break;
            }

            // 返回菜单处理
            if (command === 'menu') {
                await showReturnMenuMessage(s);
                throw new Error('RETURN_MENU');
            }
            
            // 配置处理
            if (command === 'config') {
                await s.reply('请发送"修改无界配置"或前往前端web"插件配置"来管理SSH设备');
                throw new Error('CONFIG_MODE');
            }

            // 执行命令
            const output = await executeCommand(conn, command);
            session.commandCount++;
            
            // 格式化输出
            await showCommandResult(s, output);
        }
    } finally {
        conn.end();
    }
}

// ========== SSH连接管理 ==========
async function verifyConnection(s, device) {
    const connectionReport = [
        `🔍 正在验证 ${device.icon} ${device.name}`,
        "────────────────"
    ];

    // 主机可达性检查
    const hostOnline = await pingHost(device.host);
    connectionReport.push(`主机可达: ${hostOnline ? '✅' : '❌'}`);
    
    // 认证检查
    if (hostOnline) {
        const authValid = await testCredentials(device);
        connectionReport.push(`认证有效: ${authValid ? '✅' : '❌'}`);
        if (!authValid) throw new Error('AUTH_FAILURE');
    } else {
        throw new Error('HOST_OFFLINE');
    }

    await s.reply(connectionReport.join('\n'));
}

function createConnection(s, device, TIMEOUTS) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        const timer = setTimeout(() => 
            reject(new Error('CONNECTION_TIMEOUT')), 
            TIMEOUTS.connect
        );

        conn.on('ready', () => {
            clearTimeout(timer);
            s.reply([
                "🔐 安全连接已建立",
                "────────────────",
                `设备: ${device.icon} ${device.name}`,
                `协议: SSHv${conn.protocolVersion}`,
                `算法: ${conn.algorithm}`
            ].join('\n'));
            resolve(conn);
        }).on('error', err => {
            clearTimeout(timer);
            reject(new Error(`CONNECTION_FAILED: ${err.message}`));
        }).connect(device);
    });
}

// ========== 交互增强模块 ==========
async function showExitMessage(s, device, session) {
    const duration = formatDuration(Date.now() - session.startTime);
    const stats = [
        "🛑 会话终止摘要",
        "────────────────",
        `设备: ${device.icon} ${device.name}`,
        `时长: ${duration}`,
        `命令执行: ${session.commandCount}次`,
        `最后活动: ${formatTime(session.lastActivity)}`,
        "────────────────",
        "⏳ 本提示10秒后自动清除"
    ].join('\n');

    const msg = await s.reply(stats);
    setTimeout(() => s.delMsg(msg), 10000);
}

async function showReturnMenuMessage(s) {
    const msg = await s.reply([
        "🔙 返回主菜单",
        "────────────────",
        "正在安全断开连接...",
        "⏳ 3秒后自动跳转"
    ].join('\n'));
    setTimeout(() => s.delMsg(msg), 3000);
}

async function showCommandResult(s, output) {
    const MAX_LENGTH = 1500;
    const truncated = output.length > MAX_LENGTH 
        ? output.slice(0, MAX_LENGTH) + '\n...（输出已截断）' 
        : output;

    const result = [
        "📊 执行结果",
        "────────────────",
        truncated,
        "────────────────",
        `字符数: ${output.length} | 状态: ${output.includes('ERROR') ? '❌' : '✅'}`
    ].join('\n');

    const msg = await s.reply(result);
    setTimeout(() => s.delMsg(msg), 30000); // 30秒后清除长输出
}

// ========== 工具函数模块 ==========
function formatDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return [h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ');
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

async function getInput(s, prompt, timeout) {
    const msg = await s.reply(prompt);
    const response = await s.waitInput(() => {}, timeout * 1000);
    return response?.getMsg()?.trim() || '';
}

async function getCommandInput(s, device, session, TIMEOUTS) {
    return await getInput(s, [
        `🚀 ${device.icon} ${device.name} 终端就绪`,
        "────────────────",
        `会话时长: ${formatDuration(Date.now() - session.startTime)}`,
        `执行命令: ${session.commandCount}次`,
        "────────────────",
        "支持多命令用 && 分隔",
        "────────────────",
        "▸ exit   结束会话",
        "▸ menu   返回主菜单",
        "▸ config 配置设备",
        "────────────────",
        "请输入Linux命令:"
    ].join('\n'), TIMEOUTS.command);
}

// ========== 系统验证模块 ==========
async function pingHost(host) {
    return new Promise(resolve => {
        exec(`ping -c 1 -W 1 ${host}`, err => resolve(!err));
    });
}

async function testCredentials(device) {
    return new Promise(resolve => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.end();
            resolve(true);
        }).on('error', () => resolve(false))
          .connect(device);
    });
}

function validateDeviceIndex(index, DEVICES) {
    if (isNaN(index) || index < 0 || index >= DEVICES.length) {
        throw new Error('INVALID_DEVICE');
    }
}

// ========== 错误处理模块 ==========
function handleSystemError(s, error) {
    const errorConfig = {
        'USER_EXIT': {
            title: '👋 会话取消',
            content: '用户主动退出设备选择'
        },
        'HOST_OFFLINE': {
            title: '🌐 连接失败',
            content: '目标主机不可达\n请检查网络连接'
        },
        'AUTH_FAILURE': {
            title: '🔑 认证失败',
            content: '用户名/密码错误\n请验证后重试'
        },
        'CONNECTION_TIMEOUT': {
            title: '⏰ 连接超时',
            content: `超过${TIMEOUTS.connect/1000}秒未响应\n请检查端口配置`
        }
    };

    const { title = '⚠️ 系统异常', content = error.message } = errorConfig[error.message] || {};
    
    const msg = [
        title,
        "────────────────",
        content,
        "────────────────",
        `错误代码: ${error.message.split(':')[0] || 'UNKNOWN'}`
    ].join('\n');

    s.reply(msg).then(m => setTimeout(() => s.delMsg(m), 10000));
}

// ========== 命令执行模块 ==========
async function executeCommand(conn, command) {
    return new Promise((resolve, reject) => {
        conn.exec(command, (err, stream) => {
            if (err) return reject(err);
            
            let output = '';
            stream.on('data', data => output += data)
                  .on('close', () => resolve(output))
                  .stderr.on('data', data => output += `\n[ERROR] ${data}`);
        });
    });
}
