# Cocos Creator 弹幕库

基于 Cocos Creator 3.8 的高性能弹幕系统，支持 JSON/XML 配置文件。

## ✨ 特性

- ✅ **NodePool 对象池** - 自动管理弹幕节点复用
- ✅ **链式 API** - 流畅的弹幕创建体验
- ✅ **配置文件支持** - JSON/XML 格式的弹幕模式
- ✅ **丰富的运动控制** - 速度、方向、加速度、角速度
- ✅ **预设模式** - 圆形、螺旋、扇形等常见弹幕

## 📦 快速开始

### 1. 初始化管理器

```typescript
import { BulletManager } from "./manager/BulletManager";

// 获取单例
const bulletManager = BulletManager.getInstance();

// 初始化（容器节点、预制体、对象池大小）
bulletManager.init(containerNode, bulletPrefab, 50);
```

### 2. 手动发射弹幕（链式 API）

```typescript
// 发射单个弹幕
bulletManager
    .create()
    .at(0, 0)              // 位置
    .direction(90)         // 方向（角度）
    .speed(200)            // 速度（像素/秒）
    .sprite(spriteFrame)   // 精灵帧
    .lifetime(300)         // 生命周期（帧数）
    .fire();

// 发射圆形弹幕
for (let i = 0; i < 12; i++) {
    const angle = (360 / 12) * i;
    bulletManager.create()
        .at(0, 0)
        .direction(angle)
        .speed(150)
        .fire();
}
```

### 3. 从配置文件加载

```typescript
import { JsonAsset } from "cc";

// 从 JSON 加载
const pattern = bulletManager.loadPatternFromJSON(jsonAsset);

// 执行弹幕模式
pattern.setPosition(0, 0).execute();
```

### 4. 每帧更新

```typescript
update(deltaTime: number) {
    bulletManager.update(deltaTime);
}
```

## 📄 配置文件格式

### JSON 格式

#### 圆形弹幕示例

```json
{
  "name": "circle",
  "type": "circle",
  "top": "main",
  "actions": {
    "main": [
      {
        "type": "repeat",
        "params": {
          "times": 12,
          "actions": [
            {
              "type": "fire",
              "params": {
                "direction": {
                  "value": 0,
                  "type": "sequence"
                },
                "speed": {
                  "value": 150,
                  "type": "absolute"
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

#### 螺旋弹幕示例

```json
{
  "name": "spiral",
  "type": "spiral",
  "top": "main",
  "actions": {
    "main": [
      {
        "type": "repeat",
        "params": {
          "times": 36,
          "actions": [
            {
              "type": "fire",
              "params": {
                "direction": {
                  "value": 10,
                  "type": "sequence"
                },
                "speed": {
                  "value": 120,
                  "type": "absolute"
                }
              }
            },
            {
              "type": "wait",
              "params": {
                "frames": 3
              }
            }
          ]
        }
      }
    ]
  }
}
```

### XML 格式

```xml
<bulletml name="example" type="custom">
    <action label="top">
        <repeat>
            <times>10</times>
            <fire>
                <direction type="sequence">36</direction>
                <speed type="absolute">100</speed>
            </fire>
            <wait>5</wait>
        </repeat>
    </action>
</bulletml>
```

## 🎮 动作类型

### fire - 发射弹幕

```json
{
  "type": "fire",
  "params": {
    "direction": { "value": 90, "type": "absolute" },
    "speed": { "value": 150, "type": "absolute" }
  }
}
```

### wait - 等待

```json
{
  "type": "wait",
  "params": {
    "frames": 30
  }
}
```

### repeat - 重复

```json
{
  "type": "repeat",
  "params": {
    "times": 5,
    "actions": [...]
  }
}
```

### changeDirection - 改变方向

```json
{
  "type": "changeDirection",
  "params": {
    "direction": { "value": 180, "type": "absolute" },
    "term": 60
  }
}
```

### changeSpeed - 改变速度

```json
{
  "type": "changeSpeed",
  "params": {
    "speed": { "value": 200, "type": "absolute" },
    "term": 60
  }
}
```

## 📊 值类型

### absolute - 绝对值

直接使用指定的值

```json
{ "value": 90, "type": "absolute" }
```

### relative - 相对值

在基础值上增加

```json
{ "value": 10, "type": "relative" }
```

### sequence - 序列值

每次发射时累加

```json
{ "value": 30, "type": "sequence" }
```

## 🔧 API 文档

### BulletManager

#### 初始化

```typescript
init(container: Node, bulletPrefab?: Prefab, poolSize: number = 50): void
```

#### 创建弹幕

```typescript
create(): BulletBuilder
```

#### 加载配置

```typescript
loadPatternFromJSON(jsonAsset: JsonAsset): BulletPattern | null
loadPatternFromXML(textAsset: TextAsset): BulletPattern | null
createPattern(config: IPatternConfig): BulletPattern
```

#### 更新和清理

```typescript
update(deltaTime: number): void
clear(): void
destroy(): void
```

#### 获取信息

```typescript
get bulletCount(): number
get poolInfo(): { size: number; active: number }
```

### BulletBuilder（链式 API）

```typescript
at(x: number, y: number, z?: number): BulletBuilder
position(pos: Vec3): BulletBuilder
direction(degree: number): BulletBuilder
speed(speed: number): BulletBuilder
sprite(spriteFrame: SpriteFrame): BulletBuilder
lifetime(frames: number): BulletBuilder
data(userData: any): BulletBuilder
prefab(prefab: Prefab): BulletBuilder
fire(): BulletComponent
```

### BulletPattern

```typescript
setPosition(x: number, y: number, z?: number): this
execute(): Promise<void>
stop(): void
get isRunning(): boolean
get config(): IPatternConfig
```

### BulletComponent

```typescript
setSpeed(speed: number): void
setDirection(degree: number): void
setAcceleration(acceleration: number): void
setAngularVelocity(degreesPerSecond: number): void
kill(): void
get isActive(): boolean
get position(): Vec3
```

## 📁 目录结构

```
assets/games/barrage/
├── scripts/
│   ├── core/                    # 核心引擎
│   │   ├── types/              # 类型定义
│   │   │   ├── BulletTypes.ts  # 弹幕基础类型
│   │   │   └── PatternTypes.ts # 配置文件类型
│   │   ├── BulletPattern.ts    # 模式执行器
│   │   └── PatternParser.ts    # 配置解析器
│   ├── manager/                # 管理器
│   │   └── BulletManager.ts    # 弹幕管理器
│   ├── components/             # 组件
│   │   └── BulletComponent.ts  # 弹幕组件
│   ├── enums/                  # 枚举
│   │   └── BarrageEnums.ts     # 事件和模式枚举
│   └── BarrageTestScene.ts     # 测试场景
├── resources/
│   └── patterns/               # 配置文件
│       ├── circle.json         # 圆形
│       ├── spiral.json         # 螺旋
│       ├── fan.json            # 扇形
│       └── complex.json        # 复杂模式
└── README.md
```

## 🎯 性能优化

1. **对象池** - 自动复用节点，减少 GC 压力
2. **批量更新** - 统一更新所有弹幕，减少函数调用
3. **状态管理** - 高效的弹幕状态跟踪
4. **内存友好** - 避免频繁创建临时对象

## 📝 使用示例

查看 `BarrageTestScene.ts` 获取完整的使用示例。

## 🚀 下一步计划

- [ ] 四叉树空间分区（碰撞检测优化）
- [ ] 碰撞检测系统
- [ ] 可视化编辑器扩展
- [ ] Mesh 批渲染优化
- [ ] 更多预设弹幕模式

## 📄 许可证

MIT
