/**
 * @author xjj
 * @name HumanTG_Expand
 * @origin xjj
 * @team xjj
 * @version v1.0.1
 * @description 拓展人行tg功能
 * @rule ^(\.id|\.re|\.q|\.log)
 * @rule ^(\.at) ?([\s\S]+)?
 * @rule ^(\.de) ([0-9]+)$
 * @rule ^(\.ins) ?([\s\S]+)?$
 * @priority 100000000
 * @admin true
 * @public false
 * @disable false
 */

/* 
.id命令
读取所在会话中的id信息,回复某条消息则附加回复的id详情

.re命令
直接发.re转发自己最后发的一条消息
回复某消息发.re,则转发该条消息

.de命令
.de 5 删除自己在该会话中的最后5条发言

.log命令
在控制台打印该消息

-------------------------------
以下命令需要修改一下HumanTG适配器：
在其他HumanTG.Bridge.xxxxx的位置附近加一行
HumanTG.Bridge.rawClient = client;

.at命令
回复某消息发.at 任意字符,at被回复的消息的发送人并附加任意字符

.ins命令
回复某消息发.ins 指定文件夹,安装被回复消息中的文件(js或ts)到指定文件夹，不指定文件夹默认装到 官方插件 下面

.q命令
回复该消息贴纸版，已知问题: 没有用户名（@xxxx）的用户无法获得头像
*/
const {rm} = require("fs");
const log4js = require("log4js");
const log = log4js.getLogger("HumanTG_Expand");
log.level = "error";
module.exports = async (s) => {
	if (!s.getFrom().includes("HumanTG") || !(await s.isAdmin())) return;
	const from = s.getFrom(),
		userId = +s.getUserId(),
		userName = s.getUserName(),
		groupId = +s.getGroupId(),
		groupName = s.getGroupName(),
		msgId = +s.getMsgId(),
		friendId = +s.msgInfo.friendId,
		replyToMsgId = +s.msgInfo.replyToMsgId,
		ChatID = +groupId || +friendId || +userId,
		adminID = await new BncrDB("HumanTG").get("admin");
	switch (s.param(1)) {
		case ".id":
			let logs = `> 该条ID详细信息:\n`;
			friendId && (logs += `好友id:  \`${friendId}\`\n`);
			userId && (logs += `用户id:  \`${userId}\`\n`);
			userName && (logs += `用户名:  \`${userName}\`\n`);
			groupName && (logs += `群聊名:  \`${groupName}\`\n`);
			groupId && (logs += `群id:  \`${groupId}\`\n`);
			msgId && (logs += `消息id:  \`${msgId}\`\n`);
			if (replyToMsgId) {
				let info = await s.Bridge.getReplySendInfo(ChatID, replyToMsgId);
				logs += `\n> 被回复的消息ID详细信息:\n`;
				info?.bot && (logs += `是否bot: ${info?.bot}\n`);
				info?.id && (logs += `用户id:  \`${info?.id.toString()}\`\n`);
				info?.username && (logs += `用户名:  \`${info?.username}\`\n`);
				replyToMsgId && (logs += `消息id:  \`${replyToMsgId}\`\n`);
			}
			log.info(logs);
			s.delMsg(await s.reply(logs), {wait: 2});
			return;
		case ".de":
			let num = +s.param(2),
				info = await s.Bridge.getUserMsgId(ChatID, adminID, num + 1);
			info.length && s.delMsg(...info), s.delMsg(await s.reply(`已删除${info.length - 1}/${num}`), {wait: 3});
			return;
		case ".re":
			s.delMsg(msgId);
			const toMsgid = replyToMsgId || (await s.Bridge.getUserMsgId(ChatID, adminID, 1))[0];
			toMsgid && s.Bridge.forwardMessages(ChatID, toMsgid, ChatID);
			return;
		/** Code Encryption Block[419fd178b7a37c9eae7b7426c4a04203ab386791629eeddecc9be9aa66d6d3ed38db57ff79c97c77914cec4bb2e3734f0cd05b26cbac11404f2d4c28f727eb1f54188a1b15c4e655a55bf632a3c2be83c1974ec694ca1ac46a301bfd772542a955ca16e78b01a606c54e1d38b9c955c6f6cd56e1b0c799e386fa48264978e78169169cbddbdc196979010b17cb5a5c83445ccf7fc0eba6d016e2858309b3eccf253d03d80b80ac49bd136182b222e9a26c0a4975b64d2140a655e9794db8b4134faf7460c7651747f003ad74ab3644e921582953e1d2575c478d961ebae6ab59a1f1748e5ff73e5aa96d25f2633a7d7f04f1176dbc2bb617c3e80eae05bdd397b94fb8fab9e6b2216eb5f592537dd3b4ee4c370d147d41037e0dbbc72d82a28be55be208c7300d1f84a7619ceb4264e953b55511dddf9189b78a2f987be6264fe34fe78c68ed964afc6108a4bd36b37f7b8158750a2d15805567a763b21b6a9feb82c2d20496e18568c9dce11e37fe362868b3c2095762231dd2e8eeba08e3443d5757a6470ebd700bc08deedba2de99da9ae96fa7e39490126b9560ee9af3b1da549d927d1b2c62eff513a8410bd1d1868f631b934fd20bf639472d2c9700ad189b5305f676c3ac0a53e15bab12d228ca1ef826359a1959f6b72b849c64aa53344800afb3b813fab4a45e470e6970bb51a3576b97b819efbe583a7a2788218d9d316e36f0a74ed7040bdc9ec683f62ba4c1c84a41cfaee781910ca35b367a853733bdeafb86b3b606858c6f3693c371fb7fd3ab73d43106ad67119b1156c0b4215ef389482dbc14c040e5800b16fe08c680a198fef8e484346772d500e519fe42370e52831b1b86baab45dc738bcb83ad1388673b3cc1bdadc13b8d51b0a54fb63a86ad73d901e598c5101dac12502cef65e00bb18a4c20f2ba34c0beac67aeb6cb0bdd66bccb642558d789c0ddad12752df52b72f4a332791bfe83206d5ec537ae27590b0f36322326075a22d17abd306d00d1236f8fd2a75bb3ea7881f6d344682044d5d01cc61be2c60098c9471d7ce9ba70d0e3b7f02bbfb9d833320a827b85957224bca41fedfa674497deda95c150030d4b02c482bb60129410cf5ffced6faa83631290721105039208cb5dadd3090a6685690031224f6a063852565cff907a79022594e8e289c1c15865ab04e9dc46f2f4902d1312c3cd1e7c26debe2e8cdb562ff5bfdd4a73c4ce585abd51ca3fe60c04b6669881811661bc6804b17b491233754145994eb5d4d1d2b44ab08e49c07e4007413bfad8be5104969475debdbb384cd433c3ec428b0779ace9f2faa3d2ef402c8a9f36863a10f431c050cf019cbcea795b478adb6850085df34d4deb61a630f1625ca5a56527a3c44b2699bd298c5a04dc9a3b7dbaad0e594ac8a866141d2fd19181280a558ef55f37cea75a9bdb5e67bd2aedc0fb7133ee0664c9d884fc3e18c17e67ccf456ab93e7214ae1543b204e4150b35c3c7b3c0fbd0fafb09a2818cdcaf714ad70e2277dddc541163c48bba7f585347d877f4d76effee146d921b0fc0533974b05e6c3c7e3716d88e5570e485cb4cf0ec484303991dd1880562e4e92d2597f76ce35fbfcf26a8c2089e775ae2a0ead61fd66a46b231aeea74a45b5aeaed0e4a4f810e2bd27a262528b2c14bcfd24b5844d19a316f64993d4e7c3411833f8287db0fd47b69a828ccd016e708d97194d05dd33caded873c4f3151d5e77b9003143272461d8d2855af92ef5336626534cb3a2674f165df73e2dc4dd02b3910810e40e7f5e6a72c07eb6e6158dada0b24f93da03ee1fb22c1952ef25f22ca7c4d33ed3f826a70fcff1f2e99c2fe0152af31a8691e7154e0f5490f356081eb304a93f001c6fc4a9cbdff32672caff4d0935f92d20227f8ca277a8cd33afeb299114b3eb47974cae2e69e9a291000363d2e9260513379863a5afdb30645ea0c0991d5144cceb94e1a0bcc9430fbc212ef053b2c9f3ec4155356455dc0bbf68c55be1a08b4c4c920d4325e89aba9cb997950e166ec0c3227381e78cbcbb4c28e578f7c3d90674964668179f5ac5b306b0b89dafbd82c9fd98cc5273ec1bc9a366a7be465d5fd20a1e7e9627820df0158eb8b031d9ce968ca5d11cee580eab679d4d3f5f94c0ae696f961b4eb1cb1b6b48a74abd1f4ce7fd6f0dcbe79667c69a0dcfc45e3231c7d5d0835bed8a0517b1ea9de5d4a7befa4cb526013beeb70f2f90bc57927aa93e75fd04abb3539c29f4056525be8388a1b222bf21b6ada492870381dd015860fd5ac81a670e9da39d8ebcf35a4457505f2045775da37ae66db13e37aa6a91ba11b459c65d472b40379dacb2479b1063c951a160444e2f261be453baff5b0a0fff0919840376b49774b0685a421fb4ecf242d64b46ca2d236bfce96b7f753c1dff78e2f980d073c377afe02a4d7963092795469bdaa0377a510021a3ace5536cd9a6ba51fe58ebb45ad2af7121c1e205edcb1d9415e13f29285459072e859ab517594acdeddf1048e9f3b81e17a120d5b4648f922c1a3fe6ded3d781190cb2031c4ba3d021c18ccf416480e3ab9f2da413678e80ba0414bd273f633db7c47ad631897b4f353521289087b357f697ed27928db4fcd45ad0bcf2a075e332867b1d3394c08cc8c25b40c8de7f4da8c5933bac955cc5df3152ba40c9ad453a4fab2e2d35809c7ae6429b2e2155d4a46cee0506e8328f491915e36026438fda796d2c78b930a0e524bea1160095fdeb15420dabd9f1729d1c3af324031453c2649c8d337e4bbc20167a3a82aa7db39fdfc3cc51f5490b66e73e3944482c6c03f7cc5272903c1e3e9d98bae2a6a49c6f16b08a84cfa19b0d7362647c3c7b2d043a2df4aa8639ad5b044b1796e0cb53ffb9d2732a29f6eeea603cbab53324a1246292cf5a4db0bd06c131264461ee34171f5486d98a28fa874cb574bc6a7337d5921a90ab52954e0b2731dd0624370f7868802186d51a250ed6703c49ef70b71c3173819643ceeebc8fa1921bf81f80d596d74a7492e1c636db3b5aaf0dabb055bbe3e55252cab42d632628917e1ef59396a175a3b6b567eef021cdba66cf4d9ecb12a547a88846157d0473957f3f65a064cd5a0dca7f0d80454110b58c712c459043bf75874258db8a8866f0fd9548c148577ef0655254640fda463d646312174d6f56625fbcb2c66c14b68ca7fb31f3dfc02fb5b2c15b5c2c6a13793aeccb9847711571be639ba5cab463fab3332b8965483cd73a5778c400a188e31962e2c044e6f123b17491df2003755dcfa44d9ec6f22b8f10d97492bef83ca307639f25de7508007b1a4095c2638fd39f7625bfe2175a9c3dcc5c7813a253ab986a0fdd889544e0953c0e337eb5ce6957f2808b548d253eb07d9af7673cb299eb7f5951f3fec228ea58aa943443c3d81390c9247c9bcafdb506acdeb0b9445014506a1951af887cae4e6ac8212e42799db813e63c5600309f7ee9f0dce811e43d8123866e4c926c6993e6bddf45b06560d68e2f8e55285c1960b8c881a3a3f4641d42e3d6d52eae18d2fad65495324a0a83fcb5f4b24510e102586bd8d15ee0c83b242ca3f57ced90c15a383df9cfc619c76ff6336ff533dee68ae33111f077df6bd602ca1caaac11c1dadf4b01736c16520b16fcd202df951e76ce7e440b6efd8d73a39ee5ae29c8dedbc902e23062b7e2aaf7df2014d376a0df684d4438307d52309c60bacce5a6b01a3fdfc7c1247169b68649fca63e3384e3c61a6b729e4c24264f89fdc897d2a41ba2c3f5655daa070600cec6f167a06b16b77f422b5e274c7dfbf5beb2a5a61dc549cec6c85df949cedda707e76cfd7a0ee06f0d96c779e8592e82731aa71b9d8775483885b4b45daea24e622e4101c9bf86b3b8304c7f56b8055d1255d397d322ab12b172ffc69d4ceca6140faf22b56d114095753253431f4b869b94c95bb7e6c3ad38d62c12e3f15dd8dd8e96037fabb6fd28262593da16f00aaceab1789939445f1b12b38772038c937619dc78998f38e6afce4ea87d5896785d9ba12aa79d0b170258a8c149323d34c3fd0a2ae9f9fa88bc730d8576e00ce43bfda8eaf8008ede7bf6eb9e98404bd2e43ddd88cbd9c79028377e587573c2ad609136a3da73d58ee75ce79c8ad17db9c5d104fbdb3da4f278daa6a3f83786a8069f9a151d0da6992af88c5f8402cdd515ca9de5d48cdda27a7febcce9b6af5ff65de6b8f15c] */
		default:
			break;
	}
};
