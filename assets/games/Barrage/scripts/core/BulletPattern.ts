import { Vec3 } from "cc";
import {
    IPatternConfig,
    IActionConfig,
    EActionType,
    IFireActionConfig,
    IWaitActionConfig,
    IRepeatActionConfig,
    IChangeDirectionActionConfig,
    IChangeSpeedActionConfig,
    IValueConfig
} from "./types/PatternTypes";
import { BulletManager } from "../manager/BulletManager";

/**
 * 弹幕模式执行器
 * 根据配置执行弹幕发射序列
 */
export class BulletPattern {

    private _config: IPatternConfig;
    private _manager: BulletManager;
    private _position: Vec3 = new Vec3();
    private _isRunning: boolean = false;
    private _sequenceAngle: number = 0; // 序列角度累加值
    private _sequenceSpeed: number = 0; // 序列速度累加值

    constructor(config: IPatternConfig, manager: BulletManager) {
        this._config = config;
        this._manager = manager;
    }

    /**
     * 设置发射位置
     */
    setPosition(x: number, y: number, z: number = 0): this {
        this._position.set(x, y, z);
        return this;
    }

    /**
     * 执行模式（异步）
     */
    async execute(): Promise<void> {
        if (this._isRunning) {
            console.warn("[BulletPattern] 模式正在运行中");
            return;
        }

        this._isRunning = true;
        this._sequenceAngle = 0;
        this._sequenceSpeed = 0;

        try {
            // 执行入口动作
            const topLabel = this._config.top || "main";
            const actions = this._config.actions?.[topLabel];

            if (actions) {
                await this._executeActions(actions);
            }
        } catch (error) {
            console.error("[BulletPattern] 执行失败:", error);
        } finally {
            this._isRunning = false;
        }
    }

    /**
     * 执行动作列表
     */
    private async _executeActions(actions: IActionConfig[]): Promise<void> {
        for (const action of actions) {
            await this._executeAction(action);
        }
    }

    /**
     * 执行单个动作
     */
    private async _executeAction(action: IActionConfig): Promise<void> {
        switch (action.type) {
            case EActionType.FIRE:
                this._executeFire(action as IFireActionConfig);
                break;

            case EActionType.WAIT:
                await this._executeWait(action as IWaitActionConfig);
                break;

            case EActionType.REPEAT:
                await this._executeRepeat(action as IRepeatActionConfig);
                break;

            case EActionType.CHANGE_DIRECTION:
                // TODO: 实现方向改变（需要跟踪已发射的弹幕）
                break;

            case EActionType.CHANGE_SPEED:
                // TODO: 实现速度改变（需要跟踪已发射的弹幕）
                break;

            default:
                console.warn("[BulletPattern] 未知动作类型:", action.type);
        }
    }

    /**
     * 执行发射动作
     */
    private _executeFire(action: IFireActionConfig): void {
        const params = action.params;

        // 计算方向
        let direction = 0;
        if (params.direction) {
            direction = this._resolveValue(params.direction, this._sequenceAngle);
            if (params.direction.type === "sequence") {
                this._sequenceAngle += params.direction.value;
            }
        }

        // 计算速度
        let speed = 100;
        if (params.speed) {
            speed = this._resolveValue(params.speed, this._sequenceSpeed);
            if (params.speed.type === "sequence") {
                this._sequenceSpeed += params.speed.value;
            }
        }

        // 发射弹幕
        this._manager
            .create()
            .position(this._position)
            .direction(direction)
            .speed(speed)
            .fire();
    }

    /**
     * 执行等待动作
     */
    private _executeWait(action: IWaitActionConfig): Promise<void> {
        const frames = action.params.frames;
        const waitTime = frames * (1000 / 60); // 假设60fps

        return new Promise(resolve => {
            setTimeout(resolve, waitTime);
        });
    }

    /**
     * 执行重复动作
     */
    private async _executeRepeat(action: IRepeatActionConfig): Promise<void> {
        const times = action.params.times;
        const actions = action.params.actions;

        for (let i = 0; i < times; i++) {
            await this._executeActions(actions);
        }
    }

    /**
     * 解析值配置
     */
    private _resolveValue(config: IValueConfig, baseValue: number): number {
        switch (config.type) {
            case "absolute":
                return config.value;

            case "relative":
                return baseValue + config.value;

            case "sequence":
                return baseValue;

            default:
                return config.value;
        }
    }

    /**
     * 停止执行
     */
    stop(): void {
        this._isRunning = false;
    }

    /**
     * 是否正在运行
     */
    get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * 获取配置
     */
    get config(): IPatternConfig {
        return this._config;
    }
}
