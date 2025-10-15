/**
 * 弹幕模式配置类型定义
 * 支持从 JSON/XML 加载弹幕配置
 */

/**
 * 动作类型
 */
export enum EActionType {
    /** 发射弹幕 */
    FIRE = "fire",
    /** 等待 */
    WAIT = "wait",
    /** 重复 */
    REPEAT = "repeat",
    /** 改变方向 */
    CHANGE_DIRECTION = "changeDirection",
    /** 改变速度 */
    CHANGE_SPEED = "changeSpeed",
    /** 加速 */
    ACCEL = "accel",
    /** 消失 */
    VANISH = "vanish"
}

/**
 * 值类型（用于方向和速度）
 */
export interface IValueConfig {
    /** 值 */
    value: number;
    /** 类型：absolute(绝对)、relative(相对)、sequence(序列) */
    type?: "absolute" | "relative" | "sequence";
}

/**
 * 弹幕动作配置
 */
export interface IActionConfig {
    /** 动作类型 */
    type: EActionType;
    /** 参数（根据不同类型有不同含义） */
    params?: any;
}

/**
 * 发射动作配置
 */
export interface IFireActionConfig extends IActionConfig {
    type: EActionType.FIRE;
    params: {
        /** 方向配置 */
        direction?: IValueConfig;
        /** 速度配置 */
        speed?: IValueConfig;
        /** 子弹标签（引用其他配置） */
        bulletLabel?: string;
        /** 嵌套动作 */
        actions?: IActionConfig[];
    };
}

/**
 * 等待动作配置
 */
export interface IWaitActionConfig extends IActionConfig {
    type: EActionType.WAIT;
    params: {
        /** 等待帧数 */
        frames: number;
    };
}

/**
 * 重复动作配置
 */
export interface IRepeatActionConfig extends IActionConfig {
    type: EActionType.REPEAT;
    params: {
        /** 重复次数 */
        times: number;
        /** 子动作列表 */
        actions: IActionConfig[];
    };
}

/**
 * 改变方向动作配置
 */
export interface IChangeDirectionActionConfig extends IActionConfig {
    type: EActionType.CHANGE_DIRECTION;
    params: {
        /** 目标方向 */
        direction: IValueConfig;
        /** 变化时间（帧数） */
        term: number;
    };
}

/**
 * 改变速度动作配置
 */
export interface IChangeSpeedActionConfig extends IActionConfig {
    type: EActionType.CHANGE_SPEED;
    params: {
        /** 目标速度 */
        speed: IValueConfig;
        /** 变化时间（帧数） */
        term: number;
    };
}

/**
 * 加速动作配置
 */
export interface IAccelActionConfig extends IActionConfig {
    type: EActionType.ACCEL;
    params: {
        /** 水平加速度 */
        horizontal?: IValueConfig;
        /** 垂直加速度 */
        vertical?: IValueConfig;
        /** 持续时间（帧数） */
        term: number;
    };
}

/**
 * 弹幕配置
 */
export interface IBulletConfig {
    /** 标签（用于引用） */
    label?: string;
    /** 方向 */
    direction?: IValueConfig;
    /** 速度 */
    speed?: IValueConfig;
    /** 动作列表 */
    actions?: IActionConfig[];
}

/**
 * 弹幕模式配置（根配置）
 */
export interface IPatternConfig {
    /** 模式名称 */
    name: string;
    /** 模式类型 */
    type?: string;
    /** 入口动作标签 */
    top?: string;
    /** 动作定义列表 */
    actions?: { [label: string]: IActionConfig[] };
    /** 弹幕定义列表 */
    bullets?: { [label: string]: IBulletConfig };
}

/**
 * 弹幕模式库配置
 */
export interface IPatternLibrary {
    /** 版本 */
    version?: string;
    /** 模式列表 */
    patterns: IPatternConfig[];
}
