/**
 * @author 鹿
 * @name 成语接龙
 * @team deer
 * @version 1.3.0
 * @description 来一场紧张刺激的成语接龙吧！现在支持积分、排行榜和超时功能！请使用"接 成语"来玩。
 * @rule ^成语接龙$
 * @rule ^(不接了|结束接龙)$
 * @rule ^(成语排行|接龙榜)$
 * @rule ^接\s*[\u4e00-\u9fa5]{4}$
 * @admin false
 * @public true
 * @priority 101
 * @classification ["娱乐", "游戏", "文化"]
 */

const gameDB = new BncrDB('chengyuSolitaire_game');
const rankDB = new BncrDB('chengyuSolitaire_rank');
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5分钟超时

// 内置成语词典 (部分示例)
// 为了插件的健壮性，这里仅列出部分，实际应包含数千个
const idiomList = [
    '为所欲为', '为富不仁', '仁至义尽', '尽善尽美', '美中不足', '足智多谋', '谋事在人', '人山人海',
    '海阔天空', '空前绝后', '后发制人', '人定胜天', '天外有天', '天长地久', '久负盛名', '名扬四海',
    '海外奇谈', '谈笑风生', '生龙活虎', '虎虎生威', '威风凛凛', '凛然正气', '气象万千', '千方百计',
    '计上心来', '来日方长', '长治久安', '安步当车', '车水馬龍', '龍馬精神', '神采奕奕', '奕奕生辉',
    '辉煌腾达', '达官显贵', '贵人多忘', '忘恩负义', '义薄云天', '天涯海角', '角立杰出', '出奇制胜',
    '胜券在握', '握手言和', '和颜悦色', '色厉内荏', '荏苒光阴', '阴差阳错', '错综复杂', '杂乱无章',
    '章句之徒', '徒劳无功', '功成名就', '就地取材', '材大难用', '用武之地', '地大物博', '博大精深',
    '深思熟虑', '虑周藻密', '密不透风', '风驰电掣', '掣襟露肘', '肘腋之患', '患得患失', '失道寡助',
    '助人为乐', '乐不思蜀', '蜀犬吠日', '日积月累', '累卵之危', '危在旦夕', '夕惕若厉', '厉兵秣马',
    '马到成功', '功德无量', '量力而行', '行云流水', '水落石出', '出人头地', '地久天长', '长年累月'
];

// 为了快速查找，构建一个以首字为key的Map
const idiomMap = new Map();
const allIdiomsSet = new Set(idiomList);

function setupIdioms() {
    if (idiomMap.size > 0) return; // 防止重复初始化
    idiomList.forEach(idiom => {
        const firstChar = idiom[0];
        if (!idiomMap.has(firstChar)) {
            idiomMap.set(firstChar, []);
        }
        idiomMap.get(firstChar).push(idiom);
    });
}

// 初始化词典
setupIdioms();

