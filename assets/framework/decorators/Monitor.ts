
// 监测执行时间
export function monitorExecutionTime(message: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const start = window.performance && window.performance.now ? window.performance.now() : Date.now();
            const result = await originalMethod.apply(this, args);
            const end = window.performance && window.performance.now ? window.performance.now() : Date.now();
            const delta = end - start;
            if (delta >= 1000) {
                GFM.LogMgr.log(`=============================================================`);
                GFM.LogMgr.log(`====== Message       = ${message}`);
                GFM.LogMgr.log(`====== ClassName     = ${target.constructor?.name}`);
                GFM.LogMgr.log(`====== MethodName    = ${propertyKey}`);
                GFM.LogMgr.log(`====== Args          = ${args?.toString()}`);
                GFM.LogMgr.log(`====== ExecutionTime = ${delta} ms`);
                GFM.LogMgr.log(`=============================================================`);

                GFM.LogMgr.warn("Execution time is too long, please optimize the code.");


                const eventName = (GFM.ReportMgr.reportName + ":cocos_execute_time") + GFM.TEST ? "_test" : "";
                GFM.ReportMgr.reportError(JSON.stringify({
                    message: message,
                    class: target.constructor?.name,
                    method: propertyKey,
                    args: args?.toString(),
                    time: delta
                }), eventName);
            }

            return result;
        };

        return descriptor;
    }
}

// 监测异常
export function monitorException(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        try {
            return originalMethod.apply(this, args);
        } catch (error) {
            GFM.LogMgr.warn(`Error in ${propertyKey}: ${error}`);

            const eventName = (GFM.ReportMgr.reportName + ":cocos_execute_exception") + GFM.TEST ? "_test" : "";
            GFM.ReportMgr.reportError(JSON.stringify({
                class: target.constructor?.name,
                method: propertyKey,
                args: args?.toString(),
                error: error
            }), eventName);
        }
    };
    return descriptor;
}

export class Monitor {
    private _deltaTime: number = 500;
    private _timeMap: Map<string, number> = new Map();

    constructor() {
        GFM.LogMgr.log("Monitor is ready.");
    }

    private _getTimeNow(): number {
        return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    time(message: string, time: number = 500) {
        this._deltaTime = time;
        let curtime = this._getTimeNow();
        if (this._timeMap.has(message)) {
            GFM.LogMgr.error(`Monitor Time already exists for message: ${message}`);
            return;
        }
        this._timeMap.set(message, curtime);
    }

    timeEnd(message: string) {
        let curtime = this._getTimeNow();
        if (!this._timeMap.has(message)) {
            GFM.LogMgr.warn(`Monitor Time does not exist for message: ${message}`);
            return;
        }
        let startTime = this._timeMap.get(message);
        this._timeMap.delete(message);
        let delta = curtime - startTime;

        if (delta >= this._deltaTime) {
            if (GFM.DEBUG) {
                GFM.LogMgr.warn(`${message} too long, please optimize the code.`);
                GFM.LogMgr.log(`=============================================================`);
                GFM.LogMgr.log(`${message}`);
                GFM.LogMgr.log(`time = ${delta} ms`);
                GFM.LogMgr.log(`=============================================================`);
            }

            const eventName = (GFM.ReportMgr.reportName + ":cocos_check_time-" + message) + GFM.TEST ? "_test" : "";
            GFM.ReportMgr.reportError(JSON.stringify({
                message: message,
                time: delta
            }), eventName);
        }
    }
}