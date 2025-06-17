/**
 * @author 鹿
 * @name 菜单
 * @team xinz
 * @version 1.3.1
 * @description 增加一些样式
 * @rule ^(菜单)$
 * @admin false
 * @public true
 * @priority 1000
 * @disable false
 * @classification ["工具"]
 */

/*
更新日志：
v1.3.1 (2025-03-14)
- 新增多种标题样式：rounded、elegant
- 新增多种分类样式：clean、modern、dot
- 新增紧凑模式显示选项
- 新增菜单项编号显示功能
- 优化菜单布局和显示效果

*/

/// <reference path="../../@types/Bncr.d.ts" />
const defaultConfig = {
  menuItems: [
    {
      category: '京东活动',
      icon: '🛒',
      items: [
        { command: '登录', description: '短信/扫码登录', icon: '🔑' },
        { command: '查询', description: '查询账户信息', icon: '📊' },
        { command: '豆豆', description: '查询豆豆明细', icon: '🫘' },
        { command: '浇水', description: '东东农场(旧)浇水', icon: '💧' },
        { command: '更新ck', description: '密码登录专属更新ck', icon: '🔄' },
        { command: '奖票兑换', description: '玩一玩奖票兑换红包', icon: '🎟️' },
        { command: '账户管理', description: '管理/删除账户', icon: '👤' },
        { command: '密码管理', description: '删除密码登录账户', icon: '🔒' },
        { command: '位置查询', description: '位置每天都会变动', icon: '📍' }
      ]
    },
    {
      category: '其它命令',
      icon: '🔧',
      items: [
        { command: '城市天气', description: '例如：北京天气', icon: '🌤️' },
        { command: '查Q绑 qq', description: '例如：查Q绑 123456', icon: '🔍' },
        { command: '打赏', description: '打赏一下，维护不易', icon: '💰' },
        { command: '打赏排行榜', description: '记住每一位老板', icon: '🏆' }
      ]
    }
  ],
  bottomContent: '请多多拉人，一起撸 ~\n㊗️🎊家人们发大财,心想事成,身体健康',
  style: {
    useIcons: true,
    headerStyle: 'modern', // 'simple', 'fancy', 'minimal', 'modern', 'rounded', 'elegant'
    commandMaxLength: 10,  // 命令最大长度，用于对齐
    separator: '›',  // 命令和描述之间的分隔符
    categoryStyle: 'clean', // 'emoji', 'box', 'line', 'clean', 'modern', 'dot'
    compactMode: false, // 是否使用紧凑模式
    useColorfulIcons: true, // 是否使用彩色图标
    showItemNumbers: false, // 是否显示菜单项编号
    alignDescriptions: true, // 是否对齐描述文本
    showChangelog: true // 是否显示更新日志
  }
};

