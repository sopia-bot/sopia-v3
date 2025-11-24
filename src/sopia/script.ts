/*
 * script.ts
 * Created on Wed Oct 14 2020
 *
 * Copyright (c) Tree Some. Licensed under the MIT License.
 */
const fs = window.require('fs');
const path = window.require('path');
import { BundleInfo } from '@/router/bundle';
import './context';

import logger from '@/plugins/logger';
const { ipcRenderer } = window.require('electron');

export class Script {

	public boxs: any[] = [];

	constructor() {
		this.add = this.add.bind(this);
		this.abort = this.abort.bind(this);
		this.clear = this.clear.bind(this);
		this.run = this.run.bind(this);
		this.reload = this.reload.bind(this);
	}

	public async add(folder: string) {


		let pkg = {} as BundleInfo;
		let index = '';
		try {
			const packageTarget = path.join(folder, 'package.json');
			if (fs.existsSync(packageTarget)) {
				pkg = JSON.parse(fs.readFileSync(packageTarget, 'utf-8')) as BundleInfo;
				index = path.join(folder, pkg.main ?? 'index.js');
				// https://github.com/sopia-bot/sopia-v3/issues/5
				index = window.require.resolve(index);
			} else {
				index = window.require.resolve(path.join(folder, 'index.js'));
			}
		} catch (e) {
			logger.err('script', `add catch error ::`, pkg, `index: [${index}]`, e);
		}


		if (fs.existsSync(index)) {
			const name = path.basename(folder);
			const context = (window as any)['bctx'].new(name);
			try {
				const module = window.require(index);
				let stpTargetFile = '';
				logger.debug('processor', `require module ${index}`, module);
				if (pkg['stp']) {
					if (pkg['stp']['domain'] && pkg['stp']['file']) {
						stpTargetFile = pkg['stp']['file'];
						if (!fs.existsSync(stpTargetFile)) {
							stpTargetFile = path.join(folder, pkg['stp']['file']);
						}
						stpTargetFile = window.require.resolve(stpTargetFile);
						logger.debug('sopia', `Bundle ${module} is using stp protocl ${stpTargetFile}`);
						ipcRenderer.invoke('stp:regist', pkg['stp']['domain'], stpTargetFile, folder);
					}
				}
				const box = {
					name,
					file: index,
					stpFile: stpTargetFile,
					dir: folder,
					module,
					context,
				};
				this.boxs.push(box);
			} catch (e) {
				logger.err('sopia', `Failed load script file [${index}]`, e);
			}
		} else {
			logger.err('sopia', `Can not open script file [${index}].`);
		}
	}

	public abort(name: string) {
		const idx = this.boxs.findIndex((b: any) => b.name === name);
		const box = this.boxs[idx];
		if (box) {
			const module = box.module;
			if (module && typeof module.onAbort === 'function') {
				module.onAbort();
			}
			ipcRenderer.invoke('stp:unregister', box.stpFile);
			(window as any)['bctx'].destroy(name);
			logger.info('sopia', 'module cache clear', box.file);
			delete window.require.cache[box.file];
			this.boxs.splice(idx, 1);
		}
	}

	public clear() {
		let idx = 0;
		if (Array.isArray(this.boxs)) {
			while (this.boxs.length) {
				const module = this.boxs[0];
				this.abort.call(this, module.name);
				if (idx++ > 10000) {
					break;
				}
			}
		}
		this.boxs = [];
	}

	public run(event: any, sock: any) {
		if (Array.isArray(this.boxs)) {
			for (const { module } of this.boxs) {
				if (typeof module[event.event] === 'function') {
					try {
						module[event.event](event, sock);
					} catch (err) {
						console.error(err);
						// ignore error
					}
				}
				if (typeof module['live_event_all'] === 'function') {
					module['live_event_all'](event, sock);
				}
			}
		}
	}

	public reload(name: string) {
		const box = this.boxs.find((b: any) => b.name === name);
		if (box) {
			this.abort(name);
			this.add(box.dir);
		}
	}

}

export default new Script();
