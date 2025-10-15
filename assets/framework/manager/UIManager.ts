import { BlockInputEvents, color, director, Label, Layers, Node, Sprite, SpriteFrame, UITransform, Vec3, Widget } from "cc";

// 定义 UI 类型
export enum UIType {
    FULLSCREEN = 'FULLSCREEN',
    HALFSCREEN = 'HALFSCREEN',
    POPUP = 'POPUP',
    PERMANENT = 'PERMANENT' // 新增常驻类型
}

// UIManager 类
export default class UIManager {
    public bundleName: string = "";
    private _uiStacks: { [key in UIType]: any[] } = {
        [UIType.FULLSCREEN]: [],
        [UIType.HALFSCREEN]: [],
        [UIType.POPUP]: [],
        [UIType.PERMANENT]: [] // 新增常驻类型的栈
    };

    private _uiShow: Array<string> = [];

    private _fullSceneUI: Node = null;
    private _halfSceneUI: Node = null;
    private _popUpUI: Node = null;
    private _permanentUI: Node = null;
    private _waitingUI: Node = null;

    public setup(): void {
    }

    public init(ui: any): void {
        let scene = director.getScene();
        let uiLayer = scene.getChildByName('Canvas');
        // let uiLayer = canvas.getChildByName('uiLayer');
        // if (!uiLayer) {
        // uiLayer = new Node("uiLayer");
        // uiLayer.layer = Layers.Enum.UI_2D;
        // uiLayer.addComponent(UITransform);
        // uiLayer.parent = canvas;
        // }

        this.createUILayer("fullScene", uiLayer);
        this.createUILayer("halfScene", uiLayer);
        this.createUILayer("popUp", uiLayer);
        this.createUILayer("permanent", uiLayer);
        this.createUILayer("waiting", uiLayer);
    }

    private createUILayer(layerName: string, parent: Node): void {
        let uiLayer = parent.getChildByName(layerName);
        if (!uiLayer) {
            uiLayer = new Node(layerName);
            uiLayer.layer = Layers.Enum.UI_2D;
            uiLayer.addComponent(UITransform);
            let wid = uiLayer.addComponent(Widget);
            wid.isAlignBottom = true;
            wid.isAlignTop = true;
            wid.isAlignLeft = true;
            wid.isAlignRight = true;
            wid.left = wid.right = wid.top = wid.bottom = 0;
            uiLayer.parent = parent;
            // uiLayer.addComponent(BlockInputEvents);
        }

        if (layerName == "waiting") {
            let mask = new Node("mask");
            mask.addComponent(UITransform);
            let wid = mask.addComponent(Widget);
            wid.isAlignBottom = true;
            wid.isAlignTop = true;
            wid.isAlignLeft = true;
            wid.isAlignRight = true;
            wid.left = wid.right = wid.top = wid.bottom = 0;
            mask.parent = uiLayer;

            let sp = mask.addComponent(Sprite);
            GFM.ResMgr.loadAsset("texture/mask_bg/spriteFrame", SpriteFrame).then((asset) => {
                sp.spriteFrame = asset as SpriteFrame;
                sp.color = color(0, 0, 0, 170);
            });

            let desL = new Node("desL");
            desL.addComponent(UITransform);
            let lab = desL.addComponent(Label);
            lab.fontSize = 50;
            lab.lineHeight = 60;
            lab.color = color(218, 0, 0);
            desL.position = Vec3.ZERO;
            desL.parent = uiLayer;
            uiLayer.active = false;
        }

        this["_" + layerName + "UI"] = uiLayer;
    }

    public initUI(ui: any, data: any): void {
        if (!ui) {
            console.error('UI is undefined');
            return;
        }

        let type = ui.getType();
        switch (type) {
            case UIType.FULLSCREEN:
                this._fullSceneUI.addChild(ui.node);
                break;
            case UIType.HALFSCREEN:
                this._halfSceneUI.addChild(ui.node);
                break;
            case UIType.POPUP:
                this._popUpUI.addChild(ui.node);
                break;
            case UIType.PERMANENT:
                this._permanentUI.addChild(ui.node);
                break;
        }

        ui._initData = data;
        this.checkUIStack(ui);
    }

    // 打开 UI
    public checkUIStack(ui: any): void {
        const type = ui.getType();
        const stack = this._uiStacks[type];

        if (type !== UIType.PERMANENT) {
            // 如果当前类型已经有 UI 展示，先隐藏它
            if (stack.length > 0) {
                stack[stack.length - 1].hide(false);
            }
        }

        let index = this._uiShow.indexOf(ui.__classname__);
        if (index === -1) debugger;
        this._uiShow.splice(index, 1);
        // 将新的 UI 添加到栈中并显示
        stack.push(ui);
        ui.show();
    }

    public showWaiting(cmd: number): void {
        this._waitingUI.active = true;

        if (GFM.DEBUG) {
            this._waitingUI.children.forEach(v => v.active = true);
            this._waitingUI.getChildByName("desL").getComponent(Label).string = cmd + "";
        } else {
            this._waitingUI.children.forEach(v => v.active = false);
        }
    }

    public closeWaiting(): void {
        this._waitingUI.active = false;
    }

    public isExistUI(uiName: string, data: any): boolean {
        let list = this._uiStacks[UIType.PERMANENT];
        let ui = list.find((ui) => ui.__classname__ === uiName);
        if (ui) {
            ui._initData = data;
            ui.show();
            return true;
        }

        return false;
    }

    public isPreShowUI(uiName: string): boolean {
        return this._uiShow.indexOf(uiName) !== -1;
    }

    public setPreShowUI(uiName: string): void {
        this._uiShow.push(uiName);
    }

    public isShowUI(uiName: string): boolean {
        for (let key of Object.keys(this._uiStacks)) {

            if (UIType.PERMANENT === key) continue;

            let uiList = this._uiStacks[key];
            let com = uiList.find((ui) => ui.__classname__ === uiName);

            if (com) {
                return com;
            }
        }

        return false;
    }

    // 关闭 UI
    public deleteUI(ui: any, dety: boolean): void {
        if (ui === undefined) {
            console.error('UI is undefined');
            return;
        }

        const type = ui.getType();
        const stack = this._uiStacks[type];

        if (stack.length) {

            if (stack[stack.length - 1].__classname__ === ui.__classname__) {
                stack.pop();
            } else {
                let uIdx = stack.findIndex(v => v.__classname__ === ui.__classname__);
                if (uIdx !== -1) {
                    stack.splice(uIdx, 1);
                }
            }

            if (!dety) {
                // 显示上一个 UI
                if (stack.length > 0) {
                    stack[stack.length - 1].show();
                }
            }
        }
    }

    public closeAllUI(): void {
        for (let key of Object.keys(this._uiStacks)) {
            let uiList = this._uiStacks[key] || [];

            for (let i = uiList.length - 1; i >= 0; i--) {
                let ui = uiList[i];
                ui?.hide(true, true);
            }

            this._uiStacks[key].length = 0;
        }
    }

    public closeUI(uiName: string): void {
        if (uiName === undefined) {
            console.error('UI name is undefined');
            return;
        }

        for (let key of Object.keys(this._uiStacks)) {

            let uiList = this._uiStacks[key];
            let com = uiList.find((ui) => ui.__classname__ === uiName);

            if (com) {
                com.hide(true, true);
                break;
            }
        }
    }
}
