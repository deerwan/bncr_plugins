/**
 * @author 小九九
 * @name 更换rabbitpro反代
 * @origin 小九九
 * @team 鹿
 * @version 1.0.3
 * @rule ^crbfd$
 * @description 检查反代列表，更换可用的rabbitpro反代
 * @admin true
 * @public true
 * @priority 1000
 * @classification ["工具","系统"]
 */

    /*
    命令解释：
    crbfd: （管理员）更换兔子反代，可配合定时任务自动运行，可自定义触发命令，修改
    * @rule ^crbfd$
    例如：
    * @rule ^更换兔子反代$
    多个 | 分割
    例如：
    * @rule ^crbfd|更换兔子反代$
    更新日志：
    1.0.3
    - 修复URL处理逻辑
    - 优化错误处理和日志记录
    - 改进推送消息逻辑
    1.0.2
    增加更换反代推送管理员选项，单个或多个，而不是所有管理员


    */

    const jsonSchema = BncrCreateSchema.object({
        rabbit: BncrCreateSchema.object({
            base: BncrCreateSchema.string().setTitle("地址").setDescription(`最后不要带/`).setDefault("http://172.0.0.1:1234"),
            name: BncrCreateSchema.string().setTitle("用户名").setDescription(`登录后台用的那个用户名`).setDefault("admin"),
            passwd: BncrCreateSchema.string().setTitle("密码").setDescription(`登录后台用的那个密码`).setDefault("password"),
        }).setTitle("兔子面板"),
        rlist: BncrCreateSchema.array(BncrCreateSchema.string().setTitle("地址").setDescription(`前面不要http(s)://，最后不要带/`).setDefault("mr-orgin.1888866.xyz"))
            .setTitle("反代地址")
            .setDescription(`点击右下角+增加更多地址`)
            .setDefault([
                "rabbit.cfyes.tech",
                "mr-orgin.1888866.xyz",
                "jd-orgin.1888866.xyz",
                "mr.118918.xyz",
                "host.257999.xyz",
                "log.madrabbit.eu.org",
                "fd.gp.mba:6379",
            ]),
        admins: BncrCreateSchema.array(BncrCreateSchema.string().setTitle("管理员").setDescription(`要接收通知的管理员QQ号或其他平台ID`).setDefault(""))
            .setTitle("接收通知的管理员")
            .setDescription(`点击右下角+增加更多管理员，留空则不推送给任何管理员`)
            .setDefault([]),
        platforms: BncrCreateSchema.array(BncrCreateSchema.string().setTitle("平台").setDescription(`要推送通知的平台，如qq、tgBot等`).setDefault(""))
            .setTitle("推送平台")
            .setDescription(`点击右下角+增加更多平台，留空则不推送到任何平台`)
            .setDefault([]),
    });
    const ConfigDB = new BncrPluginConfig(jsonSchema);
    
    const db = new BncrDB("rabbit");
    
    module.exports = async (s) => {
        await ConfigDB.get();
        if (!Object.keys(ConfigDB.userConfig).length) {
            return await s.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置');
        }
        const baseUrl = ConfigDB.userConfig.rabbit.base;
        const name = ConfigDB.userConfig.rabbit.name;
        const passwd = ConfigDB.userConfig.rabbit.passwd;
        const urlArr = ConfigDB.userConfig.rlist;
        if (!global.crbfd_lock) {
            global.crbfd_lock = true;
            try {
                const axios = require("axios");
                const regBaseUrl = regHttpUrl(baseUrl);
                const authToken = await auth(name, passwd);
                if (!authToken) throw new Error("兔子后台鉴权失败");
                let config = await getConfig(authToken);
                if (!config) throw new Error("获取配置失败");
                
                let oldAuthUrl = config.ServerHost;
                let n = urlArr.indexOf(oldAuthUrl);
                n = n !== -1 ? n : 0; // 使用条件运算符替代空合并运算符
                
                const availUrl = await testAvailUrl(authToken, urlArr, n);
                if (!availUrl) throw new Error("没有可用的反代地址");
                
                await db.set("auth_url", `http://${availUrl}`);
                config.ServerHost = availUrl;
                await saveConfig(authToken, config);
    
                await sysMethod.sleep(5);
                global.crbfd_lock = false;
    
                async function auth(name, passwd) {
                    let result;
                    try {
                        const response = await axios({
                            method: "post",
                            url: regBaseUrl + "/admin/auth",
                            data: { username: name, password: passwd },
                            timeout: 10000
                        });
                        result = response.data;
                    } catch (error) {
                        console.log("auth error:", error.message || error);
                        pushAdminMessage("连接rabbitpro后台失败: " + (error.message || "未知错误"));
                        return null;
                    }
                    
                    if (!result) {
                        return null;
                    } else if (result.code == 401) {
                        pushAdminMessage("更换rabbitpro反代auth：" + result.msg);
                        return null;
                    }
                    return result.access_token;
                }
    
                async function getConfig(authToken) {
                    let result;
                    try {
                        const response = await axios({
                            method: "get",
                            url: regBaseUrl + "/admin/GetConfig",
                            headers: {
                                authorization: "Bearer " + authToken,
                            },
                            timeout: 10000
                        });
                        result = response.data;
                    } catch (error) {
                        console.log("getConfig error:", error.message || error);
                        pushAdminMessage("获取配置失败: " + (error.message || "未知错误"));
                        return null;
                    }
                    return result;
                }
    
                async function saveConfig(authToken, config) {
                    let result;
                    try {
                        const response = await axios({
                            method: "post",
                            url: regBaseUrl + "/admin/SaveConfig",
                            headers: {
                                authorization: "Bearer " + authToken,
                            },
                            data: config,
                            timeout: 10000
                        });
                        result = response.data;
                    } catch (error) {
                        console.log("saveConfig error:", error.message || error);
                        pushAdminMessage("保存配置失败: " + (error.message || "未知错误"));
                        return false;
                    }
                    
                    if (result?.code == 0) {
                        pushAdminMessage("更换rabbitpro反代：" + result.msg + "\n现在使用的是：" + config.ServerHost);
                        return true;
                    } else {
                        pushAdminMessage("更换rabbitpro反代：保存设置失败" + (result?.msg ? ": " + result.msg : ""));
                        return false;
                    }
                }
    
                async function testAvailUrl(authToken, urlArr, n) {
                    const maxRetries = 2; // 每个URL最多尝试次数
                    
                    for (let i = 1; i < urlArr.length; i++) {
                        const url = urlArr[(n + i) % urlArr.length];
                        const regUrl = regHttpUrl(url);
                        console.log("正在测试：" + regUrl);
    
                        for (let retry = 0; retry < maxRetries; retry++) {
                            let result = false;
                            try {
                                const response = await axios({
                                    method: "get",
                                    timeout: 5000,
                                    url: regUrl + "/enc/M",
                                }).catch(error => {
                                    if (error.response) {
                                        return { data: error.response.data };
                                    }
                                    throw error;
                                });
                                
                                result = response.data;
                                console.log("测试结果:", result);
                                
                                if (result && result?.message?.data == "no data") {
                                    console.log("找到可用反代地址：" + url);
                                    return url;
                                }
                            } catch (e) {
                                console.log(`测试 ${url} 失败 (尝试 ${retry+1}/${maxRetries}):`, e.message || e);
                                // 如果不是最后一次尝试，等待一秒后重试
                                if (retry < maxRetries - 1) {
                                    await sysMethod.sleep(1);
                                }
                            }
                        }
                    }
                    
                    pushAdminMessage("更换rabbitpro反代：所有反代地址都不可用");
                    return null;
                }
    
                function regHttpUrl(url) {
                    const httpReg = /^https?:\/\//;
                    if (!httpReg.test(url)) {
                        url = "http://" + url;
                    }
                    if (url.endsWith("/")) { // 修复：使用url而不是baseUrl
                        url = url.slice(0, -1);
                    }
                    return url;
                }
            } catch (err) {
                console.log("更换rabbitpro反代出错:", err.message || err);
                pushAdminMessage("更换rabbitpro反代出错：" + (err.message || err));
                await sysMethod.sleep(5);
                global.crbfd_lock = false;
            }
        } else {
            console.log("更换rabbitpro反代：另一个自动更换反代正在运行中");
        }
        
        // 辅助函数定义在模块级别
        function pushAdminMessage(message) {
            const platforms = ConfigDB.userConfig.platforms || [];
            const admins = ConfigDB.userConfig.admins || [];
            
            // 只有当platforms或admins有值时才推送
            if (platforms.length > 0 || admins.length > 0) {
                sysMethod.pushAdmin({
                    platform: platforms.length > 0 ? platforms : [],
                    admin: admins.length > 0 ? admins : [],
                    msg: message,
                });
            } else {
                // 仅记录日志，不推送
                console.log("[不推送] " + message);
            }
        }
    };