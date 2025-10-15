import { Asset, AssetManager, assetManager, isValid, JsonAsset, log, native, path, Prefab, resources, sp, Sprite, SpriteAtlas, SpriteFrame, sys } from "cc";

interface ICachedAsset {
    asset: Asset;   // 加载的资源对象
    refCount: number;   // 引用技术
    lastAccessed: number;    // 上次访问时间戳
}

export const assetTypeMap: { [key: string]: typeof Asset } = {
    "sprite": SpriteFrame,
    "spine": sp.SkeletonData,
    "atlas": SpriteAtlas,
    "json": JsonAsset,
    "prefab": Prefab
};

/**
 * 资源管理器, 加载目录支持引用计数, 注意不可父子目录混用
 *  资源路径类型: bundleName:dir/assetName
 * @export
 * @class ResManager
 */
export default class ResManager {

    private _bundleName: string = "resources"; // 默认bundle名称
    public get bundleName(): string {
        return this._bundleName;
    }
    public set bundleName(value: string) {
        this._bundleName = value;
    }


    private _loadedAssets: Map<string, ICachedAsset> = null;
    private _loadedBundles: Map<string, AssetManager.Bundle> = null;
    private _expirationTime: number = 30000; // 未使用资源的过期时间（毫秒）
    private _isReleaseImmediately: boolean = false; //是否立即释放资源

    public async setup(time: number) {
        this._loadedAssets = new Map();
        this._loadedBundles = new Map();
        this._expirationTime = time;
        this._isReleaseImmediately = time <= 0;
        GFM.LogMgr.log("ResManager setup");
    }

    /**
     * 根据资源路径获取资源（bundleName:path）
     * @param path 资源路径 结构为 bundleName:dir/assetName
     * @returns 
     */
    public get<T extends Asset>(path: string, warn = true): T {
        let url = path;
        let index = url.indexOf(":");
        if (index < 0) {
            url = `resources:${path}`;
        }
        let asset = this._loadedAssets.get(url);
        if (asset) {
            return asset.asset as T;
        }
        else {
            if (warn) GFM.LogMgr.warn(`ResManager.get: ${url} not loaded.  path = ${path}`);
            return null;
        }
    }

    /**
     * 根据路径和bundle名获取资源
     * @param path 路径
     * @param bundleName bundle名
     * @returns 
     */
    public getAsset<T extends Asset>(path: string, bundleName?: string): T {
        let key = `${bundleName || 'resources'}:${path}`;
        const cachedAsset = this._loadedAssets.get(key);
        return cachedAsset ? cachedAsset.asset as T : null;
    }

    public getFullPath(path: string, bundleName?: string): string {
        return `${bundleName || 'resources'}:${path}`;
    }

    /**
     * 加载资源
     * @param path 资源路径
     * @param type 资源类型 (cc.Prefab, cc.Texture2D, etc.)
     * @param bundleName 如果资源在某个Bundle中，传入Bundle名称
     * @param onProgress 加载进度回调 (progress: number) => void
     * @returns Promise 返回加载的资源
     */
    public async loadAsset<T extends Asset>(
        path: string,
        type: typeof Asset,
        bundleName?: string,
        onProgress?: (progress: number) => void
    ): Promise<T> {
        const key = `${bundleName || 'resources'}:${path}`;
        const now = Date.now();

        if (this._loadedAssets.has(key)) {
            const cachedAsset = this._loadedAssets.get(key)!;
            cachedAsset.refCount++;
            cachedAsset.lastAccessed = now; // 更新最近访问时间
            return cachedAsset.asset as T;
        }

        return new Promise<T>((resolve) => {
            const bundle = bundleName
                ? this._loadedBundles.get(bundleName)
                : resources;

            if (!bundle) {
                GFM.LogMgr.error(`loadAsset Bundle ${bundleName} not loaded.`);
                resolve(null);
                return;
            }

            bundle.load(
                path,
                type,
                (finish, total) => onProgress?.(finish / total),
                (err, asset) => {
                    if (err) {
                        GFM.LogMgr.error(`Failed to load asset: ${key}`, err);
                        resolve(null);
                    } else {
                        this._loadedAssets.set(key, { asset, refCount: 1, lastAccessed: now });
                        resolve(asset as T);
                    }
                }
            );
        });
    }

