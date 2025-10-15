import { _decorator, Component, Prefab, instantiate, Node, isValid, tween, v3, Widget, Sprite, BlockInputEvents, UITransform, Layers, SpriteFrame, color, Tween } from 'cc';
import { UIType } from '../manager/UIManager';
const { ccclass, property } = _decorator;


/**
    @example

    @ccclass
    @PopUp  @FullScene @HalfScene
    export class TipsPop extends BaseUI {}
    TipsPop.show();
    TipsPop.hide();
 * 
 */


@ccclass('BaseUI')
export class BaseUI extends Component {
    protected uiType: UIType = UIType.POPUP; // 默认类型为POPUP
    protected _msgList: Array<number> = [];
    protected _initData: any = null;

    protected static maskClose: boolean = false;
    protected static showMask: boolean = true;
    protected static resUrl: string = "";

    constructor(...args: any[]) {
        super();
    }

    public static async show(data?: any) {
        let uiName = this.prototype["__classname__"];

        if (GFM.UIMgr.isExistUI(uiName, data)) {
            return;
        }

        if (GFM.UIMgr.isPreShowUI(uiName)) {
            return;
        }

        if (GFM.UIMgr.isShowUI(uiName)) {
            return;
        }

        let url = this.resUrl + uiName;
        GFM.UIMgr.setPreShowUI(uiName);

        GFM.ResMgr.loadAsset(url, Prefab, GFM.ResMgr.bundleName).then((prefab) => {
            let ui = instantiate(prefab as Prefab);
            if (ui) {
                let mask = new Node("mask");
                mask.addComponent(UITransform);
                mask.addComponent(BlockInputEvents);

                let sp = mask.addComponent(Sprite);

                GFM.ResMgr.loadAsset("texture/mask_bg/spriteFrame", SpriteFrame).then((asset) => {
                    sp.spriteFrame = asset as SpriteFrame;
                    sp.color = color(0, 0, 0, this.showMask ? 170 : 0);
                });


                // sp.spriteFrame = await GFM.ResMgr.loadAsset("res/texture/mask_bg/spriteFrame", SpriteFrame, bundleName);
                // SpriteFrame.createWithImage(assetManager.assets.get("7d8f9b89-4fd1-4c9f-a3ab-38ec7cded7ca") as any)
                mask.addComponent(Widget);
                ui.insertChild(mask, 0);
                mask.layer = Layers.Enum.UI_2D;

                if (this.maskClose) {
                    mask.on(Node.EventType.TOUCH_END, () => {
                        this.hide();
                    });
                }

                ui.active = false;
                GFM.UIMgr.initUI(ui.getComponent(uiName), data);
                console.log(`${uiName} UI shown`);
            }
        })
    }

    public static hide(): void {
        let uiName = this.prototype["__classname__"];
        GFM.UIMgr.closeUI(uiName);
    }

    protected onShowEnd(): void {

    }

    protected onShowBegin(): void {

    }

    public show(): void {
        if (isValid(this.node)) {
            console.log(`${this.node.name} UI show`);
        }
    }

    // 隐藏UI
    public hide(close: boolean = true, dety: boolean = false): void {
        if (!close) {
            this.node.active = false;
            return;
        }

        if (isValid(this.node)) {
            GFM.UIMgr.deleteUI(this, dety);
            this.node.destroy();
            console.log(`${this.node.name} UI hidden`);
        }
    }

    // 获取UI类型
    public getType(): UIType {
        return this.uiType;
    }

    // 可以在这里添加更多的通用方法和属性
}


export function FullScene<T extends typeof BaseUI>(constructor: T) {
    // @ts-ignore
    if (constructor.resUrl == '') {
        // @ts-ignore
        constructor.resUrl = 'res/prefab/';
    }

    // @ts-ignore
    constructor.showMask = false;

    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
            this.uiType = UIType.FULLSCREEN;
            // console.log('FullScene');
        }

        public show(): void {
            super.show();
            this.openAni();
        }

        openAni() {
            console.log(this.node.name + ' openAnimation');
            Tween.stopAllByTarget(this.node);
            tween(this.node)
                .set({ active: true })
                .call(() => this.onShowBegin())
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    mask.layer = Layers.Enum.UI_3D;
                    let wid = mask?.getComponent(Widget);
                    if (wid) {
                        wid.isAlignBottom = true;
                        wid.isAlignTop = true;
                        wid.isAlignLeft = true;
                        wid.isAlignRight = true;
                        wid.left = wid.right = wid.top = wid.bottom = 0;
                        wid.updateAlignment();
                    }
                })
                .delay(.1)
                .call(() => this.onShowEnd())
                .start();
        }
    };
}

