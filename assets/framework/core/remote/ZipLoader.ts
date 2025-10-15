import { Asset, assetManager, SpriteFrame, Texture2D } from 'cc';
import JSZip from 'jszip';

// Register the downloader for .zip files
assetManager.downloader.register({
    '.zip': assetManager.downloader['_downloaders']['.bin'],
});

export default class ZipLoader {

    public static loadRemoteZip(url: string): Promise<[string, JSZip]> {
        return new Promise((resolve, reject) => {
            assetManager.loadRemote(url, (error: Error, asset: Asset) => {
                if (error) {
                    GFM.LogMgr.error('ZipLoader', 'loadRemoteZip 1', error.message, ' url: ' + url);
                    resolve([error.message, null]);
                    return;
                }

                if (!(asset instanceof Asset) || !asset.nativeAsset) {
                    GFM.LogMgr.error('ZipLoader', 'loadRemoteZip 2', 'invalid asset', ' url: ' + url);
                    resolve(['invalid asset', null]);
                    return;
                }


                const jszip = new JSZip();
                const nativeAsset = asset.nativeAsset;

                jszip.loadAsync(nativeAsset).then((zip: JSZip) => {
                    resolve([null, zip]);
                }).catch((err: Error) => {
                    GFM.LogMgr.error('ZipLoader', 'loadRemoteZip 3', err.message, ' url: ' + url);
                    resolve([err.message, null]);
                });

            });
        })
    }


    // 转换为文本
    public static toText(file: any): Promise<string> {
        return new Promise((resolve, reject) => {
            if (file && file.async) {
                file.async('text').then((text: string) => {
                    resolve(text);
                }).catch((err: Error) => {
                    GFM.LogMgr.error('ZipLoader', 'toText', err.message);
                    resolve(null);
                });
            } else {
                GFM.LogMgr.error('ZipLoader', 'toText', 'file is not valid');
                resolve(null);
            }
        });
    }

    // 转换为JSON
    public static async toJson(file: any): Promise<any> {
        const text = await this.toText(file);
        if (!text) {
            GFM.LogMgr.error('ZipLoader', 'toJson', 'text is empty');
            return null;
        }
        try {
            return JSON.parse(text);
        } catch (error) {
            GFM.LogMgr.error('ZipLoader', 'toJson', 'JSON parse error: ' + error.message);
            return null;
        }
    }

    // 转换为base64
    public static toBase64(file: any): Promise<string> {
        return new Promise((resolve, reject) => {
            if (file && file.async) {
                file.async('base64').then((base64: string) => {
                    resolve(base64);
                }).catch((err: Error) => {
                    GFM.LogMgr.error('ZipLoader', 'toBase64', err.message);
                    resolve(null);
                });
            } else {
                GFM.LogMgr.error('ZipLoader', 'toBase64', 'file is not valid');
                resolve(null);
            }
        });
    }

    // 转换为SpriteFrame
    public static async toSpriteFrame(file: any): Promise<SpriteFrame> {
        let base64 = await this.toBase64(file);
        if (!base64) {
            GFM.LogMgr.error('ZipLoader', 'toSpriteFrame', 'base64 is empty');
            return null;
        }
        if (!base64.startsWith('data:image/png')) {
            base64 = 'data:image/png;base64,' + base64;
        }

        return ZipLoader.base64ToSpriteFrame(base64);
    }

    // 将base64转换为SpriteFrame 仅支持web
    private static base64ToSpriteFrame(base64: string): SpriteFrame {
        if (!window || !window.document) {
            return null;
        }

        const image = new Image();
        image.src = base64;

        const sp = SpriteFrame.createWithImage(image);
        image.remove();
        return sp;
    }


    // 转换为Texture2D
    public static async toTexture2D(file: any): Promise<Texture2D> {
        let base64 = await this.toBase64(file);
        if (!base64) {
            GFM.LogMgr.error('ZipLoader', 'Texture2D', 'base64 is empty');
            return null;
        }
        if (!base64.startsWith('data:image/png')) {
            base64 = 'data:image/png;base64,' + base64;
        }

        return ZipLoader.base64ToTexture2D(base64);
    }

    // 将base64转换为SpriteFrame 仅支持web
    private static base64ToTexture2D(base64: string): Texture2D {
        if (!window || !window.document) {
            return null;
        }

        const image = new Image();
        image.src = base64;

        const texture = new Texture2D();
        texture.uploadData(image);
        image.remove();
        return texture;
    }

    // 转换为视频地址
    public static toVideo(file: any): Promise<string> {
        return new Promise((resolve, reject) => {
            if (file && file.async) {
                file.async('blob').then((blob: Blob) => {
                    const url = URL.createObjectURL(blob);
                    resolve(url);
                }).catch((err: Error) => {
                    GFM.LogMgr.error('ZipLoader', 'toVideo', err.message);
                    resolve(null);
                });
            } else {
                GFM.LogMgr.error('ZipLoader', 'toVideo', 'file is not valid');
                resolve(null);
            }
        });
    }
}