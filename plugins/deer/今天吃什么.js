/**
 * @author 鹿
 * @name 今天吃什么
 * @team deer
 * @version 1.0.1
 * @description 解决宇宙终极难题：今天吃什么？
 * @rule ^(今天吃什么|吃什么)$
 * @rule ^添加菜单\s(.+)$
 * @rule ^删除菜单\s(.+)$
 * @rule ^(查看菜单|我的菜单)$
 * @admin false
 * @public true
 * @priority 100
 * @classification ["生活","娱乐"]
 */

// 内置一个丰富的默认菜单，确保第一次使用时就有内容
const defaultMenu = [
    '肯德基', '麦当劳', '汉堡王', '华莱士', '赛百味',
    '兰州拉面', '沙县小吃', '桂林米粉', '螺蛳粉', '酸辣粉',
    '麻辣烫', '麻辣香锅', '火锅', '冒菜', '串串香',
    '盖浇饭', '煲仔饭', '猪脚饭', '黄焖鸡米饭', '隆江猪脚饭',
    '饺子', '包子', '馄饨', '烧卖', '油条豆浆',
    '寿司', '刺身', '日式拉面', '鳗鱼饭', '天妇罗',
    '披萨', '意面', '牛排', '沙拉',
    '湘菜', '川菜', '粤菜', '东北菜', '本帮菜',
    '炒饭', '炒面', '拌面', '泡面加个蛋',
    '楼下快餐', '便利店饭团', '自己做饭', '喝西北风'
];

// 初始化数据库
const menuDB = new BncrDB('whatToEat');

/**
 * 获取当前菜单，如果用户菜单为空，则返回默认菜单
 * @returns {Promise<string[]>}
 */
async function getCurrentMenu() {
    const userMenu = await menuDB.get('userMenu', []);
    return userMenu.length > 0 ? userMenu : defaultMenu;
}

// 插件主逻辑
module.exports = async s => {
    const msg = s.getMsg();
    const content = s.param(1); // param(1)会获取到 rule 中第一个括号里的内容

    try {
        if (msg === '今天吃什么' || msg === '吃什么') {
            const menu = await getCurrentMenu();
            const choice = menu[Math.floor(Math.random() * menu.length)];
            await s.reply(`🤔 让我想想... 就决定是你了！\n\n🎉 今天吃【${choice}】吧！`);
        } else if (msg.startsWith('添加菜单 ')) {
            const userMenu = await menuDB.get('userMenu', []);
            if (userMenu.includes(content)) {
                await s.reply(`😋【${content}】已经在你的菜单里啦，不用重复添加哦。`);
            } else {
                userMenu.push(content);
                await menuDB.set('userMenu', userMenu);
                await s.reply(`👌 好了！【${content}】已经成功加入你的专属菜单！`);
            }
        } else if (msg.startsWith('删除菜单 ')) {
            const userMenu = await menuDB.get('userMenu', []);
            const index = userMenu.indexOf(content);
            if (index > -1) {
                userMenu.splice(index, 1);
                await menuDB.set('userMenu', userMenu);
                await s.reply(`🗑️ 搞定！【${content}】已经从你的菜单里移除了。`);
            } else {
                await s.reply(`🤔 咦？你的菜单里好像没有【${content}】哦。`);
            }
        } else if (msg === '查看菜单' || msg === '我的菜单') {
            const userMenu = await menuDB.get('userMenu', []);
            let replyMsg = '';
            if (userMenu.length > 0) {
                replyMsg = '📋 这是你的专属美食菜单：\n\n' + userMenu.join('、');
                replyMsg += '\n\n你可以通过"添加/删除菜单"来管理它。';
            } else {
                replyMsg = '📋 你还没有专属菜单，将使用默认菜单：\n\n' + defaultMenu.join('、');
                replyMsg += '\n\n快用"添加菜单"来创建你的第一个美食吧！';
            }
            await s.reply(replyMsg);
        }
    } catch (error) {
        console.error('"今天吃什么"插件出错了：', error);
        await s.reply('哎呀，我的菜单好像出错了，请稍后再试吧！');
    }
}; 