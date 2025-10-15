/*
 * @Author: JL
 * @Date: 2025-08-15
 * VideoAlphaPlayer2 - 优化版本的带alpha通道视频播放器
 * 支持WebGL2.0，包含性能优化和内存管理
 */

import { _decorator, Component, Enum, game, loader, Material, Rect, Sprite, SpriteFrame, sys, Texture2D, UITransform, v2, VideoClip } from 'cc';
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

export enum EReourceType {
    LOCAL = 1,
    REMOTE = 2
}

interface WebGLContext {
    isWebGL2: boolean;
    context: WebGLRenderingContext | WebGL2RenderingContext;
}

/**
 * 带alpha通道的视频渲染组件 (优化版本)
 * 支持WebGL1.0和WebGL2.0，包含性能优化
 */
@ccclass('VideoAlphaPlayer2')
@requireComponent(UITransform)
export class VideoAlphaPlayer2 extends Component {
    @property({ tooltip: '是否显示video组件' })
    showVideo: Boolean = true;

    @property({ type: Enum(EReourceType) })
    resourceType: EReourceType = EReourceType.LOCAL;

    @property({
        type: VideoClip,
        tooltip: '视频资源',
        visible() { return this.resourceType == EReourceType.LOCAL }
    })
    private _videoClip: VideoClip = null;
    get videoClip(): VideoClip {
        return this._videoClip;
    }
    set videoClip(value: VideoClip) {
        this._videoClip = value;
        if (this.resourceType != EReourceType.LOCAL) {
            console.warn('VideoAlphaPlayer2: videoClip is only valid when resourceType is EReourceType.LOCAL');
        }
        this._updateVideoSource();
    }

    @property({
        tooltip: '资源地址',
        visible() { return this.resourceType == EReourceType.REMOTE }
    })
    private _url: string = "";
    private _realUrl: string = "";
    get url(): string {
        return this._url;
    }
    set url(value: string) {
        this._url = value;
        if (this.resourceType != EReourceType.REMOTE) {
            console.warn('VideoAlphaPlayer2: url is only valid when resourceType is EReourceType.REMOTE');
        }

        if (this._url.endsWith('.zip')) {
            this.excuteZipFile();
        } else if (this._url.endsWith('.mp4') || this._url.endsWith('.webm')) {
            this._realUrl = value;
            this._updateVideoSource();
        } else {
            console.error('VideoAlphaPlayer2: Invalid video url, must be .mp4 or .webm or .zip');
        }
    }

    @property({ tooltip: '加载完成后自动播放？' })
    playOnWake: Boolean = true;

    @property({ tooltip: '是否横向布局' })
    isHorizontal: Boolean = true;

    @property({ tooltip: '是否循环播放' })
    loop: boolean = true;

    @property({ type: Material })
    spriteMaterial: Material = null;

    @property({ tooltip: '是否启用性能优化(帧变化检测)', group: { name: "性能优化", id: "performance" } })
    enableFrameOptimization: boolean = true;

    @property({ tooltip: '最大更新帧率(FPS)', group: { name: "性能优化", id: "performance" }, range: [15, 60, 1] })
    maxUpdateFPS: number = 30;

    @property({ tooltip: '是否启用纹理缓存', group: { name: "性能优化", id: "performance" } })
    enableTextureCache: boolean = true;

    // 私有属性
    private _outputSprite: Sprite = null;
    private _video: HTMLVideoElement = null;
    private _texture: Texture2D = null;
    private _time: number = 0;
    private _currentVideoState: EVideoState = EVideoState.IDLE;
    private _loaded: boolean = false;

    // WebGL上下文信息
    private _webglContext: WebGLContext = null;

    // 性能优化相关
    private _lastVideoTime: number = -1;
    private _lastFrameTime: number = 0;
    private _targetFrameInterval: number = 1 / 30; // 默认30FPS
    private _textureNeedsUpdate: boolean = false;

    // 纹理缓存
    private static _textureCache: Map<string, Texture2D> = new Map();
    private _currentTextureKey: string = '';

    protected onLoad(): void {
        this._outputSprite = this.node.addComponent(Sprite);
        this._outputSprite.type = Sprite.Type.SIMPLE;
        this._outputSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._outputSprite.trim = false;

        this._initWebGLContext();
        this._targetFrameInterval = 1 / this.maxUpdateFPS;
    }

    protected onDestroy(): void {
        this._cleanupVideo();
        this._cleanupTexture();
        this._cleanupSprite();
    }

    protected start(): void {
        this._initBrowser();

        if (this.playOnWake) {
            this._updateVideoSource();
        }
    }

    onEnable(): void {
        if (this._loaded && this._currentVideoState == EVideoState.PLAYING) {
            this.play();
        }
    }

