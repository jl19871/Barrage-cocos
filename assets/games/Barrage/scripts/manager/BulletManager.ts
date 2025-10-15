import { Node, Prefab, instantiate, Vec3, SpriteFrame, NodePool, JsonAsset, TextAsset } from "cc";
import { BulletComponent } from "../components/BulletComponent";
import { IBulletConfig } from "../core/types/BulletTypes";
import { IPatternConfig } from "../core/types/PatternTypes";
import { PatternParser } from "../core/PatternParser";
import { BulletPattern } from "../core/BulletPattern";

/**
 * 弹幕管理器
 * 负责弹幕的创建、更新和销毁
 */
export class BulletManager {

    private static _instance: BulletManager = null;

    /** 弹幕容器节点 */
    private _container: Node = null;

    /** 所有活跃的弹幕 */
    private _activeBullets: BulletComponent[] = [];

    /** 默认弹幕预制体 */
    private _defaultBulletPrefab: Prefab = null;

    /** 弹幕对象池 */
    private _bulletPool: NodePool = null;

    /** 对象池初始大小 */
    private _poolInitSize: number = 50;

    /** 待删除的弹幕索引 */
    private _toRemove: number[] = [];

    private constructor() { }

    /**
     * 获取单例实例
     */
    static getInstance(): BulletManager {
        if (!this._instance) {
            this._instance = new BulletManager();
        }
        return this._instance;
    }

    /**
     * 初始化管理器
     * @param container 弹幕容器节点
     * @param bulletPrefab 默认弹幕预制体
     * @param poolSize 对象池初始大小
     */
    init(container: Node, bulletPrefab?: Prefab, poolSize: number = 50): void {
        this._container = container;
        this._defaultBulletPrefab = bulletPrefab;
        this._poolInitSize = poolSize;
        this._activeBullets = [];
        this._toRemove = [];

        // 初始化对象池
        this._initPool();
    }

    /**
     * 初始化对象池
     */
    private _initPool(): void {
        if (!this._defaultBulletPrefab) {
            return;
        }

        // 创建对象池
        this._bulletPool = new NodePool("BulletComponent");

        // 预创建节点
        for (let i = 0; i < this._poolInitSize; i++) {
            const node = instantiate(this._defaultBulletPrefab);
            this._bulletPool.put(node);
        }
    }

    /**
     * 创建弹幕（链式调用入口）
     */
    create(): BulletBuilder {
        return new BulletBuilder(this);
    }

    /**
     * 内部方法：实际创建弹幕
     */
    _createBullet(config: IBulletConfig, prefab?: Prefab): BulletComponent {
        let bulletNode: Node;

        // 优先从对象池获取
        if (this._bulletPool && this._bulletPool.size() > 0 && !prefab) {
            bulletNode = this._bulletPool.get();
        } else {
            // 从预制体实例化
            if (prefab || this._defaultBulletPrefab) {
                bulletNode = instantiate(prefab || this._defaultBulletPrefab);
            } else {
                // 如果没有预制体，创建空节点
                bulletNode = new Node("Bullet");
            }
        }

        // 添加到容器
        if (this._container) {
            this._container.addChild(bulletNode);
        }

        // 获取或添加组件
        let bulletComp = bulletNode.getComponent(BulletComponent);
        if (!bulletComp) {
            bulletComp = bulletNode.addComponent(BulletComponent);
        }

        // 初始化弹幕
        bulletComp.init(config);

        // 添加到活跃列表
        this._activeBullets.push(bulletComp);

        return bulletComp;
    }

    /**
     * 更新所有弹幕（每帧调用）
     */
    update(deltaTime: number): void {
        this._toRemove.length = 0;

        // 更新所有弹幕
        for (let i = 0; i < this._activeBullets.length; i++) {
            const bullet = this._activeBullets[i];

            if (!bullet || !bullet.isActive) {
                this._toRemove.push(i);
                continue;
            }

            bullet.updateBullet(deltaTime);
        }

        // 移除已销毁的弹幕
        for (let i = this._toRemove.length - 1; i >= 0; i--) {
            const index = this._toRemove[i];
            const bullet = this._activeBullets[index];

            if (bullet && bullet.node) {
                this._recycleBullet(bullet);
            }

            this._activeBullets.splice(index, 1);
        }
    }

