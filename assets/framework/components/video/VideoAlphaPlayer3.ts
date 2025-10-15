/*
 * @Author: JL
 * @Date: 2025-01-12 20:00:00
 * VideoAlphaPlayer3 - 基于VideoAlphaPlayer的缓存版本
 */

import { _decorator, Component, Enum, game, gfx, ImageAsset, Material, Node, Rect, Sprite, SpriteFrame, sys, Texture2D, UITransform, v2, Vec2, VideoClip, VideoPlayer } from 'cc';
import ZipLoader from '../../core/remote/ZipLoader';
const { ccclass, property, requireComponent } = _decorator;

export enum EEventType {
    PREPARING = 1,
    LOADED = 2,
    READY = 3,
    COMPLETED = 4,
    ERROR = 5,
    PLAYING = 6,
    PAUSED = 7,
    STOPPED = 8,
    BUFFER_START = 9,
    BUFFER_UPDATE = 10,
    BUFFER_END = 11
};

enum EVideoState {
    ERROR = -1,
    IDLE = 0,
    PREPARING = 1,
    PREPARED = 2,
    PLAYING = 3,
    PAUSED = 4,
    COMPLETED = 5
};

enum EReadyState {
    HAVE_NOTHING = 0,
    HAVE_METADATA = 1,
    HAVE_CURRENT_DATA = 2,
    HAVE_FUTURE_DATA = 3,
    HAVE_ENOUGH_DATA = 4
};

export enum EResourceType {
    LOCAL = 1,
    REMOTE = 2
}

interface WebGLContext {
    isWebGL2: boolean;
    context: WebGLRenderingContext | WebGL2RenderingContext;
}

// 视频帧序列缓存 - 缓存完整的shader处理后帧序列
interface VideoFrame {
    texture: Texture2D;
    timestamp: number;
}

class VideoFrameSequenceCache {
    private static cache = new Map<string, VideoFrame[]>();
    private static memoryUsage = 0;
    private static readonly MEMORY_LIMIT = 200 * 1024 * 1024; // 200MB

    static get(url: string): VideoFrame[] | null {
        const normalizedUrl = this.normalizeUrl(url);
        const frameSequence = this.cache.get(normalizedUrl);
        if (frameSequence && frameSequence.length > 0) {
            console.log(`VideoFrameSequenceCache: 命中缓存 ${normalizedUrl}, 共${frameSequence.length}帧`);
            return frameSequence;
        }
        return null;
    }

    private static normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin + urlObj.pathname;
        } catch {
            return url;
        }
    }

    static set(url: string, frameSequence: VideoFrame[]): void {
        const normalizedUrl = this.normalizeUrl(url);

        // 如果已经存在相同URL的缓存，不重复添加
        if (this.cache.has(normalizedUrl)) {
            console.log(`VideoFrameSequenceCache: URL ${normalizedUrl} 已存在缓存，跳过`);
            return;
        }

        // 计算帧序列的内存使用
        let sequenceMemory = 0;
        for (const frame of frameSequence) {
            const texture = frame.texture;
            sequenceMemory += texture ? texture.width * texture.height * 4 : 0; // RGBA
        }

        if (this.memoryUsage + sequenceMemory > this.MEMORY_LIMIT) {
            console.log(`VideoFrameSequenceCache: 内存超限，清理旧缓存`);
            this.clear();
        }

        // 缓存完整的帧序列
        this.cache.set(normalizedUrl, frameSequence);
        this.memoryUsage += sequenceMemory;
        console.log(`VideoFrameSequenceCache: 缓存帧序列 ${normalizedUrl}, ${frameSequence.length}帧 (${(sequenceMemory / 1024 / 1024).toFixed(1)}MB)`);
        console.log(`VideoFrameSequenceCache: 总使用 ${(this.memoryUsage / 1024 / 1024).toFixed(1)}MB/${(this.MEMORY_LIMIT / 1024 / 1024).toFixed(1)}MB`);
    }

    static clear(): void {
        let cleanedMemory = 0;
        for (const [url, frameSequence] of this.cache.entries()) {
            for (const frame of frameSequence) {
                const texture = frame.texture;
                const textureMemory = texture ? texture.width * texture.height * 4 : 0;
                cleanedMemory += textureMemory;
                frame.texture?.destroy();
            }
        }
        this.cache.clear();
        this.memoryUsage = 0;
        console.log(`VideoFrameSequenceCache: 清理所有缓存 (释放${(cleanedMemory / 1024 / 1024).toFixed(1)}MB)`);
    }

    static remove(url: string): boolean {
        const normalizedUrl = this.normalizeUrl(url);
        const frameSequence = this.cache.get(normalizedUrl);
        if (frameSequence) {
            let releasedMemory = 0;
            for (const frame of frameSequence) {
                const texture = frame.texture;
                const textureMemory = texture ? texture.width * texture.height * 4 : 0;
                releasedMemory += textureMemory;
                frame.texture?.destroy();
            }
            this.cache.delete(normalizedUrl);
            this.memoryUsage -= releasedMemory;
            console.log(`VideoFrameSequenceCache: 移除缓存 ${normalizedUrl} (释放${(releasedMemory / 1024 / 1024).toFixed(1)}MB)`);
            return true;
        }
        return false;
    }

    static getMemoryInfo(): { used: number; limit: number; count: number; totalFrames: number } {
        let totalFrames = 0;
        for (const frameSequence of this.cache.values()) {
            totalFrames += frameSequence.length;
        }
        return {
            used: this.memoryUsage,
            limit: this.MEMORY_LIMIT,
            count: this.cache.size,
            totalFrames: totalFrames
        };
    }
}

