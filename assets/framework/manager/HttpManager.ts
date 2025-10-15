/*
 * @Author: JL
 * @Date: 2025-01-13 15:06:46
 * 统一JSON请求
 */
const RETRY_COUNT = 3;



export class HttpManager {
    constructor() {

    }

    public setup() {

    }

    public addHeader(key: string, value: string): void {
        HttpService.addHeader(key, value);
    }

    public removeHeader(key: string): void {
        HttpService.removeHeader(key);
    }

    public clearHeaders(): void {
        HttpService.clearHeaders();
    }

    public async get(url: string, data = null): Promise<any> {
        return await HttpService.send(data, url, EHttpMethod.GET);
    }

    public async post(url: string, data = null, postType = EHttpPostType.JSON): Promise<any> {
        return await HttpService.send(data, url, EHttpMethod.POST, postType);
    }
}

const TIME_OUT = 10e3;

export enum EHttpPostType {
    JSON = 0,
    FORMDATA = 1,
    URLENCODED = 2,
}

export enum EHttpMethod {
    GET = 'GET',
    POST = 'POST',
}

// 假设 ErrorCode 是一个已定义的枚举
export enum EHttpCode {
    SUCCESS = 200,
    NET_ERROR = 400,
    TOKEN_INVID = 600,
    TOKEN_ERROR = 601,
    TIMEOUT = 999,
    PARSE_ERROR = 998,
    STATUS_ERROR = 997,
    SEND_FAIL = 996
}


class HttpService {

    private static headers: { [key: string]: string } = null;

    public static addHeader(key: string, value: string): void {
        if (!HttpService.headers) {
            HttpService.headers = {};
        }
        if (HttpService.headers[key]) {
            GFM.LogMgr.warn(`Header ${key} already exists, overwriting value.`);
        }
        HttpService.headers[key] = value;
    }

    public static removeHeader(key: string): void {
        if (HttpService.headers && HttpService.headers[key]) {
            delete HttpService.headers[key];
        }
    }

    public static clearHeaders(): void {
        HttpService.headers = null;
    }

    private static serializeParams(data: any): string {
        if (!data) return '';
        return Object.keys(data)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
            .join('&');
    }

    /**
     * 发送请求
     * @param reqData 发送的数据内容
     * @param reqUrl 请求地址
     * @param method 请求类型 
     * @param postType 请求数据类型
     * @returns 
     */
    public static send(
        reqData: any,
        reqUrl: string,
        method: EHttpMethod,
        postType: EHttpPostType = EHttpPostType.JSON
    ): Promise<any> {
        // GFM.EventMgr.emit(EEventEnum.BLOCK_INPUT_SHOW, reqUrl);
        GFM.showWaiting(reqUrl);
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            let fullUrl = reqUrl;
            const isPost = method === EHttpMethod.POST;
            let sendData: any = null;

            if (!isPost && reqData) {
                const params = HttpService.serializeParams(reqData);
                fullUrl += `?${params}`;
            }

            xhr.timeout = TIME_OUT;
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    GFM.hideWaiting(reqUrl);
                    // GFM.EventMgr.emit(EEventEnum.BLOCK_INPUT_HIDE, reqUrl);
                    if (xhr.status >= 200 && xhr.status < 400) {
                        // GFM.LogMgr.log(`http ${method} ${fullUrl} <--- ${xhr.responseText}`);
                        try {
                            const json = JSON.parse(xhr.responseText);
                            resolve(json);
                        } catch (e) {
                            resolve({ code: EHttpCode.PARSE_ERROR, msg: `Invalid JSON response,responseText=${xhr.responseText}` });
                        }
                    } else {
                        resolve({ code: EHttpCode.STATUS_ERROR, msg: `HTTP status error,status = ${xhr.status}` });
                    }
                }
            };

            xhr.ontimeout = () => {
                resolve({ code: EHttpCode.TIMEOUT, msg: 'Request timeout' });
            };

            xhr.onerror = () => {
                resolve({ code: EHttpCode.SEND_FAIL, msg: 'Request failed' });
            };

            xhr.open(method, fullUrl, true);

            //TODO 注入headers
            if (HttpService.headers) {
                for (const header in HttpService.headers) {
                    xhr.setRequestHeader(header, HttpService.headers[header]);
                }
            }

            if (isPost) {
                sendData = reqData;
                switch (postType) {
                    case EHttpPostType.FORMDATA:
                        xhr.setRequestHeader("Content-Type", 'multipart/form-data; boundary=gfmformdata;charset=utf-8');
                        let formData = new GFMFormData();
                        for (var key in reqData) {
                            formData.append(key + "", reqData[key] + "");
                        }
                        sendData = formData.arrayBuffer;
                        break;
                    case EHttpPostType.JSON:
                        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                        sendData = JSON.stringify(reqData);
                        break;
                    case EHttpPostType.URLENCODED:
                        xhr.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded');
                        sendData = HttpService.serializeParams(reqData);
                        break;
                }
            }

            xhr.send(isPost ? sendData : null);
            GFM.LogMgr.log(`http ${method} ${fullUrl} ---> ${reqData}`);
        });
    }
}

export function HTTP_REQ(method: EHttpMethod, url: string, postType: EHttpPostType = EHttpPostType.JSON) {
    return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
        let oldValue = descriptor.value;
        let rTime = 0;

        descriptor.value = async function (...args: any[]) {
            return HttpService.send(args[0], url, method, postType)
                .then(function (value) {
                    return oldValue.call(target, args[1], value);
                })
                .catch(async function (error) {
                    if (error instanceof Error) {
                        GFM.LogMgr.error(methodName + " --- " + error);
                        return;
                    }
                    switch (error.code) {
                        case EHttpCode.TOKEN_INVID:
                        case EHttpCode.TOKEN_ERROR:
                            if (methodName !== "getNewToken" /*&& Config.refreshToken*/) {
                                // await NetManager.prototype.getNewToken({ refreshToken: Config.refreshToken });
                                return Promise.resolve(await descriptor.value(...args));
                            } else {
                                // ErrorCodeManager.checkCode(error);
                                return Promise.reject(error);
                            }
                            break;
                        case EHttpCode.NET_ERROR:
                        case EHttpCode.TIMEOUT:
                            if (RETRY_COUNT > rTime++) {
                                return Promise.resolve(await descriptor.value(...args));
                            } else {
                                return Promise.resolve(error);
                            }
                            break;
                        default:
                            return Promise.resolve(error);
                    }
                })
        }
    }
}


export class GFMFormData {
    private _boundary_key: string = 'gfmformdata';
    private _boundary: string;
    private _end_boundary: string;
    private _result: string;

    constructor() {
        this._boundary = '--' + this._boundary_key;
        this._end_boundary = this._boundary + '--';
        this._result = "";
    }

    public append(key: string, value: string, filename?: string) {
        this._result += this._boundary + '\r\n';
        if (filename) {
            this._result += 'Content-Disposition: form-data; name="' + key + '"' + '; filename="' + filename + '"' + '\r\n\r\n';
        } else {
            this._result += 'Content-Disposition: form-data; name="' + key + '"' + '\r\n\r\n';
        }

        this._result += value + '\r\n';
    }

    public get arrayBuffer(): ArrayBuffer {
        this._result += '\r\n' + this._end_boundary;
        let charArr: Array<any> = [];

        for (var i = 0; i < this._result.length; i++) { // 取出文本的charCode（10进制）
            charArr.push(this._result.charCodeAt(i));
        }

        let array: Uint8Array = new Uint8Array(charArr);
        return array.buffer;
    }
}