import path from 'path';
import { app, BrowserWindow, ipcMain, IpcMainEvent, dialog, shell, Tray, Menu, nativeImage } from 'electron';
import { ChildProcess, execSync, spawn } from 'child_process';
import { install as npmInstall, InstallItem, InstallOptions } from 'npkgi';
import express, { Application } from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import axios from 'axios';
import Module, { createRequire } from 'module';
import { bun, bunx } from './bun';
import AdmZip from 'adm-zip';
import AutoLaunch from 'auto-launch';

import CfgLite from 'cfg-lite';
import fs from 'fs';
import vm from 'vm';
import pkg from '../../package.json';
import { registerStpApp, unregisterStpApp } from './stp-protocol';
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';

const isDevelopment = process.env.NODE_ENV !== 'production';

let isIpcHandlerRegistered = false;

type PathType = 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps' | 'sessionData';
const CfgList: Record<string, any> = {};
const getPath = (type: PathType, ...args: string[]) => path.resolve(app.getPath(type), ...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 전역 트레이 변수
let globalTray: Tray | null = null;

// 트레이 생성 함수
function createTray() {
	if (globalTray) {
		return globalTray; // 이미 트레이가 있으면 기존 것 반환
	}

	try {
		const iconPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), './resources/icon.png') : path.join(__dirname, '../public/icon.png');
		globalTray = new Tray(nativeImage.createFromPath(iconPath));

		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'SOPIA 열기',
				click: () => {
					const windows = BrowserWindow.getAllWindows();
					const mainWindow = windows.find(win => !win.isDestroyed());
					if (mainWindow) {
						mainWindow.show();
						mainWindow.focus();
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

		globalTray.setContextMenu(contextMenu);
		globalTray.setToolTip('SOPIA - DJ 보드');

		// 트레이 아이콘 클릭시 윈도우 토글
		globalTray.on('click', () => {
			const windows = BrowserWindow.getAllWindows();
			const mainWindow = windows.find(win => !win.isDestroyed());
			if (mainWindow) {
				if (mainWindow.isVisible()) {
					mainWindow.hide();
				} else {
					mainWindow.show();
					mainWindow.focus();
				}
			}
		});

		console.log('트레이가 생성되었습니다.');
		return globalTray;
	} catch (error) {
		console.error('트레이 생성 오류:', error);
		return null;
	}
}

export function registerIpcHandler() {
	if (isIpcHandlerRegistered) {
		console.log('IPC handlers already registered, skipping...');
		return;
	}

	isIpcHandlerRegistered = true;
	console.log('Registering IPC handlers...');

	ipcMain.on('cfg-lite', (evt: IpcMainEvent, prop: string, file: string, ...args: any) => {
		const key = file;
		let rtn: any = null;
		console.log(`cfg-lite: prop=${prop},file=${file},argc=${args.length}, args=${args.join()}`);
		try {
			if (prop === 'new') {
				const tmp = new CfgLite(file, args[0]);
				CfgList[key] = tmp;
				rtn = true;
			} else {
				if (typeof CfgList[key][prop] === 'function') {
					rtn = CfgList[key][prop](...args);
				} else {
					rtn = CfgList[key][prop];
				}
			}
			evt.returnValue = rtn;
		} catch (err: any) {
			console.log('cfg-lite: Cannot open cfg file.', file, err.message);
			evt.returnValue = false;
		}
	});

	ipcMain.on('open-browser', (evt: IpcMainEvent, url: string) => {
		shell.openExternal(url);
	});

	ipcMain.on('zip:create', (evt: IpcMainEvent, src: string, dst: string) => {
		console.log('zip:create', src, dst);
		try {
			const zip = new AdmZip();
			zip.addLocalFolder(src);
			zip.writeZip(dst);
			evt.returnValue = true;
		} catch (err) {
			console.error(err);
			evt.returnValue = false;
		}
	});

	ipcMain.on('zip:uncompress-buffer', (evt: IpcMainEvent, b64str: string, dst: string) => {
		console.log('zip:uncompress-buffer', dst);
		try {
			const zip = new AdmZip(Buffer.from(b64str, 'base64'));
			zip.extractAllTo(dst, true);
			evt.returnValue = true;
		} catch (err) {
			console.error(err);
			evt.returnValue = false;
		}
	});

	ipcMain.on('isdev', (evt: IpcMainEvent) => {
		evt.returnValue = isDevelopment;
	});

	ipcMain.on('app:get-path', (evt: IpcMainEvent, type: string) => {
		evt.returnValue = app.getPath(type as any);
	});

	ipcMain.on('is-packaged', (evt: IpcMainEvent) => {
		evt.returnValue = app.isPackaged;
	});

	ipcMain.on('root-path', (evt: IpcMainEvent) => {
		if (app.isPackaged) {
			evt.returnValue = path.dirname(process.execPath);
		} else {
			evt.returnValue = process.cwd();
		}
	});

	const buildTime = (time: Date): string => {
		const yyyy = time.getFullYear();
		const mm = (time.getMonth() + 1).toString().padStart(2, '0');
		const dd = (time.getDate()).toString().padStart(2, '0');

		const hh = time.getHours().toString().padStart(2, '0');
		const MM = time.getMinutes().toString().padStart(2, '0');
		const ss = time.getSeconds().toString().padStart(2, '0');

		return `${yyyy}${mm}${dd}-${hh}${MM}${ss}`;
	};
	const startTime = buildTime(new Date());
	ipcMain.on('start-time', (evt: IpcMainEvent, type: string) => {
		evt.returnValue = startTime;
	});

	function pickProgram(list: string[]) {
		for (const item of list) {
			if (fs.existsSync(item)) {
				return item;
			}
		}
		return '';
	}

	function getChromePathWindows() {
		try {
			const chromePath = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve', { encoding: 'utf-8' });
			const chromePathMatch = chromePath.match(/\s*REG_SZ\s*(.*?)\s*$/i);

			if (chromePathMatch && chromePathMatch[1]) {
				const chromeInstallPath = chromePathMatch[1];
				return chromeInstallPath;
			} else {
				console.log('Chrome path not found in the registry.');
			}
		} catch (error) {
			console.error('An error occurred:', error);
		}
		return '';
	}

	function getChromeProcessWindows() {
		try {
			const stdbuf = execSync('wmic process where "name like \'%chrome.exe%\'" get processid,workingsetsize');
			const stdout = stdbuf.toString('utf-8');

			const processes = stdout.trim().split('\n').slice(1); // 헤더 행 제거

			if (processes.length === 0) {
				console.log('실행 중인 크롬 브라우저 프로세스가 없습니다.');
			} else {
				console.log('실행 중인 크롬 브라우저 프로세스:');
				return processes.map(line => {
					const [pid, memory] = line.trim().split(/\s+/);
					console.log(`- PID: ${pid}, 메모리 사용량: ${(parseInt(memory) / 1024).toFixed(2)} MB`);
					return pid;
				});
			}
		} catch (err) {
			if (err) {
				console.error('프로세스 정보 가져오기 실패:', err);
			}
		}
		return [];
	}

	function isChromeRunning() {
		switch (process.platform) {
			case 'win32':
				const pids = getChromeProcessWindows();
				return pids.length > 0;
		}
		return false;
	}

	function checkExtVersion(version: string) {
		if (fs.existsSync(getPath('userData', `ext-${version}`))) {
			return true;
		}
		if (fs.existsSync(getPath('userData', 'login-ext'))) {
			fs.rmSync(getPath('userData', 'login-ext'), { recursive: true });
		}
		fs.writeFileSync(getPath('userData', `ext-${version}`), '');
		return true;
	}

	let loginServer: HttpServer | null = null;
	let loginWebContents: Electron.WebContents | null = null;

	// 로그인 창 열기 요청
	ipcMain.on('ext-login-open', async (evt) => {
		loginWebContents = evt.sender;

		try {
			// install extension
			let executablePath = '';
			switch (process.platform) {
				case 'darwin':
					executablePath = pickProgram([
						'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
					]);
					break;
				case 'win32':
					executablePath = pickProgram([
						getChromePathWindows(),
						`C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
						`C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
					]);
					break;
			}

			if (!executablePath) {
				dialog.showErrorBox('Error', '크롬 실행 파일을 찾을 수 없습니다.');
				console.log('Can not find Chrome exe file');
				loginWebContents?.send('ext-login-result', {
					success: false,
					status: '101',
					error: '크롬 실행 파일을 찾을 수 없습니다.',
				});
				return;
			}

			checkExtVersion(pkg.version);

			const extensionPath = getPath('userData', 'login-ext');
			if (!fs.existsSync(extensionPath)) {
				console.log('Downloading Chrome extension');
				const res = await axios.get('https://sopia-v3.s3.ap-northeast-2.amazonaws.com/sopia-login-ext.zip', {
					responseType: 'arraybuffer',
				});
				const buf = res.data;
				const archive = new AdmZip(buf);
				archive.extractAllTo(extensionPath);
			}

			// 기존 서버가 있으면 종료
			if (loginServer) {
				loginServer.close();
				loginServer = null;
			}

			let proc: ChildProcess | null = null;

			const expressApp = express();
			expressApp.use(cors());
			expressApp.use(express.json());

			expressApp.get('/check', (_, res) => {
				res.json({ success: true });
			});

			expressApp.post('/spoon-login', (req, res) => {
				console.log('body', req.body);
				res.json({});
				proc?.kill();

				// 로그인 결과를 renderer로 전송
				loginWebContents?.send('ext-login-result', {
					success: true,
					status: '100',
					data: req.body,
				});

				// 서버 종료
				if (loginServer) {
					loginServer.close();
					loginServer = null;
				}
			});

			loginServer = expressApp.listen(19595, () => {
				console.log('express server listen', 19595);

				const url = `https://sopia.dev/extension-loader?redirect=${encodeURIComponent('https://www.spooncast.net/kr')}`;
				proc = spawn(executablePath, [
					`${url}`
				]);
			});

			// 서버 에러 핸들링
			loginServer.on('error', (err) => {
				console.error('Server error:', err);
				loginWebContents?.send('ext-login-result', {
					success: false,
					status: '999',
					error: err.message,
				});
			});

		} catch (err: any) {
			dialog.showErrorBox('Error', '알 수 없는 오류가 발생했습니다.\n' + err.message);
			console.error(err);
			loginWebContents?.send('ext-login-result', {
				success: false,
				status: '999',
				error: err.message,
			});
		}
	});

	// 로그인 취소 요청
	ipcMain.on('ext-login-cancel', () => {
		if (loginServer) {
			loginServer.close();
			loginServer = null;
		}
		console.log('Login cancelled');
	});

	ipcMain.on('open-chrome', (event, url: string) => {
		// install extension
		let executablePath = '';
		switch (process.platform) {
			case 'darwin':
				executablePath = pickProgram([
					'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
				]);
				break;
			case 'win32':
				executablePath = pickProgram([
					getChromePathWindows(),
					`C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
					`C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
				]);
				break;
		}
		const proc = spawn(executablePath, [
			`${url}`
		]);
	})

	ipcMain.handle('open-dialog', async (event, options: any) => {
		return await dialog.showOpenDialog(options);
	});

	ipcMain.handle('npm:install', async (event, packages: InstallItem[], options: InstallOptions) => {
		return await npmInstall(packages, options);
	});

	ipcMain.handle('bun:install', async (event, pkgPath: string) => {
		const bunExec = await bun(['install', '--production'], {
			cwd: pkgPath,
		});

		const postscript = path.join(pkgPath, 'postscript.js');
		if (fs.existsSync(postscript)) {
			const scriptText = fs.readFileSync(postscript, 'utf-8');
			const script = new vm.Script(scriptText);
			const moduleObj: { exports: any } = { exports: {} };
			const bundleRequire = createRequire(postscript);
			const context = {
				require: function (name) {
					try {
						return bundleRequire(name);
					} catch {
						return __non_webpack_require__(name);
					}
				},
				Buffer,
				__dirname: path.dirname(postscript),
				__filename: postscript,
				__pkgdir: pkgPath,
				module: moduleObj,
				process,
				exports: moduleObj.exports,
				console,
				setTimeout,
				setInterval,
				clearTimeout,
				clearInterval,
				bun,
				bunx,
			};
			vm.createContext(context);
			try {
				script.runInContext(context, {
					displayErrors: true,
				});
			} catch (err) {
				console.error(err);
				return false;
			}
		}

		return true;
	});

	const readDirectory = (dir: string, cb: (...args: any) => any, oriDir?: string) => {
		if (!oriDir) {
			oriDir = dir;
			dir = '';
		}

		const target = path.resolve(oriDir, dir);
		const items = fs.readdirSync(target);
		items.forEach((item: string) => {
			const t = path.resolve(target, item);
			const st = path.join(dir, item).replace(/\\/g, '/');
			const stat = fs.statSync(t);
			cb(st, stat.isDirectory());
			if (stat.isDirectory()) {
				readDirectory(st, cb, oriDir);
			}
		});
	};

	ipcMain.on('package:create', (evt: IpcMainEvent, src: string, dst: string) => {
		console.log('package:create', src, dst);
		try {
			const pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
			let ignore: string[] = [];
			if (pkg.sopia) {
				ignore = (pkg?.sopia?.['ignore:upload'] || []).map((i: string) => path.join(src, i));
			}

			const zip = new AdmZip();
			readDirectory(src, (p: string, isDir: boolean) => {
				if (!isDir) {
					const fullPath = path.join(src, p);
					const isIgnore = ignore.some(i => fullPath.startsWith(i));
					if (isIgnore) {
						return;
					}
					zip.addLocalFile(fullPath, path.dirname(p));
				}
			});

			zip.writeZip(dst);
			evt.returnValue = true;
		} catch (err) {
			console.error(err);
			evt.returnValue = false;
		}
	});

	ipcMain.on('package:uncompress-buffer', (evt: IpcMainEvent, b64str: string, dst: string) => {
		console.log('package:uncompress-buffer', dst);

		if (!fs.existsSync(dst)) {
			fs.mkdirSync(dst);
		}

		try {
			const zip = new AdmZip(Buffer.from(b64str, 'base64'));
			const pkgEntry = zip.getEntry('package.json');
			if (!pkgEntry) {
				return false;
			}

			const pkg = JSON.parse(pkgEntry.getData().toString('utf8'));
			const ignore = (pkg?.sopia?.['ignore:fetch'] || []).map((i: string) => path.join(dst, i));
			console.log(`package:uncompress-buffer: ignoring list ${ignore.join(',')}`);

			zip.getEntries().forEach((entry) => {
				const target = path.join(dst, entry.entryName);
				console.log('target', target, fs.existsSync(target));
				if (fs.existsSync(target)) {
					const isIgnore = ignore.some(i => target.startsWith(i));
					console.log('isIgnore', isIgnore);
					if (isIgnore) {
						return;
					}
				}
				const dirname = path.dirname(target);
				if (!fs.existsSync(dirname)) {
					fs.mkdirSync(dirname, { recursive: true });
				}
				zip.extractEntryTo(entry, dirname, false, true);
			});

			evt.returnValue = true;
		} catch (err) {
			console.error(err);
			evt.returnValue = false;
		}
	});

	ipcMain.on('app:quit', (evt: IpcMainEvent) => {
		app.quit();
	});

	// 윈도우를 트레이로 숨기기
	ipcMain.on('app:hide-to-tray', (evt: IpcMainEvent) => {
		const win = BrowserWindow.fromWebContents(evt.sender);
		if (win) {
			// 트레이가 없으면 생성
			if (!globalTray) {
				createTray();
			}
			win.hide();
			console.log('윈도우가 트레이로 숨겨졌습니다.');
		}
	});

	ipcMain.handle('stp:regist', async (evt, domain: string, targetFile: string, packageDir: string) => {
		if (fs.existsSync(targetFile)) {
			const scriptText = fs.readFileSync(targetFile, 'utf-8');
			console.log('targetFile', targetFile);
			const script = new vm.Script(scriptText);
			const moduleObj: { exports: any } = { exports: {} };
			const bundleRequire = createRequire(targetFile);
			const context = {
				require: function (name) {
					try {
						console.log('require resolve', bundleRequire.resolve(name));
						return bundleRequire(name);
					} catch (err) {
						console.error(err);
						return __non_webpack_require__(name);
					}
				},
				Buffer,
				__dirname: path.dirname(targetFile),
				__filename: targetFile,
				__pkgdir: packageDir,
				setTimeout,
				setInterval,
				clearTimeout,
				clearInterval,
				module: moduleObj,
				process,
				exports: moduleObj.exports,
				console,
				URLSearchParams,
				URL,
				fetch,
				bun,
				bunx,
			};
			vm.createContext(context);
			try {
				script.runInContext(context, {
					displayErrors: true,
				});
				let app = context.module.exports?.default ?? context.module.exports;
				registerStpApp(domain, app as Application, script);
				return {
					success: true,
				};
			} catch (err) {
				console.error(err);
				return {
					success: false,
					detail: err,
				};
			}
		} else {
			console.log('Can not find ', targetFile);
		}
	});

	ipcMain.handle('stp:unregister', async (evt, domain: string) => {
		unregisterStpApp(domain);
		return true;
	});

	ipcMain.handle('open-bundle-manager', async (evt) => {
		const exePath = process.execPath;
		let exeDir = path.dirname(exePath);


		// macOS에서는 .app/Contents/MacOS/ 경로에서 dist_electron/mac-arm64로 이동
		if (process.platform === 'darwin') {
			exeDir = path.join(exeDir, '../../../');
			spawn('open', [
				'-a', path.join(exeDir, 'SopiaBundleManager.app'), // 실행할 앱 경로
				'--args', // 앱에 인자 전달
				'--mode', 'bundle-manager',
			], {
				detached: true,
				stdio: 'ignore',
			});
		} else if (process.platform === 'win32') {
			const exeFile = path.join(exeDir, 'SopiaBundleManager.exe');
			spawn(exeFile, ['--mode', 'bundle-manager'], {
				detached: true,
				stdio: 'ignore',
			});
		}

		return true;
	});

	// Auto Launch 설정
	const autoLauncher = new AutoLaunch({
		name: 'SOPIA',
		path: process.execPath,
		arguments: ['--mode', 'autolaunch']
	});

	// 자동 실행 상태 확인
	ipcMain.handle('auto-launch-status', async (evt) => {
		try {
			const isEnabled = await autoLauncher.isEnabled();
			return isEnabled;
		} catch (error) {
			console.error('자동 실행 상태 확인 오류:', error);
			return false;
		}
	});

	// 자동 실행 토글
	ipcMain.handle('auto-launch-toggle', async (evt, enable: boolean) => {
		try {
			if (enable) {
				await autoLauncher.enable();
				console.log('자동 실행 활성화됨');
			} else {
				await autoLauncher.disable();
				console.log('자동 실행 비활성화됨');
			}
			return { success: true };
		} catch (error: any) {
			console.error('자동 실행 설정 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// ==================== 백업 관련 IPC 핸들러 ====================

	// 디스크 정보 조회 (Windows)
	ipcMain.handle('backup:get-disk-info', async (evt, drive: string = 'C:') => {
		try {
			if (process.platform === 'win32') {
				const output = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get Size,FreeSpace /format:csv`, { encoding: 'utf-8' });
				const lines = output.trim().split('\n').filter(line => line.trim() && !line.startsWith('Node'));
				if (lines.length > 0) {
					const parts = lines[0].split(',');
					const freeSpace = parseInt(parts[1]) || 0;
					const totalSize = parseInt(parts[2]) || 0;
					return {
						success: true,
						total: totalSize,
						free: freeSpace,
						used: totalSize - freeSpace,
					};
				}
			}
			return { success: false, error: 'Unsupported platform' };
		} catch (error: any) {
			console.error('디스크 정보 조회 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 폴더 용량 조회 (재귀적)
	function getFolderSize(folderPath: string): number {
		let totalSize = 0;
		try {
			if (!fs.existsSync(folderPath)) return 0;
			const files = fs.readdirSync(folderPath);
			for (const file of files) {
				const filePath = path.join(folderPath, file);
				const stats = fs.statSync(filePath);
				if (stats.isDirectory()) {
					totalSize += getFolderSize(filePath);
				} else {
					totalSize += stats.size;
				}
			}
		} catch (error) {
			console.error(`폴더 용량 조회 오류 (${folderPath}):`, error);
		}
		return totalSize;
	}

	// sopia-v3 폴더 용량 조회 (1뎁스)
	ipcMain.handle('backup:get-folder-sizes', async (evt) => {
		try {
			const sopiaPath = getPath('userData');
			const items = fs.readdirSync(sopiaPath);
			const sizes: Record<string, number> = {};

			for (const item of items) {
				const itemPath = path.join(sopiaPath, item);
				const stats = fs.statSync(itemPath);
				if (stats.isDirectory()) {
					sizes[item] = getFolderSize(itemPath);
				} else {
					sizes[item] = stats.size;
				}
			}

			const total = Object.values(sizes).reduce((sum, size) => sum + size, 0);

			return {
				success: true,
				total,
				items: sizes,
				path: sopiaPath,
			};
		} catch (error: any) {
			console.error('폴더 용량 조회 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 설치된 번들 리스트 조회
	ipcMain.handle('backup:get-bundles', async (evt) => {
		try {
			const bundlesPath = getPath('userData', 'bundles');
			if (!fs.existsSync(bundlesPath)) {
				return { success: true, bundles: [] };
			}

			const bundles: any[] = [];
			const folders = fs.readdirSync(bundlesPath);

			for (const folder of folders) {
				const bundlePath = path.join(bundlesPath, folder);
				const pkgPath = path.join(bundlePath, 'package.json');

				if (fs.existsSync(pkgPath)) {
					try {
						const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
						const pkgInfo = JSON.parse(pkgContent);
						bundles.push({
							id: folder,
							name: pkgInfo['name:ko'] || pkgInfo['name'] || folder,
							version: pkgInfo['version'] || '0.0.0',
							description: pkgInfo['description:ko'] || pkgInfo['description'] || '',
							path: bundlePath,
						});
					} catch (error) {
						console.error(`번들 정보 파싱 오류 (${folder}):`, error);
					}
				}
			}

			return { success: true, bundles };
		} catch (error: any) {
			console.error('번들 리스트 조회 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 백업 생성
	// 백업 생성
	ipcMain.handle('backup:create', async (evt, options: {
		name: string;
		description: string;
		items: {
			bundles?: string[];
			sopiaCode?: boolean;
			history?: boolean;
			appSettings?: boolean;
			cmdSettings?: boolean;
			localStorage?: boolean;
		};
		onProgress?: (progress: number, message: string) => void;
	}) => {
		try {
			const { createBackup } = require('./backup-service');
			return await createBackup({
				...options,
				onProgress: (progress: number, message: string) => {
					evt.sender.send('backup:progress', progress, message);
				}
			});
		} catch (error: any) {
			console.error('백업 생성 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 백업 목록 조회
	ipcMain.handle('backup:list', async (evt) => {
		try {
			const { listBackups } = require('./backup-service');
			return await listBackups();
		} catch (error: any) {
			console.error('백업 목록 조회 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 백업 파일 내 파일 목록 조회
	ipcMain.handle('backup:get-file-list', async (evt, backupFilePath: string) => {
		try {
			const zip = new AdmZip(backupFilePath);
			const entries = zip.getEntries();
			const files: any[] = [];

			for (const entry of entries) {
				if (!entry.isDirectory && entry.entryName !== 'metadata.json') {
					files.push({
						name: entry.entryName,
						size: entry.header.size,
						compressedSize: entry.header.compressedSize,
					});
				}
			}

			return { success: true, files };
		} catch (error: any) {
			console.error('파일 목록 조회 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// ... (previous code)

	// 백업 복원 요청 (재시작)
	ipcMain.handle('backup:request-restore', async (evt, options: any) => {
		try {
			const { requestRestore } = require('./backup-service');
			return await requestRestore(options);
		} catch (error: any) {
			console.error('복원 요청 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 백업 복원 (Legacy or Direct)
	ipcMain.handle('backup:restore', async (evt, options: {
		backupFilePath: string;
		items: {
			bundles?: string[]; // 선택된 번들 ID 배열
			sopiaCode?: boolean;
			history?: boolean;
			appSettings?: boolean;
			cmdSettings?: boolean;
			localStorage?: boolean;
		};
		overwrite: Record<string, boolean>; // 각 항목별 덮어쓰기 여부
	}) => {
		// Direct restore using service (if needed without restart, though recommended to use request-restore)
		try {
			const { restoreBackup } = require('./backup-service');
			return await restoreBackup(options);
		} catch (error: any) {
			console.error('복원 오류:', error);
			return { success: false, error: error.message };
		}
	});


	// 백업 충돌 확인
	ipcMain.handle('backup:check-conflicts', async (evt, backupFilePath: string, selectedItems: any) => {
		try {
			const zip = new AdmZip(backupFilePath);
			const metadataEntry = zip.getEntry('metadata.json');
			if (!metadataEntry) {
				return { success: false, error: '메타데이터를 찾을 수 없습니다.' };
			}

			const metadata = JSON.parse(metadataEntry.getData().toString('utf-8'));
			const userDataPath = getPath('userData');
			const conflicts: any[] = [];

			// 번들 충돌 확인 - 선택된 번들만 확인
			if (selectedItems.bundles && Array.isArray(selectedItems.bundles) && selectedItems.bundles.length > 0) {
				for (const bundleId of selectedItems.bundles) {
					const bundlePath = path.join(userDataPath, 'bundles', bundleId);
					if (fs.existsSync(bundlePath)) {
						// 번들 정보 읽기
						const pkgPath = path.join(bundlePath, 'package.json');
						let bundleName = bundleId;
						if (fs.existsSync(pkgPath)) {
							try {
								const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
								const pkgInfo = JSON.parse(pkgContent);
								bundleName = pkgInfo['name:ko'] || pkgInfo['name'] || bundleId;
							} catch (err) {
								// 파싱 실패 시 bundleId 사용
							}
						}
						conflicts.push({
							type: 'bundle',
							id: bundleId,
							name: bundleName,
							message: `번들 "${bundleName}"이(가) 이미 존재합니다.`,
						});
					}
				}
			}

			// 소피아 코드 충돌 확인
			if (selectedItems.sopiaCode && metadata.items.sopiaCode) {
				const sopiaPath = path.join(userDataPath, 'sopia');
				if (fs.existsSync(sopiaPath)) {
					conflicts.push({
						type: 'sopiaCode',
						id: 'sopiaCode',
						name: '소피아 코드',
						message: '소피아 코드 폴더가 이미 존재합니다.',
					});
				}
			}

			// 방송 기록 충돌 확인
			if (selectedItems.history && metadata.items.history) {
				const historyPath = path.join(userDataPath, 'historydb');
				if (fs.existsSync(historyPath)) {
					conflicts.push({
						type: 'history',
						id: 'history',
						name: '방송 기록',
						message: '방송 기록 폴더가 이미 존재합니다.',
					});
				}
			}

			// 앱 설정 충돌 확인
			if (selectedItems.appSettings && metadata.items.appSettings) {
				const appCfgPath = path.join(userDataPath, 'app.cfg');
				if (fs.existsSync(appCfgPath)) {
					conflicts.push({
						type: 'appSettings',
						id: 'appSettings',
						name: '앱 설정',
						message: '앱 설정 파일이 이미 존재합니다.',
					});
				}
			}

			// Local Storage 충돌 확인
			if (selectedItems.localStorage && metadata.items.localStorage) {
				const localStoragePath = path.join(userDataPath, 'Local Storage');
				if (fs.existsSync(localStoragePath)) {
					conflicts.push({
						type: 'localStorage',
						id: 'localStorage',
						name: 'Local Storage',
						message: 'Local Storage 폴더가 이미 존재합니다.',
					});
				}
			}

			// 명령어 설정 충돌 확인
			if (selectedItems.cmdSettings && metadata.items.cmdSettings) {
				const cmdCfgPath = path.join(userDataPath, 'cmd.cfg');
				if (fs.existsSync(cmdCfgPath)) {
					conflicts.push({
						type: 'cmdSettings',
						id: 'cmdSettings',
						name: '명령어 설정',
						message: '명령어 설정 파일이 이미 존재합니다.',
					});
				}
			}

			return { success: true, conflicts };
		} catch (error: any) {
			console.error('충돌 확인 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 백업 삭제
	ipcMain.handle('backup:delete', async (evt, backupFilePath: string) => {
		try {
			if (fs.existsSync(backupFilePath)) {
				fs.unlinkSync(backupFilePath);
				return { success: true };
			}
			return { success: false, error: '파일을 찾을 수 없습니다.' };
		} catch (error: any) {
			console.error('백업 삭제 오류:', error);
			return { success: false, error: error.message };
		}
	});

	// 폴더 열기
	ipcMain.handle('backup:open-folder', async (evt, folderPath: string) => {
		try {
			await shell.openPath(folderPath);
			return { success: true };
		} catch (error: any) {
			console.error('폴더 열기 오류:', error);
			return { success: false, error: error.message };
		}
	});
};