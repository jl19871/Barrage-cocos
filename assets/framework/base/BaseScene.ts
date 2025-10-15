/*
 * @Author: JL
 * @Date: 2025-06-11 11:13:38
 */
import { Component, ResolutionPolicy, view } from "cc";
import BlockLayer from "../components/common/BlockLayer";

export type DesignResolutionSize = {
    width: number;
    height: number;
    policy: number;
}

export abstract class BaseScene extends Component {


    protected onLoad(): void {
        // 设置分辨率
        let size = this.setDesignResolutionSize();
        view.setDesignResolutionSize(size.width, size.height, size.policy);
        // 初始化UI层
        GFM.UIMgr.init(null);
        // 初始化屏蔽层
        BlockLayer.getInstance();
    }


    abstract setDesignResolutionSize(): DesignResolutionSize; // 设置分辨率
}