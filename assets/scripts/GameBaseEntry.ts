/*
 * @Author: JL
 * @Date: 2025-05-08 15:42:34
 */
import { _decorator, assert, assetManager, Component, director, instantiate, native, Node, path, Prefab, resources, Scene, SceneAsset } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameBaseEntry')
export abstract class GameBaseEntry extends Component {

    protected params: any = null;

    protected start() {
        assetManager.loadBundle("framework", async (err, data) => {
            if (!err) {
                GFM.setup();
                GFM.setGameState("PL_Loading", { "returnType": 0 });
                let bundleName = this.getBundleName();
                GFM.ResMgr.bundleName = bundleName;
                GFM.ReportMgr.reportName = this.getReportName();
                const bundle = await GFM.ResMgr.loadBundle(bundleName);
                if (bundle != null) {
                    GFM.LangMgr.initLangJson();
                    this.checkGame();
                } else {
                    GFM.LogMgr.log("游戏Bundle包加载失败 " + bundleName);
                }
            }
            else {
                console.error("加载framework失败");
            }
        });
    }


    protected async checkGame() {
        this.params = this.getUrlParams(window.location.href);

        if (!this.checkGameId()) {
            let error = `gameId ${this.params["gameId"]} not found`;
            GFM.LogMgr.error(error);
            GFM.setGameState("PL_Loaderror", { "returnType": 0, "error": error });
            return;
        }

        if (!GFM.DEBUG) {
            // 处理游戏参数
            const appId = this.params["appId"];
            if (appId != undefined && appId != null) {
                GFM.LogMgr.log("appId: " + appId);
                GFM.DataMgr.base.appId = appId;
            }
            else {
                let error = `appId ${appId} not found`;
                GFM.LogMgr.error(error);
                GFM.setGameState("PL_Loaderror", { "returnType": 0, "error": error });
                return;
            }
        }

        if (this.params["useNativePlayer"] != undefined) {
            GFM.AudioMgr.useNativePlayer = this.params["useNativePlayer"] == "true" || this.params["useNativePlayer"] == "1";
        }

        // 语言判断
        const language = this.params["language"];
        let isOK = false;
        if (language != undefined && language != null) {
            GFM.LogMgr.log("language: " + language);
            isOK = await GFM.LangMgr.setLanguage(language);
        }
        if (!isOK) {
            GFM.LangMgr.setLanguage("zh" as any);
        }


        let sceneData = await this.loadGameScene();
        let scene = sceneData[0];
        let sceneName = sceneData[1];

        if (scene == null) {
            let error = `Scene ${sceneName} not found`;
            GFM.LogMgr.error(error);
            GFM.setGameState("PL_Loaderror", { "returnType": 0, "error": error });
            return;
        }
        director.runScene(scene, null, () => {
            GFM.LogMgr.log("切换场景成功");
            // 游戏场景加载完成
            GFM.setGameState("PL_Launch", { "returnType": 0 });
        });
    }


    protected getUrlParams(url) {
        let urlArr = url.split("?");
        let data = {};
        if (urlArr.length === 1) return data;
        for (let i = 1; i <= urlArr.length - 1; i++) {
            let paramsStr = decodeURIComponent(urlArr[i]);
            if (paramsStr && paramsStr !== 'undefined') {
                let paramsArr = paramsStr.split("&");
                paramsArr.forEach((str) => {
                    let key = str.split("=")[0];
                    let value = str.split("=")[1];
                    if (value) data[key] = value;
                });
            }
        }
        return data;
    }

    abstract getBundleName(): string; // 获取bundle名字
    abstract checkGameId(): boolean; // 检查ID是否合法
    abstract getReportName(): string; // 获取游戏上报名称
    abstract loadGameScene(): Promise<[SceneAsset, string]>; // 场景资源 和 场景名称

    // ============================ 示例 以炸弹猫为例===============================
    // getBundleName():string {
    //     return "BombCat";
    // }
    // checkGameId(): boolean {
    //     if (this.params["gameId"] == "游戏id1") {
    //         return true;
    //     }
    //     else if (this.params["gameId"] == "游戏id2") {
    //         return true;
    //     }
    //     return false;
    // }

    // async loadGameScene(): Promise<[SceneAsset, string]> {
    //     let bundleName = this.getBundleName();
    //     let scene: SceneAsset = null;
    //     let sceneName = "None";

    //     if (this.params["gameId"] == "游戏id1") {
    //         sceneName = "游戏id1的场景路径"; //"scenes/RoomBombCat";
    //         scene = await GFM.ResMgr.loadAsset<SceneAsset>(sceneName, SceneAsset, bundleName);
    //     }
    //     else if (this.params["gameId"] == "游戏id2") {
    //         sceneName = "游戏id2的场景路径"; //"scenes/BombCatMatch";
    //         scene = await GFM.ResMgr.loadAsset<SceneAsset>(sceneName, SceneAsset, bundleName);
    //     }
    //     return [scene, sceneName];
    // }
}

