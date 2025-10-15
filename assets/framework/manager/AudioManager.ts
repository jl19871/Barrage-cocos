import { AudioClip, AudioSource, director, Node, sys } from "cc";
import NativeWebBridge, { EWebGameEvent } from "./NativeWebBridge";

/*
 * @Author: JL
 * @Date: 2025-01-20 16:53:24
 */
export default class AudioManager {
    private _bgm: Map<AudioClip, number> = null;
    private _effect: Map<number, AudioClip> = null;

    public useNativePlayer: boolean = false; // 是否使用原生播放器

    public vibrateSwitch: boolean = true;
    private _effectSwitch: boolean = true;

    public set effectSwitch(b: boolean) {
        this.setStoItem("effectSwitch", b ? 1 : 0)
        this._effectSwitch = b;
    }

    public get effectSwitch(): boolean {
        return this._effectSwitch;
    }


    private _soundSwitch: boolean = true;
    public set soundSwitch(b: boolean) {
        this.setStoItem("soundSwitch", b ? 1 : 0)
        this._soundSwitch = b;
        if (this._soundSwitch) {
            this.resumeMusic();
        } else {
            this.pauseMusic();
        }
    }

    public get soundSwitch(): boolean {
        return this._soundSwitch;
    }


    private _audioNode: Node = null;
    private _audioSource: AudioSource = null;

    private _musicUrl: string = "";
    private _musicId: string = "";

    private _bgmVolume: number = 1;
    public set bgmVolume(value: number) {
        this._bgmVolume = value;
        if (this.useNativePlayer) return;
        if (this._audioSource.playing) {
            this._audioSource.volume = value;
        }
        else {
            this._audioSource.play();
            this._audioSource.volume = value;
        }
    }

    private _effectVolume: number = 1;
    public set effectVolume(value: number) {
        this._effectVolume = value;
        if (this.useNativePlayer) return;
        for (let i = 0; i < this._effectList.length; i++) {
            this._effectList[i].component.volume = value;
        }
    }


    private _effectUniqueId = 0;
    /**
        {
            id = 1,
            componetnt = null
        }
     */
    private _effectList = [];


    setup() {
        if (this._audioNode) return; //避免切换场景初始化报错
        this.useNativePlayer = false;
        this._effectUniqueId = 0;
        this._effectList = [];
        this._audioNode = new Node('Audio');
        director.getScene().addChild(this._audioNode);
        director.addPersistRootNode(this._audioNode);
        this._audioSource = this._audioNode.addComponent(AudioSource);

        this._effectSwitch = this.getStoItem("effectSwitch", 1);
        this._soundSwitch = this.getStoItem("soundSwitch", 1);
    }

    private setStoItem(key: string, value: any) {
        sys.localStorage.setItem(key, value);
    }

    private getStoItem(key: string, dValue: number): boolean {
        let local = sys.localStorage.getItem(key);
        if (!local) {
            return !!dValue;
        }

        return !!Number(local);
    }

    public audioSource(): AudioSource {
        return this._audioSource;
    }

    //#region 音效相关
    public playEffectByUrl(url: string, bundleName: string = "resources", loop: boolean = false) {
        if (!url || !this.effectSwitch) return;

        if (this.useNativePlayer) {
            GFM.ResMgr.loadAsset<AudioClip>(url, AudioClip, bundleName).then(clip => {
                if (clip) {
                    GFM.NativeWebBridge.sendGameEvent(EWebGameEvent.PLAY_EFFECT, {
                        url: clip.nativeUrl,
                        loop: loop
                    });
                }
            });
            return;
        }

        GFM.ResMgr.loadAsset<AudioClip>(url, AudioClip, bundleName).then(clip => {
            if (clip) {
                this.playEffect(clip, loop);
            }
        });
    }