/**
 * 带alpha通道的视频渲染组件 
 * 支持WebGL 1.0 和 WebGL 2.0
 */
@ccclass('VideoAlphaPlayer3')
@requireComponent(UITransform)
export class VideoAlphaPlayer3 extends Component {
    @property({ tooltip: '是否显示video组件' })
    showVideo: Boolean = true;

    @property({ type: Enum(EResourceType) })
    resourceType: EResourceType = EResourceType.LOCAL;
    @property(
        {
            type: VideoClip,
            tooltip: '视频资源',
            visible() { return this.resourceType == EResourceType.LOCAL }
        })
    private _videoClip: VideoClip = null;
    get videoClip(): VideoClip {
        return this._videoClip;
    }
    set videoClip(value: VideoClip) {
        this._videoClip = value;
        if (this.resourceType != EResourceType.LOCAL) {
            GFM.LogMgr.warn('VideoAlphaPlayer3: videoClip is only valid when resourceType is EResourceType.LOCAL');
        }
        this._updateVideoSource();
    }

    @property(
        {
            tooltip: '资源地址',
            visible() { return this.resourceType == EResourceType.REMOTE }
        })
    private _url: string = "";
    private _realUrl: string = "";
    get url(): string {
        return this._url;
    }
    set url(value: string) {
        this._url = value;
        if (this.resourceType != EResourceType.REMOTE) {
            GFM.LogMgr.warn('VideoAlphaPlayer3: url is only valid when resourceType is EResourceType.REMOTE');
        }

        if (this._url.endsWith('.zip')) {
            this.excuteZipFile();
        }
        else if (this._url.endsWith('.mp4') || this._url.endsWith('.webm')) {
            this._realUrl = value;
            this._updateVideoSource();
        }
        else {
            GFM.LogMgr.error('VideoAlphaPlayer3', 'url', 'Invalid video url, must be .mp4 or .webm or .zip');
        }
    }

    @property({ tooltip: '加载完成后自动播放？' })
    playOnWake: Boolean = true;
    @property({ tooltip: '是否横向布局' })
    isHorizontal: Boolean = true;
    @property({ tooltip: '是否循环播放' })
    loop: boolean = true;
    @property({ type: Material })
    tempSpriteMaterial: Material = null;

    private spriteMaterial: Material = null;

    // 缓存配置
    @property({ tooltip: '启用纹理缓存（避免重复解码）' })
    enableTextureCache: boolean = true;

    private _outputSprite: Sprite = null;

    private _video: HTMLVideoElement = null;
    private _texture: Texture2D = null; //视频纹理
    private _time: number = 0;
    private _currentVideoState: EVideoState = EVideoState.IDLE; //当前视频状态
    private _loaded: boolean = false; //是否加载完成

    // WebGL上下文信息
    private _webglContext: WebGLContext = null;

    // 缓存相关
    private _currentUrl: string = '';
    private _isRecordingFrames: boolean = false; // 是否正在记录帧
    private _recordedFrames: VideoFrame[] = []; // 记录的帧序列

    // 序列帧播放相关
    private _isPlayingSequence: boolean = false; // 是否在播放序列帧
    private _currentFrameIndex: number = 0; // 当前播放的帧索引
    private _cachedFrameSequence: VideoFrame[] = null; // 缓存的帧序列

    // WebGL2专用canvas复用（避免频繁创建）
    private _webgl2Canvas: HTMLCanvasElement = null;
    private _webgl2Context: CanvasRenderingContext2D = null;

    protected onLoad(): void {
        if (this.tempSpriteMaterial) {
            this.spriteMaterial = new Material();
            // 克隆一个新的材质实例
            this.spriteMaterial.copy(this.tempSpriteMaterial);
        }

        this._outputSprite = this.node.addComponent(Sprite);
        this._outputSprite.type = Sprite.Type.SIMPLE;
        this._outputSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._outputSprite.trim = true;

        this._texture = new Texture2D();
        this._initWebGLContext();
    }

