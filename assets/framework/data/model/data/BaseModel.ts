/*
 * @Author: JL
 * @Date: 2025-05-21 17:49:32
 */
import { IDataModel } from "../IDataModel";

export default class BaseModel extends IDataModel {

    public appId: string = "";
    public gameId: string = "";
    public userId: string = "";
    public gameRoundId: string = "";
    public params: any = null;


    constructor() {
        super('base');
    }

    async setup() {

    }

    clear() {
        this.appId = "";
        this.gameId = "";
        this.userId = "";
        this.params = null;
    }
}