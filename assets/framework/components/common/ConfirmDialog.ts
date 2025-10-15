
import { _decorator, Component, Node, Label, Button, isValid } from 'cc';
import { BaseUI, PopUp } from '../../base/BaseUI';
import LangLabel from '../i18n/LangLabel';

const { ccclass, property } = _decorator;

/** 确认对话框配置接口 */
export interface IConfirmDialogConfig {
    /** 标题文本 */
    title?: string;
    /** 内容文本（支持多行） */
    content?: string;
    /** 左侧按钮文本（为空则不显示） */
    leftButtonText?: string;
    /** 右侧按钮文本（为空则不显示） */
    rightButtonText?: string;
    /** 左侧按钮回调（null或undefined时关闭弹窗） */
    onLeftClick?: (() => void) | null;
    /** 右侧按钮回调（null或undefined时关闭弹窗） */
    onRightClick?: (() => void) | null;
}

/**
 * 可配置的确认对话框基类
 * 支持单按钮和双按钮模式，支持自定义标题、内容和按钮回调
 * 子类只需设置 resUrl 即可使用
 */
@ccclass('ConfirmDialog')
@PopUp
export class ConfirmDialog extends BaseUI {

    /** 标题标签 */
    @property(LangLabel)
    lab_title: LangLabel = null!;

    /** 内容标签 */
    @property(LangLabel)
    lab_content: LangLabel = null!;

    /** 左侧按钮 */
    @property(Button)
    btn_left: Button = null!;

    /** 右侧按钮 */
    @property(Button)
    btn_right: Button = null!;

    /** 左侧按钮标签 */
    @property(LangLabel)
    lab_leftBtn: LangLabel = null!;

    /** 右侧按钮标签 */
    @property(LangLabel)
    lab_rightBtn: LangLabel = null!;

    /** 当前配置 */
    private _config: IConfirmDialogConfig = null;

    /** 组件启动 */
    start(): void {
        this.setupEventListeners();
    }

    /** 
     * 显示确认对话框
     * @param config 配置对象
     */
    public static async show(config: IConfirmDialogConfig): Promise<void> {
        return super.show(config);
    }

    /** 显示结束回调，应用配置 */
    protected onShowBegin(): void {
        if (this._initData) {
            this.applyConfig(this._initData);
        }
    }

    /** 设置事件监听器 */
    private setupEventListeners(): void {
        // 左侧按钮事件
        if (this.btn_left && isValid(this.btn_left.node)) {
            this.btn_left.node.on(Button.EventType.CLICK, this.onLeftButtonClick, this);
        }

        // 右侧按钮事件
        if (this.btn_right && isValid(this.btn_right.node)) {
            this.btn_right.node.on(Button.EventType.CLICK, this.onRightButtonClick, this);
        }
    }

    /** 应用配置到UI */
    private applyConfig(config: IConfirmDialogConfig): void {
        // 合并配置
        this._config = config;

        try {
            // 设置标题
            if (this.lab_title && isValid(this.lab_title.node)) {
                this.lab_title.tid = this._config.title;
                this.lab_title.node.active = !!this._config.title;
            }

            // 设置内容
            if (this.lab_content && isValid(this.lab_content.node)) {
                this.lab_content.tid = this._config.content;
            }

            // 配置左侧按钮
            this._configureButton(
                this.btn_left,
                this.lab_leftBtn,
                this._config.leftButtonText
            );

            // 配置右侧按钮
            this._configureButton(
                this.btn_right,
                this.lab_rightBtn,
                this._config.rightButtonText
            );

            // 处理单按钮居中显示
            this.adjustButtonLayout();
        } catch (error) {
            GFM.LogMgr.error("应用确认对话框配置失败:", error);
        }
    }

    /** 
     * 配置按钮显示状态和文本
     * @param button 按钮组件
     * @param label 按钮标签组件
     * @param text 按钮文本
     */
    private _configureButton(button: Button, label: LangLabel, text: string): void {
        if (!button || !isValid(button.node)) {
            return;
        }

        const showButton = text && text.trim().length > 0;
        button.node.active = showButton;

        if (showButton && label && isValid(label.node)) {
            label.tid = text;
        }
    }

    /** 
     * 调整按钮布局，单按钮时居中显示
     */
    private adjustButtonLayout(): void {
        try {
            const hasLeftButton = this.btn_left && this.btn_left.node.active;
            const hasRightButton = this.btn_right && this.btn_right.node.active;

            // 单按钮居中处理
            if (!hasLeftButton && hasRightButton) {
                // 只有右按钮，将右按钮移动到中间
                const rightButton = this.btn_right.node;
                if (this.btn_left && this.btn_left.node) {
                    // 获取左按钮的位置作为中间位置
                    const leftPos = this.btn_left.node.position;
                    const rightPos = rightButton.position;
                    const centerX = (leftPos.x + rightPos.x) / 2;
                    rightButton.setPosition(centerX, rightPos.y, rightPos.z);
                }
            } else if (hasLeftButton && !hasRightButton) {
                // 只有左按钮，将左按钮移动到中间
                const leftButton = this.btn_left.node;
                if (this.btn_right && this.btn_right.node) {
                    const leftPos = leftButton.position;
                    const rightPos = this.btn_right.node.position;
                    const centerX = (leftPos.x + rightPos.x) / 2;
                    leftButton.setPosition(centerX, leftPos.y, leftPos.z);
                }
            }
            // 双按钮时保持原有位置，不需调整
        } catch (error) {
            GFM.LogMgr.error("调整按钮布局失败:", error);
        }
    }

    /** 左侧按钮点击处理 */
    private onLeftButtonClick(): void {
        try {
            // 执行回调函数
            if (this._config.onLeftClick) {
                this._config.onLeftClick();
            }
        } catch (error) {
            GFM.LogMgr.error("左侧按钮点击处理失败:", error);
        } finally {
            this.closeDialog();
        }
    }

    /** 右侧按钮点击处理 */
    private onRightButtonClick(): void {
        try {
            // 执行回调函数
            if (this._config.onRightClick) {
                this._config.onRightClick();
            }
        } catch (error) {
            GFM.LogMgr.error("右侧按钮点击处理失败:", error);
        } finally {
            this.closeDialog();
        }
    }

    /** 关闭对话框 */
    private closeDialog(): void {
        try {
            this.hide();
        } catch (error) {
            GFM.LogMgr.error("关闭确认对话框失败:", error);
        }
    }

    /** 组件销毁时清理事件监听器 */
    onDestroy(): void {
        if (this.btn_left && isValid(this.btn_left.node)) {
            this.btn_left.node.off(Button.EventType.CLICK, this.onLeftButtonClick, this);
        }

        if (this.btn_right && isValid(this.btn_right.node)) {
            this.btn_right.node.off(Button.EventType.CLICK, this.onRightButtonClick, this);
        }
    }
}