    protected onDestroy(): void {
        if (this._video && sys.isBrowser) {
            this._video.pause();
            if (this._video.src.startsWith('blob:')) {
                URL.revokeObjectURL(this._video.src);
            }
            this._video.src = "";
            this._video.load();
            // 移除DOM中的video元素（无论showVideo值如何都需要移除）
            if (this._video.parentNode) {
                this._video.parentNode.removeChild(this._video);
            }
            this._video = null;
        }

        // 销毁纹理资源
        if (this._texture) {
            this._texture.destroy();
            this._texture = null;
        }

        if (this._outputSprite && this._outputSprite.spriteFrame) {
            this._outputSprite.spriteFrame.destroy();
            this._outputSprite.spriteFrame = null;
        }

        if (this.spriteMaterial) {
            this.spriteMaterial.destroy();
            this.spriteMaterial = null;
        }

        // 清理WebGL2复用的canvas
        this._cleanupWebGL2Canvas();
    }

    protected start(): void {
        console.log('VideoAlphaPlayer3: start() 被调用');
        console.log(`缓存配置: ${this.enableTextureCache}`);

        // 懒加载优化：推迟video元素创建，优先检查缓存
        if (this.playOnWake) {
            this._updateVideoSource();
        }
    }

    onEnable(): void {
        if (this._loaded && this._currentVideoState == EVideoState.PLAYING) {
            // 缓存模式或video模式都通过统一的play方法处理
            this.play();
        }
    }

    update(deltaTime: number) {
        this._time += deltaTime;
        if (this._time < 0.032 || !this._loaded) {
            return;
        } else {
            this._time = 0;
        }

        // 处理序列帧播放
        if (this._isPlayingSequence && this._currentVideoState === EVideoState.PLAYING) {
            this._updateSequenceFrame();
            return;
        }

        // 常规video播放
        if (this._video) {
            this._updateTexture();

            // 如果正在记录帧，记录当前帧
            if (this._isRecordingFrames) {
                this._recordCurrentFrame();
            }

            // 解决循环卡帧
            if (this.loop && this._video.currentTime > this._video.duration - 0.15) {
                this._onCompleted();
            }
        }
    }

    //#region WebGL上下文管理
    private _initWebGLContext(): void {
        const canvas = game.canvas;
        if (!canvas) {
            console.error('VideoAlphaPlayer3: Canvas not found');
            return;
        }

        // 尝试获取WebGL2上下文
        let context = canvas.getContext('webgl2') as WebGL2RenderingContext;
        if (context) {
            this._webglContext = {
                isWebGL2: true,
                context: context
            };
            console.log('VideoAlphaPlayer3: Using WebGL2');
            this._logWebGL2Capabilities(context);
        } else {
            // 回退到WebGL1
            //@ts-ignore
            context = canvas.getContext('webgl') as WebGLRenderingContext;
            if (context) {
                this._webglContext = {
                    isWebGL2: false,
                    context: context
                };
                console.log('VideoAlphaPlayer3: Using WebGL1');
            } else {
                console.error('VideoAlphaPlayer3: WebGL not supported');
            }
        }
    }

    private _logWebGL2Capabilities(context: WebGL2RenderingContext): void {
        if (!context) return;

        try {
            const renderer = context.getParameter(context.RENDERER);
            const version = context.getParameter(context.VERSION);
            const shadingLanguageVersion = context.getParameter(context.SHADING_LANGUAGE_VERSION);

            console.log('VideoAlphaPlayer3 WebGL2 Info:', {
                renderer,
                version,
                shadingLanguageVersion,
                maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
                maxViewportDims: context.getParameter(context.MAX_VIEWPORT_DIMS)
            });
        } catch (error) {
            console.warn('VideoAlphaPlayer3: Failed to get WebGL2 capabilities:', error);
        }
    }
    //#endregion


