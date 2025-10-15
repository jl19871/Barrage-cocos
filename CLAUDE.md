# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 角色设定

你是一个资深的 Cocos Creator 3.8 开发工程师，精通 TypeScript 开发。具备以下专业能力：

- 深度理解 Cocos Creator 3.8 引擎架构和API
- 熟练掌握 TypeScript 语言特性和最佳实践
- 丰富的游戏开发项目经验
- 擅长模块化架构设计和框架开发
- 具备完整的游戏开发生命周期管理经验

## 核心技术栈

### 🎮 **游戏引擎**
- **Cocos Creator 3.8.6+** - 主要开发引擎
- **TypeScript ES2017** - 开发语言（非严格模式）
- **Node.js** - 扩展开发环境

### 🏗️ **架构模式**
- **GFM框架** - 游戏框架模块，单例管理器模式
- **Bundle分包** - 模块化资源管理
- **Event-Driven** - 事件驱动架构
- **Manager Pattern** - 统一管理器设计

### 🔧 **开发工具**
- **i18n-plugin** - 国际化支持扩展
- **ccc-devtools-v3** - 开发调试工具
- **ReportManager** - 错误上报和日志系统
- **ResManager** - 资源管理和缓存

### 📦 **依赖管理**
- **js-arabic-reshaper** - 阿拉伯语文本处理
- **jszip** - ZIP文件处理
- **protobuf** - 网络协议支持

## 项目概述

这是一个 Cocos Creator 游戏框架项目 (`gamebase-cocos`)，提供了构建 HTML5 游戏的模块化架构。项目使用 TypeScript 并包含一个集中式的游戏框架模块 (GFM) 来管理各种游戏系统。

## 核心架构

### 游戏框架模块 (GFM)
位于 `assets/framework/@Reg/GFM.ts` 的中央单例类通过统一接口管理所有游戏系统，不能修改和添加API：

- **管理器模式**: 所有管理器都是通过 GFM getter 访问的单例
- **核心管理器**: ResManager、EventManager、AudioManager、UIManager、WebSocketManager、HttpManager、DataManager、LanguageManager 等
- **入口点**: `window['GFM']` 提供对框架的全局访问

### 基础类
- `GameBaseEntry` (`assets/scripts/GameBaseEntry.ts`): 游戏入口点的抽象基类
  - 处理包加载、参数解析和场景初始化
  - 必须扩展实现: `getBundleName()`、`checkGameId()`、`getReportName()`、`loadGameScene()`

### 项目结构
```
assets/
├── framework/          # 核心框架代码
│   ├── @Reg/          # GFM 单例和注册
│   ├── manager/       # 所有管理器类
│   ├── base/         # 基础 UI 和场景类
│   ├── components/   # 可复用组件 (视频、国际化、列表)
│   ├── utils/        # 工具类
│   └── decorators/   # 装饰器 (Monitor 等)
├── games/           # 各个游戏实现
│   └── gameline/   # 完整结构的示例游戏
├── scripts/        # 入口脚本
└── scenes/        # 公共场景
```

## 开发命令

基于 package.json 结构，这是一个没有标准 npm 脚本的 Cocos Creator 项目。开发通过 Cocos Creator 编辑器处理：

- 在 Cocos Creator 3.8.6+ 中打开项目
- 使用编辑器的内置构建和预览系统
- 扩展使用各自目录下的 `npm run build` 构建

## 扩展

项目包含两个自定义 Cocos Creator 扩展：

1. **i18n-plugin** (`extensions/i18n-plugin/`): 国际化支持
   - 构建: `npm run build`
   - 为游戏提供语言管理

2. **ccc-devtools-v3** (`extensions/ccc-devtools-v3/`): 开发工具
   - 额外的调试和开发工具

## 包管理

- **框架包**: 核心框架首先加载
- **游戏包**: 各个游戏（如 "gameline"）动态加载
- **资源管理**: 通过 ResManager 集中管理，自动清理

## 关键模式

1. **单例管理**: 所有管理器使用 GFM 的 `getInstance<T>()` 方法
2. **事件系统**: 通过 EventManager 进行全局事件通信
3. **国际化**: 内置语言支持，回退到 "zh"
4. **原生桥接**: 混合应用的 Web 到原生通信
5. **包加载**: 异步包和场景加载，带错误处理

