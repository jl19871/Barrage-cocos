/*
 * @Author: JL
 * @Date: 2021-12-29 14:19:37
 */

import { _decorator, assetManager, CCString, Component, Label, Size, TTFFont, UITransform } from "cc";
import { EDITOR } from "cc/env";
import { EEventEnum } from "../../data/enums/EventEnums";
import Reshaper from 'js-arabic-reshaper';
import { ELangType } from "../../manager/LanguageManager";
const { ccclass, property, executeInEditMode, menu, requireComponent } = _decorator;


@ccclass
@requireComponent(Label)
@executeInEditMode()
@menu("自定义组件/i18n/LangLabel")
export default class LangLabel extends Component {

    private _bmfontUrl = "";
    @property({ visible: function () { return this._lab && !this._lab.useSystemFont; }, readonly: true })
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
        if (this._lab) {
            this._lab.string = value;
            if (GFM.LangMgr.curLang === ELangType.AR) {
                this.setArabicLabelText(value);
            }
        }
    }
    get string() {
        if (this._lab) {
            this._string = this._lab.string;
        }
        return this._string;
    }

    private _lab: Label = null;
    private fontUuid: string = "";

    public async onLoad() {
        this._lab = this.getComponent(Label);

        if (EDITOR) {
            if (this._lab && !this._lab.useSystemFont) {
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



    /**
     * 设置阿拉伯语文本到 Label，并自动处理换行与尺寸适配
     * @param label 要设置文本的 Label 组件
     * @param value 要设置的文本内容
     * @param language 当前语言标识（如 'ar' 表示阿拉伯语）
     */
    private setArabicLabelText(value: string | null | undefined) {
        if (value === null || value === undefined) {
            value = '';
        } else {
            value = value.toString();
        }

        value = Reshaper.reshape(value);

        const uiTransform = this._lab.node.getComponent(UITransform);
        if (this._lab.overflow === Label.Overflow.RESIZE_HEIGHT || (this._lab as any).target_resize) {
            (this._lab as any).target_resize = true;
            this._lab.overflow = Label.Overflow.SHRINK;

            const size: Size = uiTransform!.contentSize;
            const maxCharsPerLine = size.width / this._lab.fontSize / 0.4;

            let index = 0;
            let lineCount = 1;

            for (let i = 0; i < value.length; i++) {
                index++;
                if (index >= maxCharsPerLine && value[i] === ' ') {
                    value = this.insertStr(value, i, '\n');
                    i++;
                    index = 0;
                    lineCount++;
                }
            }

            const newHeight = this._lab.lineHeight * 1.26 + this._lab.lineHeight * (lineCount - 1);
            uiTransform!.setContentSize(size.width, newHeight);
        }

        (this._lab as any)._string = value;
        this._lab.string = value;
    }

    private insertStr(str: string, index: number, insert: string): string {
        return str.slice(0, index) + insert + str.slice(index);
    }

    async updateFont() {
        // 如果使用了 TTFFont, 切换对应语言的 TTFFont
        if (!this._lab.useSystemFont) {
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
                            this._lab.font = font;
                            this.fontUuid = font.uuid;
                        }
                    });
                }
            }
            else {
                if (this._bmfontUrl == "") return;
                const lang = GFM.LangMgr.curLang;
                const path = this._bmfontUrl.replace(/\{lang\}/g, lang);
                const font = await GFM.ResMgr.loadAsset<TTFFont>(path, TTFFont, GFM.ResMgr.bundleName);
                this._lab.font = font;
            }
        }
    }

    protected update(dt: number): void {
        this.checkPath();
    }

    private async checkPath() {
        if (this._lab && EDITOR) {
            if (this._lab.useSystemFont) return;
            if (this._lab.font == null) {
                this.fontUuid = "";
                return;
            }
            if (this.fontUuid !== this._lab.font.uuid) {
                this.fontUuid = this._lab.font.uuid;
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
