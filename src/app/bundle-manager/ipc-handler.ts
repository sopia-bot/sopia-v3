import CfgLite from "cfg-lite";
import { app, ipcMain, IpcMainEvent, shell, dialog } from "electron";
import { bun, bunx } from "../bun";
import path from "path";
import { createRequire } from "module";
import fs from "fs";
import vm from "vm";
import AdmZip from 'adm-zip';

const CfgList: Record<string, any> = {};
const isDevelopment = process.env.NODE_ENV !== 'production';

export function registerBundleIpc() {
	ipcMain.on('app:quit', (evt: IpcMainEvent) => {
		app.quit();
	});

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

	ipcMain.handle('open-dialog', async (event, options: any) => {
		return await dialog.showOpenDialog(options);
	});

	ipcMain.on('isdev', (evt: IpcMainEvent) => {
		evt.returnValue = isDevelopment;
	});

	ipcMain.on('app:get-path', (evt: IpcMainEvent, type: string) => {
		evt.returnValue = app.getPath(type as any);
	});

	ipcMain.on('shell:open-path', (evt: IpcMainEvent, path: string) => {
		shell.openPath(path);
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

	ipcMain.handle('package:uncompress-buffer', (evt, b64str: string, dst: string) => {
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
				if (entry.isDirectory) {
					return;
				}
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
				zip.extractEntryTo(entry.entryName, dirname, false, true);
			});

			return true;
		} catch (err) {
			console.error(err);
			return false;
		}
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
}