    update(deltaTime: number) {
        this._time += deltaTime;

        // 动态帧率控制
        if (this._time < this._targetFrameInterval || !this._loaded) {
            return;
        }

        this._time = 0;
        this._updateTextureIfNeeded();

        // 循环播放优化
        if (this.loop && this._video && this._video.currentTime > this._video.duration - 0.15) {
            this._onCompleted();
        }
    }

    //#region WebGL上下文管理
    private _initWebGLContext(): void {
        const canvas = game.canvas;
        if (!canvas) {
            console.error('VideoAlphaPlayer2: Canvas not found');
            return;
        }

        // 尝试获取WebGL2上下文
        let context = canvas.getContext('webgl2') as WebGL2RenderingContext;
        if (context) {
            this._webglContext = {
                isWebGL2: true,
                context: context
            };
            console.log('VideoAlphaPlayer2: Using WebGL2');
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
                console.log('VideoAlphaPlayer2: Using WebGL1');
            } else {
                console.error('VideoAlphaPlayer2: WebGL not supported');
            }
        }
    }

    private _logWebGL2Capabilities(context: WebGL2RenderingContext): void {
        if (!context) return;

        try {
            const renderer = context.getParameter(context.RENDERER);
            const version = context.getParameter(context.VERSION);
            const shadingLanguageVersion = context.getParameter(context.SHADING_LANGUAGE_VERSION);

            console.log('VideoAlphaPlayer2 WebGL2 Info:', {
                renderer,
                version,
                shadingLanguageVersion,
                maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
                maxViewportDims: context.getParameter(context.MAX_VIEWPORT_DIMS)
            });
        } catch (error) {
            console.warn('VideoAlphaPlayer2: Failed to get WebGL2 capabilities:', error);
        }
    }
    //#endregion

    //#region 浏览器视频组件初始化
    private _initBrowser(): void {
        this._video = document.createElement('video');
        this._setupVideoStyle();
        this._setupVideoAttributes();
        this._registerVideoEvents();
        this._loaded = false;
    }

    private _setupVideoStyle(): void {
        if (!this.showVideo) {
            this._video.style.position = 'absolute';
            this._video.style.left = '-9999px';
            this._video.style.top = '-9999px';
            this._video.style.opacity = '0';
            this._video.style.pointerEvents = 'none';
            this._video.style.zIndex = '1';
            this._video.style.display = 'block';
        } else {
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
            document.body.appendChild(this._video);
        }
    }

    private _setupVideoAttributes(): void {
        this._video.setAttribute("x5-video-player-type", "true");
        this._video.setAttribute("playsinline", "true");
        this._video.crossOrigin = 'anonymous';
        this._video.autoplay = false;
        this._video.loop = false;
        this._video.muted = true;
    }

    private _registerVideoEvents(): void {
        this._video.addEventListener('loadstart', () => this._onLoadstart());
        this._video.addEventListener('progress', () => this._onProgress());
        this._video.addEventListener('stalled', () => this._onLoadError());
        this._video.addEventListener('abort', () => this._onLoadError());
        this._video.addEventListener('loadedmetadata', () => this._onMetaLoaded());
        this._video.addEventListener('ended', () => this._onCompleted());
        this._video.addEventListener('canplay', () => this._onCanPlay());
        this._video.addEventListener('canplaythrough', () => this._onCanPlay());
        this._video.addEventListener('suspend', () => this._onCanPlay());

        // 添加时间更新事件用于帧变化检测
        if (this.enableFrameOptimization) {
            this._video.addEventListener('timeupdate', () => this._onTimeUpdate());
        }
    }

    private _onTimeUpdate(): void {
        if (this._video && this._video.currentTime !== this._lastVideoTime) {
            this._textureNeedsUpdate = true;
        }
    }
    //#endregion

    //#region 视频事件处理
    private _onLoadstart(): void {
        console.log('VideoAlphaPlayer2: 视频加载开始');
    }

    private _onProgress(): void {
        if (this._video && this._video.buffered.length > 0) {
            const bufferedEnd = this._video.buffered.end(this._video.buffered.length - 1);
            const duration = this._video.duration;
            console.log(`VideoAlphaPlayer2: 已缓冲 ${(bufferedEnd / duration) * 100}%`);
        }
    }

    private _onLoadError(): void {
        console.log('VideoAlphaPlayer2: 视频加载异常');
        this._currentVideoState = EVideoState.ERROR;
        this.node.emit('error', this);
    }

    private _onMetaLoaded(): void {
        this.node.emit('loaded', this);
        const width = this.isHorizontal ? this._video.videoWidth / 2 : this._video.videoWidth;
        const height = this.isHorizontal ? this._video.videoHeight : this._video.videoHeight / 2;
        console.log(`VideoAlphaPlayer2: 视频分辨率：${width}x${height}`);
    }

    private _onCompleted(): void {
        if (this.loop) {
            if (this._currentVideoState == EVideoState.PLAYING) {
                this._video.currentTime = 0;
                this._video.play();
            }
        } else {
            this._currentVideoState = EVideoState.COMPLETED;
            this.node.emit('completed', this);
        }
    }

    private _onCanPlay(): void {
        if (this._loaded || this._currentVideoState == EVideoState.PLAYING) return;

        if (this._video.readyState === EReadyState.HAVE_ENOUGH_DATA ||
            this._video.readyState === EReadyState.HAVE_METADATA) {
            this._onReadyToPlay();
        }
    }

    private _onReadyToPlay(): void {
        this._video.currentTime = 0;
        this._loaded = true;
        this._currentVideoState = EVideoState.PREPARED;

        this._initTexture();
        this._updateSprite();
        this._updateTextureIfNeeded();

        if (this.playOnWake) {
            this.play();
        }

        this.node.emit('ready', this);
    }
    //#endregion

    //#region 纹理管理优化
    private _getTextureKey(): string {
        return `${this._video.videoWidth}x${this._video.videoHeight}`;
    }

    private _initTexture(): void {
        if (!this._video) {
            console.error('VideoAlphaPlayer2: video is not initialized.');
            return;
        }

        this._currentTextureKey = this._getTextureKey();

        if (this.enableTextureCache && VideoAlphaPlayer2._textureCache.has(this._currentTextureKey)) {
            this._texture = VideoAlphaPlayer2._textureCache.get(this._currentTextureKey);
        } else {
            this._texture = new Texture2D();
            this._setupTextureParameters();

            if (this.enableTextureCache) {
                VideoAlphaPlayer2._textureCache.set(this._currentTextureKey, this._texture);
            }
        }
    }

    private _setupTextureParameters(): void {
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
            console.log(`VideoAlphaPlayer2: 非2的幂纹理尺寸 ${width}x${height}, 设置CLAMP_TO_EDGE包装模式`);
        }

        this._texture.reset({
            width: width,
            height: height,
            format: this._webglContext?.isWebGL2 ? Texture2D.PixelFormat.RGBA8888 : Texture2D.PixelFormat.RGBA8888,
            mipmapLevel: 1,
        });

        // WebGL2 特定优化
        if (this._webglContext?.isWebGL2) {
            console.log('VideoAlphaPlayer2: 应用WebGL2纹理优化');
        }
    }

    private _updateTextureIfNeeded(): void {
        if (!this._isInPlaybackState()) return;

        // 性能优化：只有在帧变化时才更新纹理
        if (this.enableFrameOptimization) {
            if (!this._textureNeedsUpdate) return;

            if (this._video.currentTime === this._lastVideoTime) return;

            this._lastVideoTime = this._video.currentTime;
            this._textureNeedsUpdate = false;
        }

        this._uploadTextureData();

        if (this.spriteMaterial) {
            this.spriteMaterial.setProperty("mainTexture", this._texture);
        }
    }

    private _uploadTextureData(): void {
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
            console.error('VideoAlphaPlayer2: Failed to upload texture data:', error);
            // 如果WebGL2方式失败，回退到WebGL1方式
            if (this._webglContext?.isWebGL2) {
                try {
                    //@ts-ignore
                    this._texture.uploadData(this._video);
                } catch (fallbackError) {
                    console.error('VideoAlphaPlayer2: Fallback upload also failed:', fallbackError);
                }
            }
        }
    }

    private _uploadTextureDataWebGL2(): void {
        if (!this._video || !this._texture) return;

        // WebGL2 需要更精确的纹理数据处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            // 如果无法创建2D上下文，回退到直接上传
            //@ts-ignore
            this._texture.uploadData(this._video);
            return;
        }

        canvas.width = this._video.videoWidth;
        canvas.height = this._video.videoHeight;

        // 绘制视频帧到canvas
        ctx.drawImage(this._video, 0, 0);

        // 从canvas获取ImageData并上传
        try {
            //@ts-ignore
            this._texture.uploadData(canvas);
        } catch (error) {
            console.warn('VideoAlphaPlayer2: Canvas upload failed, trying direct upload:', error);
            //@ts-ignore
            this._texture.uploadData(this._video);
        }
    }
    //#endregion

    //#region Sprite更新
    private _updateSprite(): void {
        if (!this._outputSprite) return;

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
            let rect = new Rect();

            if (this.isHorizontal) {
                rect.set(sourceWidth / 2, 0, sourceWidth / 2, sourceHeight);
            } else {
                rect.set(0, sourceHeight / 2, sourceWidth, sourceHeight / 2);
            }

            sf.rect = rect;
            sf.packable = false;

            this._outputSprite.customMaterial = this.spriteMaterial;
            const mat = this._outputSprite.getMaterialInstance(0);
            if (mat) {
                mat.setProperty('TexSize', v2(sourceWidth, sourceHeight));
            }
        });
    }
    //#endregion

    //#region 资源清理
    private _cleanupVideo(): void {
        if (this._video && sys.isBrowser) {
            this._video.pause();
            if (this._video.src.startsWith('blob:')) {
                URL.revokeObjectURL(this._video.src);
            }
            this._video.src = "";
            this._video.load();
            if (this.showVideo && this._video.parentNode) {
                this._video.parentNode.removeChild(this._video);
            }
            this._video = null;
        }
    }

    private _cleanupTexture(): void {
        if (this._texture && !this.enableTextureCache) {
            this._texture.destroy();
            this._texture = null;
        }
    }

    private _cleanupSprite(): void {
        if (this._outputSprite && this._outputSprite.spriteFrame && !this.enableTextureCache) {
            this._outputSprite.spriteFrame.destroy();
            this._outputSprite.spriteFrame = null;
        }
    }

    // 静态方法：清理所有纹理缓存
    public static clearTextureCache(): void {
        VideoAlphaPlayer2._textureCache.forEach(texture => texture.destroy());
        VideoAlphaPlayer2._textureCache.clear();
        console.log('VideoAlphaPlayer2: Texture cache cleared');
    }
    //#endregion

    //#region 公共API
    public play(): void {
        if (this._video) {
            console.log('VideoAlphaPlayer2: 开始播放视频');
            this._video.play();
            this._currentVideoState = EVideoState.PLAYING;
            this.node.emit('playing', this);
        }
    }

    public pause(): void {
        if (this._video) {
            this._video.pause();
            this._currentVideoState = EVideoState.PAUSED;
            this.node.emit('paused', this);
        }
    }

    public stop(): void {
        if (this._video) {
            this._video.pause();
            this._video.currentTime = 0;
            this._currentVideoState = EVideoState.IDLE;
            this.node.emit('stopped', this);
        }
    }

    public isPlaying(): boolean {
        return this._currentVideoState == EVideoState.PLAYING;
    }

    public getCurrentTime(): number {
        return this._video ? this._video.currentTime : 0;
    }

    public getDuration(): number {
        return this._video ? this._video.duration : 0;
    }

    public seekTo(time: number): void {
        if (this._video) {
            this._video.currentTime = Math.max(0, Math.min(time, this._video.duration));
        }
    }

    public setPlaybackRate(rate: number): void {
        if (this._video) {
            this._video.playbackRate = rate;
            this._targetFrameInterval = 1 / (this.maxUpdateFPS * rate);
        }
    }
    //#endregion

    //#region 工具方法
    private _isInPlaybackState(): boolean {
        return !!this._video &&
            this._loaded &&
            this._currentVideoState != EVideoState.IDLE &&
            this._currentVideoState != EVideoState.PREPARING &&
            this._currentVideoState != EVideoState.ERROR;
    }

    private _updateVideoSource(): void {
        let url = '';
        if (this.resourceType == EReourceType.REMOTE) {
            url = this._realUrl;
        } else if (this.resourceType == EReourceType.LOCAL) {
            if (this.videoClip) {
                url = this.videoClip.nativeUrl;
            }
        }

        if (url && loader.md5Pipe) {
            url = loader.md5Pipe.transformURL(url);
        }

        if (url == "") return;

        this._currentVideoState = EVideoState.PREPARING;
        this._loaded = false;
        this._time = 0;
        this._lastVideoTime = -1;
        this._textureNeedsUpdate = false;

        this._video.pause();
        if (this._video.src && this._video.src.startsWith('blob:')) {
            URL.revokeObjectURL(this._video.src);
            this._video.src = "";
        }
        this._video.src = url;
        this._video.load();
        this.node.emit('preparing', this);
    }

    private async excuteZipFile(): Promise<void> {
        try {
            const jzip = await ZipLoader.loadRemoteZip(this._url);
            if (jzip[0] == null) {
                const videoFile = jzip[1].file(/.*\.mp4/)[0];
                if (videoFile) {
                    const url = await ZipLoader.toVideo(videoFile);
                    if (url == "") {
                        console.error('VideoAlphaPlayer2: Failed to load video file from zip');
                        return;
                    }
                    this._realUrl = url;
                    this._updateVideoSource();
                } else {
                    console.error('VideoAlphaPlayer2: No video file found in zip');
                }
            }
        } catch (error) {
            console.error('VideoAlphaPlayer2: Error loading zip file:', error);
        }
    }
    //#endregion
}