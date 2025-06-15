/**
 * @author 小九九 t.me/gdot0
 * @name 更新代理白名单
 * @team 鹿
 * @version 1.1.0
 * @description 更换jl、su、51、yyy、ipzan白名单
 * @rule ^chwlst$
 * @admin true
 * @public true
 * @priority 1000
 * @disable false
 * @classification ["工具","系统"]
 */

/*
更新日志：
1.1.0
- 适配无界3.0插件市场
- 添加可视化配置界面
- 优化错误处理和日志记录
- 改进推送消息逻辑
*/

const request = require("util").promisify(require("request"));
const got = require("got");
const DB = new BncrDB("djunDB");

// 配置Schema
const jsonSchema = BncrCreateSchema.object({
    yyytoken: BncrCreateSchema.string()
        .setTitle("优易云token")
        .setDescription("优易云API的token")
        .setDefault(""),
    d51Key: BncrCreateSchema.string()
        .setTitle("51代理key")
        .setDescription("51代理API的key")
        .setDefault(""),
    suKey: BncrCreateSchema.string()
        .setTitle("速代理key")
        .setDescription("速代理API的key")
        .setDefault(""),
    jltradeNo: BncrCreateSchema.string()
        .setTitle("巨量订单号")
        .setDescription("巨量代理的订单号")
        .setDefault(""),
    jlkey: BncrCreateSchema.string()
        .setTitle("巨量key")
        .setDescription("巨量代理API的key")
        .setDefault(""),
    ipzanNo: BncrCreateSchema.string()
        .setTitle("品赞订单号")
        .setDescription("品赞代理的订单号")
        .setDefault(""),
    ipzanUserId: BncrCreateSchema.string()
        .setTitle("品赞用户id")
        .setDescription("品赞代理的用户ID")
        .setDefault(""),
    ipzanPassword: BncrCreateSchema.string()
        .setTitle("品赞登录密码")
        .setDescription("品赞代理的登录密码")
        .setDefault(""),
    ipzanExtractKey: BncrCreateSchema.string()
        .setTitle("品赞套餐提取密匙")
        .setDescription("品赞代理的套餐提取密匙")
        .setDefault(""),
    ipzanSignKey: BncrCreateSchema.string()
        .setTitle("品赞签名密匙")
        .setDescription("品赞代理的签名密匙")
        .setDefault(""),
    platforms: BncrCreateSchema.array(BncrCreateSchema.string().setTitle("平台").setDescription(`要推送通知的平台，如qq、tgBot等`).setDefault(""))
        .setTitle("推送平台")
        .setDescription(`点击右下角+增加更多平台，留空则不推送到任何平台`)
        .setDefault([]),
    admins: BncrCreateSchema.array(BncrCreateSchema.string().setTitle("管理员").setDescription(`要接收通知的管理员QQ号或其他平台ID`).setDefault(""))
        .setTitle("接收通知的管理员")
        .setDescription(`点击右下角+增加更多管理员，留空则不推送给任何管理员`)
        .setDefault([])
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

//配置
const yyytoken = ""; //优易云token

const d51Key = ""; //51代理key

const suKey = ""; //速代理key

const jltradeNo = ""; //巨量订单号
const jlkey = ""; //巨量key

const ipzanNo = ""; //品赞订单号
const ipzanUserId = ""; //品赞用户id
const 品赞登录密码 = "";
const 品赞套餐提取密匙 = "";
const 品赞签名密匙 = "";

const yyyurl = "http://data.yyyip.cn:8888/whiteip_api?";
//const url = "https://4.ipw.cn/";

module.exports = async (s) => {
    try {
        // 检查配置是否完成
        await ConfigDB.get();
        if (!Object.keys(ConfigDB.userConfig).length) {
            return await s.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置');
        }

        // 检查必要的配置项是否已填写
        const config = ConfigDB.userConfig;
        const requiredFields = ['yyytoken', 'suKey', 'jltradeNo', 'jlkey', 'ipzanNo', 'ipzanUserId', 'ipzanPassword', 'ipzanExtractKey', 'ipzanSignKey'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            return await s.reply(`请先完成以下必要配置项：\n${missingFields.map(field => `- ${field}`).join('\n')}\n\n请发送"修改无界配置"或前往前端web"插件配置"进行配置`);
        }

        let newip = await DB.get("local_ip");
        console.log(newip);
        if (newip) {
            let adminNotice = "";
            Promise.all([
                //并发提交更换白名单请求，如果有新请求，请加到这个数列里面
                jl(),
                yyy(),
                su(),
                ipzan(),
            ]).then(() => {
                pushAdminMessage("更换白名单结果：\n" + adminNotice.slice(0, -2));
            });

            //await updateIp();

            //各家代理更换白名单的方法，可自行补充
            async function jl() {
                //巨量
                //替换白名单
                const jlApi = "http://v2.api.juliangip.com/dynamic/getwhiteip?trade_no=" + jltradeNo + "&sign=" + jlwlSign();
                let jlWhiteList = "";
                try {
                    jlWhiteList = await got(jlApi).json();
                } catch (err) {
                    console.log("巨量获取白名单失败");
                    adminNotice += "巨量get error\n";
                    return;
                }
                //console.log(jlWhiteList);
                try {
                    const jlWhiteIp = jlWhiteList.data.current_white_ip;
                    function jlrpSign() {
                        const string = "new_ip=" + newip + "&old_ip=" + jlWhiteIp + "&trade_no=" + jltradeNo + "&key=" + jlkey;
                        const md5 = require("md5");
                        const sign = md5(string);
                        return sign;
                    }
                    let jlWhiteReplace = await request({
                        url:
                            "http://v2.api.juliangip.com/dynamic/replaceWhiteIp?trade_no=" +
                            jltradeNo +
                            "&new_ip=" +
                            newip +
                            "&old_ip=" +
                            jlWhiteIp +
                            "&sign=" +
                            jlrpSign(),
                        method: "get",
                    });
                    //onsole.log(jlWhiteReplace.body);
                    //adminNotice += jlWhiteReplace.body;
                } catch (err) {
                    console.log("巨量替换白名单失败");
                    adminNotice += "巨量push error\n";
                    return;
                }
                console.log("巨量替换ip成功");
                adminNotice += "巨量success\n";
            }

            async function yyy() {
                //优亦云
                //删除旧白名单
                console.log("开始更换");
                const yyyApi = yyyurl + "method=list&token=" + yyytoken;
                let yyyWhiteList = await got(yyyApi).json();
                //console.log(yyyWhiteList);
                for (const yyyWhiteRec of yyyWhiteList.data) {
                    let yyyWhiteIp = yyyWhiteRec.ip;
                    let yyyWhiteDel = await request({
                        url: yyyurl + "method=del&token=" + yyytoken + "&ip=" + yyyWhiteIp,
                        method: "get",
                    });
                    //console.log(yyyWhiteDel.body);
                }
                console.log("优亦云删除旧ip成功");
                //添加新白名单
                let yyydata = await request({
                    url: yyyurl + "method=add&token=" + yyytoken + "&ip=" + newip,
                    method: "get",
                });
                console.log("优亦云添加新ip成功");
                adminNotice += "优亦云success\n";
                //console.log(yyydata.body);
            }

            /*
            await function d51(){
                //51
                //删除旧白名单
                const d51Api = "http://aapi.51daili.com/whiteIP?op=list&appkey=" + d51Key;
                let d51WhiteList = await got(d51Api).json();
                //console.log(d51WhiteList);
                for (const d51WhiteIp of d51WhiteList.data.list) {
                    let d51WhiteDel = await request({
                        url: "http://aapi.51daili.com/whiteIP?op=del&appkey=" + d51Key + "&whiteip=" + d51WhiteIp,
                        method: 'get'
                    });
                    //console.log(d51WhiteDel.body);
                }
                console.log("51删除旧ip成功");
                //添加新白名单
                let d51data = await request({
                    url: "http://aapi.51daili.com/whiteIP?op=add&appkey=" + d51Key + "&whiteip=" + newip,
                    method: 'get'
                });
                console.log("51添加新ip成功");
                //console.log(d51data.body);
            }
            */

            async function su() {
                //速
                //删除旧白名单
                const suApi = "https://sudaili.com/whiteIP?op=list&appkey=" + suKey;
                let suWhiteList = await got(suApi).json();
                //console.log(d51WhiteList);
                for (const suWhiteIp of suWhiteList.data.list) {
                    let suWhiteDel = await request({
                        url: "https://sudaili.com/whiteIP?op=del&appkey=" + suKey + "&whiteip=" + suWhiteIp,
                        method: "get",
                    });
                    //console.log(d51WhiteDel.body);
                }
                console.log("速删除旧ip成功");
                //添加新白名单
                let sudata = await request({
                    url: "https://sudaili.com/whiteIP?op=add&appkey=" + suKey + "&whiteip=" + newip,
                    method: "get",
                });
                console.log("速添加新ip成功");
                adminNotice += "速success\n";
                //console.log(sudata.body);
            }

            async function ipzan() {
                //品赞
                //删除旧白名单
                const ipzanApi = "https://service.ipzan.com/whiteList-get?no=" + ipzanNo + "&userId=" + ipzanUserId;
                let ipzanWhiteList = await got(ipzanApi).json();
                //console.log(ipzanWhiteList);
                for (const ipzanWhiteRec of ipzanWhiteList.data) {
                    let ipzanWhiteIp = ipzanWhiteRec.id;
                    let ipzanWhiteDel = await request({
                        url: "https://service.ipzan.com/whiteList-del?no=" + ipzanNo + "&userId=" + ipzanUserId + "&ip=" + ipzanWhiteIp,
                        method: "get",
                    });
                    //console.log(ipzanWhiteDel.body);
                }
                console.log("品赞删除旧ip成功");
                //添加新白名单
                let ipzandata = await request({
                    url: "https://service.ipzan.com/whiteList-add?no=" + ipzanNo + "&sign=" + ipzanSign() + "&ip=" + newip,
                    method: "get",
                });
                console.log("品赞添加新ip成功");
                adminNotice += "品赞success\n";
                //console.log(ipzandata.body);
            }
        }
    } catch (error) {
        console.error('更新代理白名单出错:', error);
        await s.reply('抱歉,更新白名单时出现错误,请稍后再试。\n错误信息: ' + error.message);
    }

    function ipzanSign() {
        const CryptoJS = require("crypto-js");
        //const data = `登录密码:套餐提取密匙:${Date.now() / 1000}`;
        const data = `${品赞登录密码}:${品赞套餐提取密匙}:${Date.now() / 1000}`;
        //const key = CryptoJS.enc.Utf8.parse(签名密匙);
        const key = CryptoJS.enc.Utf8.parse(`${品赞签名密匙}`);
        const encryptedData = CryptoJS.AES.encrypt(data, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        });
        const sign = encryptedData.ciphertext.toString();
        return sign;
    }
};
function jlwlSign() {
    const string = "trade_no=" + jltradeNo + "&key=" + jlkey;
    const md5 = require("md5");
    const sign = md5(string);
    return sign;
}

// 辅助函数：推送管理员消息
function pushAdminMessage(message) {
    const platforms = ConfigDB.userConfig.platforms || [];
    const admins = ConfigDB.userConfig.admins || [];
    
    if (platforms.length > 0 || admins.length > 0) {
        sysMethod.pushAdmin({
            platform: platforms.length > 0 ? platforms : [],
            admin: admins.length > 0 ? admins : [],
            msg: message,
        });
    } else {
        console.log("[不推送] " + message);
    }
}