export function HalfScene<T extends typeof BaseUI>(constructor: T) {
    // @ts-ignore
    if (constructor.resUrl == '') {
        // @ts-ignore
        constructor.resUrl = 'res/prefab/';
    }

    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
            this.uiType = UIType.HALFSCREEN;
            // console.log('HalfScene');
        }


        public show(): void {
            super.show();
            this.openAni();
        }

        public hide(close: boolean = true, dety: boolean = false): void {
            if (isValid(this.node)) {
                if (!close) {
                    this.node.active = false;
                    return;
                }

                GFM.UIMgr.deleteUI(this, dety);
                this.closeAni();
                console.log(this.node.name + " is close");
            }
        }

        openAni() {
            console.log(this.node.name + ' openAnimation');
            Tween.stopAllByTarget(this.node);
            tween(this.node)
                .set({ active: true, scale: v3(0, 0, 1) })
                .call(() => this.onShowBegin())
                .to(0.15, { scale: v3(1.2, 1.2, 1) })
                .to(0.15, { scale: v3(1, 1, 1) })
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    let wid = mask?.getComponent(Widget);
                    if (wid) {
                        wid.isAlignBottom = true;
                        wid.isAlignTop = true;
                        wid.isAlignLeft = true;
                        wid.isAlignRight = true;
                        wid.left = wid.right = wid.top = wid.bottom = 0;
                        wid.updateAlignment();
                    }
                })
                .delay(.1)
                .call(() => this.onShowEnd())
                .start();
        }

        closeAni() {
            console.log(this.node.name + ' closeAnimation');
            tween(this.node)
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    mask.active = false;
                })
                .to(0.15, { scale: v3(0, 0, 1) })
                .destroySelf()
                .start();
        }
    };
}


export function PopUp<T extends typeof BaseUI>(constructor: T) {
    // @ts-ignore
    if (constructor.resUrl == '') {
        // @ts-ignore
        constructor.resUrl = 'res/prefab/';
    }

    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
            this.uiType = UIType.POPUP;
            // console.log('PopUp');
        }

        public show(): void {
            super.show();
            this.openAni();
        }

        public hide(close: boolean = true, dety: boolean = false): void {
            if (isValid(this.node)) {
                if (!close) {
                    this.node.active = false;
                    return;
                }

                GFM.UIMgr.deleteUI(this, dety);
                this.closeAni();
                console.log(this.node.name + " is close");
            }
        }

        openAni() {
            console.log(this.node.name + ' openAnimation');
            Tween.stopAllByTarget(this.node);
            tween(this.node)
                .set({ active: true, scale: v3(0, 0, 1) })
                .call(() => this.onShowBegin())
                .to(0.15, { scale: v3(1.2, 1.2, 1) })
                .to(0.15, { scale: v3(1, 1, 1) })
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    let wid = mask?.getComponent(Widget);
                    if (wid) {
                        wid.isAlignBottom = true;
                        wid.isAlignTop = true;
                        wid.isAlignLeft = true;
                        wid.isAlignRight = true;
                        wid.left = wid.right = wid.top = wid.bottom = 0;
                        wid.updateAlignment();
                    }
                })
                .delay(.1)
                .call(() => this.onShowEnd())
                .start();
        }

        closeAni() {
            console.log(this.node.name + ' closeAnimation');
            tween(this.node)
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    mask.active = false;
                })
                .to(0.15, { scale: v3(0, 0, 1) })
                .destroySelf()
                .start();
        }
    };
}

export function Permanent<T extends typeof BaseUI>(constructor: T) {
    // @ts-ignore
    if (constructor.resUrl == '') {
        // @ts-ignore
        constructor.resUrl = 'res/prefab/';
    }

    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
            this.uiType = UIType.PERMANENT;
            // console.log('PopUp');
        }

        public show(): void {
            this.openAni();
        }

        public hide(close: boolean = true): void {
            if (isValid(this.node)) {
                if (!close) {
                    this.node.active = false;
                    return;
                }

                this.closeAni();
                console.log(this.node.name + " is close");
            }
        }

        protected openAni(): void {
            console.log(this.node.name + ' openAnimation');
            Tween.stopAllByTarget(this.node);
            tween(this.node)
                .set({ active: true, scale: v3(0, 0, 1) })
                .call(() => this.onShowBegin())
                .to(0.15, { scale: v3(1.2, 1.2, 1) })
                .to(0.15, { scale: v3(1, 1, 1) })
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    let wid = mask?.getComponent(Widget);
                    if (wid) {
                        wid.isAlignBottom = true;
                        wid.isAlignTop = true;
                        wid.isAlignLeft = true;
                        wid.isAlignRight = true;
                        wid.left = wid.right = wid.top = wid.bottom = 0;
                        wid.updateAlignment();
                    }
                })
                .delay(.1)
                .call(() => this.onShowEnd())
                .start();
        }

        closeAni() {
            console.log(this.node.name + ' closeAnimation');
            tween(this.node)
                .call(() => {
                    let mask = this.node.getChildByName("mask");
                    mask.active = false;
                })
                .to(0.15, { scale: v3(0, 0, 1) })
                .set({ active: false })
                .start();
        }
    };
}