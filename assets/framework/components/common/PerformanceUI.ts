/*
 * @Author: JL
 * @Date: 2025-06-18 18:04:34
 */
import { _decorator, Color, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PerformanceUI')
export class PerformanceUI extends Component {

    private _label: Label = null;

    protected onLoad(): void {
        this._label = this.node.getComponent(Label);
    }

    protected start(): void {
        this.updateStatus();
        this.schedule(this.updateStatus, 1); // 每秒更新一次
    }

    private updateStatus() {
        if (this._label) {
            let str = "";
            // 网络连接及延迟
            const isConnected = GFM.SocketMgr.isConnected();
            if (isConnected) {
                str = "Wss已连接";
                if (GFM.HeartBeatMgr.isStart) {
                    str += "\n当前:" + GFM.HeartBeatMgr.currentLatency + " ms,平均:" + GFM.HeartBeatMgr.averageLatency + " ms";
                }
                else {
                    str += "\n未开启心跳统计";
                }
            }
            else {
                str = "Wss未连接";
            }
            //登录信息相关
            str += "\n用户ID: " + (GFM.DataMgr.base.userId == "" ? "未登录" : GFM.DataMgr.base.userId);
            str += "\n游戏对局: " + (GFM.DataMgr.base.gameRoundId == "" ? "未设置" : GFM.DataMgr.base.gameRoundId);

            str += "\n";
            str += "\nFPS: " + GFM.PreformanceMgr.fps.toFixed(0);
            str += "\nDraw Calls: " + GFM.PreformanceMgr.drawCalls;
            str += "\nTexture Memory: " + GFM.PreformanceMgr.textureMemory.toFixed(2) + " MB";

            this._label.string = str;
        }
    }
}

