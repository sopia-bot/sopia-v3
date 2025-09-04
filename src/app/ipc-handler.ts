import path from 'path';
import { app, BrowserWindow , ipcMain, IpcMainEvent, dialog, shell } from 'electron';
import { ChildProcess, execSync, spawn } from 'child_process';
import { install as npmInstall, InstallItem, InstallOptions } from 'npkgi';
import express, { Application } from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import axios from 'axios';
import Module, { createRequire } from 'module';
import { bun, bunx } from './bun';
import AdmZip from 'adm-zip';

import CfgLite from 'cfg-lite';
import fs from 'fs';
import vm from 'vm';
import pkg from '../../package.json';
import { registerStpApp } from './stp-protocol';
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';

const isDevelopment = process.env.NODE_ENV !== 'production';

type PathType = 'home' | 'appData' | 'userData' | 'cache' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps';
const CfgList: Record<string, any> = {};
const getPath = (type: PathType, ...args: string[]) => path.resolve(app.getPath(type), ...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


export function registerIpcHandler() {
	ipcMain.on('cfg-lite', (evt: IpcMainEvent, prop: string, file: string, ...args: any) => {
		const key = file;
		let rtn: any = null;
		console.log(`cfg-lite: prop=${prop},file=${file},argc=${args.length}, args=${args.join()}`);
		try {
			if ( prop === 'new' ) {
				const tmp = new CfgLite(file, args[0]);
				CfgList[key] = tmp;
				rtn = true;
			} else {
				if ( typeof CfgList[key][prop] === 'function' ) {
					rtn = CfgList[key][prop](...args);
				} else {
					rtn = CfgList[key][prop];
				}
			}
			evt.returnValue = rtn;
		} catch(err: any) {
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
		if ( app.isPackaged ) {
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
		for ( const item of list ) {
			if ( fs.existsSync(item) ) {
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
		switch ( process.platform ) {
			case 'win32':
				const pids = getChromeProcessWindows();
				return pids.length > 0;
		}
		return false;	
	}

	function checkExtVersion(version: string) {
		if ( fs.existsSync(getPath('userData', `ext-${version}`)) ) {
			return true;
		}
		if ( fs.existsSync(getPath('userData', 'login-ext')) ) {
			fs.rmSync(getPath('userData', 'login-ext'), { recursive: true });
		}
		fs.writeFileSync(getPath('userData', `ext-${version}`), '');
		return true;
	}

	let expressServer: HttpServer|null = null;
	ipcMain.handle('ext-login-open', async (evt, url: string) => {
		try {
			// install extension
			let executablePath = '';
			switch ( process.platform ) {
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
			
			if ( !executablePath ) {
				dialog.showErrorBox('Error', '크롬 실행 파일을 찾을 수 없습니다.');
				console.log('Can not find Chrome exe file');
				return {
					success: false,
					status: '101',
				};
			}

			checkExtVersion(pkg.version);

			const extensionPath = getPath('userData', 'login-ext');
			if ( !fs.existsSync(extensionPath) ) {
				console.log('Downloading Chrome extension');
				const res = await axios.get('https://sopia-v3.s3.ap-northeast-2.amazonaws.com/sopia-login-ext.zip', {
					responseType: 'arraybuffer',
				});
				const buf = res.data;
				const archive = new AdmZip(buf);
				archive.extractAllTo(extensionPath);
			}

			const callback = new Promise((resolve, reject) => {
				if ( expressServer ) {
					expressServer.close();
					expressServer = null;
				}
				let proc: ChildProcess|null = null;
				const app = express();
				app.use(cors())
				app.use(express.json());
				app.get('/check', (_, res) => {
					res.json({ success: true })
				})
				app.post('/spoon-login', (req, res) => {
					console.log('body', req.body);
					res.json({});
					proc?.kill();
					resolve(req.body);
				});
				expressServer = app.listen(19595, () => {
					console.log('express listen', 19595);

					const url = `https://sopia.dev/extension-loader?redirect=${encodeURIComponent('https://www.spooncast.net/kr')}`;
					proc = spawn(executablePath, [
						`${url}`
					]);
				});
			});

			const userInfo = await callback;
			expressServer?.close();
			expressServer = null;
			return {
				success: true,
				status: '100',
				data: userInfo,
			};
		} catch (err: any) {
			dialog.showErrorBox('Error', '알 수 없는 오류가 발생했습니다.\n' + err.message);
			console.error(err);
			return {
				success: false,
				status: '999',
			};
		}
	});

	ipcMain.on('open-chrome', (event, url: string) => {
		// install extension
		let executablePath = '';
		switch ( process.platform ) {
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
		if ( fs.existsSync(postscript) ) {
			const scriptText = fs.readFileSync(postscript, 'utf-8');
			const script = new vm.Script(scriptText);
			const moduleObj: { exports: any } = { exports: {} };
			const bundleRequire = createRequire(postscript);
			const context = {
				require: function(name) {
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
				bun,
				bunx,
			};
			vm.createContext(context);
			try {
				script.runInContext(context, {
					displayErrors: true,
				});
			} catch(err) {
				console.error(err);
				return false;
			}
		}
		
		return true;
	});

	const readDirectory = (dir: string, cb: (...args: any) => any, oriDir?: string) => {
		if ( !oriDir ) {
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
			if ( stat.isDirectory() ) {
				readDirectory(st, cb, oriDir);
			}
		});
	};

	ipcMain.on('package:create', (evt: IpcMainEvent, src: string, dst: string) => {
		console.log('package:create', src, dst);
		try {
			const pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
			let ignore: string[] = [];
			if ( pkg.sopia ) {
				ignore = (pkg?.sopia?.['ignore:upload'] || []).map((i: string) => path.join(src, i));
			}

			const zip = new AdmZip();
			readDirectory(src, (p: string, isDir: boolean) => {
				if ( !isDir ) {
					const fullPath = path.join(src, p);
					if ( ignore.includes(fullPath) ) {
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

		if ( !fs.existsSync(dst) ) {
			fs.mkdirSync(dst);
		}

		try {
			const zip = new AdmZip(Buffer.from(b64str, 'base64'));
			const pkgEntry = zip.getEntry('package.json');
			if ( !pkgEntry ) {
				return false;
			}

			const pkg = JSON.parse(pkgEntry.getData().toString('utf8'));
			const ignore = (pkg?.sopia?.['ignore:fetch'] || []).map((i: string) => path.join(dst, i));
			console.log(`package:uncompress-buffer: ignoring list ${ignore.join(',')}`);

			zip.getEntries().forEach((entry) => {
				const target = path.join(dst, entry.entryName);
				if ( fs.existsSync(target) ) {
					if ( ignore.includes(target) ) {
						return;
					}
				}
				const dirname = path.dirname(target);
				if ( !fs.existsSync(dirname) ) {
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

	ipcMain.handle('stp:regist', async (evt, domain: string, targetFile: string, packageDir: string) => {
		if ( fs.existsSync(targetFile) ) {
			const scriptText = fs.readFileSync(targetFile, 'utf-8');
			console.log('targetFile', targetFile);
			const script = new vm.Script(scriptText);
			const moduleObj: { exports: any } = { exports: {} };
			const bundleRequire = createRequire(targetFile);
			const context = {
				require: function(name) {
					try {
						console.log('require resolve', bundleRequire.resolve(name));
						return bundleRequire(name);
					} catch(err) {
						console.error(err);
						return __non_webpack_require__(name);
					}
				},
				Buffer,
				__dirname: path.dirname(targetFile),
				__filename: targetFile,
				__pkgdir: packageDir,
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
				registerStpApp(domain, app as Application);
				return {
					success: true,
				};
			} catch(err) {
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

	ipcMain.handle('open-bundle-manager', async (evt) => {
		const exePath = process.execPath;
		const exeDir = path.dirname(exePath);
		const exeFile = path.join(exeDir, 'SopiaBundleManager.exe');
		spawn(exeFile, ['--mode', 'bundle-manager'], {
			detached: true,
			stdio: 'ignore',
		});
		return true;
	});
};