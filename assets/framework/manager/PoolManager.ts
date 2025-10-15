/*
 * @Author: JL
 * @Date: 2025-01-20 16:53:24
 */
import { _decorator, Node, Pool, instantiate, Prefab, warn, error } from 'cc';

export interface PoolRegisterData {
    key: string;       
    prefabPath: string;         
    initialSize: number; 
    bundleName: string;  
    resetHandler?: (node: Node) => void;
}


export default class PoolManager {
    constructor() {

    }

    public async setup() {

    }
    
    private managerNode: Node = new Node('PoolManager');
    private pools: Map<string, Pool<Node>> = new Map();
    private prefabs: Map<string, Prefab> = new Map();
    private pendingRegistrations: Map<string, Promise<void>> = new Map();
    
    /**
     * 异步注册预制体到对象池
     */
    private async registerPrefabAsync(data: PoolRegisterData): Promise<void> {
        if (this.pools.has(data.key) || this.pendingRegistrations.has(data.key)) {
            return;
        }

        const registrationPromise = new Promise<void>(async (resolve, reject) => {
            try {
                const prefab = await GFM.ResMgr.loadAsset<Prefab>(data.prefabPath, Prefab, data.bundleName);
                if (!prefab) {
                    throw new Error(`Prefab ${data.prefabPath} not found`);
                }
        
                this.prefabs.set(data.key, prefab);
        
                const pool = new Pool<Node>(
                    () => {
                        const node = instantiate(prefab);
                        node['__poolKey'] = data.key;
                        return node;
                    },
                    data.initialSize || 10,
                    (node: Node) => {
                        node.active = false;
                        //node.parent = this.managerNode;
                        data.resetHandler?.(node);
                    }
                );
        
                this.pools.set(data.key, pool);
                resolve();
            } catch (err) {
                error(`Failed to register prefab ${data.key}:`, err);
                reject(err);
            } finally {
                if (this.pendingRegistrations.get(data.key) === registrationPromise) {
                    this.pendingRegistrations.delete(data.key);
                }
            }
        });

        this.pendingRegistrations.set(data.key, registrationPromise);
        return registrationPromise;
    }
    
    /**
     * 获取节点实例（自动处理注册）
     * @param data 池配置数据
     * @returns Promise<Node | null>
     */
    async getAsync<T extends Node = Node>(data: PoolRegisterData): Promise<T | null> {
        const { key } = data;
    
        if (this.pools.has(key)) {
            return this.get<T>(key);
        }
    
        let registerPromise = this.pendingRegistrations.get(key);
        if (!registerPromise) {
            registerPromise = this.registerPrefabAsync(data);
            this.pendingRegistrations.set(key, registerPromise);
        }
    
        await registerPromise;
        return this.get<T>(key);
    }
    
    
    /**
     * 从对象池获取节点实例
     * @param key 预制体标识key
     * @returns 节点实例或null
     */
    get<T extends Node = Node>(key: string): T | null {
        if (!this.pools.has(key)) {
            error(`Pool for ${key} not found!`);
            return null;
        }
        
        const pool = this.pools.get(key)!;
        const node = pool.alloc();

        if (!node) {
            warn(`Pool ${key} is exhausted!`);
        }

        // node.active = true;
        return node as T;
    }
    
    /**
     * 回收节点到对象池
     * @param node 要回收的节点
     */
    put(node: Node): void {
        if (!node || !node.isValid || !node['__poolKey']) {
            warn('Invalid node or node is not poolable');
            return;
        }
    
        const key = node['__poolKey'];
        if (!this.pools.has(key)) {
            warn(`Pool for ${key} not found, destroying node`);
            node.destroy();
            return;
        }
    
        node.active = false;
        // node.parent = this.managerNode;
        this.pools.get(key)!.free(node);
    }
    
    
    /**
     * 预加载特定类型的节点
     * @param key 预制体标识key
     * @param count 预加载数量
     */
    preload(key: string, count: number): void {
        if (!this.pools.has(key)) {
            error(`Pool for ${key} not found!`);
            return;
        }
        
        const pool = this.pools.get(key)!;
        const nodes: Node[] = [];
        
        for (let i = 0; i < count; i++) {
            nodes.push(pool.alloc());
        }
        
        // 立即回收预加载的节点
        nodes.forEach(node => pool.free(node));
    }
    
    /**
     * 释放特定类型的对象池
     * @param key 预制体标识key
     * @param destroyNodes 是否销毁所有节点(默认true)
     */
    release(key: string, destroyNodes: boolean = true): void {
        if (!this.pools.has(key)) return;
        
        const pool = this.pools.get(key)!;
        if (destroyNodes) {
            pool.destroy();
        }
        
        this.pools.delete(key);
        this.prefabs.delete(key);
    }
    
    /**
     * 清空所有对象池
     * @param destroyNodes 是否销毁所有节点(默认true)
     */
    clearAll(destroyNodes: boolean = true): void {
        this.pools.forEach((pool, key) => {
            if (destroyNodes) {
                pool.destroy();
            }
        });
    
        this.pools.clear();
        this.prefabs.clear();
        this.pendingRegistrations.clear();
        this.managerNode.destroy(); // 确保 `managerNode` 也被销毁
    }
}