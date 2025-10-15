/*
 * @Author: JL
 * @Date: 2021-12-29 14:19:37
 */

import { _decorator, assetManager, ccenum, CCString, Component, Sprite, SpriteFrame } from "cc";
import { EDITOR } from "cc/env";
import { EEventEnum } from "../../data/enums/EventEnums";
const { ccclass, property, executeInEditMode, menu, requireComponent } = _decorator;


@ccclass
@executeInEditMode()
@requireComponent(Sprite)
@menu("自定义组件/i18n/LangSprite")
export default class LangSprite extends Component {

    @property(CCString)
    private _spriteUrl = "";
    @property({ readonly: true, type: CCString, displayName: "多语言图片地址" })
    set spriteUrl(value: string) {
        this._spriteUrl = value;
        this.updateSprite();
    }
    get spriteUrl() {
        return this._spriteUrl;
    }
    // 编辑模式使用
    private _sprfullPath: string = "";

    private _spr: Sprite = null;
    private _lastSprFrame: SpriteFrame = null;

    public async onLoad() {
        this._spr = this.getComponent(Sprite);
        GFM.EventMgr.on(EEventEnum.LANG_CHANGE, this.onLanguageChanged, this);
        if (EDITOR) {
            await this.checkPath();
        }
        this.updateSprite();
    }

    public onDestroy() {
        GFM.EventMgr.off(EEventEnum.LANG_CHANGE, this.onLanguageChanged, this);
    }

    /**
     * 收到语言变更通知
     *
     * @private
     */
    private onLanguageChanged() {
        this.updateSprite();
    }

    /**
     * 更新文本
     *
     * @private
     * @returns {*}
     */
    private async updateSprite(): Promise<void> {
        if (this._spriteUrl) {
            if (EDITOR) {
                if (this._sprfullPath == "") return;
                // @ts-ignore
                const lang = await Editor.Message.request("i18n-plugin", "getLang");
                const url = this._sprfullPath.replace("{lang}", lang) + "/spriteFrame";
                // @ts-ignore
                const result = await Editor.Message.request("asset-db", "query-asset-info", url);
                if (result) {
                    const uuid = result.uuid;
                    assetManager.loadAny({ uuid }, (err, spriteFrame) => {
                        if (err) {
                            console.error(`LangSPrite: 无法加载图片资源 ${uuid}`, url);
                        } else {
                            this._spr.spriteFrame = spriteFrame as SpriteFrame;
                            this._lastSprFrame = spriteFrame as SpriteFrame;
                        }
                    });
                }
            }
            else {
                const lang = GFM.LangMgr.curLang;
                console.log("1111  " + this._spriteUrl);
                const url = this._spriteUrl.replace("{lang}", lang) + "/spriteFrame";
                console.log(url);
                let spriteFrame = await GFM.ResMgr.loadAsset<SpriteFrame>(url, SpriteFrame, GFM.ResMgr.bundleName);
                if (spriteFrame) {
                    this._spr.spriteFrame = spriteFrame;
                    this._lastSprFrame = spriteFrame;
                }
                else {
                    console.warn(`LangSprite: 无法加载图片资源 ${url}`);
                }
            }
        }
    }

    protected update(): void {
        this.checkPath();
    }

    private async checkPath() {
        if (EDITOR) {
            if (this._spr && this._spr.spriteFrame !== this._lastSprFrame) {
                this._lastSprFrame = this._spr.spriteFrame;
                if (this._lastSprFrame == null) {
                    this._spriteUrl = null;
                    return;
                }
                let uuid = this._lastSprFrame.uuid;
                if (uuid) {
                    // @ts-ignore
                    let url = await Editor.Message.request("asset-db", "query-url", uuid);

                    // 1. 移除 @uuid 后缀
                    const noUuid = url.split('@')[0];

                    const match = noUuid.match(/^(db:\/\/assets\/.*?lang\/)([^/]+)(\/.+)$/);
                    if (!match) {
                        console.warn('路径异常，请确保当前路径在assets下');
                        return;
                    }

                    const dbPrefix = match[1];     // db://assets/.../lang/
                    const langCode = match[2];     // en
                    const rest = match[3];         // /img/icon
                    this._sprfullPath = `${dbPrefix}{lang}${rest}`;

                    const cleanPath = rest.replace(/\.[^/.]+$/, '');
                    this._spriteUrl = `lang/{lang}${cleanPath}`;
                    // console.log(`LangSprite: 语言图片路径已更新为 ${this._sprfullPath} ${this._spriteUrl}`);
                }
                else {
                    this._spriteUrl = "";
                    this._sprfullPath = "";
                }

            }
        }
    }
}