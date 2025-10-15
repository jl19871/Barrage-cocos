import { _decorator, Component, Sprite, Vec3, math } from "cc";
import { IBulletConfig, IBulletRuntime, EBulletState } from "../core/types/BulletTypes";

const { ccclass, property } = _decorator;

/**
 * 弹幕组件
 * 挂载在弹幕节点上，负责弹幕的运动和生命周期管理
 */
@ccclass("BulletComponent")
export class BulletComponent extends Component {

    @property(Sprite)
    sprite: Sprite = null;

    /** 运行时数据 */
    private _runtime: IBulletRuntime = null;

    /** 临时向量，避免频繁创建 */
    private _tempVec3: Vec3 = new Vec3();

    /**
     * 初始化弹幕
     */
    init(config: IBulletConfig): void {
        // 初始化运行时数据
        this._runtime = {
            node: this.node,
            position: config.position ? config.position.clone() : new Vec3(),
            speed: config.speed || 100,
            direction: math.toRadian(config.direction || 0),
            acceleration: 0,
            angularVelocity: 0,
            state: EBulletState.ACTIVE,
            age: 0,
            lifetime: config.lifetime || 0,
            userData: config.userData
        };

        // 设置初始位置
        this.node.setPosition(this._runtime.position);

        // 设置精灵帧
        if (config.spriteFrame && this.sprite) {
            this.sprite.spriteFrame = config.spriteFrame;
        }

        // 设置初始旋转（可选：让子弹朝向运动方向）
        this.node.angle = -math.toDegree(this._runtime.direction);
    }

    /**
     * 重置弹幕（用于对象池）
     */
    reset(): void {
        this._runtime = null;
        this.node.setPosition(Vec3.ZERO);
        this.node.angle = 0;
    }

    reuse(): void {
        this.reset();
    }

    unuse(): void {
        this.reset();
    }

    /**
     * 更新弹幕（每帧调用）
     */
    updateBullet(deltaTime: number): void {
        if (!this._runtime || this._runtime.state !== EBulletState.ACTIVE) {
            return;
        }

        // 更新速度（加速度）
        this._runtime.speed += this._runtime.acceleration * deltaTime;

        // 更新方向（角速度）
        this._runtime.direction += this._runtime.angularVelocity * deltaTime;

        // 计算位移
        const dx = Math.cos(this._runtime.direction) * this._runtime.speed * deltaTime;
        const dy = Math.sin(this._runtime.direction) * this._runtime.speed * deltaTime;

        // 更新位置
        this._runtime.position.x += dx;
        this._runtime.position.y += dy;
        this.node.setPosition(this._runtime.position);

        // 更新旋转（让子弹朝向运动方向）
        this.node.angle = -math.toDegree(this._runtime.direction);

        // 更新生命周期
        this._runtime.age++;
        if (this._runtime.lifetime > 0 && this._runtime.age >= this._runtime.lifetime) {
            this.kill();
        }
    }

    /**
     * 标记弹幕为销毁状态
     */
    kill(): void {
        if (this._runtime) {
            this._runtime.state = EBulletState.DESTROYING;
        }
    }

    /**
     * 设置速度
     */
    setSpeed(speed: number): void {
        if (this._runtime) {
            this._runtime.speed = speed;
        }
    }

    /**
     * 设置方向（角度）
     */
    setDirection(degree: number): void {
        if (this._runtime) {
            this._runtime.direction = math.toRadian(degree);
        }
    }

    /**
     * 设置加速度
     */
    setAcceleration(acceleration: number): void {
        if (this._runtime) {
            this._runtime.acceleration = acceleration;
        }
    }

    /**
     * 设置角速度（角度/秒）
     */
    setAngularVelocity(degreesPerSecond: number): void {
        if (this._runtime) {
            this._runtime.angularVelocity = math.toRadian(degreesPerSecond);
        }
    }

    /**
     * 获取当前状态
     */
    get state(): EBulletState {
        return this._runtime ? this._runtime.state : EBulletState.IDLE;
    }

    /**
     * 获取当前位置
     */
    get position(): Vec3 {
        return this._runtime ? this._runtime.position : Vec3.ZERO;
    }

    /**
     * 获取运行时数据
     */
    get runtime(): IBulletRuntime {
        return this._runtime;
    }

    /**
     * 是否激活
     */
    get isActive(): boolean {
        return this._runtime && this._runtime.state === EBulletState.ACTIVE;
    }
}
