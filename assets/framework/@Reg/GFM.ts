import AudioManager from "../manager/AudioManager";
import EventManager from "../manager/EventManager";
import { HttpManager } from "../manager/HttpManager";
import LoggerManager from "../manager/LoggerManager";
import ResManager from "../manager/ResManager";
import UIManager from "../manager/UIManager";
import WebSocketManager from "../manager/WebSocketManager";
import CocosUtil from "../utils/CocosUtil";
import GameTools from "../utils/GameTools";
import RandomUtil from "../utils/RandomUtil";

import LanguageManager from "../manager/LanguageManager";
import NativeManager from "../manager/NativeManager";
import NativeWebBridge, { EWebGameEvent, EWebGameState } from "../manager/NativeWebBridge";
import { HTML5 } from "cc/env";
import PoolManager from "../manager/PoolManager";
import DataManager from "../manager/DataManager";
import TimeUtil from "../utils/TimeUtil";
import ReportManager from "../manager/ReportManager";
import HeartbeatManager from "../manager/HeartbeatManager";
import { Monitor } from "../decorators/Monitor";
import PerformanceManager from "../manager/PerformanceManager";
import { EEventEnum } from "../data/enums/EventEnums";

/**
 * 游戏统一调度 Game Framework Module
 */
export class GFM {
    // 单例全部在此初始化
    private instances: Map<{ new() }, Object> = new Map<{ new() }, Object>();

    private static _instance: GFM = null;

    public TEST: boolean = false; // 测试模式（测试服、正式服）

    public DEBUG: boolean = true; // 调试模式（显示测试输入等）

    public static getInstance(): GFM {
        if (this._instance === null) {
            this._instance = new GFM();
        }
        return this._instance;
    }

    constructor() {
        // 直接绑定静态类
        this.CocosUtil = CocosUtil;
        this.GameTools = GameTools;
        this.TimeUtil = TimeUtil;
    }

    // 静态类绑定
    public CocosUtil: typeof CocosUtil;
    public GameTools: typeof GameTools;
    public TimeUtil: typeof TimeUtil;

    /** 资源管理器 */
    public get ResMgr(): ResManager {
        return this.getInstance(ResManager);
    }

    /** 全局通知工具 */
    public get EventMgr(): EventManager {
        return this.getInstance(EventManager);
    }

    public get SocketMgr(): WebSocketManager {
        return this.getInstance(WebSocketManager);
    }

    public get HttpMgr(): HttpManager {
        return this.getInstance(HttpManager);
    }

    public get LogMgr(): LoggerManager {
        return this.getInstance(LoggerManager);
    }

    public get RandomUtil(): RandomUtil {
        return this.getInstance(RandomUtil);
    }

    public get AudioMgr(): AudioManager {
        return this.getInstance(AudioManager);
    }

    public get UIMgr(): UIManager {
        return this.getInstance(UIManager);
    }

    public get NativeMgr(): NativeManager {
        return this.getInstance(NativeManager);
    }

    public get LangMgr(): LanguageManager {
        return this.getInstance(LanguageManager);
    }

    public get PoolMgr(): PoolManager {
        return this.getInstance(PoolManager);
    }

    public get DataMgr(): DataManager {
        return this.getInstance(DataManager);
    }

    public get NativeWebBridge(): NativeWebBridge {
        let obj = this.getInstance(NativeWebBridge);
        if (window["nativeWebBridge"] == undefined) {
            window["nativeWebBridge"] = obj;
        }
        return obj;
    }

    public get ReportMgr(): ReportManager {
        return this.getInstance(ReportManager);

    }

    public get HeartBeatMgr(): HeartbeatManager {
        return this.getInstance(HeartbeatManager);
    }

    public get Monitor(): Monitor {
        return this.getInstance(Monitor);
    }

    public get PreformanceMgr(): PerformanceManager {
        return this.getInstance(PerformanceManager);
    }

    // public clearAllMgr() {
    //   this.clearAll();
    // }

    // public async reloadSetting() {
    //   GameConfig.settingConfigs = null;
    //   Game.DataManager.res.clear();
    //   await Game.DataManager.res.setup();
    //   await Game.DataManager.lang.setup();
    //   await Game.AssetManager.reloadGameBundle();
    // }

    // 初始启动
    async setup() {
        await this.ResMgr.setup(-1);
        await this.LogMgr.setup();
        await this.EventMgr.setup();
        await this.SocketMgr.setup();
        await this.DataMgr.setup();
        this.AudioMgr.setup();
        this.LangMgr.setup();
        this.PoolMgr.setup();
    }

    public showWaiting(reason: string) {
        this.EventMgr.emit(EEventEnum.BLOCK_INPUT_SHOW, reason);
    }

    public hideWaiting(reason: string) {
        this.EventMgr.emit(EEventEnum.BLOCK_INPUT_HIDE, reason);
    }


    public getInstance<T>(c: { new(): T }): T {
        if (!this.instances.has(c)) {
            let obj = new c();
            this.instances.set(c, obj);
            return obj;
        }
        return <T>this.instances.get(c);
    }

    public clearAll() {
        this.ResMgr.clearUnusedAssets();
        this.EventMgr.clear();
        this.SocketMgr.close();
        this.AudioMgr.clear();
        this.NativeMgr.clearEvent();
    }


    private _gameState: EWebGameState = EWebGameState.NONE;
    public get gameState() {
        return this._gameState;
    }

    public setGameState(type: EWebGameState | string, data: Object = null) {
        if (this._gameState == type) return;
        this._gameState = type as EWebGameState;
        this.sendGameState(data);
    }

    public sendGameState(data: Object = null) {
        if (HTML5) {
            this.NativeWebBridge.sendGameState(this._gameState, data);
        } else {
            this.LogMgr.warn('当前不是HTML5环境');
        }
    }
}

window['GFM'] = GFM.getInstance();