    private _releaseAssetAndReduce(key: string, asset: ICachedAsset) {
        let now = Date.now();
        asset.refCount--;
        asset.lastAccessed = now;
        this._releaseAsset(key, asset, now);
    }

    private _releaseAsset(key: string, asset: ICachedAsset, now: number = Date.now()) {
        if (asset.refCount <= 0 && (this._isReleaseImmediately || now - asset.lastAccessed > this._expirationTime)) {
            assetManager.releaseAsset(asset.asset);
            this._loadedAssets.delete(key);
            GFM.LogMgr.log(`Released asset: ${key}`);
        }
    }

    /**
     * 清理未使用的资源
     * @param expirationTime 未使用资源的过期时间（毫秒） 默认30秒
     */
    public clearUnusedAssets() {
        const now = Date.now();
        for (const [key, cachedAsset] of this._loadedAssets.entries()) {
            this._releaseAsset(key, cachedAsset, now);
        }
    }

    /**
     * 加载远程资源
     * @param url 远程资源的 URL
     * @param type 资源类型 (cc.Texture2D, cc.AudioClip, etc.)
     * @param useCache 是否使用本地缓存
     * @param onProgress 加载进度回调 (progress: number) => void
     * @returns Promise 返回加载的资源
     */
    public async loadRemoteAsset<T extends Asset>(
        url: string,
        type: typeof Asset,
        useCache: boolean = true,
    ): Promise<T> {
        return new Promise<T>((resolve) => {
            const key = `remote:${url}`;
            if (this._loadedAssets.has(key)) {
                const cachedAsset = this._loadedAssets.get(key)!;
                cachedAsset.refCount++;
                cachedAsset.lastAccessed = Date.now();
                resolve(cachedAsset.asset as T);
                return;
            }

            assetManager.loadRemote<T>(
                url,
                { cacheEnabled: useCache },
                (err, asset) => {
                    if (err) {
                        GFM.LogMgr.error(`Failed to load remote asset: ${url}`, err);
                        resolve(null);
                    } else {
                        this._loadedAssets.set(key, {
                            asset,
                            refCount: 1,
                            lastAccessed: Date.now(),
                        });
                        resolve(asset);
                    }
                }
            );
        });
    }

    public async loadRemoteHead<T extends Asset>(
        url: string,
        type: typeof Asset,
        useCache: boolean = true,
    ): Promise<T> {
        const key = `remote:${url}`;
        if (this._loadedAssets.has(key)) {
            const cachedAsset = this._loadedAssets.get(key)!;
            cachedAsset.refCount++;
            cachedAsset.lastAccessed = Date.now();
            return cachedAsset.asset as T;
        }

        return new Promise<T>((resolve, reject) => {
            assetManager.loadRemote<T>(
                url + '?x-oss-process=image/format,png/resize,m_fill,h_120,w_120',
                { ext: '.png', cacheEnabled: useCache },
                (err, asset) => {
                    if (err) {
                        reject(err);
                    } else {
                        this._loadedAssets.set(key, {
                            asset,
                            refCount: 1,
                            lastAccessed: Date.now(),
                        });
                        resolve(asset);
                    }
                }
            );
        });
    }


    /**
     * 释放资源
     * @param path 资源路径
     * @param bundleName 如果资源在某个Bundle中，传入Bundle名称
     */
    public releaseAsset(path: string, bundleName?: string) {
        const key = `${bundleName || 'resources'}:${path}`;
        const cachedAsset = this._loadedAssets.get(key);
        if (cachedAsset) {
            this._releaseAssetAndReduce(key, cachedAsset);
        }
    }

    /**
     * 释放所有资源
     */
    public releaseAllAssets() {
        for (const [key, { asset }] of this._loadedAssets.entries()) {
            assetManager.releaseAsset(asset);
            GFM.LogMgr.log(`Released asset: ${key}`);
        }
        this._loadedAssets.clear();
    }

    /**
     * 释放资源管理器
     */
    public release() {
        this.releaseAllAssets();
    }

