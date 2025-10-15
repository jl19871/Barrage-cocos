/*
 * @Author: JL
 * @Date: 2025-05-21 20:24:18
 */
import { readFileSync } from 'fs-extra';
import { join } from 'path';
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/settings/settings.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/settings/settings.css'), 'utf-8'),
    $: {
        app: '#app',
        langFolder: '#langFolder',
        langSelect: '#langSelect',
        langSelectWrap: '#langSelectWrap',
        refreshBtn: '#refreshBtn',
    },
    methods: {
        hello() {
            if (this.$.app) {
                this.$.app.innerHTML = 'hello';
                console.log('[cocos-panel-html.default]: hello');
            }
        },

        async refreshFolder(needCheck = true) {
            if (this.$.langFolder) {
                const uuid = await Editor.Message.request("i18n-plugin", "getLangFolderUUID");
                if (uuid != "") {
                    // @ts-ignore
                    this.$.langFolder.value = uuid;
                    await this.checkFolder(uuid);
                }
                else {
                    // @ts-ignore
                    this.$.langFolder.value = null;
                    // @ts-ignore
                    this.$.langSelectWrap.style.display = 'none';
                    // @ts-ignore
                    this.$.refreshBtn.style.display = 'none';
                }
            }
        },

        async checkFolder(uuid: string = "") {
            const [code, msg] = await Editor.Message.request('i18n-plugin', 'checkFolder', uuid);
            // @ts-ignore
            this.$.app.innerHTML = msg;
            switch (code) {
                case 0:
                    {
                        const langJson = await Editor.Message.request('i18n-plugin', 'getLangJson');
                        const curLang = await Editor.Message.request('i18n-plugin', 'getCurLang');
                        const langMap = await Editor.Message.request('i18n-plugin', 'getLangMap');

                        // @ts-ignore
                        this.$.langSelectWrap.style.display = '';
                        // @ts-ignore
                        this.$.refreshBtn.style.display = '';
                        // 更新下拉选项
                        const select = this.$.langSelect;
                        // @ts-ignore
                        select.innerHTML = ''; // 清空旧选项
                        Object.keys(langMap).forEach(code => {
                            const opt = document.createElement('option');
                            opt.value = code;
                            opt.innerText = code.toUpperCase();
                            // @ts-ignore
                            select.appendChild(opt);
                        });
                        // @ts-ignore
                        select.value = curLang;
                        this.setLang(curLang);
                    }
                    break;
                case 1:
                    {
                        Editor.Profile.setProject('i18n-plugin', 'langFolder', "");
                        // @ts-ignore
                        this.$.langSelectWrap.style.display = 'none';
                        // @ts-ignore
                        this.$.refreshBtn.style.display = 'none';
                    }
                    break;
                case 3:
                    {
                        await this.refreshFolder(false);
                    }
                    break;
                case 5:
                    {
                        // @ts-ignore
                        this.$.langSelectWrap.style.display = 'none';
                        // @ts-ignore
                        this.$.refreshBtn.style.display = 'none';
                    }
                    break;

            }
        },

        async setLang(lang: string) {
            const [code, msg] = await Editor.Message.request('i18n-plugin', 'setLang', lang);
            // @ts-ignore
            this.$.app?.innerHTML = msg;
        }
    },
    async ready() {
        console.log('ready');
        if (this.$.app) {
            this.$.app.innerHTML = '';
        }
        if (this.$.refreshBtn) {
            this.$.refreshBtn.addEventListener('confirm', async () => {
                await this.refreshFolder();
            });
        }

        if (this.$.langFolder) {
            this.refreshFolder();

            //@ts-ignore
            if (this.$.langFolder.value != null) {
                const curLang = await Editor.Message.request('i18n-plugin', 'getCurLang');
                // @ts-ignore
                this.$.langSelect.value = curLang;
                if (curLang != null) {
                    // @ts-ignore
                    this.setLang(curLang);
                }
            }

            this.$.langFolder.addEventListener('confirm', async (event) => {
                //@ts-ignore
                let uuid = this.$.langFolder.value;
                if (uuid == null || uuid == undefined || uuid == '') {
                    uuid = "-1";
                }
                this.checkFolder(uuid);
            });

            //@ts-ignore
            this.$.langSelect.addEventListener('confirm', async () => {
                //@ts-ignore
                const lang = this.$.langSelect.value;
                this.setLang(lang);
            });
        }
    },
    beforeClose() { },
    close() { },
});