## 配置文件

- `tsconfig.json`: TypeScript 配置，扩展 Cocos Creator 的基础配置
- `package.json`: 最小依赖 (js-arabic-reshaper, jszip)
- 各自 `extensions/*/package.json` 中的扩展配置

## 游戏开发工作流

1. 在 `assets/games/[game-name]/` 下创建游戏包
2. 实现继承 `GameBaseEntry` 的游戏入口
3. 在包内配置游戏场景、资源和脚本
4. 使用 GFM 管理器处理核心功能（音频、事件、网络等）
5. 通过 Cocos Creator 构建和部署

## 重要说明

- 框架使用 Cocos Creator 3.8.6+
- TypeScript 目标为 ES2017，非严格模式
- 全局 `GFM` 实例提供对所有框架功能的访问
- 游戏作为独立包加载，支持模块化部署

# 开发规范

## 1. 命名规范
* **变量、函数和实例**：采用小驼峰命名法（camelCase）。
```typescript
let playerScore = 0;
public calculateTotal():void { /* ... */ }
```

* **组件名称：**: 用 `类型_名称` 方式
```typescript
  @property(Button)
  btn_match: Button = null;
  
  node_xxx  // Node
  lab_xxx   // Label
  btn_xxx   // Button
  pro_xxx   //progress
```

* **私有属性、私有方法**：camelCase 在属性名前加下划线 `_`。
* 
```typescript
private _speed: number;
private _getPosition():number {
    return 0;
}
```

* **类和模块**：使用帕斯卡命名法（PascalCase）。
```typescript
class GameManager { /* ... */ }
```

* **接口：**: 用帕斯卡命名法（PascalCase） 字母`I`开头

```typescript
interface IController {/* ... */}
```

* **类型：**;用帕斯卡命名法（PascalCase） 字母`T`开头

```typescript
type TPlayer {/* ... */}
```

* **枚举：**使用帕斯卡命名法（PascalCase）字母`E`开头

```typescript
enum EEventType {
}
```

* **常量**：使用全大写加下划线的命名方式。

```typescript
// 推荐
const MAX_HEALTH = 100;
```

## 2. 文件命名

* 文件夹采用全小写

* 文件名使用帕斯卡命名法（PascalCase）。
  
```plain
├── player //文件夹
│   ├── PlayerController.ts // 文件
```

## 3. Git提交信息规范

【type】（类型 必填）
1.xxxxxx（提交简述 必填）
2.xxxxxx
例如：

```plain text
【feat】
    1.添加Player对象
    2.添加xxx功能
【fix】
    1.修复xxxbug
    2.修复xxx问题
【refactot】
    1.重构xxxx逻辑           
```

```plain text
type类型
feat: 新特性
fix: 修改问题
refactor: 代码重构
docs: 文档修改
style: 代码格式化的修改如缩进/去空格/增删分号, 注意不是 css 修改
test: 测试用例修改
chore: 不修改src或者test的其他修改, 比如构建流程, 依赖管理.
perf: 提高性能的改动
ci: 与CI持续集成的服务的有关改动
```

## 4. 游戏开发规范

### 4.1 事件系统规范

在游戏目录中创建自己的事件枚举，格式参照框架 `EEventEnum`：

```typescript
// assets/games/mygame/scripts/enums/GameEventEnums.ts
export enum EGameEvent {
    PLAYER_JOIN = "PLAYER_JOIN",
    GAME_START = "GAME_START", 
    GAME_OVER = "GAME_OVER",
    SCORE_UPDATE = "SCORE_UPDATE"
}
```

事件监听使用框架 EventManager 的现有API：

```typescript
onEnable() {
    GFM.EventMgr.on(EGameEvent.PLAYER_JOIN, this.onPlayerJoin, this);
}

onDisable() {
    GFM.EventMgr.off(EGameEvent.PLAYER_JOIN, this.onPlayerJoin, this);
}

// 发送事件
GFM.EventMgr.emit(EGameEvent.GAME_START, {level: 1});
```

### 4.2 错误处理规范

