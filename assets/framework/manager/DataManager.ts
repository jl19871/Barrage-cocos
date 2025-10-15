/*
 * @Author: JL
 * @Date: 2025-05-21 17:49:59
 */
import BaseModel from "../data/model/data/BaseModel";
import { IDataModel } from "../data/model/IDataModel";

export default class DataManager {
    private _tModel: Array<IDataModel> = [];

    private _base: BaseModel;
    public get base(): BaseModel {
        return this._base;
    }

    constructor() {

    }

    newModel<T extends IDataModel>(c: { new(): T }): T {
        let obj = new c();
        this._tModel.push(obj);
        return obj
    }

    clear() {
        this._tModel.forEach(m => {
            m.clear();
        });
    }

    public async setup() {
        this._base = this.newModel(BaseModel);
        await this._base.setup();
        GFM.LogMgr.log("DataManager setup");
    }

}