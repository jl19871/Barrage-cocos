/*
 * @Author: JL
 * @Date: 2025-04-21 14:45:18
 */

import { HTML5 } from "cc/env";

// webview与原生交互
export interface INativeMessage {
    type: string;
    data?: any;
}

// 游戏状态类型
export enum EWebGameState {
    NONE = "PL_None",
    LOADING = "PL_Loading",
    LOADERROR = "PL_Loaderror",
    LOADED = "PL_Loaded",
    GAMELAUNCH = "PL_Launch",
    GAMESTART = "PL_Start",
    GAMEPREPARE = "PL_Prepare",
    GAMEGAMING = "PL_Gaming",
    GAMEEND = "PL_End",
}

// 游戏事件类型
//所有JS调用原生的type类型均以 PL_ 开头（playlink）
export enum EWebGameEvent {
    PLAY_EFFECT = "PL_PlayEffect",
    STOP_EFFECT = "PL_StopEffect",
    PLAY_MUSIC = "PL_PlayMusic",
    STOP_MUSIC = "PL_StopMusic",

    GET_USER_INFO = "PL_GetUserInfo",
    GET_ROOM_INFO = "PL_GetRoomInfo",
    PLAYER_JOIN_TEAM = "PL_PlayerJoinTeam",
    PLAYER_QUIT_TEAM = "PL_PlayerQuitTeam",
    OPEN_PLAYER_INFO = "PL_OpenPlayerInfo",
    GAME_STAGE = "PL_GameStage", // 游戏阶段

    REMATCH_GAME = "PL_RematchGame",
    EXIT_GAME = "PL_ExitGame",
}
// 对应的返回方法名在后面加Back 例：PL_GetUserInfo的返回方法名 GC_GetUserInfoBack
export enum EWebGameEventBack {
    GET_USER_INFO_BACK = "GC_GetUserInfoBack",
    GET_ROOM_INFO_BACK = "GC_GetRoomInfoBack",
    GET_GAMEROUND_INFO_BACK = "GC_GetGameRoundInfoBack",
    PLAYER_JOIN_TEAM_BACK = "GC_PlayerJoinTeamBack",
    PLAYER_QUIT_TEAM_BACK = "GC_PlayerQuitTeamBack",
    REMATCH_GAME_BACK = "GC_RematchGameBack",
    EXIT_GAME_BACK = "GC_ExitGameBack",
    NATIVE_EXIT_GAME = "GC_ExitGame",
    GET_GAME_PROGRESS = "GC_GameProgress",

    IM_PUSH = "GC_IMPush", // IM推送消息
    GAME_EVENT = "GC_Event", // 游戏相关事件通知

    // 6.20 添加
    SHOW_RTC_EFFECT = "GC_ShowRTCEffect", // 显示RTC语音播放特效
    GAME_PAGE_EVENT = "GC_PageEvent", // 客户端游戏展示/隐藏事件
}

// SDK通知web游戏通用事件
export enum EWebGamePageEvent {
    SHOW_GAME = "show_game", // 从后台切入前台
    HIDE_GAME = "hide_game", // 从前台切入后台
}

// 游戏错误类型
export enum EWebGameError {
    PLAYER_JOIN_TEAM_ERROR = "PL_PlayerJoinTeamError",
}

export default class NativeWebBridge {

    public clear() {
    }

    // 封装各类调用
    public sendGameState(type: EWebGameState, data: Object = null) {
        this.sendGameMessage("GameState", type.toString(), data);
    }

    public sendGameEvent(type: EWebGameEvent, data: Object = null) {
        this.sendGameMessage("GameEvent", type.toString(), data);
    }

    public sendGameError(type: EWebGameError, data: Object = null) {
        this.sendGameMessage("GameError", type.toString(), data);
    }

    // 公共方法
    private sendGameMessage(category: "GameState" | "GameEvent" | "GameError", type: string, data: Object = null) {
        if (!HTML5) {
            GFM.LogMgr.warn('当前不是HTML5环境');
            return;
        }
        const msg: INativeMessage = {
            type,
            data,
        };
        this.sendMsgToNative(category, msg);
    }

    private sendMsgToNative(funcName: string, msg: INativeMessage) {
        if (!HTML5) {
            GFM.LogMgr.warn('当前不是HTML5环境');
            return;
        }
        try {
            const msgStr = JSON.stringify(msg);

            GFM.LogMgr.log(`sendMsgToNative ${funcName} ${msgStr}`);

            // iOS
            if (window["webkit"]?.messageHandlers && window["webkit"].messageHandlers[funcName]) {
                GFM.LogMgr.log(`调用iOS原生接口 ${funcName} ${msgStr}`);
                window["webkit"].messageHandlers[funcName].postMessage(msgStr);
            }
            // Android
            else if (window[funcName]) {
                GFM.LogMgr.log(`调用Android原生接口 ${funcName} ${msgStr}`);
                window[funcName].postMessage(msgStr);
            }
            else {
                GFM.LogMgr.warn(`未找到原生接口 ${funcName}，请检查是否正确配置了原生接口`);
            }
        } catch (error) {
            GFM.LogMgr.error('sendMsgToNative error:', error);
        }
    }

    // 异步获取原生数据
    public onNativeMsg(_data: INativeMessage) {
        try {
            GFM.LogMgr.log('onNativeMsg :', JSON.stringify(_data));
            if (_data && _data.data) {
                if ((typeof (_data.data)) == 'string') {
                    _data.data = JSON.parse(_data.data);
                }
            }
            else {
                GFM.LogMgr.error('onNativeMsg error:  【data is undefined】', JSON.stringify(_data), "type:", _data.type);
                return;
            }
            GFM.EventMgr.emit(_data.type, _data.data);
        } catch (error) {
            GFM.LogMgr.error('onNativeMsg error:', JSON.stringify(_data), "type:", _data.type, "error:", error);
        }
    }
}