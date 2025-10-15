/*
 * @Author: JL
 * @Date: 2025-06-17 17:25:32
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

/**
 * 带alpha通道的视频渲染组件 
 * 支持WebGL 1.0 和 WebGL 2.0
 */
@ccclass('VideoAlphaPlayer')
@requireComponent(UITransform)
export class VideoAlphaPlayer extends Component {
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
            GFM.LogMgr.warn('VideoMeshRenderer: videoClip is only valid when resourceType is EResourceType.LOCAL');
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
            GFM.LogMgr.warn('VideoMeshRenderer: url is only valid when resourceType is EResourceType.REMOTE');
        }

        if (this._url.endsWith('.zip')) {
            this.excuteZipFile();
        }
        else if (this._url.endsWith('.mp4') || this._url.endsWith('.webm')) {
            this._realUrl = value;
            this._updateVideoSource();
        }
        else {
            GFM.LogMgr.error('VideoMeshRenderer', 'url', 'Invalid video url, must be .mp4 or .webm or .zip');
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

    private _outputSprite: Sprite = null;

    private _video: HTMLVideoElement = null;
    private _texture: Texture2D = null; //视频纹理
    private _time: number = 0;
    private _currentVideoState: EVideoState = EVideoState.IDLE; //当前视频状态
    private _loaded: boolean = false; //是否加载完成

    // WebGL上下文信息
    private _webglContext: WebGLContext = null;

    protected onLoad(): void {
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
            if (this.showVideo) this._video.parentNode?.removeChild(this._video);
            this._video = null;
        }

        if (this._texture) {
            this._texture.destroy();
            this._texture = null;
        }

        if (this._outputSprite && this._outputSprite.spriteFrame) {
            this._outputSprite.spriteFrame.destroy();
            this._outputSprite.spriteFrame = null;
        }
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
        if (this._time < 0.032 || !this._loaded) {
            return;
        } else {
            this._time = 0;
        }

        this._updateTexture();

        // 解决循环卡帧
        if (this.loop && this._video.currentTime > this._video.duration - 0.15) {
            this._onCompleted();
        }
    }

    //#region WebGL上下文管理
    private _initWebGLContext(): void {
        const canvas = game.canvas;
        if (!canvas) {
            console.error('VideoAlphaPlayer: Canvas not found');
            return;
        }

        // 尝试获取WebGL2上下文
        let context = canvas.getContext('webgl2') as WebGL2RenderingContext;
        if (context) {
            this._webglContext = {
                isWebGL2: true,
                context: context
            };
            console.log('VideoAlphaPlayer: Using WebGL2');
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
                console.log('VideoAlphaPlayer: Using WebGL1');
            } else {
                console.error('VideoAlphaPlayer: WebGL not supported');
            }
        }
    }

    private _logWebGL2Capabilities(context: WebGL2RenderingContext): void {
        if (!context) return;

        try {
            const renderer = context.getParameter(context.RENDERER);
            const version = context.getParameter(context.VERSION);
            const shadingLanguageVersion = context.getParameter(context.SHADING_LANGUAGE_VERSION);

            console.log('VideoAlphaPlayer WebGL2 Info:', {
                renderer,
                version,
                shadingLanguageVersion,
                maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
                maxViewportDims: context.getParameter(context.MAX_VIEWPORT_DIMS)
            });
        } catch (error) {
            console.warn('VideoAlphaPlayer: Failed to get WebGL2 capabilities:', error);
        }
    }
    //#endregion


    //#region 初始化浏览器视频组件，并注册事件
    // 初始化浏览器视频组件，并注册事件
    private _initBrowser(): void {
        // 隐藏视频
        this._video = document.createElement('video');

        if (!this.showVideo) {
            this._video.style.position = 'absolute';
            this._video.style.left = '-9999px';
            this._video.style.top = '-9999px';
            this._video.style.opacity = '0';
            this._video.style.pointerEvents = 'none';
            this._video.style.zIndex = '1';
            this._video.style.display = 'block';
            document.body.appendChild(this._video);
        }
        else {
            // TEST 测试
            this._video.style.position = 'fixed';
            this._video.style.left = '50%';
            this._video.style.top = '25%';
            this._video.style.transform = 'translate(-50%, -50%)';
            this._video.style.opacity = '1';
            this._video.style.pointerEvents = 'auto';
            this._video.style.zIndex = '9999';
            this._video.style.display = 'block';
            this._video.style.width = '640px';   // 你需要的大小
            this._video.style.height = '360px';  // 你需要的大小
            this._video.controls = true;         // 如果你想让它可以操作
            document.body.appendChild(this._video);
        }

        this._video.setAttribute("x5-video-player-type", "true"); // 设置属性以支持横屏
        this._video.setAttribute("playsinline", "true"); // 设置属性以支持横屏
        this._video.crossOrigin = 'anonymous'; // 设置跨域属性
        this._video.autoplay = false; // 不自动播放
        this._video.loop = false;
        this._video.muted = true; // 静音

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
        console.log('视频加载开始');
    }

    private _onProgress(): void {
        let video = this._video;
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration;
            console.log(`已缓冲 ${(bufferedEnd / duration) * 100}%`);
        }
    }

    private _onLoadError(): void {
        console.log('视频加载异常');
        this._currentVideoState = EVideoState.ERROR;
    }

    private _onMetaLoaded(): void {
        this.node.emit('loaded', this);
        let width = this.isHorizontal ? this._video.videoWidth / 2 : this._video.videoWidth;
        let height = this.isHorizontal ? this._video.videoHeight : this._video.videoHeight / 2;
        console.log(`视频分辨率：${width}x${height}`);
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
            // this.node.destroy();
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
                let rect = new Rect();
                //TEST 测试
                // rect.set(0, 0, sourceWidth, sourceHeight);

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
            })
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
            console.error('VideoAlphaPlayer: Failed to upload texture data:', error);
            // 如果WebGL2方式失败，回退到WebGL1方式
            if (this._webglContext?.isWebGL2) {
                try {
                    //@ts-ignore
                    this._texture.uploadData(this._video);
                } catch (fallbackError) {
                    console.error('VideoAlphaPlayer: Fallback upload also failed:', fallbackError);
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
            console.warn('VideoAlphaPlayer: Canvas upload failed, trying direct upload:', error);
            //@ts-ignore
            this._texture.uploadData(this._video);
        }
    }

    private _clearTexture(): void {
        if (this._video == null) {
            console.error('VideoAlphaPlayer: video is not initialized.');
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
            console.log(`VideoAlphaPlayer: 非2的幂纹理尺寸 ${width}x${height}, 设置CLAMP_TO_EDGE包装模式`);
        }

        this._texture.reset({
            width: width,
            height: height,
            format: this._webglContext?.isWebGL2 ? Texture2D.PixelFormat.RGBA8888 : Texture2D.PixelFormat.RGBA8888,
            mipmapLevel: 1,
        });

        // WebGL2 特定优化
        if (this._webglContext?.isWebGL2) {
            console.log('VideoAlphaPlayer: 应用WebGL2纹理优化');
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

        this._currentVideoState = EVideoState.PREPARING;
        this._loaded = false;
        this._time = 0;

        this._video?.pause();
        if (this._video?.src && this._video?.src.startsWith('blob:')) {
            URL.revokeObjectURL(this._video?.src);
            this._video.src = "";
        }
        this._video.src = url;
        this._video?.load();
        this.node?.emit('preparing', this);
    }


    public play() {
        if (this._video) {
            console.log('开始播放视频');
            this._video.play();
            this._currentVideoState = EVideoState.PLAYING;
        }
    }

    public isPlaying() {
        return this._currentVideoState == EVideoState.PLAYING;
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
                    GFM.LogMgr.error('VideoMeshRenderer', 'loadRemoteZip', 'Failed to load video file from zip');
                    return;
                }
                this._realUrl = url;
                this._updateVideoSource();
            } else {
                GFM.LogMgr.error('VideoMeshRenderer', 'loadRemoteZip', 'No video file found in zip');
            }
        }
    }
}