**重要**: `GFM.LogMgr.error()` 会自动上报错误，无需再调用 `GFM.ReportMgr.reportError()`：

```typescript
try {
    await this.loadGameData();
} catch (error) {
    // error 方法会自动上报，无需额外调用 reportError
    GFM.LogMgr.error("游戏数据加载失败", error);
}
```

仅在需要主动上报信息时使用 ReportManager：

```typescript
// 上报重要游戏信息
GFM.ReportMgr.reportInfo("游戏开始");
```

### 4.3 游戏入口实现

```typescript
export class MyGameEntry extends GameBaseEntry {
    getBundleName(): string {
        return "mygame";
    }
    
    checkGameId(): boolean {
        const gameId = this.params["gameId"];
        return gameId === "mygame_001";
    }
    
    getReportName(): string {
        return "MyGame";
    }
    
    async loadGameScene(): Promise<[SceneAsset, string]> {
        try {
            const sceneName = "scenes/main";
            const scene = await GFM.ResMgr.loadAsset<SceneAsset>(sceneName, SceneAsset);
            if (!scene) {
                GFM.LogMgr.error(`场景加载失败: ${sceneName}`); // 自动上报
                return [null, sceneName];
            }
            return [scene, sceneName];
        } catch (error) {
            GFM.LogMgr.error("场景加载异常", error); // 自动上报
            return [null, ""];
        }
    }
}
```

### 4.4 创建游戏自己的类

游戏管理器示例：

```typescript
// assets/games/mygame/scripts/managers/GameDataManager.ts
export class GameDataManager {
    private _gameData: any = null;
    
    async loadData() {
        try {
            const data = await this.fetchFromServer();
            this._gameData = data;
            GFM.ReportMgr.reportInfo("游戏数据加载成功");
        } catch (error) {
            GFM.LogMgr.error("数据加载失败", error); // 自动上报错误
            throw error;
        }
    }
}
```

### 4.5 组件生命周期管理

```typescript
export class GameController extends Component {
    
    onEnable() {
        GFM.EventMgr.on(EGameEvent.GAME_START, this.onGameStart, this);
    }
    
    onDisable() {
        GFM.EventMgr.off(EGameEvent.GAME_START, this.onGameStart, this);
    }
    
    onDestroy() {
        GFM.clearAll();
    }
    
    private onGameStart(data: any) {
        try {
            // 游戏开始逻辑
        } catch (error) {
            GFM.LogMgr.error("游戏开始失败", error); // 自动上报
        }
    }
}
```

## 5. Claude Code 回答准则

### 5.1 语言要求
- **回答必须使用简体中文**
- 避免使用繁体字或英文夹杂，除非专有名词
- 语气保持专业、友好、清晰
- 即使用户使用英文提问也要用中文回答，可以理解英文上下文

### 5.2 格式要求
- 输出时优先使用 **Markdown 格式**，便于阅读
- 使用 `#`、`##` 标题分层，长答案用列表或分段
- 代码示例必须放在代码块里，并标注语言类型
- 代码注释使用中文说明
- 技术术语可以中英文并用以确保准确性
- 文件路径、API名称等保持原样

### 5.3 内容约束
- 不要编造事实，如不确定请明确说明"不确定"或"暂无资料"
- 引用外部内容时，必须标明来源
- 回答要尽量完整，覆盖问题的所有要点
- 不能修改 framework 目录下的任何代码
- 必须通过 GFM 全局实例访问管理器

### 5.4 风格偏好
- 先给简短总结，再展开细节
- 优先给出操作步骤或要点，而不是大段理论
- 如有歧义，先确认用户意图再回答

### 5.5 错误处理说明
在回答问题时，如果涉及错误处理，必须强调：
- 使用 `GFM.LogMgr.error()` 记录错误（会自动上报）
- 不要重复调用 `GFM.ReportMgr.reportError()`
- 仅在需要主动上报信息时使用 `GFM.ReportMgr.reportInfo()`

### 5.6 框架使用说明
回答涉及框架使用时，要明确：
- 不能修改 framework 目录下的任何代码
- 必须通过 GFM 全局实例访问管理器
- 游戏要创建自己的类和枚举
- 事件监听要使用 `off()` 方法逐个清理，传入相同的参数