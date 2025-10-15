export default class LoggerManager {

    public showTrace: boolean = true;

    constructor() {
    }

    public async setup() {
        this.log("LogManager setup");
    }

    /**
    * @zh 打印回调重写
    * @param arg 
    */
    public log(...arg) {
        if (!GFM.DEBUG) return;
        if (this.showTrace) {
            let info = this.stack();
            if (info != "") {
                arg.unshift(info + "  ==> ");
            }
        }
        console.log("%c【GFM log】==> ", "color:green", ...arg);
    }
    /**
     * @zh 打印回调重写
     * @param arg 
     */
    public error(...arg) {
        if (this.showTrace) {
            let info = this.stack();
            if (info != "") {
                arg.unshift(info + "  ==> ");
            }
        }
        console.error("%c【GFM error】==> ", "color:red", ...arg);
        // 发送错误信息到日志
        let errorInfo = "【GFM error】==>" + arg;
        GFM.ReportMgr.reportError(errorInfo);

    }
    /**
     * @zh 打印回调重写
     * @param arg 
     */
    public warn(...arg) {
        if (this.showTrace) {
            let info = this.stack();
            if (info != "") {
                arg.unshift(info + "  ==> ");
            }
        }
        console.warn("%c【GFM warn】==> ", "color:yellow", ...arg);
    }
    /**
     * @zh 打印详细信息
     * @param arg 
     */
    public dump(arg) {
        console.log("【GFM dump Start】--------------------------------------");
        console.table(arg);
        console.log("【GFM dump End】----------------------------------------");
    }

    private getDateString(): string {
        let d = new Date();
        let str = d.getHours().toString();
        let timeStr = "";
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = d.getMinutes().toString();
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = d.getSeconds().toString();
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = d.getMilliseconds().toString();
        if (str.length == 1) str = "00" + str;
        if (str.length == 2) str = "0" + str;
        timeStr += str;

        timeStr = "[" + timeStr + "]";
        return timeStr;
    }

    private stack(index = 2): string {
        try {
            let exceptKey = {
                "Generator.next": 1
            }

            let lines = new Error().stack.split("\n") ?? [];
            lines.shift();
            let result = [];
            lines.forEach(line => {
                line = line.substring(7);
                var lineBreak = line.split(" ");
                if (lineBreak.length >= 2) {
                    let key = lineBreak[0];
                    let array = key.split(".");
                    if (array.length > 1 && !exceptKey.hasOwnProperty(key)) {
                        result.push(" stack: " + array[0] + ".ts -> " + array[1] + ":");
                    }
                }
            });

            if (index <= result.length - 1) {
                return result[index];
            }
            else {
                return "";
            }
        } catch (e) {
            return "";
        }
    }
}
