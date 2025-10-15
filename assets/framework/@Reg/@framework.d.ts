/*
 * @Author: JL
 * @Date: 2025-01-13 11:32:35
 */
import { GFM } from "./GFM";

export { };

declare global {
    /**@description 全局GFM使用 */
    const GFM: GFM & {}
}

declare global {
    interface Window {
        GFM: GFM
    }
} 