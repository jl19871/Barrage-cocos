/*
 * @Author: JL
 * @Date: 2021-11-01 13:49:20
 * 多语言数据管理器
 */

import { sys, assetManager, resources, JsonAsset } from "cc";
import { EEventEnum } from "../data/enums/EventEnums";
import { IDataModel } from "../data/model/IDataModel";

/**
 * 支持的语言类型
 *
 * @export
 * @enum {number}
 */
export enum ELangType {
    EN = "en",   // 英文
    ZH = "zh",    // 中文
    AR = "ar",   // 阿拉伯
    TR = "tr"    // 土耳其
}

export default class LanguageManager extends IDataModel {
    clear(): void {
        this.langJson = null;
    }
    // 游戏内资源
    // json 资源
    // private langJson: Record<string, string> = {};
    private langJson: any = null;

    // 错误返回json
    private langResultJson = [];

    private _curLang: ELangType = ELangType.ZH;

    constructor() {
        super('lang');
    }

    get curLang(): ELangType {
        return this._curLang;
    }

    public async setup() {
        const defaultLang = ELangType.ZH;
        this.LoadStorage();
        this._curLang = this.Get('curLang', defaultLang) as ELangType;

    }

    public async initLangJson() {
        await this.loadLanguageDir(this._curLang);
    }

    /**
     * 动态加载语言包
     *
     * @private
     * @param lang
     * @memberof LangModel
     */
    private async loadLanguageDir(lang: string = this._curLang) {
        await GFM.ResMgr.loadDir(`lang/${lang}`, GFM.ResMgr.bundleName);
        const langPath = `${GFM.ResMgr.bundleName}:lang/${lang}/i18n`;
        const langData = GFM.ResMgr.get<JsonAsset>(langPath);
        if (langData) {
            this.langJson = langData.json;
        }
        else {
            console.error(`LanguageManager: load language file ${langPath} failed`);
        }
    }

    /**
     * 释放语言包
     *
     * @private
     * @param lang
     * @memberof LangModel
     */
    private async releaseLanguageDir(lang: string) {
        // GFM.ResMgr.releaseDir(`lang/${lang}`, GFM.ResMgr.bundleName);
    }


    /**
     * 语言改变处理
     *
     * @param lang
     * @memberof LangModel
     */
    public async setLanguage(lang: ELangType): Promise<boolean> {
        if (this._curLang === lang) {
            return true;
        }

        if (!this.isValidLangType(lang)) {
            return false;
        }

        const orginLang = this._curLang;
        this._curLang = lang;

        this.Set('curLang', this._curLang);
        this.Save();
        await this.loadLanguageDir(lang);
        GFM.EventMgr.emit(EEventEnum.LANG_CHANGE);
        this.releaseLanguageDir(orginLang);
        return true;
    }

    /**
       * 获得 tid 对应的字符串配置
       *
       * @param tid
       * @returns string
       * @memberof LangModel
       */
    public getLangStr(tid: string, argText?: Array<string>): string {
        const [id, ...args] = tid.split(",");
        if (this.langJson == null) {
            return tid;
        }
        let str = this.langJson[id];
        if (!str) {
            GFM.LogMgr.warn(`语言包未找到 ${id} ${this._curLang}`);
            return tid;
        }

        (argText ?? args).forEach((arg, index) => {
            // str = str.replace("${p" + (index + 1) + "}", arg);
            let g = "\\${p" + (index + 1) + "}";
            let reg = new RegExp(g, "g");
            str = str.replace(reg, arg);
        });
        return str;
    }


    public getLangResultStr(tid: string): string {
        const [id, ...args] = tid.split(",");
        let result = this.langResultJson.find((o) => o.value === Number(tid));
        if (result) {
            let str = result.comment;
            args.forEach((arg, index) => {
                // str = str.replace("${p" + (index + 1) + "}", arg);
                let g = "\\${p" + (index + 1) + "}";
                let reg = new RegExp(g, "g");
                str = str.replace(reg, arg);
            });
            return str;
        }
        else {
            return tid;
        }
    }



    private isValidLangType(value: any): value is ELangType {
        for (const key in ELangType) {
            if (ELangType[key as keyof typeof ELangType] === value) {
                return true;
            }
        }
        return false;
    }
}