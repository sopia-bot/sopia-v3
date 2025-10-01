import { app, session, BrowserWindow, ipcMain } from 'electron';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import path from 'path';
import { registerBundleIpc } from './ipc-handler';
export default function createBundleManagerWindow() {
    let win: BrowserWindow | null;
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const createWindow = () => {
        registerBundleIpc();
        // Create the browser window.
        win = new BrowserWindow({
            width: 1200,
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
            title: `소피아 번들 관리자`,
            icon: path.join(__dirname, '../../public/icon_.png'),
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

        if (process.env.WEBPACK_DEV_SERVER_URL) {
            // Load the url of the dev server if in development mode
            win.loadFile(path.join(__dirname, '../public/bundle-manager.html'));
            if (process.env.IS_TEST) { win.webContents.openDevTools(); }
        } else {
            createProtocol('app');
            // Load the index.html when not in development
            if (process.env.IS_TEST) { win.webContents.openDevTools(); }
            win.loadURL('app://./bundle-manager.html');
        }

        win.on('closed', () => {
            win = null;
        });

        // 프로그램 종료 시 다시 시작하는 코드 추가
        app.on('before-quit', (event) => {
            if ( !isDevelopment ) {
                event.preventDefault();
                const { spawn } = require('child_process');
                const path = require('path');
                
                // 현재 실행 파일의 경로
                const exePath = process.execPath;
                const exeDir = path.dirname(exePath);
                const exeFile = path.join(exeDir, 'SOPIAv3.exe');
                
                // 새로운 프로세스 시작
                spawn(exeFile, [], {
                    detached: true,
                    stdio: 'ignore'
                }); 
            }
                
            // 현재 프로세스 종료
            app.exit();
        });

        if ( isDevelopment ) {
            win.once('ready-to-show', () => {
                win?.show();
            });
        }
    };

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

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', async () => {
        session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });

        createWindow();
    });
}
