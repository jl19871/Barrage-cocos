/*
 * 装饰器
 * @Author: JL
 * @Date: 2025-06-06 14:57:59
 */
// 将静态类绑定为属性访问器
export function StaticAccessor(staticClass: any) {
    return function (target: any, propertyKey: string) {
        const privateKey = `__${propertyKey}`;

        Object.defineProperty(target, propertyKey, {
            get: function () {
                if (!this[privateKey]) {
                    this[privateKey] = staticClass;
                }
                return this[privateKey];
            },
            enumerable: true,
            configurable: true,
        });
    };
}

// 网络消息装饰器
// 自动注册网络消息
export function ScoketMsg(cmd?: number): Function {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let oldValue = descriptor.value;
        descriptor.value = function (...args: any[]) {
            GFM.EventMgr.on(cmd + "", this["on" + packet.MsgNo[cmd]], this);
            this._msgList?.push(cmd);
            oldValue.apply(this, args);
        }
    }
}

// 取消注册网络消息
export function UnScoketMsg(): Function {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let oldValue = descriptor.value;
        descriptor.value = function (...args: any[]) {
            if (this._msgList) {
                for (let i = 0; i < this._msgList.length; ++i) {
                    let cmd = this._msgList[i];
                    GFM.EventMgr.off(cmd + "", this["on" + packet.MsgNo[cmd]], this);
                }
                this._msgList = [];
            }
            oldValue.apply(this, args);
        }
    }
}

// 网络消息日志装饰器
// 测试模式自动打印网络消息日志
export function MsgLog(): Function {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let oldValue = descriptor.value;
        descriptor.value = function (...args: any[]) {
            if (GFM.DEBUG) {
                let cmd = propertyKey.slice(8);
                let msg = packet[cmd]?.decode(args[0]);
                console.log(`%c [${Math.floor(Date.now() / 1000)}]【${propertyKey} log】==> `, "color:red", msg);
            }
            oldValue.apply(this, args);
        }
    }
}