// 游戏核心逻辑
module.exports = async s => {
    const command = s.getMsg();
    const gameId = s.getGroupId() || s.getUserId();
    if (!gameId) return;

    let game = await gameDB.get(gameId);

    // 检查游戏是否超时
    if (game && game.isActive && (Date.now() - game.startTime > TIMEOUT_DURATION)) {
        await gameDB.del(gameId);
        await s.reply(`⏰ 太长时间没有接龙了，本轮游戏已超时结束。\n上一轮的最后一个成语是【${game.lastIdiom}】。`);
        game = null; // 重置游戏状态
    }

    try {
        // === 1. 开始游戏 ===
        if (command === '成语接龙') {
            if (game && game.isActive) {
                // 兼容旧数据，如果不存在startTime，则添加
                if (!game.startTime) {
                    game.startTime = Date.now();
                    await gameDB.set(gameId, game);
                }
                return await s.reply(`游戏已经开始了哦！\n当前词是：【${game.lastIdiom}】\n请使用【接 成语】来接龙。`);
            }
            const startGameIdiom = idiomList[Math.floor(Math.random() * idiomList.length)];
            const newGame = {
                isActive: true,
                lastIdiom: startGameIdiom,
                usedIdioms: [startGameIdiom], // 使用数组以便存入DB
                roundStats: {}, // { [userId]: { userName, score } }
                startTime: Date.now()
            };
            await gameDB.set(gameId, newGame);
            return await s.reply(`🎉 成语接龙开始！\n\n我先来：【${startGameIdiom}】\n\n请使用【接 成语】来参与接龙。`);
        }

        // === 2. 结束游戏 ===
        if (command === '不接了' || command === '结束接龙') {
            if (!game || !game.isActive) return;
            let summary = '好吧，本轮成语接龙结束！';
            if (Object.keys(game.roundStats).length > 0) {
                summary += '\n\n本局战报：\n';
                for (const userId in game.roundStats) {
                    const stat = game.roundStats[userId];
                    summary += `${stat.userName} 接对了 ${stat.score} 个成语\n`;
                }
            }
            await gameDB.del(gameId);
            return await s.reply(summary);
        }
        
        // === 3. 查看排行榜 ===
        if (command === '成语排行' || command === '接龙榜') {
            const allRanks = await rankDB.get('all', []);
            if (allRanks.length === 0) {
                return await s.reply('目前还没有人登上成语排行榜，快来玩一把，争做文化人！');
            }
            
            allRanks.sort((a, b) => b.totalScore - a.totalScore);

            let leaderboard = `🏆 成语接龙总排行榜 🏆\n(记录历史总积分)\n--------------------\n`;
            allRanks.slice(0, 10).forEach((p, i) => {
                leaderboard += `${i + 1}. ${p.userName} - ${p.totalScore}分\n`;
            });
            
            if(allRanks.length > 10) {
                leaderboard += `\n...等共${allRanks.length}人已上榜`;
            }
            return await s.reply(leaderboard);
        }


        // === 4. 处理接龙 ===
        if (/^接\s*[\u4e00-\u9fa5]{4}$/.test(command)) {
            if (!game || !game.isActive) {
                return s.reply('当前没有正在进行的成语接龙游戏，请发送【成语接龙】来开始新游戏。');
            }

            const userInput = command.replace(/^接\s*/, '');
            const lastChar = game.lastIdiom[game.lastIdiom.length - 1];
            const usedIdiomsSet = new Set(game.usedIdioms);
            
            if (!allIdiomsSet.has(userInput)) return s.reply(`🤔"${userInput}"... 这好像不是一个成语哦，换一个试试？`);
            if (usedIdiomsSet.has(userInput)) return s.reply(`"${userInput}"已经用过啦，想想别的。`);
            if (userInput[0] !== lastChar) return s.reply(`没有接上哦，上一个成语是【${game.lastIdiom}】，你应该用"${lastChar}"字开头。`);

            // 玩家回答正确
            const userId = s.getUserId();
            const userName = s.getUserName();
            
            // 更新本局统计
            if (!game.roundStats[userId]) {
                game.roundStats[userId] = { userName, score: 0 };
            }
            game.roundStats[userId].score++;
            
            // 更新总排行榜
            const allRanks = await rankDB.get('all', []);
            let userRank = allRanks.find(r => r.userId === userId);
            if (userRank) {
                userRank.totalScore++;
                userRank.userName = userName; // 同步最新昵称
            } else {
                userRank = { userId, userName, totalScore: 1 };
                allRanks.push(userRank);
            }
            await rankDB.set('all', allRanks);
            
            
            // 机器人接龙
            game.usedIdioms.push(userInput);
            const nextFirstChar = userInput[userInput.length - 1];
            const possibleReplies = (idiomMap.get(nextFirstChar) || []).filter(idiom => !usedIdiomsSet.has(idiom) && idiom !== userInput);

            if (possibleReplies.length === 0) {
                let summary = `厉害！你说的"${userInput}"我接不上了，你赢了！🎉`;
                 if (Object.keys(game.roundStats).length > 0) {
                    summary += '\n\n本局战报：\n';
                    for (const uid in game.roundStats) {
                        const stat = game.roundStats[uid];
                        summary += `${stat.userName} 接对了 ${stat.score} 个成语\n`;
                    }
                }
                await gameDB.del(gameId);
                return await s.reply(summary);
            }

            const botReply = possibleReplies[Math.floor(Math.random() * possibleReplies.length)];
            game.usedIdioms.push(botReply);
            game.lastIdiom = botReply;
            game.startTime = Date.now(); // 重置计时器
            await gameDB.set(gameId, game);

            await s.reply(`漂亮！获得1分！\n我来接：【${botReply}】\n\n到你了，请继续：`);
        }

    } catch (error) {
        console.error('成语接龙插件出错:', error);
        await s.reply('哎呀，我的词典好像翻乱了，游戏出现了一点小问题，我们稍后再战吧！');
        await gameDB.del(gameId);
    }
}; 