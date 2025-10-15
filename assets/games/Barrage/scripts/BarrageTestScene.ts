import { _decorator, Component, Node, Prefab, SpriteFrame, Label, JsonAsset } from "cc";
import { BulletManager } from "./manager/BulletManager";
import { BulletPattern } from "./core/BulletPattern";

const { ccclass, property } = _decorator;

/**
 * 弹幕测试场景
 * 演示基础的弹幕发射功能
 */
@ccclass("BarrageTestScene")
export class BarrageTestScene extends Component {

    @property(Node)
    bulletContainer: Node = null;

    @property(Prefab)
    bulletPrefab: Prefab = null;

    @property(SpriteFrame)
    bulletSprite: SpriteFrame = null;

    @property(Label)
    infoLabel: Label = null;

    @property({ type: [JsonAsset], tooltip: "弹幕配置文件列表" })
    patternConfigs: JsonAsset[] = [];

    private _bulletManager: BulletManager = null;
    private _patterns: BulletPattern[] = [];
    private _currentPatternIndex: number = 0;

    onLoad() {
        // 初始化弹幕管理器
        this._bulletManager = BulletManager.getInstance();
        this._bulletManager.init(this.bulletContainer, this.bulletPrefab);

        // 加载弹幕配置
        this._loadPatterns();
    }

    start() {
        // 测试：发射一个简单的弹幕
        this.fireSingleBullet();

        // 定时发射配置文件中的弹幕模式
        this.schedule(this.firePatternBullets.bind(this), 2.0);
    }

    /**
     * 加载弹幕配置
     */
    private _loadPatterns(): void {
        for (const config of this.patternConfigs) {
            const pattern = this._bulletManager.loadPatternFromJSON(config);
            if (pattern) {
                this._patterns.push(pattern);
                console.log(`[BarrageTest] 已加载弹幕模式: ${pattern.config.name}`);
            }
        }
    }

    update(deltaTime: number) {
        // 更新所有弹幕
        this._bulletManager.update(deltaTime);

        // 更新信息显示
        if (this.infoLabel) {
            const poolInfo = this._bulletManager.poolInfo;
            this.infoLabel.string = `活跃弹幕: ${poolInfo.active} | 对象池: ${poolInfo.size}`;
        }
    }

    /**
     * 发射单个弹幕
     */
    fireSingleBullet() {
        this._bulletManager
            .create()
            .at(0, -200)           // 屏幕下方
            .direction(90)         // 向上
            .speed(200)            // 速度200像素/秒
            .sprite(this.bulletSprite)
            .lifetime(300)         // 5秒后消失(60fps * 5)
            .fire();
    }

    /**
     * 发射圆形弹幕
     */
    fireCircleBullets() {
        const bulletCount = 12; // 12个弹幕
        const centerX = 0;
        const centerY = 0;

        for (let i = 0; i < bulletCount; i++) {
            const angle = (360 / bulletCount) * i;

            this._bulletManager
                .create()
                .at(centerX, centerY)
                .direction(angle)
                .speed(150)
                .sprite(this.bulletSprite)
                .lifetime(300)
                .fire();
        }
    }

    /**
     * 发射配置文件中的弹幕模式
     */
    firePatternBullets() {
        if (this._patterns.length === 0) {
            console.warn("[BarrageTest] 没有加载任何弹幕模式");
            return;
        }

        // 轮流使用不同的弹幕模式
        const pattern = this._patterns[this._currentPatternIndex];
        this._currentPatternIndex = (this._currentPatternIndex + 1) % this._patterns.length;

        // 在中心位置执行弹幕模式
        pattern.setPosition(0, 0).execute();

        console.log(`[BarrageTest] 发射弹幕模式: ${pattern.config.name}`);
    }

    onDestroy() {
        if (this._bulletManager) {
            this._bulletManager.destroy();
        }
    }
}
