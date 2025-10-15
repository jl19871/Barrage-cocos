import { JsonAsset, TextAsset } from "cc";
import { IPatternConfig, IPatternLibrary } from "./types/PatternTypes";

/**
 * 弹幕模式解析器
 * 支持从 JSON 和 XML 加载弹幕配置
 */
export class PatternParser {

    /**
     * 从 JSON 资源解析
     */
    static parseJSON(jsonAsset: JsonAsset): IPatternConfig | null {
        try {
            if (!jsonAsset || !jsonAsset.json) {
                console.error("[PatternParser] JSON 资源无效");
                return null;
            }

            const config = jsonAsset.json as IPatternConfig;
            return this._validateConfig(config) ? config : null;
        } catch (error) {
            console.error("[PatternParser] JSON 解析失败:", error);
            return null;
        }
    }

    /**
     * 从 JSON 文本解析
     */
    static parseJSONText(jsonText: string): IPatternConfig | null {
        try {
            const config = JSON.parse(jsonText) as IPatternConfig;
            return this._validateConfig(config) ? config : null;
        } catch (error) {
            console.error("[PatternParser] JSON 文本解析失败:", error);
            return null;
        }
    }

    /**
     * 从 XML 资源解析
     */
    static parseXML(textAsset: TextAsset): IPatternConfig | null {
        try {
            if (!textAsset || !textAsset.text) {
                console.error("[PatternParser] XML 资源无效");
                return null;
            }

            return this.parseXMLText(textAsset.text);
        } catch (error) {
            console.error("[PatternParser] XML 解析失败:", error);
            return null;
        }
    }

    /**
     * 从 XML 文本解析
     */
    static parseXMLText(xmlText: string): IPatternConfig | null {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const bulletmlNode = xmlDoc.getElementsByTagName("bulletml")[0];
            if (!bulletmlNode) {
                console.error("[PatternParser] 找不到 bulletml 根节点");
                return null;
            }

            const config: IPatternConfig = {
                name: bulletmlNode.getAttribute("name") || "unnamed",
                type: bulletmlNode.getAttribute("type") || "custom",
                actions: {},
                bullets: {}
            };

            // 解析 action 节点
            const actionNodes = bulletmlNode.getElementsByTagName("action");
            for (let i = 0; i < actionNodes.length; i++) {
                const actionNode = actionNodes[i];
                const label = actionNode.getAttribute("label");
                if (label) {
                    config.actions[label] = this._parseXMLActions(actionNode.childNodes);
                }
            }

            // 设置入口
            config.top = bulletmlNode.getAttribute("top") || "top";

            return this._validateConfig(config) ? config : null;
        } catch (error) {
            console.error("[PatternParser] XML 文本解析失败:", error);
            return null;
        }
    }

    /**
     * 解析 XML 动作列表
     */
    private static _parseXMLActions(nodes: NodeListOf<ChildNode>): any[] {
        const actions: any[] = [];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.nodeType !== 1) continue; // 跳过非元素节点

            const element = node as Element;
            const tagName = element.tagName.toLowerCase();

            switch (tagName) {
                case "fire":
                    actions.push(this._parseXMLFire(element));
                    break;
                case "wait":
                    actions.push({
                        type: "wait",
                        params: {
                            frames: parseInt(element.textContent || "0")
                        }
                    });
                    break;
                case "repeat":
                    const times = element.getElementsByTagName("times")[0];
                    actions.push({
                        type: "repeat",
                        params: {
                            times: parseInt(times?.textContent || "1"),
                            actions: this._parseXMLActions(element.childNodes)
                        }
                    });
                    break;
                case "changedirection":
                    actions.push(this._parseXMLChangeDirection(element));
                    break;
                case "changespeed":
                    actions.push(this._parseXMLChangeSpeed(element));
                    break;
            }
        }

        return actions;
    }

    /**
     * 解析 XML fire 节点
     */
    private static _parseXMLFire(element: Element): any {
        const directionNode = element.getElementsByTagName("direction")[0];
        const speedNode = element.getElementsByTagName("speed")[0];

        const action: any = {
            type: "fire",
            params: {}
        };

        if (directionNode) {
            action.params.direction = {
                value: parseFloat(directionNode.textContent || "0"),
                type: directionNode.getAttribute("type") || "absolute"
            };
        }

        if (speedNode) {
            action.params.speed = {
                value: parseFloat(speedNode.textContent || "0"),
                type: speedNode.getAttribute("type") || "absolute"
            };
        }

        return action;
    }

    /**
     * 解析 XML changeDirection 节点
     */
    private static _parseXMLChangeDirection(element: Element): any {
        const directionNode = element.getElementsByTagName("direction")[0];
        const termNode = element.getElementsByTagName("term")[0];

        return {
            type: "changeDirection",
            params: {
                direction: {
                    value: parseFloat(directionNode?.textContent || "0"),
                    type: directionNode?.getAttribute("type") || "absolute"
                },
                term: parseInt(termNode?.textContent || "1")
            }
        };
    }

    /**
     * 解析 XML changeSpeed 节点
     */
    private static _parseXMLChangeSpeed(element: Element): any {
        const speedNode = element.getElementsByTagName("speed")[0];
        const termNode = element.getElementsByTagName("term")[0];

        return {
            type: "changeSpeed",
            params: {
                speed: {
                    value: parseFloat(speedNode?.textContent || "0"),
                    type: speedNode?.getAttribute("type") || "absolute"
                },
                term: parseInt(termNode?.textContent || "1")
            }
        };
    }

    /**
     * 验证配置有效性
     */
    private static _validateConfig(config: IPatternConfig): boolean {
        if (!config.name) {
            console.error("[PatternParser] 配置缺少 name 字段");
            return false;
        }

        if (!config.top && !config.actions) {
            console.error("[PatternParser] 配置缺少 top 或 actions 字段");
            return false;
        }

        return true;
    }

    /**
     * 解析模式库（多个模式）
     */
    static parseLibrary(jsonAsset: JsonAsset): IPatternLibrary | null {
        try {
            if (!jsonAsset || !jsonAsset.json) {
                console.error("[PatternParser] JSON 资源无效");
                return null;
            }

            const library = jsonAsset.json as IPatternLibrary;

            if (!library.patterns || !Array.isArray(library.patterns)) {
                console.error("[PatternParser] 模式库格式无效");
                return null;
            }

            return library;
        } catch (error) {
            console.error("[PatternParser] 模式库解析失败:", error);
            return null;
        }
    }
}
