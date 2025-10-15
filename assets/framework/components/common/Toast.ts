import { _decorator, Component, Label, tween, Vec3, Node, UIOpacity, find, instantiate, Prefab, Tween, Layout, NodePool, isValid } from 'cc';
import { log } from 'console';

const { ccclass, property } = _decorator;

/**
 * Toast 基础组件
 * 研发直接将此脚本绑定到预制体上，无需复杂配置
 * 每个游戏只有一个 Toast 样式
 */
@ccclass('Toast')
export class Toast extends Component {

    /** 默认显示时长（毫秒） */
    public static readonly DEFAULT_DURATION = 1000;
    /** Toast 间隔 修改为Toast高度*/
    public static readonly TOAST_SPACING = 85;

    public static resUrl: string = 'res/prefab/Toast';

    /** 内容标签，研发必须在预制体中绑定 */
    @property(Label)
    lab_content: Label = null!;

    @property(UIOpacity)
    uiOpacity: UIOpacity = null;

    public static show(str: string, duration: number = Toast.DEFAULT_DURATION): void {
        ToastManager.show(str, duration);
    }

    public setContent(content: string): void {
        if (this.lab_content) {
            this.lab_content.string = content;
        }
    }

    /**
     * 显示 Toast
     */
    public show(duration: number = Toast.DEFAULT_DURATION): void {
        this.node.active = true;
        this.playAnimation(duration);
    }

    public hide(): void {
        ToastManager.recycleToast(this);
        this.node.active = false;
    }

    /**
     * 子类可重写：显示动画
     */
    protected playAnimation(duration: number): void {
        Tween.stopAllByTarget(this.node);
        if (this.uiOpacity) {
            Tween.stopAllByTarget(this.uiOpacity);
        }

        // 透明度动画
        if (this.uiOpacity) {
            tween(this.uiOpacity)
                .set({ opacity: 0 })
                .to(0.2, { opacity: 255 })
                .delay(duration / 1000)
                .to(0.3, { opacity: 0 })
                .start();
        }

        tween(this.node)
            .set({ scale: new Vec3(0.8, 0.8, 1) })
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .delay(duration / 1000)
            .to(0.3, { position: new Vec3(this.node.position.x, this.node.position.y + 100, 0) })
            .call(() => {
                if (isValid(this.node)) {
                    this.hide();
                }
            })
            .start();
    }


    public clear(): void {
        Tween.stopAllByTarget(this.node);
        if (this.uiOpacity) {
            Tween.stopAllByTarget(this.uiOpacity);
        }

        this.node.setScale(1, 1, 1);
        this.node.setPosition(0, 0, 0);

        if (this.uiOpacity) {
            this.uiOpacity.opacity = 255;
        }

        if (this.lab_content) {
            this.lab_content.string = '';
        }
    }

    public unuse(): void {
        this.clear();
    }

    public reuse(): void {
        this.clear();
    }
}

/**
 * Toast 管理器 - 统一管理 Toast 实例
 */
export class ToastManager {
    /** 对象池 */
    private static _pool: NodePool = null;
    /** 当前活跃的 Toast 列表 */
    private static _activeToasts: Toast[] = [];
    /** 容器节点 */
    private static _container: Node = null;
    /** 注册的 Toast 预制体（Prefab 对象） */
    private static _toastPrefab: Prefab = null;
    /** 是否已经尝试过自动加载 */
    private static _autoLoadAttempted: boolean = false;


    public static async show(str: string, duration: number = Toast.DEFAULT_DURATION): Promise<void> {
        // 如果没有预制体，尝试自动加载
        if (!this._toastPrefab && !this._autoLoadAttempted) {
            await this._autoLoadToastPrefab();
        }

        let toast: Toast;

        if (this._toastPrefab) {
            toast = this._getToastFromPool();
        } else {
            GFM.LogMgr.warn(`Toast prefab not found at ${Toast.resUrl}. Creating temporary Toast without object pool.`);
            toast = this._createTemporaryToast();
        }

        if (toast) {
            this._activeToasts.push(toast);
            toast.node.parent = this._getContainer();
            toast.setContent(GFM.LangMgr.getLangStr(str));

            const containerChildren = this._getContainer().children;
            const maxSiblingIndex = containerChildren.length > 0 ?
                Math.max(...containerChildren.map(child => child.getSiblingIndex())) : 0;
            toast.node.setSiblingIndex(maxSiblingIndex + 1);

            const newToastIndex = this._activeToasts.length - 1;
            const yOffset = newToastIndex * Toast.TOAST_SPACING;
            const targetY = -yOffset;

            toast.node.setPosition(0, targetY, 0);
            toast.show(duration);
        }
    }


