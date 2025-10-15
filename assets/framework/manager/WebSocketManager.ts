import { NATIVE } from "cc/env";
import { EEventEnum } from "../data/enums/EventEnums";

export default class WebSocketManager {
    private _socket: WebSocket | null = null; // WebSocket对象
    private _url: string = "";  // 连接地址
    private _maxReconnectCount: number = 5; // 最大重连次数
    private _maxReconnectTime: number = 5; // 最大重连次数
    private _reconnectCount: number = 0;    // 重连次数
    private _isManualClose: boolean = false; // 手动断开
    private _serverTimeStamp: number = 0; // 服务器时间戳
    private _retrying: boolean = false;
    private _timeIns: number = -1;

    constructor() {
    }

    public async setup() {

    }

    public connect(url?: string) {
        if (url) {
            this._url = url;
        }
        if (this._socket) {
            this.close();
        }
        this._socket = new WebSocket(this._url);
        this._socket.binaryType = "arraybuffer"; // 默认是blob
        this._socket.onopen = (event: Event) => {
            this._onSocketOpen(event);
        };
        this._socket.onmessage = (event: MessageEvent) => {
            this._onSocketMessage(event);
        };
        this._socket.onclose = (event: CloseEvent) => {
            this._onSocketClose(event);
        };
        this._socket.onerror = (event: Event) => {
            this._onSocketError(event);
        };
    }

    public isConnected(): boolean {
        if (this._socket) {
            return this._socket.readyState === WebSocket.OPEN;
        }
        return false;
    }

    public close() {
        clearInterval(this._timeIns);

        if (this._socket) {
            this._isManualClose = true;
            try {
                this._socket.close();
            } catch (error) {
                GFM.LogMgr.error('error while closing webSocket ', error.toString());
            }
            this._socket = null;
        }
    }

    public send(data: any, cmd: number, _wait: boolean = true) {
        if (!this.isConnected()) {
            GFM.LogMgr.error('socket is not connected');
            return;
        }


        if (cmd !== packet.MsgNo.MsgNo_HeartBeatB2C && _wait) {
            GFM.showWaiting(`cmd : ${cmd.toString(16)}`);
        }

        if (packet.MsgNo && GFM.DEBUG) {
            console.log(`%c《on${packet.MsgNo[cmd]}》`, "color:#ffaa00");
        }

        // GFM.LogMgr.log(`socket send message, cmd = 0x${cmd.toString(16).toUpperCase().padStart(8, '0')}`);
        GFM.LogMgr.log(`socket send message, cmd = 0x${cmd.toString().padStart(8, '0')}， 0x${cmd.toString(16).toUpperCase().padStart(8, '0')}`);
        let sendBuf = this._msgToBuffer(data, cmd);
        this._socket.send(sendBuf);
    }

    private _onSocketOpen(event: Event) {
        GFM.LogMgr.log('socket open');
        clearInterval(this._timeIns);
        this._reconnectCount = 0; // 重置重试次数
        this._retrying = false;
        this._timeIns = -1;

        GFM.EventMgr.emit(EEventEnum.SOCKET_OPEN);
    }

    private _onSocketMessage(event: MessageEvent) {
        if (!this.isConnected()) {
            GFM.LogMgr.error('socket is not connected');
            return;
        }

        let data = event.data;
        let message = this._bufferToMsg(data);
        // GFM.LogMgr.log(`socket receive message, cmd = ${message.msg_no.toString(16).toUpperCase().padStart(8, '0')}`);
        GFM.LogMgr.log(`socket receive message, cmd = 0x${message.msg_no.toString().padStart(8, '0')}， 0x${message.msg_no.toString(16).toUpperCase().padStart(8, '0')}`);


        this._serverTimeStamp = message.unix_milli as number;

        GFM.hideWaiting(`cmd : ${(message.msg_no - 1).toString(16)}`);
        GFM.EventMgr.emit(message.msg_no + "", message.data);
    }

    private _onSocketError(event: Event) {
        GFM.LogMgr.error('socket error');
        GFM.EventMgr.emit(EEventEnum.SOCKET_ERROR);
    }

    private _onSocketClose(event: CloseEvent) {
        GFM.LogMgr.log('socket close, reason = ' + event.reason);
        this._socket = null;

        if (this._retrying) return;

        GFM.EventMgr.emit(EEventEnum.SOCKET_CLOSE);
        if (!this._isManualClose) {
            this._retryConnect();
        } else {
            this._isManualClose = false;
        }
    }

    private _retryConnect(): void {
        if (this._reconnectCount >= this._maxReconnectCount) {
            GFM.EventMgr.emit(EEventEnum.SOCKET_FAIL);
            return;
        }

        this._retrying = true;
        this._reconnectCount++;
        this.connect();

        this._timeIns = setTimeout(() => {
            GFM.LogMgr.log('socket retryConnect');
            this._retryConnect();
        }, this._maxReconnectTime * 1000) as unknown as number;
    }

    public reconnect(): void {
        this._isManualClose = false;
        this._reconnectCount = 0; // 重置重试次数
        this._retrying = false;
        this._timeIns = -1;
        this.connect();
    }


    /**
 * buffer转msg，解包用
 * 协议格式：总字节数（4个字节，总字节数=协议号字节数+数据长度） + 协议号（4个字节） + 数据
 * @param recvBuf 
 */
    private _bufferToMsg(recvBuf: ArrayBuffer) {
        let cc = new Uint8Array(recvBuf);
        let message = packet.Packet.decode(cc);
        return message;
    }

    /**
    * msg转buffer，封包用
    * 协议格式：总字节数（4个字节，总字节数=协议号字节数+数据长度） + 协议号（4个字节） + 数据
    * @param msg 
    */
    private _msgToBuffer(msg: any, cmd: number): ArrayBuffer {
        let bytes = msg.constructor.encode(msg).finish();
        let packetInstance = packet.Packet.create();
        packetInstance.data = bytes;
        packetInstance.msg_no = cmd;
        packetInstance.unix_milli = Date.now();

        let _bytes = packet.Packet.encode(packetInstance).finish();
        var arrayBuffer = _bytes.slice().buffer;
        return arrayBuffer
    }
}