    //#region 初始化浏览器视频组件，并注册事件
    // 初始化浏览器视频组件，并注册事件
    private _initBrowser(): void {

        console.error('VideoAlphaPlayer3: 初始化浏览器视频组件');


        // 检查浏览器环境
        if (!sys.isBrowser) {
            console.warn('VideoAlphaPlayer3: 非浏览器环境，无法创建video元素');
            return;
        }

        // 创建video元素
        this._video = document.createElement('video');
        if (!this._video) {
            console.error('VideoAlphaPlayer3: 无法创建video元素');
            return;
        }

        if (!this.showVideo) {
            // 隐藏但仍然添加到DOM（移动端WebView需要）
            this._video.style.position = 'absolute';
            this._video.style.left = '-9999px';
            this._video.style.top = '-9999px';
            this._video.style.opacity = '0';
            this._video.style.pointerEvents = 'none';
            this._video.style.zIndex = '-1';
            this._video.style.display = 'block';
            this._video.style.width = '1px';     // 最小尺寸
            this._video.style.height = '1px';
        }
        else {
            // TEST 测试 - 显示video元素
            this._video.style.position = 'fixed';
            this._video.style.left = '50%';
            this._video.style.top = '25%';
            this._video.style.transform = 'translate(-50%, -50%)';
            this._video.style.opacity = '1';
            this._video.style.pointerEvents = 'auto';
            this._video.style.zIndex = '9999';
            this._video.style.display = 'block';
            this._video.style.width = '640px';
            this._video.style.height = '360px';
            this._video.controls = true;
        }

        document.body.appendChild(this._video);

        this._video.setAttribute("x5-video-player-type", "true"); // 设置属性以支持横屏
        this._video.setAttribute("playsinline", "true"); // 设置属性以支持横屏
        this._video.crossOrigin = 'anonymous'; // 设置跨域属性
        this._video.autoplay = false; // 不自动播放
        this._video.loop = false;
        this._video.muted = true; // 静音

        this._video.poster = "https://hub.playlinkcn.com/Test/web/games/game/rich/1pixel.png";

        this._loaded = false;

        this._video.addEventListener('loadstart', () => this._onLoadstart());
        this._video.addEventListener('progress', () => this._onProgress());
        this._video.addEventListener('stalled', () => this._onLoadError());
        this._video.addEventListener('abort', () => this._onLoadError());

        this._video.addEventListener('loadedmetadata', () => this._onMetaLoaded());
        this._video.addEventListener('ended', () => this._onCompleted());
        this._video.addEventListener('canplay', () => this._onCanPlay());
        this._video.addEventListener('canplaythrough', () => this._onCanPlay());
        this._video.addEventListener('suspend', () => this._onCanPlay());
    }

    private _onLoadstart(): void {
        console.log('VideoAlphaPlayer3: 视频加载开始');
    }