    /**
     * 加载文件夹(根据文件夹关键字区分类型 参照assetTypeMap)
     * @param dir 文件夹路径 
     * @param bundleName bundle包名称，默认resources
     * @param onProgress 进度回调
     * @returns Promise 返回加载的资源列表(数组)
     */
    public async loadDir<T extends Asset>(dir: string, bundleName?: string, onProgress?: (progress: number) => void
    ): Promise<T[]> {
        const now = Date.now();
        let bundle = bundleName ? this._loadedBundles.get(bundleName) : resources;

        if (!bundle) {
            GFM.LogMgr.warn(`Bundle ${bundleName} not loaded, loading...`);
            await this.loadBundle(bundleName);
            bundle = this._loadedBundles.get(bundleName);
            if (!bundle) {
                throw new Error(`loadDir Bundle ${bundleName} not loaded.`);
            }
        }
        return new Promise<T[]>((resolve) => {
            let assetType: typeof Asset = Asset;
            for (const key in assetTypeMap) {
                if (dir.indexOf(key) >= 0) {
                    assetType = assetTypeMap[key];
                    break;
                }
            }
            bundle.loadDir(dir, assetType, (finish, total) => {
                onProgress?.(finish / total); // 触发加载进度回调
            }, (err, assets) => {
                if (err) {
                    GFM.LogMgr.error(`Failed to load directory: ${dir}`, err);
                    resolve([]);
                } else {
                    const loadedAssets: T[] = [];
                    for (const asset of assets) {
                        GFM.LogMgr.log(`Loaded asset: ${dir}/${asset.name}  type: ${asset.constructor.name}`);
                        const key = `${bundleName || 'resources'}:${dir}/${asset.name}`;
                        if (!this._loadedAssets.has(key)) {
                            this._loadedAssets.set(key, {
                                asset,
                                refCount: 1,
                                lastAccessed: now,
                            });
                        } else {
                            const cachedAsset = this._loadedAssets.get(key)!;
                            cachedAsset.refCount++;
                            cachedAsset.lastAccessed = now;
                        }
                        loadedAssets.push(asset as T);
                    }
                    resolve(loadedAssets);
                }
            });
        });
    }

    /**
     * 释放制定资源目录
     * @param dir 资源路径
     * @param bundleName bundle包名称，默认resources
     */
    public releaseDir(dir: string, bundleName?: string) {
        const bundleKey = bundleName || "resources"; // 默认使用 cc.resources
        for (const [key, cachedAsset] of this._loadedAssets.entries()) {
            // 检查资源是否属于指定目录
            if (key.startsWith(`${bundleKey}:${dir}`)) {
                this._releaseAssetAndReduce(key, cachedAsset);
            }
        }
    }

    /**
     * 加载多个目录
     * @param dirs 资源路径数组
     * @param bundleName bundle包名称，默认resources
     * @param onProgress 进度回调
     * @returns 
     */
    public async loadDirs(dirs: string[], bundleName?: string, onProgress?: (progress: number) => void): Promise<any> {
        if (!dirs || dirs.length === 0) return;
        let index = 0;
        const total = dirs.length;
        let promises = [];
        dirs.map(dir => promises.push(this.loadDir(dir, bundleName, (progress) => {
            if (progress >= 1) {
                index++;
                onProgress?.(index / total);
            }
        })));
        return Promise.all(promises);
    }

    public releaseDirs(dirs: string[], bundleName?: string) {
        dirs.forEach(dir => this.releaseDir(dir, bundleName));
    }

    public loadDirsWithBundleName(dirs: string[], onProgress?: (progress: number) => void): Promise<any> {
        if (!dirs || dirs.length === 0) return;
        let index = 0;
        const total = dirs.length;
        let promises = [];
        dirs.map(dir => {
            let bundleName = dir.split(":")[0];
            dir = dir.split(":")[1];
            promises.push(this.loadDir(dir, bundleName, (progress) => {
                if (progress >= 1) {
                    index++;
                    onProgress?.(index / total);
                }
            }));
        });
        return Promise.all(promises);
    }


    public releaseDirsWithBundleName(dirs: string[]) {
        dirs.forEach(dir => {
            let bundleName = dir.split(":")[0];
            dir = dir.split(":")[1];
            this.releaseDir(dir, bundleName);
        });
    }

    /**
     * 目录是否已加载, 判断引用计数是否大于 0
     *
     * @param path
     * @returns {*}
     */
    public isDirLoaded(path: string, bundleName?: string): boolean {
        const key = `${bundleName || 'resources'}:${path}`;
        return this._loadedAssets.get(key) != null;
    }

