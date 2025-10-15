/**
 * 弹幕事件枚举
 */
export enum EBarrageEvent {
    /** 弹幕创建 */
    BULLET_CREATED = "BULLET_CREATED",
    /** 弹幕销毁 */
    BULLET_DESTROYED = "BULLET_DESTROYED",
    /** 弹幕碰撞 */
    BULLET_HIT = "BULLET_HIT",
    /** 弹幕超出边界 */
    BULLET_OUT_OF_BOUNDS = "BULLET_OUT_OF_BOUNDS"
}

/**
 * 弹幕模式类型
 */
export enum EPatternType {
    /** 自定义 */
    CUSTOM = "custom",
    /** 圆形 */
    CIRCLE = "circle",
    /** 螺旋 */
    SPIRAL = "spiral",
    /** 扇形 */
    FAN = "fan",
    /** 激光 */
    LASER = "laser",
    /** 随机 */
    RANDOM = "random"
}
