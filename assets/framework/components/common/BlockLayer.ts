import { _decorator, Component, Label, Node, find, UITransform, Sprite, Color, Button, Widget, BlockInputEvents, director, HorizontalTextAlignment, VerticalTextAlignment, Overflow } from "cc";
import { EEventEnum } from "../../data/enums/EventEnums";
const { ccclass, property } = _decorator;
/*
 * @Author: JL
 * @Date: 2025-09-04 16:45:53
 */
@ccclass('BlockLayer')
export default class BlockLayer extends Component {

    @property(Label)
    lab_blockReason: Label = null;

    private blockInputRefNum = 0;
    private blockReasons: string[] = [];
    private static _instance: BlockLayer = null;
    private _blockNode: Node = null;
    private _initialized: boolean = false;

    /** Debug 模式标志 */
    private static get isDebugMode(): boolean {
        return GFM.DEBUG; // 开发环境为 debug 模式
    }

    /**
     * 获取单例实例（懒加载）
     */
    public static getInstance(): BlockLayer {
        if (!this._instance) {
            // 自动创建 BlockLayer 节点和组件
            this._createBlockLayerNode();
        }

        return this._instance;
    }

    /**
     * 自动创建 BlockLayer 节点
     */
    private static _createBlockLayerNode(): void {
        const canvas = find('Canvas');
        if (!canvas) {
            GFM.LogMgr.error('未找到 Canvas 节点，无法创建 BlockLayer');
            return;
        }

        // 检查是否已存在 BlockLayer 节点
        let blockLayerNode = canvas.getChildByName('BlockLayer');
        if (blockLayerNode) {
            this._instance = blockLayerNode.getComponent(BlockLayer);
            if (this._instance) {
                GFM.LogMgr.log('找到已存在的 BlockLayer 组件');
                return;
            }
        }

        // 创建新的 BlockLayer 节点
        blockLayerNode = new Node('BlockLayer');
        blockLayerNode.parent = canvas;

        // 添加 BlockLayer 组件
        this._instance = blockLayerNode.addComponent(BlockLayer);
        this._instance._init();

        GFM.LogMgr.log('自动创建 BlockLayer 节点和组件成功');
    }


    protected onLoad(): void {
        BlockLayer._instance = this;

        GFM.EventMgr.on(EEventEnum.BLOCK_INPUT_SHOW, this.onBlockInputShow, this);
        GFM.EventMgr.on(EEventEnum.BLOCK_INPUT_HIDE, this.onBlockInputHide, this);
        GFM.EventMgr.on(EEventEnum.BLOCK_INPUT_CLEAR, this.onBlockInputClear, this);

        // 初始化时根据 debug 模式设置调试信息显示
        this._updateDebugDisplay();
    }

    protected start(): void {

    }

    onDestroy(): void {
        GFM.EventMgr.off(EEventEnum.BLOCK_INPUT_SHOW, this.onBlockInputShow, this);
        GFM.EventMgr.off(EEventEnum.BLOCK_INPUT_HIDE, this.onBlockInputHide, this);
        GFM.EventMgr.off(EEventEnum.BLOCK_INPUT_CLEAR, this.onBlockInputClear, this);

        // 清理单例引用
        if (BlockLayer._instance === this) {
            BlockLayer._instance = null;
        }
    }

    private onBlockInputShow(reason: string): void {
        this.blockInputRefNum++;
        this.blockReasons.push(reason);
        // 显示屏蔽层节点
        this._updateBlockLayer();
        GFM.LogMgr.log("blockinput block:", this.blockInputRefNum, reason);
    }

    private onBlockInputHide(reason: string): void {
        let index = this.blockReasons.findIndex((o) => o === reason);
        if (index != -1) {
            this.blockInputRefNum -= 1;
            this.blockReasons.splice(index, 1);
            this._updateBlockLayer();
            GFM.LogMgr.log("blockinput allow:", this.blockInputRefNum, reason);
        }
    }

    private onBlockInputClear(): void {
        this.blockInputRefNum = 0;
        this.blockReasons = [];

        // 只在 debug 模式下清空文本显示
        if (BlockLayer.isDebugMode && this.lab_blockReason) {
            this.lab_blockReason.string = '';
        }

        // 强制隐藏屏蔽层节点
        this._updateBlockLayer();
    }

    /**
     * 根据 debug 模式更新调试信息显示
     */
    private _updateDebugDisplay(): void {
        if (this.lab_blockReason) {
            this.lab_blockReason.node.active = BlockLayer.isDebugMode;
        }
    }

