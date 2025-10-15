import { Vec2, Vec3 } from "cc";

/*
 * @Author: JL
 * @Date: 2025-01-16 16:17:21
 */
export default class GameTools {
    public static subName(str: string, len: number = 6): string {
        return str.substring(0, len) + (str.length > len ? "..." : "");
    }
}