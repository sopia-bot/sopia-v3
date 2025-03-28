import { app, session, protocol, BrowserWindow, ipcMain } from 'electron';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import installExtension, { VUEJS_DEVTOOLS, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import path from 'path';
import fs from 'fs';

import '../init';
import { USER_AGENT, registerIpcHandler } from '../ipc-handler';
import { registerBundleProtocol } from '../bundle-protocol';
import { registerSopiaTextProtocol } from '../stp-protocol';
import pkg from '../../../package.json';
console.log(pkg);


export default function createMainWindow() {
    const adp = app.getPath('userData');
    if ( !fs.existsSync(path.join(adp, 'restore-flag'))) {
        if ( fs.existsSync(path.join(adp, 'app.cfg')) )  {
            fs.rmSync(path.join(adp, 'app.cfg'));
        }
        fs.writeFileSync(path.join(adp, 'restore-flag'), '1');
        console.log('restore');
    }

    autoUpdater.logger = log;

    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    let win: BrowserWindow | null;

    // Scheme must be registered before the app is ready
    protocol.registerSchemesAsPrivileged([
        { scheme: 'app', privileges: { secure: true, standard: true } },
    ]);

    console.log('Development:', isDevelopment);


    // https://pratikpc.medium.com/bypassing-cors-with-electron-ab7eaf331605
    function UpsertKeyValue(obj: Record<string, string|string[]>|undefined, keyToChange: string, value: string[]) {
        const keyToChangeLower = keyToChange.toLowerCase();
        if ( !obj ) {
            return;
        }
        for (const key of Object.keys(obj)) {
            if (key.toLowerCase() === keyToChangeLower) {
                // Reassign old key
                obj[key] = value;
                // Done
                return;
            }
        }
        // Insert at end instead
        obj[keyToChange] = value;
    }

    const createWindow = () => {
        registerIpcHandler();
        // Create the browser window.
        win = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                // Use pluginOptions.nodeIntegration, leave this alone
                // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false, // cors 이슈
                backgroundThrottling: false,
                webviewTag: true,
            },
            frame: false,
            titleBarStyle: 'hidden',
            title: `SOPIA - ${pkg.version}`,
            icon: path.join(__dirname, '../public/icon_.png'),
        });

        ipcMain.on('app:minimize', () => {
            win?.minimize();
        });

        ipcMain.on('app:maximize', () => {
            win?.maximize();
        });

        ipcMain.on('open-dev-tools', () => {
            win?.webContents.openDevTools();
        });

        win.webContents.on('devtools-opened', () => {
            const css = `
                :root {
                    --sys-color-base: var(--ref-palette-neutral100);
                    --source-code-font-family: consolas !important;
                    --source-code-font-size: 12px;
                    --monospace-font-family: consolas !important;
                    --monospace-font-size: 12px;
                    --default-font-family: system-ui, sans-serif;
                    --default-font-size: 12px;
                    --ref-palette-neutral99: #ffffffff;
                }
                .theme-with-dark-background {
                    --sys-color-base: var(--ref-palette-secondary25);
                }
                body {
                    --default-font-family: consolas,system-ui,sans-serif;
                }
            `;
            win?.webContents?.devToolsWebContents?.executeJavaScript(`
                const overriddenStyle = document.createElement('style');
                overriddenStyle.innerHTML = '${css.replaceAll('\n', ' ')}';
                document.body.append(overriddenStyle);
                document.querySelectorAll('.platform-windows').forEach(el => el.classList.remove('platform-windows'));
                addStyleToAutoComplete();
                const observer = new MutationObserver((mutationList, observer) => {
                    for (const mutation of mutationList) {
                        if (mutation.type === 'childList') {
                            for (let i = 0; i < mutation.addedNodes.length; i++) {
                                const item = mutation.addedNodes[i];
                                if (item.classList.contains('editor-tooltip-host')) {
                                    addStyleToAutoComplete();
                                }
                            }
                        }
                    }
                });
                observer.observe(document.body, {childList: true});
                function addStyleToAutoComplete() {
                    document.querySelectorAll('.editor-tooltip-host').forEach(element => {
                        if (element.shadowRoot.querySelectorAll('[data-key="overridden-dev-tools-font"]').length === 0) {
                            const overriddenStyle = document.createElement('style');
                            overriddenStyle.setAttribute('data-key', 'overridden-dev-tools-font');
                            overriddenStyle.innerHTML = '.cm-tooltip-autocomplete ul[role=listbox] {font-family: consolas !important;}';
                            element.shadowRoot.append(overriddenStyle);
                        }
                    });
                }
            `);
        });

        win.webContents.session.webRequest.onBeforeSendHeaders(
            (details, callback) => {
                const { url, resourceType, requestHeaders } = details;
                if ( !!url.match(/^wss:\/\/.{2}-ssm.spooncast.net\//) ) {
                    requestHeaders['Origin'] = 'https://www.spooncast.net';
                } else if ( !!url.match(/googlevideo\.com\/videoplayback/) ) {
                    requestHeaders['Origin'] = 'https://www.youtube.com';
                }
                UpsertKeyValue(requestHeaders, 'Access-Control-Allow-Origin', ['*']);
                callback({
                    requestHeaders,
                });
            },
        );

        win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            const { url, responseHeaders } = details;
            UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['*']);
            UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Headers', ['*']);
            if ( !!url.match(/googlevideo\.com\/videoplayback/) ) {
                UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['https://www.youtube.com']);
            }
            callback({
                responseHeaders,
            });
        });

        session.defaultSession.cookies.set({
            url: 'https://youtube.com',
            name: 'VISITOR_INFO1_LIVE',
            value: 'jVdvrRqAjLg',
        });


        if (process.env.WEBPACK_DEV_SERVER_URL) {
            // Load the url of the dev server if in development mode
            win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
            if (!process.env.IS_TEST) { win.webContents.openDevTools(); }
        } else {
            createProtocol('app');
            // Load the index.html when not in development
            win.loadURL('app://./index.html');
        }

        win.on('closed', () => {
            win = null;
        });

        if ( isDevelopment ) {
            win.once('ready-to-show', () => {
                win?.show();
            });
        } else {
            autoUpdater.checkForUpdates();
        }
    };

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });

    app.userAgentFallback = USER_AGENT;

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', async () => {
        session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
        session.defaultSession.setUserAgent(USER_AGENT);

        // Install Vue Devtools
        try {
            await installExtension([VUEJS_DEVTOOLS, REACT_DEVELOPER_TOOLS]);
        } catch (e) {
            console.error('Vue Devtools failed to install:', e.toString());
        }
        createWindow();
    });

    registerBundleProtocol(app);
    registerSopiaTextProtocol(app);

    // Exit cleanly on request from parent process in development mode.
    if (isDevelopment) {
        if (process.platform === 'win32') {
            process.on('message', (data) => {
                if (data === 'graceful-exit') {
                    app.quit();
                }
            });
        } else {
            process.on('SIGTERM', () => {
                app.quit();
            });
        }
    }

    // 업데이트 오류시
    autoUpdater.on('error', function(error) {
        console.error('error', error);
    });

    // 업데이트 체크
    autoUpdater.on('checking-for-update', async () => {
        console.log('Checking-for-update');
    });

    // 업데이트할 내용이 있을 때
    autoUpdater.on('update-available', async () => {
        console.log('A new update is available');
    });

    // 업데이트할 내용이 없을 때
    autoUpdater.on('update-not-available', async () => {
        console.log('update-not-available');
    });


    //다운로드 완료되면 업데이트
    autoUpdater.on('update-downloaded', async (event, releaseNotes, releaseName) => {
        console.log('update-downloaded');
        autoUpdater.quitAndInstall();
    });
};