import { Camera, isValid, RenderTexture, Node, UITransform, Material, SpriteFrame, Sprite, director, color, find, view } from "cc";

export default class RenderUtil {
    /**
     * 获取节点的 RenderTexture (异步)
     * @param node 节点
     * @param out 输出
     */
    public static getRenderTexture(node: Node, out?: RenderTexture): Promise<RenderTexture | null> {
        return new Promise((resolve) => {
            // 检查参数
            if (!isValid(node)) {
                resolve(null);
                return;
            }

            // 检查节点是否有 UITransform 组件
            const uiTransform = node.getComponent(UITransform);
            if (!uiTransform) {
                console.error('RenderUtil: Node must have UITransform component');
                resolve(null);
                return;
            }

            if (!out || !(out instanceof RenderTexture)) {
                out = new RenderTexture();
            }
            // 获取宽高
            const width = Math.floor(uiTransform.width),
                height = Math.floor(uiTransform.height);
            // 初始化 RenderTexture
            out.reset({ width, height });
            // 创建临时摄像机用于渲染目标节点
            const cameraNode = new Node();
            cameraNode.setParent(node);
            const camera = cameraNode.addComponent(Camera);
            camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
            camera.clearColor = color(0, 0, 0, 0);
            camera.orthoHeight = height / 2 / (view.getVisibleSize().height / height);
            // 将节点渲染到 RenderTexture 中
            camera.targetTexture = out;

            // 等待下一帧渲染完成
            director.once('after-render', () => {
                // 销毁临时对象
                if (cameraNode && isValid(cameraNode)) {
                    cameraNode.destroy();
                }
                // 返回 RenderTexture
                resolve(out);
            });
        });
    }

    /**
     * 使用指定材质来将 RenderTexture 渲染到另一个 RenderTexture (异步)
     * @param srcRT 来源
     * @param dstRT 目标
     * @param material 材质
     */
    public static renderWithMaterial(srcRT: RenderTexture, dstRT: RenderTexture | Material, material?: Material): Promise<RenderTexture | null> {
        return new Promise((resolve) => {
            // 检查参数
            if (dstRT instanceof Material) {
                material = dstRT;
                dstRT = new RenderTexture();
            }
            // 创建临时节点（用于渲染 RenderTexture）
            const tempNode = new Node();
            let canvas = find("Canvas");
            if (!canvas) {
                resolve(null);
                return;
            }
            tempNode.setParent(canvas);
            const tempSprite = tempNode.addComponent(Sprite);
            tempSprite.sizeMode = Sprite.SizeMode.RAW;
            tempSprite.trim = false;
            let spriteFrame = new SpriteFrame();
            spriteFrame.texture = srcRT;
            tempSprite.spriteFrame = spriteFrame;

            // 获取图像宽高
            const width = srcRT.width,
                height = srcRT.height;
            // 初始化 RenderTexture
            (dstRT as RenderTexture).reset({ width, height });
            // 更新材质
            if (material instanceof Material) {
                tempSprite.customMaterial = material;
            }
            // 创建临时摄像机（用于渲染临时节点）
            const cameraNode = new Node();
            cameraNode.setParent(tempNode);
            const camera = cameraNode.addComponent(Camera);
            camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
            camera.clearColor = color(0, 0, 0, 0);
            camera.orthoHeight = height / 2 / (view.getVisibleSize().height / height);
            // 将临时节点渲染到 RenderTexture 中
            camera.targetTexture = dstRT as RenderTexture;

            // 等待下一帧渲染完成
            director.once('after-render', () => {
                // 销毁临时对象
                if (cameraNode && isValid(cameraNode)) {
                    cameraNode.destroy();
                }
                if (tempNode && isValid(tempNode)) {
                    tempNode.destroy();
                }
                // 返回 RenderTexture
                resolve(dstRT as RenderTexture);
            });
        });
    }

    /**
     * 获取像素数据 (异步)
     * @param node 节点
     * @param flipY 垂直翻转数据
     */
    public static getPixelsData(node: Node, flipY: boolean = true): Promise<Uint8Array | null> {
        return new Promise((resolve) => {
            if (!isValid(node)) {
                resolve(null);
                return;
            }

            // 检查节点是否有 UITransform 组件
            const uiTransform = node.getComponent(UITransform);
            if (!uiTransform) {
                console.error('RenderUtil:getPixelsData  Node must have UITransform component');
                resolve(null);
                return;
            }

            // 节点宽高
            const width = Math.floor(uiTransform.width),
                height = Math.floor(uiTransform.height);
            // 创建临时摄像机用于渲染目标节点
            const cameraNode = new Node();
            cameraNode.setParent(node);
            const camera = cameraNode.addComponent(Camera);
            camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
            camera.clearColor = color(0, 0, 0, 0);
            camera.orthoHeight = height / 2 / (view.getVisibleSize().height / height);
            // 将节点渲染到 RenderTexture 中
            const renderTexture = new RenderTexture();
            renderTexture.reset({ width, height });
            camera.targetTexture = renderTexture;

            // 等待下一帧渲染完成
            director.once('after-render', () => {
                try {
                    // 获取像素数据
                    const pixelsData = renderTexture.readPixels();

                    // 销毁临时对象
                    if (renderTexture && isValid(renderTexture)) {
                        renderTexture.destroy();
                    }
                    if (cameraNode && isValid(cameraNode)) {
                        cameraNode.destroy();
                    }

                    // 垂直翻转数据
                    if (flipY && pixelsData) {
                        const length = pixelsData.length,
                            lineWidth = width * 4,
                            data = new Uint8Array(length);
                        for (let i = 0, j = length - lineWidth; i < length; i += lineWidth, j -= lineWidth) {
                            for (let k = 0; k < lineWidth; k++) {
                                data[i + k] = pixelsData[j + k];
                            }
                        }
                        resolve(data);
                    } else {
                        resolve(pixelsData);
                    }
                } catch (error) {
                    console.error('RenderUtil: Failed to read pixels:', error);
                    // 清理资源
                    if (renderTexture && isValid(renderTexture)) {
                        renderTexture.destroy();
                    }
                    if (cameraNode && isValid(cameraNode)) {
                        cameraNode.destroy();
                    }
                    resolve(null);
                }
            });
        });
    }

    /**
     * 垂直翻转图像数据
     * @param array 数据
     * @param width 行宽
     */
    public static flipY(array: Uint8Array, width: number) {
        const length = array.length,
            flipped = new Uint8Array(length);
        for (let i = 0, j = length - width; i < length; i += width, j -= width) {
            for (let k = 0; k < width; k++) {
                flipped[i + k] = array[j + k];
            }
        }
        return flipped;
    }

}