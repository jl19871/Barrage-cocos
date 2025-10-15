import { log, native } from "cc";
import { NATIVE } from "cc/env";


export enum NATIVE_EVENT {
    EVENT_ON_GAME_INFO = "onGameInfo",
    EVENT_ON_USER_INFO = "onUserInfo",
    EVENT_COCOS_ENGINE_LOAD_SUCCESS = "cocosEngineLoadSucess",
    EVENT_GET_USER_INFO = "getUserInfo",
    EVENT_GAME_DOWNLOAD_SUCCESS = "gameDownloadSucess",
    EVENT_GAME_DOWNLOAD_FAILED = "gameDownloadFailed",
    EVENT_GAME_LAUNCH_SUCCESS = "gameLaunchSucess",
    EVENT_GAME_LAUNCH_FAILED = "gameLaunchFailed",
    EVENT_ON_CLOSE_GAME = "onCloseGame",
    EVENT_ON_RECV_FRAME = "onRecvFrame",
    EVENT_SEND_TO_SERVER = "sendToServe",
    EVENT_GET_LIVING_ROOM_INFO = "getLivingRoomInfo",
    EVENT_ON_LIVING_ROOM_INFO = "onLivingRoomInfo",
    EVENT_GAME_STAGE = "gameStage",
    EVENT_DO_STATISTICS = "doStatistics",
    EVENT_COCOS_BUTTON_CLICK = "cocosButtonClick",
    EVENT_PAGE_LAYOUT = "pageLayout",
    EVENT_NAVIGATE = "navigate",
    EVENT_ON_WSS_CONNECT = 'onWssconnect',
    EVENT_ON_WSS_DISCONNECT = 'onWssDisconnect',
}


export default class NativeManager {

    constructor() { }

    public clearEvent(): void {
        if (NATIVE) {
            native.jsbBridgeWrapper.removeAllListeners();
        }
    }

    public addNativeEvent(funcName: NATIVE_EVENT, callback: native.OnNativeEventListener) {
        if (NATIVE) {
            native.jsbBridgeWrapper.addNativeEventListener(funcName, callback);
        }
    }

    public callNative(funcName: NATIVE_EVENT, args?: string) {
        if (NATIVE) {
            native.jsbBridgeWrapper.dispatchEventToNative(funcName, args);
        } else {
            GFM.LogMgr.log("is not native");
        }
    }

    public useGamingLayout() {
        if (NATIVE) {
            let layoutStr = JSON.stringify({
                type: "gaming"
            });

            GFM.LogMgr.log("Use gaming layout. Send to Native: ", layoutStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_PAGE_LAYOUT, layoutStr);
        }
    }

    public doStatistics(info: any) {
        if (NATIVE) {
            let staStr = JSON.stringify({
                event: "mutual_click_template",
                params: info
            });
            GFM.LogMgr.log("Send Statistics To Native:", staStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_DO_STATISTICS, staStr)
        }
    }

    public onPlayerEnter(id: string) {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "playerJoin",
                data: {
                    id: id
                }
            });
            GFM.LogMgr.log("Send Player Join To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onPlayerEnterError(info: any) {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "playerJoinError",
                data: info
            });
            GFM.LogMgr.log("Send Player Join To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onPlayerQuit(id: string) {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "playerQuit",
                data: {
                    id: id
                }
            });
            GFM.LogMgr.log("Send Player Quit To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onMatchResult(success: boolean, error?: string) {
        if (NATIVE) {
            let evtInfo = {
                stage: "matchResult",
                data: {
                    success: success,
                    error: error
                }
            }
            let evtStr = JSON.stringify(evtInfo);
            GFM.LogMgr.log("Send Match Result To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onGamePlayNext(progress: number) {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "next",
                data: {
                    progress: progress
                }
            });
            GFM.LogMgr.log("Send Game Next To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onGameStart() {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "start"
            });
            GFM.LogMgr.log("Send Game Start To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onKillEvent(attackerId: string, victimId: string, type: number) {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "kill",
                data: {
                    attackerId: attackerId,
                    victimId: victimId,
                    type: type
                }
            });
            GFM.LogMgr.log("Send Kill Event To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    public onGameEnd(winTeamID: number) {
        if (NATIVE) {
            let evtStr = JSON.stringify({
                stage: "end",
                data: {
                    "winTeamID": winTeamID//获胜队伍id，未传为平局
                }
            });
            GFM.LogMgr.log("Send Game End To Native:", evtStr);
            native.jsbBridgeWrapper.dispatchEventToNative(NATIVE_EVENT.EVENT_GAME_STAGE, evtStr);
        }
    }

    // public addListener(funcName: NATIVE_EVENT, cb: Function, target: any) {
    //     if (NATIVE) {
    //         native.jsbBridgeWrapper.addNativeEventListener(funcName, cb.call(target));
    //     } else {
    //         GFM.LogMgr.log("is not native");
    //     }
    // }

    // public removeListener(funcName: NATIVE_EVENT) {
    //     if (NATIVE) {
    //         native.jsbBridgeWrapper.removeAllListenersForEvent(funcName);
    //     } else {
    //         GFM.LogMgr.log("is not native");
    //     }
    // }
}