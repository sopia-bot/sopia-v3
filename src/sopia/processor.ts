/*
 * processor.ts
 * Created on Wed Oct 14 2020
 *
 * Copyright (c) Tree Some. Licensed under the MIT License.
 */
import { LiveEvent, User, SpoonClient, LiveSocket, Live } from '@sopia-bot/core';
import CfgLite from '@/plugins/cfg-lite-ipc';
import logger from '@/plugins/logger';
import Script from './script';
import { getAppPath } from '@/plugins/ipc-renderer';
import pkg from '../../package.json';


const fs = window.require('fs');
const path = window.require('path');
const { ipcRenderer } = window.require('electron');

const $path = (type: any, ...args: any) => {
	return path.resolve(getAppPath(type), ...args);
};

// Audio Queue System for FIFO playback
class AudioQueue {
	private queue: Array<{ audio: string; volume: number }> = [];
	private isPlaying: boolean = false;
	private currentAudio: HTMLAudioElement | null = null;

	public enqueue(audioPath: string, volume: number) {
		this.queue.push({ audio: audioPath, volume });
		logger.debug('audio-queue', `Enqueued audio: ${audioPath}, queue length: ${this.queue.length}`);

		if (!this.isPlaying) {
			this.playNext();
		}
	}

	private async playNext() {
		if (this.queue.length === 0) {
			this.isPlaying = false;
			logger.debug('audio-queue', 'Queue empty, stopping playback');
			return;
		}

		this.isPlaying = true;
		const item = this.queue.shift();

		if (!item) {
			this.isPlaying = false;
			return;
		}

		logger.debug('audio-queue', `Playing audio: ${item.audio}, volume: ${item.volume}`);

		try {
			this.currentAudio = new Audio(item.audio);
			this.currentAudio.volume = item.volume / 100;

			// Set up event listeners
			const onEnded = () => {
				logger.debug('audio-queue', 'Audio playback ended');
				this.cleanup();
				this.playNext();
			};

			const onError = (error: any) => {
				logger.err('audio-queue', `Error playing audio: ${error}`);
				this.cleanup();
				this.playNext();
			};

			this.currentAudio.addEventListener('ended', onEnded);
			this.currentAudio.addEventListener('error', onError);

			await this.currentAudio.play();
		} catch (error) {
			logger.err('audio-queue', `Failed to play audio: ${error}`);
			this.cleanup();
			this.playNext();
		}
	}

	private cleanup() {
		if (this.currentAudio) {
			// Remove event listeners
			this.currentAudio.pause();
			this.currentAudio.src = '';
			this.currentAudio.load();
			this.currentAudio = null;
			logger.debug('audio-queue', 'Audio cleanup completed');
		}
	}

	public clear() {
		this.queue = [];
		this.cleanup();
		this.isPlaying = false;
		logger.debug('audio-queue', 'Queue cleared');
	}
}

const audioQueue = new AudioQueue();

window.clearScript = () => {
	Script.clear();
};
window.reloadScript = () => {
	window.clearScript();
	if (fs.existsSync($path('userData', 'sopia/index.js'))) {
		Script.add($path('userData', 'sopia/'));
	}
	const bundlePath = $path('userData', 'bundles');

	if (!fs.existsSync(bundlePath)) {
		fs.mkdirSync(bundlePath);
	}

	const bundles = fs.readdirSync(bundlePath);
	for (const bundle of bundles) {
		const target = path.join(bundlePath, bundle);
		const stat = fs.statSync(target);
		const lstat = fs.lstatSync(target);
		if (stat.isDirectory() || lstat.isSymbolicLink()) {
			logger.debug('processor', `reload bundle ${bundle}`);
			Script.add(target);
		}
	}
};
window.addEventListener('DOMContentLoaded', () => {
	window.reloadScript();
});

ipcRenderer.on('reloadScript', (evt, script) => {
	logger.debug('processor', 'receive reload Script', script);
	Script.reload(script);
});
console.log('add listener');

const CMD_PATH = $path('userData', 'cmd.cfg');

declare global {
	interface Window {
		user: User;
		$spoon: any;
		$sopia: SpoonClient;
		reloadCmdCfg: () => void;
		reloadScript: () => void;
		clearScript: () => void;
	}
}

let cfg: CfgLite;
try {
	cfg = new CfgLite(CMD_PATH);
} catch {
	if (fs.existsSync(CMD_PATH)) {
		fs.rmSync(CMD_PATH);
	}
	cfg = new CfgLite(CMD_PATH);
}
window.reloadCmdCfg = () => {
	cfg = new CfgLite(CMD_PATH);
	(window as any).cmdCfg = cfg;
};

const isAdmin = (live: Live, user: User | number) => {
	if (typeof user === 'object') {
		if (user.is_dj) {
			return true;
		}
		user = user.id;
	}

	return live.manager_ids.includes(user);
};

const DEFAULT_CMD_PREFIX = '!';
const ckCmd = (cmd: any, msg: string) => {
	let prefix = window.appCfg.get('cmd.prefix');
	if (!prefix) {
		window.appCfg.set('cmd.prefix', DEFAULT_CMD_PREFIX);
		window.appCfg.save();
		logger.info('Prefix save [!]');
		prefix = DEFAULT_CMD_PREFIX;
	}

	const m = msg.split(/\s/);
	return m[0] === (prefix + cmd.command);
};