    public playEffect(clip: AudioClip, loop: boolean = false) {
        if (this.useNativePlayer) return;

        if (clip) {
            let autoRemove = !loop;
            let id = ++this._effectUniqueId;
            let nodeAudioEffect = new Node('AudioEffect' + id);
            nodeAudioEffect.parent = this._audioNode;
            let audioCpt = nodeAudioEffect.addComponent(AudioSource);

            let temp = {
                id: id,
                component: audioCpt
            }
            this._effectList.push(temp);

            audioCpt.clip = clip;
            audioCpt.loop = loop;
            audioCpt.play();
            audioCpt.volume = this._effectVolume;

            if (autoRemove) {
                nodeAudioEffect.once(AudioSource.EventType.ENDED, () => {
                    this.stopEffect(id);
                });
            }
        }
    }

    stopEffect(id?: number) {
        if (this.useNativePlayer) return;

        let index = this._effectList.findIndex((value) => {
            return value.id == id;
        });


        if (!id) {
            index = this._effectList.findIndex(v => v.component.loop)
        }

        if (index >= 0) {
            let cpt = this._effectList[index].component;
            cpt.stop();
            cpt.destroy();
            cpt.node.parent = null;
            this._effectList.splice(index, 1);
            return id;
        }
        return -1;
    }

    pauseEffect(id: number) {
        if (this.useNativePlayer) return;
        let index = this._effectList.findIndex((value) => {
            return value.id == id;
        });
        if (index >= 0) {
            let cpt = this._effectList[index].component;
            cpt.pause();
            return id;
        }
        return -1;
    }

    resumeEffect(id: number) {
        if (this.useNativePlayer) return;
        let index = this._effectList.findIndex((value) => {
            return value.id == id;
        });
        if (index >= 0) {
            let cpt = this._effectList[index].component;
            cpt.resume();
            return id;
        }
        return -1;
    }
    //#endregion

    //#region 播放音乐
    public playMusicByUrl(url: string, bundleName: string = "resources", loop: boolean = true) {
        if (!url || !this.soundSwitch || this._bgmVolume <= 0) return;

        if (this.useNativePlayer) {
            GFM.ResMgr.loadAsset<AudioClip>(url, AudioClip, bundleName).then(clip => {
                if (clip) {
                    this._musicUrl = clip.nativeUrl;
                    GFM.NativeWebBridge.sendGameEvent(EWebGameEvent.PLAY_MUSIC, {
                        url: clip.nativeUrl,
                        loop: loop
                    });
                }
            });
            return;
        }

        GFM.ResMgr.loadAsset<AudioClip>(url, AudioClip, bundleName).then(clip => {
            if (clip) {
                this.playMusic(clip, loop);
            }
        });
    }

    playMusic(clip: AudioClip, loop: boolean = true) {
        if (this._bgmVolume <= 0) return;
        if (this.useNativePlayer) return;
        if (clip) {
            this._audioSource.playOnAwake = false;
            this._audioSource.clip = clip;
            this._audioSource.loop = loop;
            this._audioSource.play();
            this._audioSource.volume = this._bgmVolume;
        }
    }

    stopMusic() {
        if (this.useNativePlayer && this._musicUrl != "") {
            GFM.NativeWebBridge.sendGameEvent(EWebGameEvent.STOP_MUSIC, {
                url: this._musicUrl
            });
            return;
        }

        this._audioSource.stop();
    }

    pauseMusic() {
        if (this.useNativePlayer) {
            this.stopMusic();
            return;
        }
        this._audioSource.pause();
    }

    resumeMusic() {
        if (this.useNativePlayer) {
            if (this._musicUrl != "") {
                GFM.NativeWebBridge.sendGameEvent(EWebGameEvent.PLAY_MUSIC, {
                    url: this._musicUrl,
                    loop: true
                });
            }
            return;
        }
        this._audioSource.play();
    }
    //#endregion

    clear() {
        if (this._audioSource) {
            this._audioSource.stop();
            this._audioSource.destroy();
            this._audioSource = null;
        }
        if (this._effectList) {
            for (let i = 0; i < this._effectList.length; i++) {
                let cpt = this._effectList[i].component;
                cpt.stop();
                cpt.destroy();
                cpt.node.parent = null;
            }
            this._effectList = [];
        }
        this._effectUniqueId = 0;
        this._audioNode.removeAllChildren();
    }
}