    /**
     * 回收弹幕到对象池
     */
    private _recycleBullet(bullet: BulletComponent): void {
        // 重置弹幕状态
        bullet.reset();

        // 从父节点移除
        if (bullet.node.parent) {
            bullet.node.removeFromParent();
        }

        // 放入对象池
        if (this._bulletPool) {
            this._bulletPool.put(bullet.node);
        } else {
            // 如果没有对象池，直接销毁
            bullet.node.destroy();
        }
    }

    /**
     * 清空所有弹幕
     */
    clear(): void {
        for (const bullet of this._activeBullets) {
            if (bullet && bullet.node) {
                this._recycleBullet(bullet);
            }
        }
        this._activeBullets = [];
    }

    /**
     * 获取活跃弹幕数量
     */
    get bulletCount(): number {
        return this._activeBullets.length;
    }

    /**
     * 获取对象池信息
     */
    get poolInfo(): { size: number; active: number } {
        return {
            size: this._bulletPool ? this._bulletPool.size() : 0,
            active: this._activeBullets.length
        };
    }

    /**
     * 从 JSON 资源加载弹幕模式
     */
    loadPatternFromJSON(jsonAsset: JsonAsset): BulletPattern | null {
        const config = PatternParser.parseJSON(jsonAsset);
        if (!config) {
            return null;
        }
        return new BulletPattern(config, this);
    }

    /**
     * 从 XML 资源加载弹幕模式
     */
    loadPatternFromXML(textAsset: TextAsset): BulletPattern | null {
        const config = PatternParser.parseXML(textAsset);
        if (!config) {
            return null;
        }
        return new BulletPattern(config, this);
    }

    /**
     * 从配置对象创建弹幕模式
     */
    createPattern(config: IPatternConfig): BulletPattern {
        return new BulletPattern(config, this);
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.clear();

        // 清空对象池
        if (this._bulletPool) {
            this._bulletPool.clear();
            this._bulletPool = null;
        }

        this._container = null;
        this._defaultBulletPrefab = null;
    }
}

/**
 * 弹幕构建器（支持链式调用）
 */
class BulletBuilder {
    private _manager: BulletManager;
    private _config: IBulletConfig = {};
    private _prefab: Prefab = null;

    constructor(manager: BulletManager) {
        this._manager = manager;
    }

    /**
     * 设置位置
     */
    at(x: number, y: number, z: number = 0): BulletBuilder {
        this._config.position = new Vec3(x, y, z);
        return this;
    }

    /**
     * 设置位置（Vec3）
     */
    position(pos: Vec3): BulletBuilder {
        this._config.position = pos.clone();
        return this;
    }

    /**
     * 设置方向（角度）
     */
    direction(degree: number): BulletBuilder {
        this._config.direction = degree;
        return this;
    }

    /**
     * 设置速度
     */
    speed(speed: number): BulletBuilder {
        this._config.speed = speed;
        return this;
    }

    /**
     * 设置精灵帧
     */
    sprite(spriteFrame: SpriteFrame): BulletBuilder {
        this._config.spriteFrame = spriteFrame;
        return this;
    }

    /**
     * 设置生命周期（帧数）
     */
    lifetime(frames: number): BulletBuilder {
        this._config.lifetime = frames;
        return this;
    }

    /**
     * 设置自定义数据
     */
    data(userData: any): BulletBuilder {
        this._config.userData = userData;
        return this;
    }

    /**
     * 设置预制体
     */
    prefab(prefab: Prefab): BulletBuilder {
        this._prefab = prefab;
        return this;
    }

    /**
     * 发射弹幕
     */
    fire(): BulletComponent {
        return this._manager._createBullet(this._config, this._prefab);
    }
}
