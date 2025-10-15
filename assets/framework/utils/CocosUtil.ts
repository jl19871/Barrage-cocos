import { isValid, Tween, Node, tween, v3, color, Vec2 } from "cc";

export default class CocosUtil {


    /**
    * 16进制颜色转换为cc.Color
    * @param hexColor 16进制颜色
    * @returns cc.Color
    */
    public static hex2color(hexColor: string) {
        const hex = hexColor.replace(/^#?/, '0x');
        const c = parseInt(hex);
        const r = c >> 16;
        const g = (65280 & c) >> 8;
        const b = 255 & c;
        return color(r, g, b, 255);
    };

    /**
     * 获取两点间的角度 2D
     * @param p1 点1
     * @param p2 点2
     */
    public static getAngle(p1: Vec2, p2: Vec2): number {
        return Math.atan((p2.y - p1.y) / (p2.x - p1.x));
    }

    /**
     * 获取两点间的距离 2D
     * @param p1 点1
     * @param p2 点2
     */
    public static getDistance(p1: Vec2, p2: Vec2): number {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }



    /**
     * 缩放动画
     * @param node 节点
     * @param run 是否运行
     * @param _scale 缩放比例
     * @param time 时间
     */
    public static tween_ScaleForever(node: Node, run: boolean = true, _scale: number = 1.1, time: number = 0.5) {
        if (isValid(node)) {
            Tween.stopAllByTarget(node);
            const originScale = node.scale;
            node.scale = originScale;
            if (run) {
                let scale = tween().to(time, { scale: v3(_scale * originScale.x, _scale * originScale.y, _scale * originScale.z) }).to(time, { scale: v3(originScale.x, originScale.y, originScale.z) });
                tween(node).then(scale).repeatForever().start();
            }
        }
    }

    /**
     * 水平翻转（卡片翻转）
     * @param node 节点
     * @param duration 总时长
     * @param onMiddle 中间状态回调
     * @param onComplete 完成回调
     */
    public static tween_Flip(node: Node, duration: number, onMiddle?: Function, onComplete?: Function): Promise<void> {
        return new Promise<void>(res => {
            const time = duration / 2,
                scaleX = node.scale.x,
                skewY = scaleX > 0 ? 20 : -20;
            tween(node)
                .parallel(
                    tween().to(time, { scaleX: 0 }, { easing: 'quadIn' }),
                    tween().to(time, { skewY: -skewY }, { easing: 'quadOut' }),
                )
                .call(() => {
                    onMiddle && onMiddle();
                })
                .parallel(
                    tween().to(time, { scaleX: -scaleX }, { easing: 'quadOut' }),
                    tween().to(time, { skewY: 0 }, { easing: 'quadIn' }),
                )
                .call(() => {
                    onComplete && onComplete();
                    res();
                })
                .start();
        });
    }
}