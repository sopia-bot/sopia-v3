import path from 'path';
import { app, BrowserWindow , ipcMain, IpcMainEvent, dialog } from 'electron';
import puppeteer from 'puppeteer-core';
import { URL } from 'url';

import CfgLite from 'cfg-lite';
import { ZipFile, ZipArchive } from '@arkiv/zip';
import fs from 'fs';

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';

const isDevelopment = process.env.NODE_ENV !== 'production';

const CfgList: any = {};
const getPath = (type: any, ...args: any) => path.resolve(app.getPath(type), ...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

ipcMain.on('cfg-lite', (evt: IpcMainEvent, prop: string, file: string, ...args: any) => {
	const key = path.basename(file);
	let rtn: any = null;
	if ( prop === 'new' ) {
		CfgList[key] = new CfgLite(file, args[0]);
	} else {
		if ( typeof CfgList[key][prop] === 'function' ) {
			rtn = CfgList[key][prop](...args);
		} else {
			rtn = CfgList[key][prop];
		}
	}

	evt.returnValue = rtn;
});

ipcMain.on('zip:create', (evt: IpcMainEvent, src: string, dst: string) => {
	console.log('zip:create', src, dst);
	try {
		ZipFile.CreateFromDirectory(src, dst);
		evt.returnValue = true;
	} catch (err) {
		console.error(err);
		evt.returnValue = false;
	}
});

ipcMain.on('zip:uncompress-buffer', (evt: IpcMainEvent, b64str: string, dst: string) => {
	console.log('zip:uncompress-buffer', dst);
	const archive = new ZipArchive('', Buffer.from(b64str, 'base64'));
	archive.ExtractAll(dst);
	evt.returnValue = true;
});

ipcMain.on('isdev', (evt: IpcMainEvent) => {
	evt.returnValue = isDevelopment;
});

ipcMain.on('app:get-path', (evt: IpcMainEvent, type: string) => {
	evt.returnValue = app.getPath(type as any);
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

const snsLoginOpenByPuppeteer = (url: string) => new Promise(async (resolve, reject) => {
	if ( process.platform === 'win32' ) {
		const executablePath = pickProgram([
			`C:\\Program Files\\Mozilla Firefox\\firefox.exe`,
			`C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe`,
			`C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
			`C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`,
		]);

		if ( executablePath === '' ) {
			console.log(`Can not find supported browser list.`);
			reject();
			return;
		}

		const browser = await puppeteer.launch({
			executablePath,
			headless: false,
			defaultViewport: null,
			product: path.parse(executablePath).name === 'firefox' ? 'firefox' : 'chrome',
			//args,
		});

		const [page] = await browser.pages();
		await page.goto(url);
		page.on('framenavigated', async (frame) => {
			const furl = frame.url();
			const parsedUrl = new URL(furl);
			if ( parsedUrl.host === 'www.spooncast.net' ) {
				let res = await page.evaluate(`localStorage.getItem('SPOONCAST_requestBySnsLogin')`);

				for ( let i = 0; i < 5 && !res; i++ ) {
					await sleep(1000);
					res = await page.evaluate(`localStorage.getItem('SPOONCAST_requestBySnsLogin')`);
				}

				browser.close();

				try {
					resolve(JSON.parse(res).result);
				} catch {
					reject();
				}
			}
		});
		//await browser.close();
	}

});

const snsLoginOpenByElectron = function(url: string) {
	return new Promise((resolve, reject) => {
		const snsBrowser = new BrowserWindow({
			width: 800,
			height: 800,
			webPreferences: {
				contextIsolation: false,
				webSecurity: false,
			},
			show: false,
		});
		snsBrowser.webContents.setUserAgent(USER_AGENT);

		snsBrowser.show();

		snsBrowser.on('close', (evt: any) => {
			console.log('why not call close');
			const sender = evt.sender;
			const webContents = sender.webContents;

			const tout = setTimeout(() => {
				reject(new Error('Faild get localStorage data. (Timeout)'));
				if ( !snsBrowser.isDestroyed() ) {
					evt.sender.close();
				}
			}, 5000);

			webContents.executeJavaScript(`localStorage.getItem('SPOONCAST_requestBySnsLogin')`)
				.then((res: string) => {
					resolve(JSON.parse(res).result);
				})
				.catch(reject)
				.finally(() => {
					clearTimeout(tout);
					evt.sender.close();
				});

			evt.preventDefault();
		});

		snsBrowser.loadURL(url, {
			userAgent: USER_AGENT,
		});
	});
};

const snsLoginOpen = (url: string) => new Promise((resolve, reject) => {
	let res = snsLoginOpenByPuppeteer(url);
	if ( res ) {
		resolve(res);
		return;
	}

	res = snsLoginOpenByElectron(url);
	if ( res ) {
		resolve(res);
		return;
	}
	reject();
});

ipcMain.handle('sns-login-open', async (evt, url: string) => {
	try {
		const user =  await snsLoginOpen(url);
		return user;
	} catch (err) {
		return;
	}
});

ipcMain.handle('open-dialog', async (event, options: any) => {
	return await dialog.showOpenDialog(options);
});