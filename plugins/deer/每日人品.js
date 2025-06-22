/**
 * @author 鹿
 * @name 每日人品
 * @team deer
 * @version 1.0.0
 * @description 每日人品，测测你今天的人品值吧！
 * @rule ^(每日人品|今日人品|jrrp|抽签)$
 * @rule ^(人品榜|人品排行)$
 * @admin false
 * @public true
 * @priority 100
 * @classification ["娱乐","游戏"]
 */

const jrrpDB = new BncrDB('jrrp');

/**
 * 根据分数获取评价文案和表情
 * @param {number} score 人品分数
 * @returns {{level: string, comment: string, emoji: string}}
 */
function getLuckDescription(score) {
    if (score === 100) return { level: '天选之子', comment: '今天你就是唯一的主角，万事皆顺！', emoji: '👑' };
    if (score >= 90) return { level: '人品爆棚', comment: '幸运值MAX，做什么都感觉有如神助！', emoji: '🎉' };
    if (score >= 80) return { level: '鸿运当头', comment: '好运正在向你招手，大胆去尝试吧！', emoji: '🌟' };
    if (score >= 70) return { level: '相当不错', comment: '今天状态很好，是顺利的一天。', emoji: '👍' };
    if (score >= 60) return { level: '中规中矩', comment: '平平淡淡才是真，也是不错的一天。', emoji: '👌' };
    if (score >= 50) return { level: '还需努力', comment: '运气稍差，但问题不大，稳住！', emoji: '😅' };
    if (score >= 40) return { level: '有点低迷', comment: '今天可能有些不顺，保持平常心。', emoji: '🤔' };
    if (score >= 30) return { level: '诸事不宜', comment: '建议今天低调行事，少做重要决定。', emoji: '😥' };
    if (score >= 20) return { level: '霉运笼罩', comment: 'emmm...喝口水可能都会塞牙缝。', emoji: '🌧️' };
    if (score >= 1) return { level: '非酋附体', comment: '答应我，今天尽量待在家里好吗？', emoji: '🤦' };
    return { level: '无法定义', comment: '你的运气已经超出了三界之外。', emoji: '👽' };
}

/**
 * 生成基于用户ID和日期的稳定随机数 (0-100)
 * @param {string} userId 用户ID
 * @param {string} date 'YYYY-MM-DD' 格式的日期
 * @returns {number}
 */
function generateStableRandom(userId, date) {
    const seed = userId + date;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const randomValue = Math.abs(hash);
    return (randomValue % 100) + 1; // 映射到 1-100
}


module.exports = async s => {
    const today = sysMethod.getTime('yyyy-MM-dd');
    const userId = s.getUserId();
    const userName = s.getUserName();
    const command = s.getMsg();

    try {
        if (command === '人品榜' || command === '人品排行') {
            const todayData = await jrrpDB.get(today, []);
            if (todayData.length === 0) {
                return await s.reply('今天还没有人抽签哦，快来发送"jrrp"抢个沙发吧！');
            }

            todayData.sort((a, b) => b.score - a.score);

            let leaderboard = `🏆 今日人品排行榜 🏆\n--------------------\n`;
            todayData.slice(0, 10).forEach((p, i) => {
                leaderboard += `${i + 1}. ${p.userName}: ${p.score}分 (${p.level})\n`;
            });
            
            if(todayData.length > 10) {
                leaderboard += `\n...等共${todayData.length}人已抽签`;
            }

            return await s.reply(leaderboard);
        }

        const todayData = await jrrpDB.get(today, []);
        const userData = todayData.find(p => p.userId === userId);

        if (userData) {
            return await s.reply(`你今天已经抽过签啦！\n\n${userData.emoji} 你的人品是【${userData.score}分 - ${userData.level}】\n✍️ ${userData.comment}`);
        }

        const score = generateStableRandom(userId, today);
        const { level, comment, emoji } = getLuckDescription(score);

        const newUserRecord = {
            userId,
            userName,
            score,
            level,
            comment,
            emoji
        };
        todayData.push(newUserRecord);
        await jrrpDB.set(today, todayData);

        await s.reply(`✨ ${userName}，你今天的运势是...\n\n${emoji} 人品值：【${score}分 - ${level}】\n✍️ ${comment}`);

    } catch (error) {
        console.error('每日人品插件出错:', error);
        await s.reply('哎呀，我的人品测试机好像出故障了，稍后再来试试吧！');
    }
}; 