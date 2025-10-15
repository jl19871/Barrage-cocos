const CHARS: string[] = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

const BASE = 131;
const MOD = 19260817;

/**
 * 可设置随机种子的伪随机数生成器
 */
export default class Random {

    private _seed: number | string;
    public get seed(): number | string {
        return this._seed;
    }

    public set seed(v: number | string) {
        this._seed = v;
    }

    constructor(seed?: number | string) {
        if (this.seed != undefined) {
            this.seed = seed;
        }
        else {
            this.seed = Random.getSeed(8);
        }
    }


    /**
     * 获取区间[0, 1)的浮点数
     */
    public random(): number {
        const seed = typeof this.seed === "string" ? Random.hashCode(this.seed) : this.seed;
        this.seed = (seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    /**
     * 获取区间[min, max]的整数，传入1个参数则区间为[0, min]
     */
    public getInt(min: number, max: number = undefined): number {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    /**
     * 获取区间[min, max)的浮点数，传入1个参数则区间为[0, min)
     */
    public getFloat(min: number, max: number = undefined): number {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return this.random() * (max - min) + min;
    }

    /**
     * 根据权重数组进行随机，返回结果下标
     * @param weightArr 权重数组
     * @returns 随机到的权重数组下标
     */
    public randWeightIdx(weightArr: number[]) {
        let sum = 0;
        for (let i = 0; i < weightArr.length; i++) {
            sum += weightArr[i];
        }
        let randNum = this.getFloat(0, sum);
        let curValue = 0
        for (let i = 0; i < weightArr.length; i++) {
            curValue += weightArr[i];
            if (randNum < curValue) {
                return i;
            }
        }
        return weightArr.length - 1;
    }

    /**
     * Fisher–Yates shuffle 数组随机乱序
     */
    public shuffle<T>(arr: Array<T>): Array<T> {
        for (let i = arr.length - 1; i >= 0; i--) {
            let randomIndex = Math.floor(this.random() * (i + 1));
            [arr[randomIndex], arr[i]] = [arr[i], arr[randomIndex]];
        }
        return arr;
    }

    /**
     * 随机返回数组中的一个元素
     */
    public static arrayRand<T>(arr: Array<T>): T {
        if (arr.length <= 0) {
            return null;
        }
        let ran = Math.floor(Math.random() * (arr.length - 1));
        return arr[ran];
    }

    /**
     * 计算字符串的hash值 返回值>=0
     * @param str 
     * @param initHash 计算的初始值
     */
    public static hashCode(str: string, initHash: number = 0): number {
        let hash = initHash;
        if (!str) {
            return hash;
        }

        for (let i = 0; i < str.length; i++) {
            hash = (BASE * hash + str.charCodeAt(i)) % MOD;
        }
        return hash;
    }

    /**
     * 随机生成一个种子编码
     * @param length 编码字节长度
     */
    public static getSeed(length: number = 8): string {
        let seed = "";
        for (let i = 0; i < length; i++) {
            seed += Random.arrayRand(CHARS);
        }
        return seed;
    }

}
