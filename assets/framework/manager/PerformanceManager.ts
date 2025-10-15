
import { Color, director, Label, Layers, Node, UITransform, Widget } from 'cc';
import DebugUtil from '../utils/DebugUtil';

export default class PerformanceManager {
    private _ui: Node = null;

    showStatusUI(color = Color.GREEN): void {
        if (!GFM.DEBUG) {
            GFM.LogMgr.warn("PerformanceManager: Performance UI is only available in DEBUG mode.");
            return;
        }


        let scene = director.getScene();
        let canvas = scene.getChildByName('Canvas');
        if (canvas == null) {
            GFM.LogMgr.warn("Canvas node not found in the scene.");
            return;
        }

        if (this._ui == null) {
            this._ui = canvas.getChildByName("PerformanceUI");
            if (!this._ui) {
                this._ui = new Node("PerformanceUI");
                this._ui.layer = Layers.Enum.UI_2D;

                let transform = this._ui.addComponent(UITransform);
                transform.setContentSize(700, 500); // 设置大小
                transform.setAnchorPoint(0, 1); // 设置锚点

                let widget = this._ui.addComponent(Widget);
                widget.isAlignLeft = true;
                widget.isAlignTop = true;
                widget.left = 20;
                widget.top = 50;

                let lable = this._ui.addComponent(Label);
                lable.fontSize = 20;
                lable.lineHeight = 20;
                lable.color = color;
                lable.overflow = Label.Overflow.RESIZE_HEIGHT;
                lable.horizontalAlign = Label.HorizontalAlign.LEFT;
                lable.verticalAlign = Label.VerticalAlign.TOP;

                this._ui.addComponent("PerformanceUI");

                canvas.addChild(this._ui);
            }
        }
    }

    get drawCalls(): number {
        return DebugUtil.getDrawCalls();
    }

    get fps(): number {
        return DebugUtil.getFPS();
    }

    get textureMemory(): number {
        return DebugUtil.getTextureMemory();
    }
}