    public dumpDirMap() {
        const data = [];
        this._loadedAssets.forEach((v, k) => {
            data.push({ dir: k, type: v.asset.constructor.name, refNum: v.refCount });
        });

        GFM.LogMgr.dump(data);
    }

    // ============================ Bundle相关 ===============================
    /**
     * 加载 Bundle
     * @param bundleName Bundle 名称
     * @returns Promise 返回加载的 Bundle
     */
    public async loadBundle(bundleName: string, bundlePath?: string): Promise<AssetManager.Bundle> {
        if (this._loadedBundles.has(bundleName)) {
            return this._loadedBundles.get(bundleName)!;
        }

        return new Promise((resolve) => {
            if (bundlePath && sys.isNative) {
                GFM.LogMgr.log("loadBundle from write path:", bundlePath);
                assetManager.loadBundle(bundlePath, (err, bundle) => {
                    if (err) {
                        GFM.LogMgr.error("Failed to load Bundle from write path, trying default path:", err);
                        // 如果本地不存在，则尝试加载内置路径
                        assetManager.loadBundle(bundleName, (err2, bundle2) => {
                            if (err2) {
                                // GFM.LogMgr.error("从内置路径加载 Bundle 也失败:", err2);
                                GFM.LogMgr.error("load Bundle Failed from default path:", err2);
                                resolve(null);
                            } else {
                                this._loadedBundles.set(bundleName, bundle2);
                                resolve(bundle2);
                            }
                        });
                    }
                    else {
                        this._loadedBundles.set(bundleName, bundle);
                        resolve(bundle);
                    }
                });
            } else {
                assetManager.loadBundle(bundleName, (err, bundle) => {
                    if (err) {
                        GFM.LogMgr.error("load Bundle Failed:", err);
                        resolve(null);
                    } else {
                        this._loadedBundles.set(bundleName, bundle);
                        resolve(bundle);
                    }
                });
            }
        });
    }

    /**
     * 卸载 Bundle
     * @param bundleName Bundle 名称
     */
    public unloadBundle(bundleName: string) {
        const bundle = this._loadedBundles.get(bundleName);
        if (bundle) {
            bundle.releaseAll();
            this._loadedBundles.delete(bundleName);
            GFM.LogMgr.log(`Unloaded bundle: ${bundleName}`);
        }
    }

    /**
     * 卸载所有 Bundle
     */
    public unloadAllBundles() {
        for (const bundleName of this._loadedBundles.keys()) {
            this.unloadBundle(bundleName);
        }
    }


    // ============================ 预加载spine ===============================
    public preloadSpine(url: string, callback?: Function) {
        log("preloadSpine " + url + " start")
        console.time("加载spine资源 : " + url);

        this.loadAsset<sp.SkeletonData>(url, sp.SkeletonData).then((skeletonData) => {
            if (callback) {
                callback();
            }
            console.timeEnd("加载spine资源 : " + url)
        })
    }

    public showSpine(url: string, spine: sp.Skeleton, callback?: Function) {
        this.loadAsset<sp.SkeletonData>(url, sp.SkeletonData).then((skeletonData) => {
            if (isValid(spine)) {
                spine.skeletonData = skeletonData;
            }
            if (callback) {
                callback()
            }
        });
    }

    public async showSpineSync(url: string, spine: sp.Skeleton) {
        let skeletonData = await this.loadAsset<sp.SkeletonData>(url, sp.SkeletonData);
        if (isValid(spine)) {
            spine.skeletonData = skeletonData;
        }
    }

    // ============================ SpriteFrame ===============================
    public getSpriteFrame(url: string): SpriteFrame {
        let spriteFrame = this.get<SpriteFrame>(url, false);
        if (spriteFrame) {
            return spriteFrame;
        }
        else {
            let spriteFrameName = path.basename(url);
            let spriteAtlasPath = path.dirname(url);
            let spriteAtlas = this.get<SpriteAtlas>(spriteAtlasPath, false);
            if (spriteAtlas) {
                let frame = spriteAtlas.getSpriteFrame(spriteFrameName);
                if (frame) {
                    return frame;
                }
                else {
                    GFM.LogMgr.error("changeSpriteFrame error, spriteFrame is null, url:", url);
                }
            }
            else {
                GFM.LogMgr.error("changeSpriteFrame error, spriteAtlas is null, url:", url);
            }
        }
        return null;
    }
}
