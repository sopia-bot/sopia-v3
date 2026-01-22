import { app, session, protocol, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
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
import CfgLite from 'cfg-lite';
import { checkAndRunDailyBackup, processPendingRestore } from '../backup-service';
console.log(pkg);


export default function createMainWindow(hideWindow: boolean = false) {
    const adp = app.getPath('userData');

    // 초기화 플래그 확인 - userData 폴더 삭제
    const appCfgPath = path.join(adp, 'app.cfg');
    if (fs.existsSync(appCfgPath)) {
        try {
            const tempCfg = new CfgLite(appCfgPath);
            if (tempCfg.get('reset-flag')) {
                console.log('Reset flag detected, clearing userData folder...');

                // userData 폴더 내 모든 파일/폴더 삭제 (app.cfg 제외하고 먼저 삭제 후 app.cfg도 삭제)
                const items = fs.readdirSync(adp);
                for (const item of items) {
                    const itemPath = path.join(adp, item);
                    try {
                        fs.rmSync(itemPath, { recursive: true, force: true });
                        console.log(`Deleted: ${item}`);
                    } catch (err) {
                        console.error(`Failed to delete ${item}:`, err);
                    }
                }
                console.log('userData folder cleared.');
            }
        } catch (err) {
            console.error('Error checking reset flag:', err);
        }
    }

    if (!fs.existsSync(path.join(adp, 'restore-flag'))) {
        if (fs.existsSync(path.join(adp, 'app.cfg'))) {
            fs.rmSync(path.join(adp, 'app.cfg'));
        }
        fs.writeFileSync(path.join(adp, 'restore-flag'), '1');
        console.log('restore');
    }

    const appCfg = new CfgLite(path.join(adp, 'app.cfg'));
    const windowState = appCfg.get('window-state') || { width: 800, height: 600, x: undefined, y: undefined };

    if (windowState.x < 0) {
        delete windowState.x;
    }

    if (windowState.y < 0) {
        delete windowState.y;
    }

    autoUpdater.logger = log;

    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    let win: BrowserWindow | null;
    let updateWin: BrowserWindow | null = null;
    let tray: Tray | null = null;

    // Scheme must be registered before the app is ready
    protocol.registerSchemesAsPrivileged([
        { scheme: 'app', privileges: { secure: true, standard: true } },
    ]);

    console.log('Development:', isDevelopment);


    // https://pratikpc.medium.com/bypassing-cors-with-electron-ab7eaf331605
    function UpsertKeyValue(obj: Record<string, string | string[]> | undefined, keyToChange: string, value: string[]) {
        const keyToChangeLower = keyToChange.toLowerCase();
        if (!obj) {
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

    const createUpdateWindow = () => {
        if (updateWin) {
            updateWin.focus();
            return { window: updateWin, isNew: false };
        }

        updateWin = new BrowserWindow({
            width: 500,
            height: 400,
            resizable: false,
            maximizable: false,
            minimizable: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            icon: path.join(__dirname, '../public/icon_.png'),
        });

        // 드래그 가능하도록 설정
        updateWin.setMovable(true);

        if (isDevelopment) {
            updateWin.loadURL('file://' + path.join(__dirname, '../public/update.html'));
        } else {
            updateWin.loadURL('file://' + path.join(__dirname, 'update.html'));
        }

        updateWin.on('closed', () => {
            updateWin = null;
        });

        // 업데이트 창 닫기 이벤트 처리
        ipcMain.on('close-update-window', () => {
            if (updateWin) {
                updateWin.close();
            }
        });

        return { window: updateWin, isNew: true };
    };

    const createWindow = () => {
        // Create the browser window.
        win = new BrowserWindow({
            ...windowState,
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

        ipcMain.on('app:reload', () => {
            app.relaunch();
            app.quit();
        });

        ipcMain.on('open-dev-tools', () => {
            win?.webContents.openDevTools();
        });

        // 파일 드롭 이벤트 처리
        win.webContents.on('will-navigate', (event, navigationUrl) => {
            // 파일 드롭으로 인한 네비게이션 방지
            event.preventDefault();
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
                if (!!url.match(/^wss:\/\/.{2}-ssm.spooncast.net\//)) {
                    requestHeaders['Origin'] = 'https://www.spooncast.net';
                } else if (!!url.match(/googlevideo\.com\/videoplayback/)) {
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
            if (!!url.match(/googlevideo\.com\/videoplayback/)) {
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
            if (!process.env.IS_TEST) {
                win.webContents.openDevTools();
            }
        } else {
            createProtocol('app');
            // Load the index.html when not in development
            win.loadURL('app://./index.html');
        }

        // 윈도우 이동 이벤트 감지 (드래그 중)
        let moveTimeout: NodeJS.Timeout | null = null;
        win.on('move', () => {
            if (win) {
                // 기존 타이머 취소
                if (moveTimeout) {
                    clearTimeout(moveTimeout);
                }

                // 이동 중임을 알림
                win.webContents.send('window-moving');

                // 300ms 후에 이동 완료로 간주
                moveTimeout = setTimeout(() => {
                    if (win) {
                        win.webContents.send('window-moved');
                    }
                }, 300);
            }
        });

        // 윈도우 이동 완료 이벤트 (드래그 종료)
        win.on('moved', () => {
            if (win) {
                // 타이머가 있다면 취소하고 즉시 저장
                if (moveTimeout) {
                    clearTimeout(moveTimeout);
                    moveTimeout = null;
                }
                win.webContents.send('window-moved');
            }
        });

        win.on('closed', () => {
            win = null;
        });

        // auto-launch 상태 체크 스케줄러 (10초마다)
        const autoLaunchChecker = setInterval(async () => {
            if (win && !win.isDestroyed()) {
                try {
                    const AutoLaunch = require('auto-launch');
                    const autoLauncher = new AutoLaunch({
                        name: 'SOPIA',
                        path: process.execPath,
                        arguments: ['--mode', 'autolaunch']
                    });

                    const isEnabled = await autoLauncher.isEnabled();
                    if (isEnabled) {
                        win.webContents.send('auto-launch-enabled');
                    }
                } catch (error) {
                    console.error('Auto-launch 상태 확인 오류:', error);
                }
            } else {
                // 윈도우가 없으면 스케줄러 정리
                clearInterval(autoLaunchChecker);
            }
        }, 10000); // 10초마다 실행

        if (isDevelopment) {
            win.once('ready-to-show', () => {
                if (!hideWindow) {
                    win?.show();
                }
            });
        } else {
            if (!hideWindow) {
                win.once('ready-to-show', () => {
                    win?.show();
                    // 메인 윈도우가 보여진 후 1초 뒤에 업데이트 체크 시작
                    setTimeout(() => {
                        autoUpdater.checkForUpdates();
                    }, 1000);
                });
            } else {
                // hideWindow 모드에서는 바로 업데이트 체크
                autoUpdater.checkForUpdates();
            }
        }
    };

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // autolaunch 모드이거나 macOS인 경우 앱을 종료하지 않음
        if (process.platform !== 'darwin' && !hideWindow) {
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

    // 서비스 종료 날짜 (KST)
    const SERVICE_SHUTDOWN_DATE = new Date('2026-02-01T00:00:00+09:00');

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', async () => {
        // Check for pending restore operations
        await processPendingRestore();

        // Register IPC handlers once at app startup
        registerIpcHandler();

        // 서비스 종료 시간 이후 static.spooncast.net 요청 차단
        if (new Date() >= SERVICE_SHUTDOWN_DATE) {
            session.defaultSession.webRequest.onBeforeRequest(
                { urls: ['*://static.spooncast.net/*'] },
                (details, callback) => {
                    console.log('[Service Shutdown] Blocked request to:', details.url);
                    callback({ cancel: true });
                }
            );
        }

        session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
        session.defaultSession.setUserAgent(USER_AGENT);

        // Install Vue Devtools
        try {
            await installExtension([VUEJS_DEVTOOLS, REACT_DEVELOPER_TOOLS]);
        } catch (e: any) {
            console.error('Vue Devtools failed to install:', e.toString());
        }
        createWindow();

        // autolaunch 모드인 경우 트레이 설정
        if (hideWindow) {
            createTray();
        }

        // 자동 백업 실행 (5초 후)
        setTimeout(() => {
            checkAndRunDailyBackup();
        }, 5000);
    });

    // 트레이 생성 함수
    const createTray = () => {
        const iconPath = path.join(__dirname, '../public/icon.png');
        tray = new Tray(nativeImage.createFromPath(iconPath));

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'SOPIA 열기',
                click: () => {
                    if (win) {
                        win.show();
                        win.focus();
                    } else {
                        createWindow();
                    }
                }
            },
            {
                type: 'separator'
            },
            {
                label: '종료',
                click: () => {
                    app.quit();
                }
            }
        ]);

        tray.setContextMenu(contextMenu);
        tray.setToolTip('SOPIA - DJ 보드');

        // 트레이 아이콘 클릭시 윈도우 토글
        tray.on('click', () => {
            if (win) {
                if (win.isVisible()) {
                    win.hide();
                } else {
                    win.show();
                    win.focus();
                }
            } else {
                createWindow();
            }
        });
    };

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
    autoUpdater.on('error', function (error) {
        console.error('error', error);
        if (updateWin) {
            updateWin.webContents.send('update-error', error);
        }
    });

    // 업데이트 체크
    autoUpdater.on('checking-for-update', async () => {
        console.log('Checking-for-update');
        const result = createUpdateWindow();
        if (result && result.window) {
            if (result.isNew) {
                // 새 윈도우인 경우: 완전히 로드된 후에 메시지 전송
                result.window.webContents.once('did-finish-load', () => {
                    result.window.webContents.send('checking-for-update');
                });
            } else {
                // 기존 윈도우인 경우: 바로 메시지 전송
                result.window.webContents.send('checking-for-update');
            }
        }
    });

    // 업데이트할 내용이 있을 때
    autoUpdater.on('update-available', async (info) => {
        console.log('A new update is available', info);
        if (updateWin) {
            updateWin.webContents.send('update-available', {
                version: info.version,
                currentVersion: pkg.version,
                releaseDate: info.releaseDate,
                releaseName: info.releaseName,
                releaseNotes: info.releaseNotes
            });
        }
    });

    // 업데이트할 내용이 없을 때
    autoUpdater.on('update-not-available', async (info) => {
        console.log('update-not-available', info);
        if (updateWin) {
            updateWin.webContents.send('update-not-available', {
                version: info.version
            });
        }
    });

    // 다운로드 진행률
    autoUpdater.on('download-progress', (progressObj) => {
        console.log('Download progress:', progressObj);
        if (updateWin) {
            updateWin.webContents.send('download-progress', {
                percent: progressObj.percent,
                transferred: progressObj.transferred,
                total: progressObj.total,
                bytesPerSecond: progressObj.bytesPerSecond
            });
        }
    });

    //다운로드 완료되면 업데이트
    autoUpdater.on('update-downloaded', async (event, releaseNotes, releaseName) => {
        console.log('update-downloaded');
        if (updateWin) {
            updateWin.webContents.send('update-downloaded');
        }
        // 2초 후 재시작
        setTimeout(() => {
            autoUpdater.quitAndInstall();
        }, 2000);
    });
};