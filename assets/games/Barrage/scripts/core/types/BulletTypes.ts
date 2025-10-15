import { Node, Vec2, Vec3, SpriteFrame } from "cc";

/**
 * 弹幕方向类型
 */
export enum EDirectionType {
    /** 绝对角度（世界坐标系） */
    ABSOLUTE = "absolute",
    /** 相对角度（相对于发射器） */
    RELATIVE = "relative",
    /** 瞄准目标 */
    AIM = "aim",
    /** 序列角度（每次递增） */
    SEQUENCE = "sequence"
}

/**
 * 弹幕速度类型
 */
export enum ESpeedType {
    /** 绝对速度 */
    ABSOLUTE = "absolute",
    /** 相对速度 */
    RELATIVE = "relative",
    /** 序列速度 */
    SEQUENCE = "sequence"
}

/**
 * 弹幕状态
 */
export enum EBulletState {
    /** 未激活 */
    IDLE = 0,
    /** 激活运行中 */
    ACTIVE = 1,
    /** 等待销毁 */
    DESTROYING = 2
}

/**
 * 弹幕基础配置
 */
export interface IBulletConfig {
    /** 初始位置 */
    position?: Vec3;
    /** 初始方向（角度） */
    direction?: number;
    /** 方向类型 */
    directionType?: EDirectionType;
    /** 初始速度 */
    speed?: number;
    /** 速度类型 */
    speedType?: ESpeedType;
    /** 精灵帧 */
    spriteFrame?: SpriteFrame;
    /** 生命周期（帧数，0为无限） */
    lifetime?: number;
    /** 自定义数据 */
    userData?: any;
}

/**
 * 弹幕运行时数据
 */
export interface IBulletRuntime {
    /** 关联的节点 */
    node: Node;
    /** 当前位置 */
    position: Vec3;
    /** 当前速度 */
    speed: number;
    /** 当前方向（弧度） */
    direction: number;
    /** 加速度 */
    acceleration: number;
    /** 角速度（弧度/帧） */
    angularVelocity: number;
    /** 当前状态 */
    state: EBulletState;
    /** 已存活帧数 */
    age: number;
    /** 最大生命周期 */
    lifetime: number;
    /** 自定义数据 */
    userData?: any;
}

/**
 * 目标对象接口
 */
export interface IBulletTarget {
    /** 目标位置 */
    position: Vec3;
    /** 目标节点（可选） */
    node?: Node;
}

/**
 * 弹幕发射器配置
 */
export interface IBulletEmitterConfig {
    /** 发射位置 */
    position?: Vec3;
    /** 目标对象 */
    target?: IBulletTarget;
    /** 弹幕配置 */
    bulletConfig?: IBulletConfig;
    /** 发射间隔（帧） */
    interval?: number;
    /** 是否自动发射 */
    autoFire?: boolean;
}