    /**
     * 懒加载初始化
     */
    private _init(): void {
        if (this._initialized) {
            return;
        }
        try {
            this._createBlockLayer();
            this._initialized = true;
            GFM.LogMgr.log('BlockLayer 初始化成功');
        } catch (error) {
            GFM.LogMgr.error('BlockLayer 初始化失败:', error);
        }
    }

    /**
     * 创建屏蔽层节点
     */
    private _createBlockLayer(): void {
        // 使用当前节点作为屏蔽层容器
        this._blockNode = this.node;

        // 设置屏蔽层属性
        this._blockNode.setSiblingIndex(9999); // 确保在最上层
        this._blockNode.active = false;

        // 添加 UITransform 组件
        let uiTransform = this._blockNode.getComponent(UITransform);
        if (!uiTransform) {
            uiTransform = this._blockNode.addComponent(UITransform);
            uiTransform.setContentSize(100, 100); // 设置默认尺寸，Widget 会覆盖
            uiTransform.setAnchorPoint(0.5, 0.5);
        }

        // 添加 Widget 组件实现全屏
        let widget = this._blockNode.getComponent(Widget);
        if (!widget) {
            widget = this._blockNode.addComponent(Widget);
            // 设置全屏对齐
            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            widget.isAlignTop = true;
            widget.isAlignBottom = true;
            widget.left = 0;
            widget.right = 0;
            widget.top = 0;
            widget.bottom = 0;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        }

        // 添加透明背景以阻挡点击
        // let sprite = this._blockNode.getComponent(Sprite);
        // if (!sprite) {
        //     sprite = this._blockNode.addComponent(Sprite);
        //     if (sprite) {
        //         // 设置透明色，确保能阻挡点击但不可见
        //         sprite.color = new Color(0, 0, 0, 1);
        //     }
        // }

        // 添加 BlockInputEvents 组件阻挡交互
        if (!this._blockNode.getComponent(BlockInputEvents)) {
            this._blockNode.addComponent(BlockInputEvents);
        }

        // // 添加暗版
        // let darkNode = new Node('dark_node');
        // this._blockNode.addChild(darkNode);
        // darkNode.setPosition(0, 0);

        // let darkSprite = darkNode.addComponent(Sprite);
        // darkSprite.color = new Color(0, 0, 0, 128);

        // let darkWidget = darkNode.addComponent(Widget);
        // // 设置全屏对齐
        // darkWidget.isAlignLeft = true;
        // darkWidget.isAlignRight = true;
        // darkWidget.isAlignTop = true;
        // darkWidget.isAlignBottom = true;
        // darkWidget.left = 0;
        // darkWidget.right = 0;
        // darkWidget.top = 0;
        // widget.bottom = 0;
        // widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        // 添加调试文本标签
        if (BlockLayer.isDebugMode) {
            if (!this.lab_blockReason) {
                let label = new Node('debug_label');
                this._blockNode.addChild(label);
                label.setPosition(0, 0);

                uiTransform = label.addComponent(UITransform);
                uiTransform.setContentSize(700, 100); // 设置默认尺寸，Widget 会覆盖
                uiTransform.setAnchorPoint(0, 1);

                let widget = label.addComponent(Widget);
                // 设置全屏对齐
                widget.isAlignLeft = true;
                widget.isAlignTop = true;
                widget.left = 20;
                widget.top = 20;
                widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;


                let labelComp = label.addComponent(Label);
                labelComp.string = '';
                labelComp.fontSize = 24;
                labelComp.color = new Color(255, 0, 0, 255);
                labelComp.horizontalAlign = HorizontalTextAlignment.LEFT;
                labelComp.verticalAlign = VerticalTextAlignment.CENTER;
                labelComp.overflow = Overflow.RESIZE_HEIGHT;

                this.lab_blockReason = labelComp;
            }
        }

        GFM.LogMgr.log('屏蔽层节点配置完成');
    }

    /**
     * 更新屏蔽层
     */
    private _updateBlockLayer(): void {
        try {
            this._blockNode.active = this.blockInputRefNum > 0;
            this.lab_blockReason.node.active = GFM.DEBUG;
            this.lab_blockReason.string = this.blockReasons.join('\n');
        } catch (error) {
            GFM.LogMgr.error('更新屏蔽层失败:', error);
        }
    }

}