    private static async _autoLoadToastPrefab(): Promise<void> {
        this._autoLoadAttempted = true;

        try {
            const prefab = await GFM.ResMgr.loadAsset(Toast.resUrl, Prefab, GFM.ResMgr.bundleName);

            if (prefab) {
                // 验证预制体是否包含 Toast 组件
                const testNode = instantiate(prefab as Prefab);
                const toastComponent = testNode.getComponent(Toast);

                if (toastComponent) {
                    // 保存预制体对象，而不是实例化后的节点
                    this._toastPrefab = prefab as Prefab;
                    testNode.destroy(); // 销毁测试节点
                    console.log(`Toast prefab auto-loaded from ${Toast.resUrl}`);
                } else {
                    testNode.destroy();
                    GFM.LogMgr.warn(`ToastPrefab at ${Toast.resUrl} does not contain Toast component`);
                }
            }
        } catch (error) {
            // 静默失败，不输出错误日志
        }
    }

    /**
     * 从对象池获取 Toast 实例
     */
    private static _getToastFromPool(): Toast {

        let toastNode: Node = null;
        if (!this._pool) {
            this._pool = new NodePool(Toast);
        }

        if (this._pool.size() > 0) {
            toastNode = this._pool.get();
        } else {
            // 对象池为空，克隆预制体创建新实例
            if (this._toastPrefab) {
                toastNode = instantiate(this._toastPrefab);
            } else {
                GFM.LogMgr.error('Toast prefab is not loaded!');
                return null;
            }
        }
        let toast = toastNode.getComponent(Toast);
        if (!toast) {
            GFM.LogMgr.error('Toast prefab must have Toast component!');
            toastNode.destroy(); // 清理错误节点
            return null;
        }
        return toast;
    }

    /**
     * 创建临时 Toast（无预制体时使用）
     */
    private static _createTemporaryToast(): Toast {
        const node = new Node('TemporaryToast');
        const toast = node.addComponent(Toast);

        // 创建简单的 Label 组件
        const labelNode = new Node('Label');
        labelNode.setParent(node);
        toast.lab_content = labelNode.addComponent(Label);
        toast.lab_content.string = '';
        toast.lab_content.fontSize = 16;

        return toast;
    }

    /**
     * 回收 Toast 到对象池
     */
    public static recycleToast(toast: Toast): void {
        const index = this._activeToasts.indexOf(toast);
        if (index !== -1) {
            this._activeToasts.splice(index, 1);
        }

        if (this._toastPrefab) {
            this._pool.put(toast.node);
        } else {
            toast.node.destroy();
        }

        this._arrangeToasts();
    }

    /**
     * 获取容器节点
     */
    private static _getContainer(): Node {
        if (!this._container) {
            const canvas = find('Canvas');
            if (canvas) {
                this._container = new Node('ToastContainer');
                this._container.parent = canvas;
                this._container.setSiblingIndex(999); // 确保在最上层
            } else {
                GFM.LogMgr.error('未找到 Canvas 节点');
            }
        }
        return this._container;
    }

    /**
     * 重新排列所有 Toast
     * @param animated 是否使用动画，默认为 true
     */
    private static _arrangeToasts(animated: boolean = true): void {
        this._activeToasts.forEach((toast, index) => {
            const yOffset = index * Toast.TOAST_SPACING;
            const targetY = -yOffset; // 从0开始向下排列

            if (animated) {
                // 只停止位置相关的动画，使用更精确的方式
                const currentPos = toast.node.position;
                if (Math.abs(currentPos.y - targetY) > 1) { // 只有位置差异较大时才执行动画
                    // 平滑移动到目标位置
                    tween(toast.node)
                        .to(0.3, { position: new Vec3(0, targetY, 0) }, { easing: 'quartOut' })
                        .start();
                }
            } else {
                // 直接设置位置
                toast.node.setPosition(0, targetY, 0);
            }
        });
    }
}