import { EEventEnum } from "../data/enums/EventEnums";

type EventFunc = (userData: unknown, key?: EEventEnum | string | any) => void;

interface IObserver {
    func: EventFunc;
    target: unknown;
}

/**
 * 全局事件通知
 *
 * @export
 * @class EventManager
 */
export default class EventManager {

    // private _observerMap: Map<EEventEnum, IObserver[]> = new Map();
    // 为防止后续 子bundle中无法扩展EEventEnum，改为string
    private _observerMap: Map<string | EEventEnum, IObserver[]> = null;

    constructor() {
        this._observerMap = new Map();
    }

    public async setup() {
        GFM.LogMgr.log("EventMgr setup");
    }

    /**
     * 注册事件
     *
     * @param key
     * @param notifyFunc
     * @param target
     * @memberof NotifyManager
     */
    public on(key: string, notifyFunc: EventFunc, target: unknown) {
        if (!this._observerMap.has(key)) {
            this._observerMap.set(key, []);
        }
        let obj: IObserver = {
            func: notifyFunc,
            target: target
        }
        this._observerMap.get(key).push(obj);
    }

    /**
     * 移除事件
     *
     * @param key
     * @param notifyFunc
     * @param target
     * @memberof NotifyManager
     */
    public off(key: EEventEnum | string, notifyFunc: EventFunc, target: unknown) {
        const observers = this._observerMap.get(key) || [];
        const index = observers.findIndex((o) => o.func === notifyFunc && o.target === target);
        index >= 0 && observers.splice(index, 1);
    }

    /**
     * 移除指定对象上的所有事件
     * @param target 要移除所有事件的对象
     */
    public targetOff(target: unknown) {
        if (target) {
            for (const key in this._observerMap) {
                if (Object.prototype.hasOwnProperty.call(this._observerMap, key)) {
                    const observers = this._observerMap[key];
                    for (let i = 0; i < observers.length; i++) {
                        const o = observers[i];
                        if (o.target == target) {
                            observers.splice(i, 1);
                            i--;
                        }
                    }
                }
            }
        }
    }

    /**
     * 发射事件
     *
     * @template T
     * @param key
     * @param [userData=null]
     * @memberof NotifyManager
     */
    public emit<T extends unknown>(key: EEventEnum | string, userData: T = null) {
        if (!this._observerMap.has(key)) {
            GFM.LogMgr.warn(`EventMgr emit key:${key} not found`);
            return;
        }
        this._observerMap.get(key).forEach((obs: IObserver) => {
            if (obs.target) {
                obs.func.call(obs.target, userData, key);
            } else {
                obs.func(userData, key);
            }
        });
    }

    clear() {
        this._observerMap.clear();
    }
}
