import { Md5Util } from "../utils/Md5Util";

/*
 * @Author: JL
 * @Date: 2025-05-12 16:36:18
 */
enum ELogType {
    INFO = 1,
    ERROR = 2,
    DEBUG = 3
}

// 需要注册 AppId 和 Game_Type   服务端定义
// 需要注册UseId 用户ID
export default class ReportManager {

    public reportName: string = "NoName";

    private _reportMemMap: any = {};

    private _httpUrl: string = "/v1/game_center/front_log";

    private _getUrl(): string {
        return GFM.TEST ? "https://gm-wss-test.miliantech.com:81" : "https://dessert-go-rich-pub.miliantech.com";
    }

    private _keyObject(obj: any): string {
        if (obj == undefined) return "";
        var str = "";
        for (var key in obj) {
            if (str != "") {
                str += "&";
            }
            str += key + "=" + obj[key];
        }
        return str;
    }

    reportInfo(info: string, reportName: string = this.reportName, errorType: ELogType = ELogType.INFO) {
        this._report(info, reportName, errorType, false);
    }

    reportError(info: string, reportName: string = this.reportName, errorType: ELogType = ELogType.ERROR) {
        this._report(info, reportName, errorType, true);
    }

    private _report(info: string, reportName: string, errorType: ELogType, isError: boolean) {
        if (GFM.DEBUG) return;

        if (GFM.DataMgr.base.userId == "") {
            GFM.LogMgr.warn("用户ID为空");
        }
        if (GFM.DataMgr.base.appId == "") {
            GFM.LogMgr.warn("AppId为空");
        }
        if (reportName == "") {
            GFM.LogMgr.warn("reportName为空");
            return;
        }

        let logData = {
            "user_id": GFM.DataMgr.base.userId,
            [isError ? "error_info" : "log_info"]: info
        };

        const serializedInfo = this._keyObject(logData);
        let md5Str = Md5Util.md5(serializedInfo);
        if (this._reportMemMap[md5Str]) return; // 防止统一错误反复上报

        let data = {
            "app_id": GFM.DataMgr.base.appId,
            "game_type": reportName,
            "log_type": errorType,
            [isError ? "error_info" : "log_info"]: JSON.stringify(logData),
        };
        this._sendRequest(data);
    }

    private _sendRequest(data: Object) {
        let url = this._getUrl() + this._httpUrl;

        let str = JSON.stringify(data);
        GFM.LogMgr.log("上报数据", str);

        GFM.HttpMgr.post(url, data).then((res) => {
            if (res.ret_code == 0) {
                GFM.LogMgr.log("上报成功");
            }
            else {
                console.error("上报失败  code = ", res.code);
            }
        }).catch((err) => {
            console.error("上报失败", err);
        });
    }
}

window.onerror = function (message, source, lineno, colno, error) {
    // 处理错误信息
    let errorInfo = `Error: ${message} at ${source}:${lineno}:${colno}`;
    console.error(errorInfo);

    // 上报错误信息
    if (GFM && GFM.ReportMgr) {
        GFM.ReportMgr.reportError(errorInfo);
    }
}