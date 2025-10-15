/*
 * @Author: JL
 * @Date: 2025-07-04 17:48:05
 */
import { director } from "cc";
import { EEventEnum } from "../data/enums/EventEnums";

export interface IHeartBeatCommand {
    sendCmd: any;
    responseCmd: any;
    sendObj: () => any;
    onSend?: () => void;
    onResponse?: (res: any) => void;
    onDisconnect?: () => void;
}

export default class HeartbeatManager {
    private _interval: number = 5000;
    private _command?: IHeartBeatCommand = null;

    private timer: any = null;

    private _lastSendTime: number = 0;
    private _latency: number[] = [];

    private _sendCount: number = 0;
    private MAX_SENDCOUNT: number = 3;


    public get isStart(): boolean {
        return this.timer !== null;
    }

    public bindCommand(cmd: IHeartBeatCommand) {
        this._command = cmd;
        GFM.EventMgr.on(this._command.responseCmd + "", this._getHeartBeatBack, this);
        GFM.EventMgr.on(EEventEnum.SOCKET_CLOSE + "", this.stop, this);
    }

    public start(interval: number = 5000) {
        if (this._command === null) {
            GFM.LogMgr.warn("HeartbeatManager: No command bound for heartbeat.");
            return;
        }

        this._interval = interval;
        this.stop();
        this._sendHeartbeat();
        this.timer = setInterval(() => {
            this._sendHeartbeat();
        }, this._interval);
    }


    private _sendHeartbeat() {
        if (!this._command) {
            GFM.LogMgr.warn("HeartbeatManager: No command bound for heartbeat.");
            this.stop();
            return;
        }

        if (!GFM.SocketMgr.isConnected()) {
            GFM.LogMgr.warn("HeartbeatManager: Socket not connected, stopping heartbeat.");
            this.stop();
            return;
        }

        const payload = this._command.sendObj();
        this._lastSendTime = performance.now();
        GFM.SocketMgr.send(payload, this._command.sendCmd, false);

        this._sendCount++;
        if (this._command && this._command.onSend) {
            this._command.onSend();
        }

        if (this._sendCount >= this.MAX_SENDCOUNT) {
            GFM.LogMgr.warn("HeartbeatManager: Maximum send count reached, stopping heartbeat.");

            if (GFM.SocketMgr.isConnected()) {
                GFM.SocketMgr.close();
            }

            this.stop();
            if (this._command && this._command.onDisconnect) {
                this._command.onDisconnect();
            }
        }
    }

    private _getHeartBeatBack(res) {
        const now = performance.now();
        const latency = now - this._lastSendTime;
        this._latency.push(Math.round(latency));
        if (this._latency.length > 10) {
            this._latency.shift();
        }
        this._sendCount = 0;
        if (this._command && this._command.onResponse) {
            this._command.onResponse(res);
        }
    }

    public stop() {
        this._sendCount = 0;
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }


    public get averageLatency(): number {
        const total = this._latency.reduce((a, b) => a + b, 0);
        return this._latency.length > 0 ? Math.round(total / this._latency.length) : 0;
    }

    public get currentLatency(): number {
        return this._latency[this._latency.length - 1] ?? 0;
    }
}