const ckCmdEvent = (evt: any, sock: LiveSocket) => {
	if (evt.event !== LiveEvent.LIVE_JOIN &&
		evt.event !== LiveEvent.LIVE_LIKE &&
		evt.event !== LiveEvent.LIVE_PRESENT &&
		evt.event !== LiveEvent.LIVE_PRESENT_LIKE &&
		evt.event !== LiveEvent.LIVE_MESSAGE) {
		if (evt.eventName !== 'LiveFollow') {
			logger.debug('sopia', 'Event is not [JOIN, LIKE, PRESENT, MESSAGE, PRESENT_LIKE]', evt.event);
			return false;
		}
	}

	if (evt.event === LiveEvent.LIVE_JOIN ||
		evt.event === LiveEvent.LIVE_LIKE ||
		evt.event === LiveEvent.LIVE_PRESENT ||
		evt.event === LiveEvent.LIVE_PRESENT_LIKE) {
		return isAdmin(sock.Live as Live, window.$sopia.logonUser);
	}

	return evt.event === LiveEvent.LIVE_MESSAGE;
};

const processor = async (evt: any, sock: LiveSocket) => {
	logger.debug('sopia', `receive event [${evt.event}]`, evt);

	setImmediate(() => {
		Script.run(evt, sock);
	});

	if (evt.event === LiveEvent.LIVE_JOIN) {
		if (evt.data.author.tag === '5lyrz4') {
			sock.message(`어서오십시오 ${evt.data.author.nickname}님.\\n현재 버전은 ${pkg.version}입니다.`);
			return;
		}
	}

	/* S: Cmd */
	if (evt.eventName === 'LiveFollow') {
		window.appCfg.get(`cmd.${evt.event}.use`) === true && fs.existsSync(CMD_PATH)
		let comment = cfg.get('live_follow');
		if (comment) {
			comment = comment.replace(/\[\[name\]\]/g, (evt.eventPayload).nickname)
				.replace(/\n/g, '\\n');
			sock.message(comment);
		}
	} else if (ckCmdEvent(evt, sock)) {
		if (window.appCfg.get(`cmd.${evt.event}.use`) === true && fs.existsSync(CMD_PATH)) {
			let comment = cfg.get(evt.event);
			const e = evt.data;

			if (!comment) {
				if (evt.event === LiveEvent.LIVE_PRESENT_LIKE) {
					comment = cfg.get(LiveEvent.LIVE_PRESENT);
				} else {
					logger.err('sopia', 'Can not find comment', evt.event);
					return;
				}
			}

			logger.debug('sopia', 'Easy command', evt, comment);

			let res = '';

			switch (evt.event) {
				case LiveEvent.LIVE_JOIN:
				case LiveEvent.LIVE_LIKE:
					res = comment;
					break;
				case LiveEvent.LIVE_PRESENT:
					let p = comment.find((c: any) => c.sticker === e.sticker);
					if (!p) {
						p = comment[0];
					}
					res = p.message;

					// Play audio if configured
					if (p.audio && fs.existsSync(p.audio)) {
						const volume = p.audioVolume !== undefined ? p.audioVolume : 50;
						logger.debug('sopia', `Queueing present audio: ${p.audio}, volume: ${volume}`);
						audioQueue.enqueue(p.audio, volume);
					}
					break;
				case LiveEvent.LIVE_PRESENT_LIKE:
					let pl = comment.find((c: any) => c.sticker === evt.update_component.like.sticker);
					if (!pl) {
						pl = comment[0];
					}
					res = pl.message;

					// Play audio if configured
					if (pl.audio && fs.existsSync(pl.audio)) {
						const volume = pl.audioVolume !== undefined ? pl.audioVolume : 50;
						logger.debug('sopia', `Queueing present_like audio: ${pl.audio}, volume: ${volume}`);
						audioQueue.enqueue(pl.audio, volume);
					}
					break;
				case LiveEvent.LIVE_MESSAGE:
					const m = comment.find((c: any) => ckCmd(c, evt.update_component.message.value));
					if (m) {
						if (m.permit === 'manager') {
							if (isAdmin(sock.Live as Live, e.user)) {
								res = m.message;
							}
						} else {
							res = m.message;
						}
					}
					break;
			}

			res = res.replace(/\[\[name\]\]/g, (e.author || e.user).nickname)
				.replace(/\[\[tag\]\]/g, (e.author || e.user).tag)
				.replace(/\n/g, '\\n');

			if (evt.event === LiveEvent.LIVE_PRESENT) {
				res = res.replace(/\[\[sticker\]\]/g, e.sticker)
					.replace(/\[\[combo\]\]/g, String(e.combo))
					.replace(/\[\[amount\]\]/g, String(e.amount))
					.replace(/\[\[count\]\]/g, String(e.amount * e.combo));
			}

			if (res) {
				logger.debug('cmd', `Send message [${res}]`);
				sock.message(res);
			}
		}
	}
	/* E: Cmd */
};

export default processor;
