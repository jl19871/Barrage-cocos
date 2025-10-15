/*
 * @Author: JL
 * @Date: 2025-06-06 15:28:32
 */
import { color, Color, DynamicAtlasManager, find, Graphics, Label, Node, profiler, renderer, UITransform, warn } from "cc";

export default class DebugUtil {

    /**
     * 展示左下角的统计面板
     * @param status 状态
     */
    public static showStats(status: boolean = true): void {
        if (status) {
            profiler.showStats();
        }
        else {
            profiler.hideStats();
        }
    }

    /**
     * 更改统计面板的文本颜色
     * @param font 文本颜色
     */
    public static setStatsColor(fontColor: Color = Color.WHITE, backgroundColor: Color = color(0, 0, 0, 150)) {
        const profiler = find('PROFILER-NODE');
        if (!profiler) return warn('未找到统计面板节点！');

        // 文字
        profiler.children.forEach(node => {
            const label = node.getComponent(Label);
            if (label) {
                label.color = fontColor;
            }
        });

        // 背景
        let node = profiler.getChildByName('BACKGROUND');
        let transform = null;
        if (!node) {
            node = new Node('BACKGROUND');
            profiler.addChild(node);
            transform = node.addComponent(UITransform);
            transform.setContentSize(profiler.getComponent(UITransform)?.contentSize);
            node.setPosition(0, 0);
        }
        if (transform == null) {
            transform = node.getComponent(UITransform);
        }

        const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
        graphics.clear();
        graphics.rect(-5, 12.5, transform.width + 10, transform.height - 10);
        graphics.fillColor = backgroundColor;
        graphics.fill();
    }

    /**
     * 上一次渲染帧所提交的渲染批次总数
     */
    public static getDrawCalls(): number {
        return profiler.stats?.draws?.counter?.value || 0;
    }

    public static getFPS(): number {
        return profiler.stats?.fps?.counter?.value || 0;
    }

    public static getTextureMemory(): number {
        return profiler.stats?.textureMemory?.counter?.value || 0;
    }
}