    private _onProgress(): void {
        let video = this._video;
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration;
            console.log(`VideoAlphaPlayer3: 已缓冲 ${(bufferedEnd / duration) * 100}%`);
        }
    }

    private _onLoadError(): void {
        console.log('VideoAlphaPlayer3: 视频加载异常');
        this._currentVideoState = EVideoState.ERROR;
    }

    private _onMetaLoaded(): void {
        this.node.emit('loaded', this);
        let width = this.isHorizontal ? this._video.videoWidth / 2 : this._video.videoWidth;
        let height = this.isHorizontal ? this._video.videoHeight : this._video.videoHeight / 2;
        console.log(`VideoAlphaPlayer3: 视频分辨率：${width}x${height}`);
    }

    private _onCompleted(): void {
        // 播放完成时缓存帧序列并切换模式
        if (this.enableTextureCache && this._isRecordingFrames && this._recordedFrames.length > 0 && this._currentUrl) {
            console.log(`视频播放完成，缓存帧序列 (${this._recordedFrames.length}帧)`);
            VideoFrameSequenceCache.set(this._currentUrl, this._recordedFrames);
            this._isRecordingFrames = false;

            // 关键步骤：清理video元素，切换到序列帧模式
            console.log('清理video元素，切换到序列帧播放模式');
            this._cleanupVideoElement();
            this._switchToSequenceMode(this._recordedFrames);
        }

        if (this.loop) {
            if (this._isPlayingSequence) {
                // 序列帧循环播放已在 _updateSequenceFrame 中处理
                console.log('序列帧循环播放继续');
            } else if (this._currentVideoState == EVideoState.PLAYING && this._video) {
                // 传统video循环播放（仅在未切换到序列帧模式时）
                console.log('video循环播放：重新开始');
                this._video.currentTime = 0;
                this._video.play();
            }
        } else {
            // 非循环播放：播放完成
            this._currentVideoState = EVideoState.COMPLETED;
            console.log('播放完成');
            this.node.emit('completed', this);
        }
    }

    private _onCanPlay(): void {
        if (this._loaded || this._currentVideoState == EVideoState.PLAYING)
            return;
        if (this._video.readyState === EReadyState.HAVE_ENOUGH_DATA ||
            this._video.readyState === EReadyState.HAVE_METADATA) {

            this._onReadyToPlay();
        }
    }

    private _onReadyToPlay(): void {
        this._video.currentTime = 0;
        this._loaded = true;

        this._currentVideoState = EVideoState.PREPARED;

        this._clearTexture();
        this._updateSprite();
        this._updateTexture();

        // TEST 测试
        if (this.playOnWake) {
            this.play();
        }
    }
    //#endregion

    //#region 纹理处理
    // ============================ 纹理处理 ===============================
    private _updateSprite() {
        if (this._outputSprite)
            this.scheduleOnce(() => {

                this._outputSprite.customMaterial = null;
                let sf = this._outputSprite.spriteFrame;
                if (!sf) {
                    sf = new SpriteFrame();
                    this._outputSprite.spriteFrame = sf;
                }

                sf.texture = this._texture;

                const sourceWidth = this._texture.width;
                const sourceHeight = this._texture.height;

                // 计算alpha通道分离后的实际视频尺寸
                let videoWidth: number;
                let videoHeight: number;
                let rect = new Rect();

                // TEST
                // rect.set(0, 0, sourceWidth, sourceHeight);

                if (this.isHorizontal) {
                    // 水平布局：右半部分是视频内容
                    videoWidth = sourceWidth / 2;
                    videoHeight = sourceHeight;
                    rect.set(sourceWidth / 2, 0, videoWidth, videoHeight);
                } else {
                    // 垂直布局：下半部分是视频内容
                    videoWidth = sourceWidth;
                    videoHeight = sourceHeight / 2;
                    rect.set(0, sourceHeight / 2, videoWidth, videoHeight);
                }

                sf.rect = rect;
                sf.packable = false;

                // 统一应用材质和等比缩放
                this._applyMaterialAndScaling();
            })
    }

    /**
     * 计算等比缩放，保持视频宽高比
     */
    private _calculateAspectRatioScale(componentWidth: number, componentHeight: number, videoWidth: number, videoHeight: number): void {
        if (!this._outputSprite || videoWidth <= 0 || videoHeight <= 0) return;

        // 计算视频的宽高比
        const videoAspectRatio = videoWidth / videoHeight;
        // 计算组件的宽高比  
        const componentAspectRatio = componentWidth / componentHeight;

        let finalWidth: number;
        let finalHeight: number;

        if (videoAspectRatio > componentAspectRatio) {
            // 视频比较宽，以组件宽度为准
            finalWidth = componentWidth;
            finalHeight = componentWidth / videoAspectRatio;
        } else {
            // 视频比较高，以组件高度为准
            finalHeight = componentHeight;
            finalWidth = componentHeight * videoAspectRatio;
        }

        // 设置Sprite的尺寸
        const uiTransform = this._outputSprite.node.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(finalWidth, finalHeight);
            console.log(`VideoAlphaPlayer3: 等比缩放 ${videoWidth}x${videoHeight} -> ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}`);
        }
    }

    private _updateTexture() {
        if (this._isInPlaybackState()) {
            this._uploadTextureData();
            if (this.spriteMaterial) {
                this.spriteMaterial.setProperty("mainTexture", this._texture);
            }
        }
    }

    private _uploadTextureData(): void {
        // Android WebView兼容性检查
        if (!this._isVideoReadyForDrawing()) {
            console.warn('VideoAlphaPlayer3: 视频未准备好上传，跳过此次更新');
            return;
        }

        try {
            if (this._webglContext?.isWebGL2) {
                // WebGL2 专用处理方式
                this._uploadTextureDataWebGL2();
            } else {
                // WebGL1 兼容方式
                //@ts-ignore
                this._texture.uploadData(this._video);
            }
        } catch (error) {
            console.error('VideoAlphaPlayer3: Failed to upload texture data:', error);
            // 如果WebGL2方式失败，回退到WebGL1方式
            if (this._webglContext?.isWebGL2) {
                try {
                    //@ts-ignore
                    this._texture.uploadData(this._video);
                } catch (fallbackError) {
                    console.error('VideoAlphaPlayer3: Fallback upload also failed:', fallbackError);
                }
            }
        }
    }

    private _uploadTextureDataWebGL2(): void {
        if (!this._video || !this._texture) return;

        // 使用复用的canvas进行WebGL2纹理上传
        this._uploadWithSharedCanvas(this._texture);
    }

    private _clearTexture(): void {
        if (this._video == null) {
            console.error('VideoAlphaPlayer3: video is not initialized.');
            return;
        }

        this._texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
        this._texture.setMipFilter(Texture2D.Filter.LINEAR);
        this._texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);

        // WebGL2兼容性优化：确保纹理尺寸是2的幂或者显式设置非2幂支持
        const width = this._video.videoWidth;
        const height = this._video.videoHeight;

        // 检查是否为2的幂
        const isPowerOfTwo = (value: number) => (value & (value - 1)) === 0;
        const widthPOT = isPowerOfTwo(width);
        const heightPOT = isPowerOfTwo(height);

        if (!widthPOT || !heightPOT) {
            console.log(`VideoAlphaPlayer3: 非2的幂纹理尺寸 ${width}x${height}, 设置CLAMP_TO_EDGE包装模式`);
        }

        this._texture.reset({
            width: width,
            height: height,
            format: this._webglContext?.isWebGL2 ? Texture2D.PixelFormat.RGBA8888 : Texture2D.PixelFormat.RGBA8888,
            mipmapLevel: 1,
        });

        // WebGL2 特定优化
        if (this._webglContext?.isWebGL2) {
            console.log('VideoAlphaPlayer3: 应用WebGL2纹理优化');
        }
    }
    //#endregion

    private _isInPlaybackState() {
        return !!this._video && this._loaded && this._currentVideoState != EVideoState.IDLE && this._currentVideoState != EVideoState.PREPARING && this._currentVideoState != EVideoState.ERROR;
    }

    private _updateVideoSource() {
        let url = '';
        if (this.resourceType == EResourceType.REMOTE) {
            url = this._realUrl;
        }
        else if (this.resourceType == EResourceType.LOCAL) {
            if (this.videoClip) {
                url = this.videoClip.nativeUrl;
            }
        }
        // 处理资源URL转换（如果需要MD5管道处理）
        if (url && (window as any).cc && (window as any).cc.loader && (window as any).cc.loader.md5Pipe) {
            url = (window as any).cc.loader.md5Pipe.transformURL(url);
        }

        if (url == "") return;

        // 重置序列帧相关状态（切换视频时确保从干净状态开始）
        this._isPlayingSequence = false;
        this._currentFrameIndex = 0;
        this._cachedFrameSequence = null;
        this._isRecordingFrames = false;
        this._recordedFrames = [];

        // 设置当前URL，缓存仅用于性能优化提示
        this._currentUrl = url;
        console.log('VideoAlphaPlayer3: 视频URL =>', url);

        if (this.enableTextureCache) {
            const cachedFrameSequence = VideoFrameSequenceCache.get(url);
            if (cachedFrameSequence) {
                console.log('发现缓存帧序列，开始序列帧播放');
                this._startSequencePlayback(cachedFrameSequence);
                return;
            } else {
                console.log('缓存未命中，开始视频播放并记录帧序列');
                this._isRecordingFrames = true;
                this._recordedFrames = [];
            }
        }

        // 懒加载：按需初始化video元素
        if (!this._video) {
            console.log('懒加载：初始化video元素');
            this._initBrowser();

            // 初始化失败则返回
            if (!this._video) {
                console.error('VideoAlphaPlayer3: video元素初始化失败');
                return;
            }
        }

        this._currentVideoState = EVideoState.PREPARING;
        this._loaded = false;
        this._time = 0;

        this._video.pause();
        if (this._video.src && this._video.src.startsWith('blob:')) {
            URL.revokeObjectURL(this._video.src);
        }
        this._video.src = "";
        this._video.src = url;
        this._video.load();
        this.node?.emit('preparing', this);
    }


    /**
     * 统一的材质应用和缩放处理
     */
    private _applyMaterialAndScaling(): void {
        if (!this._outputSprite || !this._texture) return;

        // 应用材质
        if (this.spriteMaterial) {
            this._outputSprite.customMaterial = this.spriteMaterial;
            const mat = this._outputSprite.getMaterialInstance(0);
            if (mat) {
                mat.setProperty('TexSize', v2(this._texture.width, this._texture.height));
            }
        }

        // // 进行等比缩放计算
        // {
        //     // 获取当前组件的尺寸
        //     const uiTransform = this.node.getComponent(UITransform);
        //     const componentWidth = uiTransform ? uiTransform.width : this._texture.width;
        //     const componentHeight = uiTransform ? uiTransform.height : this._texture.height;

        //     // 计算alpha通道分离后的实际视频尺寸
        //     const videoWidth = this.isHorizontal ? this._texture.width / 2 : this._texture.width;
        //     const videoHeight = this.isHorizontal ? this._texture.height : this._texture.height / 2;

        //     // 等比缩放计算
        //     this._calculateAspectRatioScale(componentWidth, componentHeight, videoWidth, videoHeight);
        // }
    }

    /**
     * 开始序列帧播放
     */
    private _startSequencePlayback(frameSequence: VideoFrame[]): void {
        this._cachedFrameSequence = frameSequence;
        this._isPlayingSequence = true;
        this._currentFrameIndex = 0;
        this._loaded = true;
        this._currentVideoState = EVideoState.PREPARED;

        // 显示第一帧
        if (frameSequence.length > 0) {
            const firstFrame = frameSequence[0];

            this._clearTexture();
            this._texture = firstFrame.texture;
            this._updateSprite();

            // 应用材质配置
            this._applyMaterialAndScaling();

            console.log(`序列帧播放初始化完成，共${frameSequence.length}帧`);
            this.node?.emit('ready', this);

            if (this.playOnWake) {
                this._currentVideoState = EVideoState.PLAYING;
                console.log('开始序列帧播放');
            }
        }
    }

    /**
     * 记录当前帧到序列中
     */
    private _recordCurrentFrame(): void {
        if (!this._isRecordingFrames || !this._texture) {
            return;
        }

        try {
            // 完全仿照this._texture创建新的纹理实例
            const textureCopy = new Texture2D();

            // 复制当前纹理的完整配置
            textureCopy.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
            textureCopy.setMipFilter(Texture2D.Filter.LINEAR);
            textureCopy.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);

            textureCopy.reset({
                width: this._texture.width,
                height: this._texture.height,
                format: this._texture.getPixelFormat(),
                mipmapLevel: 1,
            });

            if (this._webglContext?.isWebGL2) {
                this._uploadCacheTextureWebGL2(textureCopy);
            } else {
                //@ts-ignore
                textureCopy.uploadData(this._video);
            }

            // 记录帧数据
            const frameData: VideoFrame = {
                texture: textureCopy,
                timestamp: this._video ? this._video.currentTime : 0
            };

            this._recordedFrames.push(frameData);

            if (this._recordedFrames.length % 10 === 0) {
                console.log(`已记录${this._recordedFrames.length}帧 (仿照texture方式)`);
            }
        } catch (error) {
            console.warn('VideoAlphaPlayer3: 帧记录失败，跳过此帧', error);
        }
    }

    private _uploadCacheTextureWebGL2(cacheTexture: Texture2D): void {
        if (!this._video || !cacheTexture) return;

        // 使用复用的canvas进行缓存纹理上传
        this._uploadWithSharedCanvas(cacheTexture);
    }

    private _ensureWebGL2Canvas(): boolean {
        if (!this._webgl2Canvas) {
            this._webgl2Canvas = document.createElement('canvas');
            this._webgl2Context = this._webgl2Canvas.getContext('2d');

            if (!this._webgl2Context) {
                console.warn('VideoAlphaPlayer3: 无法创建2D上下文');
                this._webgl2Canvas = null;
                return false;
            }

            console.log('VideoAlphaPlayer3: 创建WebGL2专用复用canvas');
        }

        // 动态调整canvas尺寸（只在需要时调整）
        const videoWidth = this._video.videoWidth;
        const videoHeight = this._video.videoHeight;

        if (this._webgl2Canvas.width !== videoWidth || this._webgl2Canvas.height !== videoHeight) {
            this._webgl2Canvas.width = videoWidth;
            this._webgl2Canvas.height = videoHeight;
            console.log(`VideoAlphaPlayer3: 调整复用canvas尺寸为 ${videoWidth}x${videoHeight}`);
        }

        return true;
    }

    /**
     * 检查视频是否准备好进行drawImage操作
     * Android WebView兼容性关键检查
     */
    private _isVideoReadyForDrawing(): boolean {
        if (!this._video) {
            return false;
        }

        if (this._video.videoWidth <= 0 || this._video.videoHeight <= 0) {
            return false;
        }

        if (this._video.readyState < EReadyState.HAVE_CURRENT_DATA) {
            return false;
        }

        // Android WebView特殊检查 - 确保不是空帧
        try {
            const currentTime = this._video.currentTime;
            if (isNaN(currentTime) || currentTime < 0) {
                return false;
            }
        } catch (error) {
            console.warn('VideoAlphaPlayer3: 视频时间访问异常:', error);
            return false;
        }

        return true;
    }

    private _uploadWithSharedCanvas(targetTexture: Texture2D): void {
        if (!this._video || !targetTexture) return;

        try {
            // 确保复用canvas可用
            if (!this._ensureWebGL2Canvas()) {
                // canvas创建失败，回退到直接上传
                //@ts-ignore
                targetTexture.uploadData(this._video);
                return;
            }

            // Android WebView兼容性检查 - 确保video元素完全可用
            if (!this._isVideoReadyForDrawing()) {
                console.warn('VideoAlphaPlayer3: 视频未准备好绘制，跳过此帧');
                return;
            }

            // 使用复用的canvas绘制视频帧
            this._webgl2Context.drawImage(this._video, 0, 0);

            // 从canvas上传到纹理
            try {
                //@ts-ignore
                targetTexture.uploadData(this._webgl2Canvas);
            } catch (error) {
                console.warn('VideoAlphaPlayer3: 共享Canvas upload失败，尝试直接上传:', error);
                //@ts-ignore
                targetTexture.uploadData(this._video);
            }
        } catch (error) {
            console.error('VideoAlphaPlayer3: 共享canvas纹理上传失败:', error);
            // 最终回退到WebGL1方式
            try {
                //@ts-ignore
                targetTexture.uploadData(this._video);
            } catch (fallbackError) {
                console.error('VideoAlphaPlayer3: 回退上传也失败:', fallbackError);
            }
        }
    }

    /**
     * 清理WebGL2复用的canvas资源
     */
    private _cleanupWebGL2Canvas(): void {
        if (this._webgl2Canvas) {
            // 清空canvas内容
            this._webgl2Context?.clearRect(0, 0, this._webgl2Canvas.width, this._webgl2Canvas.height);
            this._webgl2Canvas = null;
            this._webgl2Context = null;
            console.log('VideoAlphaPlayer3: 清理WebGL2复用canvas');
        }
    }

    /**
     * 更新序列帧播放
     */
    private _updateSequenceFrame(): void {
        if (!this._cachedFrameSequence || this._cachedFrameSequence.length === 0) {
            return;
        }

        const totalFrames = this._cachedFrameSequence.length;

        if (this._currentFrameIndex >= totalFrames) {
            if (this.loop) {
                this._currentFrameIndex = 0;
            } else {
                this._currentVideoState = EVideoState.COMPLETED;
                this.node.emit('completed', this);
                return;
            }
        }


        const currentFrame = this._cachedFrameSequence[this._currentFrameIndex];
        this._texture = currentFrame.texture;
        this._outputSprite.customMaterial = null;
        this._applyMaterialAndScaling();
        if (this.spriteMaterial) {
            this.spriteMaterial.setProperty("mainTexture", this._texture);
        }
        this._currentFrameIndex++;
    }

    /**
     * 清理video元素，释放DOM和内存资源
     */
    private _cleanupVideoElement(): void {
        if (this._video && sys.isBrowser) {
            console.log('清理video元素');

            // 先暂停，避免播放中断错误
            try {
                if (!this._video.paused) {
                    this._video.pause();
                }
            } catch (error) {
                console.warn('VideoAlphaPlayer3: 暂停video失败', error);
            }

            // 清理资源URL
            if (this._video.src && this._video.src.startsWith('blob:')) {
                URL.revokeObjectURL(this._video.src);
            }
            this._video.src = "";

            try {
                this._video.load();
            } catch (error) {
                console.warn('VideoAlphaPlayer3: video.load()调用失败', error);
            }

            // 从DOM中移除
            if (this._video.parentNode) {
                this._video.parentNode.removeChild(this._video);
            }

            // 清空引用
            this._video = null;
            console.log('video元素已清理，资源已释放');
        }
    }

    /**
     * 切换到序列帧播放模式
     */
    private _switchToSequenceMode(frameSequence: VideoFrame[]): void {
        this._cachedFrameSequence = frameSequence;
        this._isPlayingSequence = true;
        this._currentFrameIndex = 0;
        this._loaded = true;

        console.log(`切换到序列帧模式，共${frameSequence.length}帧`);

        // 如果当前正在播放，继续序列帧播放
        if (this._currentVideoState === EVideoState.PLAYING && this.loop) {
            console.log('继续序列帧播放');
        }
    }

    public play() {
        // 如果已经是序列帧模式，直接开始序列帧播放
        if (this._isPlayingSequence && this._cachedFrameSequence) {
            console.log('开始序列帧播放');
            this._currentVideoState = EVideoState.PLAYING;
            return;
        }

        // 否则按原有逻辑播放video
        if (!this._video) {
            console.log('播放时懒加载：需要先加载视频源');
            this._updateVideoSource();
            return;
        }

        console.log('VideoAlphaPlayer3: 开始播放视频');
        try {
            this._video.play().catch(error => {
                console.error('VideoAlphaPlayer3: 播放失败', error);
            });
            this._currentVideoState = EVideoState.PLAYING;
        } catch (error) {
            console.error('VideoAlphaPlayer3: 播放异常', error);
        }
    }

    public isPlaying() {
        return this._currentVideoState == EVideoState.PLAYING;
    }

    // 调试方法
    public getCacheInfo(): any {
        return VideoFrameSequenceCache.getMemoryInfo();
    }

    public debugInfo(): void {
        console.log('VideoAlphaPlayer3调试信息:');
        console.log(`- 当前URL: ${this._currentUrl}`);
        console.log(`- 缓存配置: ${this.enableTextureCache}`);
        console.log(`- 纹理尺寸: ${this._texture?.width}x${this._texture?.height}`);
        console.log(`- 视频状态: ${this._currentVideoState}`);
        console.log(`- 序列帧播放: ${this._isPlayingSequence}`);
        console.log(`- 当前帧索引: ${this._currentFrameIndex}`);
        console.log(`- 缓存信息:`, VideoFrameSequenceCache.getMemoryInfo());
    }

    private async excuteZipFile() {
        // 下载zip
        const jzip = await ZipLoader.loadRemoteZip(this._url);
        if (jzip[0] == null) {
            // 获取视频文件
            const videoFile = jzip[1].file(/.*\.mp4/)[0];
            if (videoFile) {
                const url = await ZipLoader.toVideo(videoFile);
                if (url == "") {
                    GFM.LogMgr.error('VideoAlphaPlayer3', 'loadRemoteZip', 'Failed to load video file from zip');
                    return;
                }
                this._realUrl = url;
                this._updateVideoSource();
            } else {
                GFM.LogMgr.error('VideoAlphaPlayer3', 'loadRemoteZip', 'No video file found in zip');
            }
        }
    }
}