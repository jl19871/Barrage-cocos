/*
 * @Author: JL
 * @Date: 2021-12-29 14:19:37
 */

import { _decorator, assetManager, CCString, Component, RichText, TTFFont } from "cc";
import { EDITOR } from "cc/env";
import { EEventEnum } from "../../data/enums/EventEnums";
const { ccclass, property, executeInEditMode, menu, requireComponent } = _decorator;



@ccclass
@requireComponent(RichText)
@executeInEditMode()
@menu("自定义组件/i18n/LangRichText")
export default class LangRichText extends Component {

    private _bmfontUrl = "";
    @property({ visible: function () { return this._richText && !this._richText.useSystemFont; }, readonly: true })
    set bmfontUrl(value: string) {
        this._bmfontUrl = value;
        if (value == "" || value == null) return;
        this.updateString();
    }
    get bmfontUrl() {
        return this._bmfontUrl;
    }
    private _bmfullPath: string = "";

    @property(CCString)
    private _tid = "";
    @property({ multiline: true, type: CCString, displayName: "多语言ID" })
    set tid(value: string) {
        this._tid = value + "";
        this.updateString();
    }
    get tid() {
        return this._tid;
    }

    private _string: string = "";
    set string(value: string) {
        this._string = value;
        if (this._richText) {
            this._richText.string = value;
        }
    }
    get string() {
        if (this._richText) {
            this._string = this._richText.string;
        }
        return this._string;
    }

    private _richText: RichText = null;
    private fontUuid: string = "";

    public async onLoad() {
        this._richText = this.getComponent(RichText);

        if (EDITOR) {
            if (this._richText && !this._richText.useSystemFont) {
                await this.checkPath();
            }
        }


        GFM.EventMgr.on(EEventEnum.LANG_CHANGE, this.onLanguageChanged, this);
        this.updateString();
    }


    public onDestroy() {
        GFM.EventMgr.off(EEventEnum.LANG_CHANGE, this.onLanguageChanged, this);
    }

    /**
     * 收到语言变更通知
     *
     * @private
     * @memberof LangLabel
     */
    private onLanguageChanged() {
        this.updateString();
    }

    /**
     * 更新文本
     *
     * @private
     * @returns {*}
     * @memberof LangLabel
     */
    private async updateString(): Promise<void> {
        if (!this._tid) {
            this.updateFont();
            return;
        }
        if (EDITOR) {
            // 编辑器模式下, 从插件中获取文本
            // @ts-ignore
            Editor.Message.request("i18n-plugin", "getLangStr", this._tid).then((str: string) => {
                this.string = str;
            });
            this.updateFont();
        } else {
            // 获取多语言文本
            this.string = GFM.LangMgr.getLangStr(this._tid) || this._tid;
            this.updateFont();
        }
    }

    async updateFont() {
        // 如果使用了 TTFFont, 切换对应语言的 TTFFont
        if (!this._richText.useSystemFont) {
            if (EDITOR) {
                // @ts-ignore
                const lang = await Editor.Message.request("i18n-plugin", "getLang");
                const url = this._bmfullPath.replace(/\{lang\}/g, lang);
                // @ts-ignore
                const result = await Editor.Message.request("asset-db", "query-asset-info", url);
                if (result) {
                    const uuid = result.uuid;
                    assetManager.loadAny({ uuid }, (err, font) => {
                        if (err) {
                            console.error(`LangLabel: 无法加载字体资源 ${uuid}`, err);
                        } else {
                            this._richText.font = font;
                            this.fontUuid = font.uuid;
                        }
                    });
                }
            }
            else {
                const lang = GFM.LangMgr.curLang;
                const path = this._bmfontUrl.replace(/\{lang\}/g, lang);
                const font = await GFM.ResMgr.loadAsset<TTFFont>(path, TTFFont, GFM.ResMgr.bundleName);
                this._richText.font = font;
            }
        }
    }

    protected update(dt: number): void {
        this.checkPath();
    }

    private async checkPath() {
        if (this._richText && EDITOR) {
            if (this._richText.useSystemFont) return;
            if (this._richText.font == null) {
                this.fontUuid = "";
                return;
            }
            if (this.fontUuid !== this._richText.font.uuid) {
                this.fontUuid = this._richText.font.uuid;
                // @ts-ignore
                let url = await Editor.Message.request("asset-db", "query-url", this.fontUuid)
                const match = url.match(/^(db:\/\/assets\/.*?lang\/)(\w+)(\/.+)$/);
                if (!match) {
                    console.warn('❌ 路径格式不正确:', url);
                    this.fontUuid = "";
                    return;
                }

                const prefix = match[1]; // db://assets/games/LanguageTest/lang/
                const lang = match[2];   // en
                const rest = match[3];   // /font/font_en.ttf
                const updatedRest = rest.replace(new RegExp(lang, 'g'), '{lang}');
                this._bmfullPath = `${prefix}{lang}${updatedRest}`;
                // console.log('✅ 更新路径:', this._bmfullPath);
                this._bmfontUrl = "lang/{lang}/font/font_{lang}.ttf";
            }
        }
    }
}