const jsonSchema = BncrCreateSchema.object({
  menuItems: BncrCreateSchema.array(
    BncrCreateSchema.object({
      category: BncrCreateSchema.string()
        .setTitle('分类名称')
        .setDescription('设置菜单分类的名称'),
      icon: BncrCreateSchema.string()
        .setTitle('分类图标')
        .setDescription('设置分类的图标(emoji)')
        .setDefault('📋'),
      items: BncrCreateSchema.array(
        BncrCreateSchema.object({
          command: BncrCreateSchema.string()
            .setTitle('命令')
            .setDescription('设置菜单项的命令'),
          description: BncrCreateSchema.string()
            .setTitle('描述')
            .setDescription('设置菜单项的描述'),
          icon: BncrCreateSchema.string()
            .setTitle('图标')
            .setDescription('设置菜单项的图标(emoji)')
            .setDefault('•')
        })
      ).setTitle('菜单项')
       .setDescription('设置该分类下的菜单项')
    })
  ).setTitle('菜单内容')
   .setDescription('设置菜单的内容结构')
   .setDefault(defaultConfig.menuItems),
  bottomContent: BncrCreateSchema.string()
    .setTitle('底部显示内容')
    .setDescription('设置菜单底部显示的内容，使用\\n表示换行')
    .setDefault(defaultConfig.bottomContent),
  style: BncrCreateSchema.object({
    useIcons: BncrCreateSchema.boolean()
      .setTitle('使用图标')
      .setDescription('是否在菜单项前显示图标')
      .setDefault(true),
    headerStyle: BncrCreateSchema.string()
      .setTitle('标题样式')
      .setDescription('设置菜单标题的样式')
      .setEnum(['simple', 'fancy', 'minimal', 'modern', 'rounded', 'elegant'])
      .setDefault('modern'),
    commandMaxLength: BncrCreateSchema.number()
      .setTitle('命令最大长度')
      .setDescription('设置命令显示的最大长度，用于对齐')
      .setDefault(10),
    separator: BncrCreateSchema.string()
      .setTitle('分隔符')
      .setDescription('设置命令和描述之间的分隔符')
      .setDefault('›'),
    categoryStyle: BncrCreateSchema.string()
      .setTitle('分类样式')
      .setDescription('设置分类标题的样式')
      .setEnum(['emoji', 'box', 'line', 'clean', 'modern', 'dot'])
      .setDefault('clean'),
    compactMode: BncrCreateSchema.boolean()
      .setTitle('紧凑模式')
      .setDescription('是否使用紧凑模式显示菜单')
      .setDefault(false),
    useColorfulIcons: BncrCreateSchema.boolean()
      .setTitle('彩色图标')
      .setDescription('是否使用彩色图标')
      .setDefault(true),
    showItemNumbers: BncrCreateSchema.boolean()
      .setTitle('显示编号')
      .setDescription('是否显示菜单项的编号')
      .setDefault(false),
    alignDescriptions: BncrCreateSchema.boolean()
      .setTitle('对齐描述')
      .setDescription('是否对齐菜单项的描述文本')
      .setDefault(true)
  }).setTitle('样式设置')
    .setDescription('设置菜单的显示样式')
    .setDefault(defaultConfig.style)
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

// 生成菜单标题
function generateHeader(style) {
  switch(style.headerStyle) {
    case 'simple':
      return [
        '━━━━━━━━━━━━━━',
        '📋 菜单选项列表 📋',
        '━━━━━━━━━━━━━━'
      ];
    case 'minimal':
      return [
        '== 菜单选项列表 =='
      ];
    case 'modern':
      return [
        '╭──── 菜单选项 ────╮',
        '│                  │',
        '╰──────────────────╯'
      ];
    case 'fancy':
    default:
      return [
        '┏━━━━━━━━━━━━━━━━━┓',
        '┃ ❤️💗菜单选项列表💗❤️ ┃',
        '┗━━━━━━━━━━━━━━━━━┛'
      ];
  }
}

// 添加新的标题样式选项
function generateHeader(style) {
  switch(style.headerStyle) {
    case 'simple':
      return [
        '━━━━━━━━━━━━━━',
        '📋 菜单选项列表 📋',
        '━━━━━━━━━━━━━━'
      ];
    case 'minimal':
      return [
        '== 菜单选项列表 =='
      ];
    case 'modern':
      return [
        '╭──── 菜单选项 ────╮',
        '│                  │',
        '╰──────────────────╯'
      ];
    case 'rounded':
      return [
        '╭────────────────╮',
        '│    菜单选项    │',
        '╰────────────────╯'
      ];
    case 'elegant':
      return [
        '┌─◈─────────◈─┐',
        '    菜单选项    ',
        '└─◈─────────◈─┘'
      ];
    case 'fancy':
    default:
      return [
        '┏━━━━━━━━━━━━━━━━━┓',
        '┃ ❤️💗菜单选项列表💗❤️ ┃',
        '┗━━━━━━━━━━━━━━━━━┛'
      ];
  }
}

// 生成分类标题
function generateCategoryTitle(category, icon, style) {
  switch(style.categoryStyle) {
    case 'box':
      return `┌─── ${category} ───┐`;
    case 'line':
      return `—— ${category} ——`;
    case 'clean':
      return `• ${category.toUpperCase()} •`;
    case 'modern':
      return `┌ ${category} ┐`;
    case 'dot':
      return `••• ${category} •••`;
    case 'emoji':
    default:
      return `${icon} ${category} ${icon}`;
  }
}

// 获取更新日志
function getLatestChangelog() {
  // 从注释中提取更新日志
  const commentRegex = /\/\*[\s\S]*?更新日志：([\s\S]*?)\*\//;
  const fileContent = require('fs').readFileSync(__filename, 'utf8');
  const match = fileContent.match(commentRegex);
  
  if (match && match[1]) {
    const changelogText = match[1].trim();
    const latestVersionMatch = changelogText.match(/v(\d+\.\d+\.\d+)\s+\(([^)]+)\)([\s\S]*?)(?=v\d+\.\d+\.\d+|$)/);
    
    if (latestVersionMatch) {
      const version = latestVersionMatch[1];
      const date = latestVersionMatch[2];
      const changes = latestVersionMatch[3].trim().split('\n').map(line => line.trim()).filter(line => line.startsWith('-'));
      
      return {
        version,
        date,
        changes: changes.map(change => change.substring(1).trim())
      };
    }
  }
  
  return null;
}

function generateMenu(menuItems, bottomContent, style = defaultConfig.style) {
  // 获取样式设置，如果没有提供则使用默认值
  const {
    useIcons = true,
    headerStyle = 'modern',
    commandMaxLength = 10,
    separator = '›',
    categoryStyle = 'clean',
    compactMode = false,
    useColorfulIcons = true,
    showItemNumbers = false,
    alignDescriptions = true,
    showChangelog = true
  } = style || {};
  
  // 生成菜单头部
  let message = generateHeader({ headerStyle });
  
  // 添加最新更新日志
  if (showChangelog) {
    const latestChangelog = getLatestChangelog();
    if (latestChangelog) {
      message.push(`📢 最新更新 v${latestChangelog.version} (${latestChangelog.date})`);
      latestChangelog.changes.forEach(change => {
        message.push(`  • ${change}`);
      });
      
      if (!compactMode) {
        message.push('────────────────');
      }
    }
  }
  
  // 添加分隔线
  if (!compactMode && !showChangelog) {
    message.push('────────────────');
  }
  
  // 遍历菜单分类
  for (const category of menuItems) {
    // 添加分类标题
    message.push(generateCategoryTitle(category.category, category.icon || '📋', { categoryStyle }));
    
    // 遍历分类下的菜单项
    category.items.forEach((item, index) => {
      const icon = useIcons ? (item.icon || '•') : '';
      const iconPrefix = useIcons ? `${icon} ` : '';
      const numberPrefix = showItemNumbers ? `${index + 1}. ` : '';
      
      let command = item.command;
      if (alignDescriptions) {
        command = command.padEnd(commandMaxLength);
      }
      
      message.push(`${numberPrefix}${iconPrefix}${command} ${separator} ${item.description}`);
    });
    
    // 添加分类分隔线
    if (!compactMode) {
      message.push('────────────────');
    } else {
      message.push('');
    }
  }

  // 添加底部内容，处理换行
  if (bottomContent) {
    message = message.concat(bottomContent.split('\\n'));
    if (!compactMode) {
      message.push('────────────────');
    }
  }

  return message.join('\n');
}

/**
 * 插件入口
 * @param {Sender} s
 */
module.exports = async s => {
  try {
    await ConfigDB.get();
    if (!Object.keys(ConfigDB.userConfig).length) {
      return await s.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置');
    }

    const { menuItems, bottomContent, style } = ConfigDB.userConfig;
    const menuContent = generateMenu(menuItems, bottomContent, style);
    await s.reply(menuContent);
  } catch (error) {
    console.error('生成或发送菜单时出错:', error);
    await s.reply('抱歉,生成菜单时出现错误,请稍后再试。\n错误信息: ' + error.message);
  }
};