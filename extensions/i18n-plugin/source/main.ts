// @ts-ignore
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureDirSync, writeJsonSync } from 'fs-extra';
import packageJSON from '../package.json';

export var langMap = {};
export var curLang = "";
export var langJson: { [key: string]: string } = {};

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */
    openPanel() {
        Editor.Panel.open(packageJSON.name);
    },
    refreshLang() {
        checkFolder().then(([code, msg]) => {
            setLang(curLang);
        });
    },
    getLangStr(tid: string) {
        const [id, ...args] = tid.split(",");
        if (langJson == null) {
            return tid;
        }
        let str = langJson[id];
        if (!str) {
            return tid;
        }
        args.forEach((arg: any, index: number) => {
            // str = str.replace("${p" + (index + 1) + "}", arg);
            let g = "\\${p" + (index + 1) + "}";
            let reg = new RegExp(g, "g");
            str = str.replace(reg, arg);
        });
        return str;
    },
    async getLangFolderUUID(url: string = "") {
        return getLangFolderUUID(url);
    },
    async checkFolder(uuid: string = "") {
        return checkFolder(uuid);
    },
    async setLang(lang: string) {
        return setLang(lang);
    },
    getLang() {
        return curLang;
    },
    getLangJson() {
        return langJson;
    },
    getCurLang() {
        return curLang;
    },
    getLangMap() {
        return langMap;
    },
    createFolders() {
        return createFolders();
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export async function load() {
    await getSelectedLang();
    const url = await Editor.Profile.getProject('i18n-plugin', 'langFolder');
    if (url == undefined) {
        Editor.Dialog.warn("请先选择语言目录", {
            buttons: ["确定"],
        });
        methods.openPanel();
    }
    else {
        await checkFolder();
        await setLang(curLang);
    }
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() { }


export async function getLangFolderUUID(url: string = ""): Promise<string> {
    if (url == "") {
        url = await Editor.Profile.getProject('i18n-plugin', 'langFolder');
    }
    if (url == undefined || url == null || url == "") {
        return "";
    }
    let uuid = await Editor.Message.request('asset-db', 'query-uuid', url as any);
    if (uuid == null) {
        return "";
    }
    return uuid;
}

export async function getSelectedLang() {
    curLang = await Editor.Profile.getProject('i18n-plugin', 'curLang');
}

export async function checkFolder(uuid: string = ""): Promise<[number, string]> {
    if (uuid == "-1") {
        Editor.Profile.setProject('i18n-plugin', 'langFolder', "");
        return [1, "未获取到 UUID"];
    }

    if (uuid == "") {
        uuid = await getLangFolderUUID();
    }
    if (uuid == "") {
        return [1, "未获取到 UUID"];
    }

    // 获取路径
    const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
    if (info == null) {
        console.warn('未获取到路径');
        return [2, "未获取到路径"];
    }

    if (info.isDirectory == false) {
        Editor.Dialog.warn('请选择一个文件夹');
        // await refreshFolder(false);
        return [3, "请选择一个文件夹"];
    }

    const url = info.url;
    langMap = {};
    const folders = await Editor.Message.request('asset-db', 'query-assets', {
        pattern: `${url}/*`
    });
    if (folders.length <= 0) {
        return [4, "未获取到语言包"];
    }

    for (const folder of folders) {
        if (folder.isDirectory) {
            const langCode = folder.name;
            const jsonUrl = `${folder.url}/i18n.json`;
            const jsonUUid = await Editor.Message.request('asset-db', 'query-uuid', jsonUrl);
            if (jsonUUid != null && jsonUUid != undefined && jsonUUid != '') {
                // @ts-ignore
                langMap[langCode] = jsonUrl;
            }
        }
    }
    Editor.Profile.setProject('i18n-plugin', 'langFolder', url);

    if (Object.keys(langMap).length <= 0) {
        return [5, "没有获取到配置"];
    }
    else {
        if (curLang == "" || curLang == undefined) {
            curLang = Object.keys(langMap)[0];
        }
        setLang(curLang);
        return [0, "获取语言包成功"];
    }
}

export async function setLang(lang: string): Promise<[number, string]> {
    //@ts-ignore
    const jsonUrl = langMap[lang];
    if (jsonUrl == undefined) {
        return [1, "未获取到语言包"];
    }
    try {
        const nativeUrl = await Editor.Message.request('asset-db', 'query-path', jsonUrl);
        const file = readFileSync(nativeUrl as any, 'utf-8');
        const json = JSON.parse(file);

        curLang = lang;
        langJson = json;
        await Editor.Message.request('scene', 'soft-reload');
        // 显示 key-value
        const result = Object.entries(json)
            .map(([k, v]) => `${k}: ${v}`)
            .join('<br>');

        return [0, `<b>${lang}</b> 的翻译内容：<br>${result}`];
    } catch (e) {
        return [2, `❌ 加载 ${lang} 的 i18n.json 失败`];
    }
}

export async function createFolders() {
    const uuids = Editor.Selection.getSelected("asset");
    if (uuids.length <= 0) {
        Editor.Dialog.warn("请先选择一个文件夹", {
            buttons: ["确定"],
        });
        return;
    }
    const uuid = uuids[0];
    const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
    if (info?.isDirectory === false) {
        Editor.Dialog.warn("请选择一个文件夹", {
            buttons: ["确定"],
        });
        return;
    }
    // console.log("创建语言包文件夹", info);
    const rootDir = info?.file;
    // console.log("创建语言包文件夹根目录", rootDir);

    const result = await Editor.Dialog.info("是否在当前目录下\n" + info?.name + "\n创建多语言目录", {
        buttons: ["确定", "取消"],
    });

    if (result.response !== 0) return;
    const langs = ['zh'];
    const subDirs = ['font', 'img'];

    for (const lang of langs) {
        // @ts-ignore
        const langPath = join(rootDir, 'lang', lang);
        for (const sub of subDirs) {
            const path = join(langPath, sub);
            ensureDirSync(path);
            // console.log(`创建子目录: ${path}`);
        }
        // 创建 i18n.json
        const i18nPath = join(langPath, 'i18n.json');
        // console.log(`创建 i18n.json: ${i18nPath}`);
        writeJsonSync(i18nPath, { "TID_TEST1": "测试1" }, { spaces: 2 });

        Editor.Message.request('asset-db', 'refresh-asset', langPath);
    }
}
