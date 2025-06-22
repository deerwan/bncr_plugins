/**
 * @author 鹿
 * @name 猜数字
 * @team deer
 * @version 1.3.0
 * @description 一个简单有趣的猜数字小游戏。请使用"猜 [数字]"来玩。带排行榜和超时功能。
 * @rule ^猜数字$
 * @rule ^(不猜了|放弃|结束游戏)$
 * @rule ^(猜数字排行|猜数字榜)$
 * @rule ^猜\s*\d{1,3}$
 * @admin false
 * @public true
 * @priority 100
 * @classification ["娱乐","游戏"]
 */

const gameDB = new BncrDB('guessTheNumber_game'); // 存储正在进行的游戏
const rankDB = new BncrDB('guessTheNumber_rank'); // 存储排行榜数据
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5分钟超时

// 游戏核心逻辑
module.exports = async s => {
    const command = s.getMsg();
    // 使用群组ID作为游戏的唯一标识，如果没有群组ID（如私聊），则使用用户ID
    const gameId = s.getGroupId() || s.getUserId();
    if (!gameId) return; // 如果无法获取标识，则不处理

    let game = await gameDB.get(gameId, null);

    // 检查游戏是否超时
    if (game && game.isActive && (Date.now() - game.startTime > TIMEOUT_DURATION)) {
        const timedOutAnswer = game.answer;
        await gameDB.del(gameId);
        await s.reply(`⏰ 太长时间没有猜了，本轮游戏已超时结束。\n正确答案是【${timedOutAnswer}】。`);
        game = null; // 重置游戏状态，以便可以开始新游戏
    }

    try {
        // === 1. 开始游戏 ===
        if (command === '猜数字') {
            if (game && game.isActive) {
                return await s.reply(`游戏已经开始了哦！请猜一个 ${game.min} - ${game.max} 之间的数字，使用【猜 数字】的格式。`);
            }

            const newGame = {
                isActive: true,
                answer: Math.floor(Math.random() * 100) + 1,
                min: 1,
                max: 100,
                guessCount: 0,
                startTime: Date.now()
            };
            await gameDB.set(gameId, newGame);
            return await s.reply('🎉 猜数字游戏开始啦！\n\n我心里想好了一个 1 到 100 之间的整数，请使用【猜 数字】来猜猜看吧！');
        }

        // === 2. 结束游戏 ===
        if (command === '不猜了' || command === '放弃' || command === '结束游戏') {
            if (!game || !game.isActive) {
                return; // 没有游戏在进行，静默处理
            }
            const answer = game.answer;
            await gameDB.del(gameId); // 结束游戏后删除记录
            return await s.reply(`好吧，本轮游戏结束！\n\n正确答案是【${answer}】，下次再来挑战哦！`);
        }

        // === 3. 查看排行榜 ===
        if (command === '猜数字排行' || command === '猜数字榜') {
            const allRanks = await rankDB.get('all', []);
            if (allRanks.length === 0) {
                return await s.reply('目前还没有人登上猜数字排行榜哦，快来玩一把，争做第一人！');
            }
            
            // 按最佳成绩（猜测次数）升序排序
            allRanks.sort((a, b) => a.bestScore - b.bestScore);

            let leaderboard = `🏆 猜数字之王排行榜 🏆\n(记录历史最佳成绩)\n--------------------\n`;
            allRanks.slice(0, 10).forEach((p, i) => {
                leaderboard += `${i + 1}. ${p.userName} - ${p.bestScore}次猜中\n`;
            });
            
            if(allRanks.length > 10) {
                leaderboard += `\n...等共${allRanks.length}人已上榜`;
            }

            return await s.reply(leaderboard);
        }

        // === 4. 处理猜测 ===
        if (/^猜\s*\d{1,3}$/.test(command)) {
            if (!game || !game.isActive) {
                return s.reply('游戏还没开始呢，请发送【猜数字】开始一轮新游戏。');
            }
            const guess = parseInt(command.replace(/^猜\s*/, ''), 10);
            
            // 简单防刷屏，如果短时间内猜测次数过多可以增加逻辑
            game.guessCount++;

            if (guess < game.min || guess > game.max) {
                 await s.reply(`数字范围是 ${game.min} - ${game.max} 哦，请猜这个范围内的数字。`);
                 await gameDB.set(gameId, game); // 更新猜测次数
                 return;
            }

            if (guess === game.answer) {
                const userId = s.getUserId();
                const userName = s.getUserName();
                const guessCount = game.guessCount;

                await gameDB.del(gameId); // 猜对了，删除游戏记录
                await s.reply(`🎉 恭喜 @${userName} 猜对啦！\n\n正确答案就是【${game.answer}】！\n你一共猜了 ${guessCount} 次。`);
                
                // 更新排行榜
                const allRanks = await rankDB.get('all', []);
                const userRank = allRanks.find(r => r.userId === userId);

                if (userRank) {
                    if (guessCount < userRank.bestScore) {
                        userRank.bestScore = guessCount;
                        userRank.userName = userName; // 更新可能变化的昵称
                        await s.reply(`🏆 哇！你打破了自己的记录，新的最佳成绩是 ${guessCount} 次！`);
                    }
                } else {
                    allRanks.push({
                        userId,
                        userName,
                        bestScore: guessCount
                    });
                     await s.reply(`🎉 恭喜你首次登上猜数字排行榜！`);
                }
                await rankDB.set('all', allRanks);

            } else if (guess > game.answer) {
                game.max = guess - 1;
                await gameDB.set(gameId, game);
                await s.reply(`大了！现在的范围是 ${game.min} - ${game.max}。`);
            } else { // guess < game.answer
                game.min = guess + 1;
                await gameDB.set(gameId, game);
                await s.reply(`小了！现在的范围是 ${game.min} - ${game.max}。`);
            }
        }

    } catch (error) {
        console.error('猜数字插件出错:', error);
        await s.reply('哎呀，我的游戏程序好像出了一点小故障，请稍后再试。');
        await gameDB.del(gameId); // 发生错误时也清理游戏状态
    }
}; 