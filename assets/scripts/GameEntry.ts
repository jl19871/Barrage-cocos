/*
 * @Author: JL
 * @Date: 2025-01-13 15:00:44
 */
import { _decorator, SceneAsset } from 'cc';
import { GameBaseEntry } from './GameBaseEntry';
const { ccclass, property } = _decorator;

// 测试脚本
@ccclass('GameEntry')
export class GameEntry extends GameBaseEntry {
    getReportName(): string {
        return "gameline_report";
    }

    getBundleName(): string {
        return "gameline";
    }
    checkGameId(): boolean {
        return true;
    }
    async loadGameScene(): Promise<[SceneAsset, string]> {
        let scene = await GFM.ResMgr.loadAsset<SceneAsset>("scenes/gameline", SceneAsset, this.getBundleName());
        return [scene, ""]
    }


    // async openGame() {
    //     await GFM.ResMgr.loadBundle("MusicGame1", native.fileUtils.getWritablePath() + "gamebase/gameline");
    //     let scene = await GFM.ResMgr.loadAsset<SceneAsset>("scenes/gameline", SceneAsset, "gameline");
    //     director.runScene(scene);
    // }

    // async clickGame() {
    //     assetManager.loadBundle("framework", async (err, bundle) => {
    //         if (err) {
    //             console.error("load bundle framework failed", err);
    //             return;
    //         }

    //         GFM.setup();
    //         await GFM.ResMgr.loadBundle("ClashBeat");
    //         let scene = await GFM.ResMgr.loadAsset<SceneAsset>("scenes/MainScene", SceneAsset, "ClashBeat");

    //         // await GFM.ResMgr.loadBundle("ClashBeat");
    //         // let scene = await GFM.ResMgr.loadAsset<SceneAsset>("scenes/MainScene", SceneAsset, "ClashBeat");

    //         if (scene) {
    //             director.runScene(scene);
    //         }
    //         else {
    //             console.error("load scene failed");
    //         }

    //     });
    // }
}

