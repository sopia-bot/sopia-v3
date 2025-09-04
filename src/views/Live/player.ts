import { SSMConnector } from '@/plugins/ssm-connector';
import Hls from 'hls.js';
import { Live } from '@sopia-bot/core';
import logger from '@/plugins/logger';
import { getAppPath } from '@/plugins/ipc-renderer';
import { serialize } from 'typescript-json-serializer';

const path = window.require('path');
const fs = window.require('fs');
const { ipcRenderer } = window.require('electron');
const { spawn } = window.require('child_process');

const safeStringify = window.require('json-stringify-safe');

function getPath(file: string) {
	const rootPath = ipcRenderer.sendSync('root-path');
	if ( ipcRenderer.sendSync('is-packaged') ) {
		return path.join(rootPath, `.ffmpeg/${file}.exe`);
	} else {
		return path.join(rootPath, `ffmpeg-binary/${file}.exe`);
	}
}

export class Player {
	private player!: Hls | SSMConnector;
	private audio = new Audio();
	private live!: Live;
	private isRecording: boolean = false;
	private recordingPath?: string;
	private recordingProcess?: any;

	get engine() {
		return this.live.engine_name;
	}

	get volume() {
		return this.audio.volume;
	}

	set volume(val) {
		this.audio.volume = val;
	}

	public $path(type: string, ...args: string[]) {
		return path.join(getAppPath(type), ...args);
	}

	public play() {
		this.audio.play();
	}

	public pause() {
		this.audio.pause();
	}

	public destroy() {
		this.stopRecording();
		this.audio.pause();
		this.audio = new Audio();
		if ( this.player ) {
			this.player.destroy();
		}
	}

	// HLS 스트림을 ffmpeg로 직접 녹음
	public async startRecording() {
		if (this.isRecording) {
			console.log('[FFMPEG-RECORD] 이미 녹음 중입니다.');
			return;
		}

		try {
			// 녹음 파일 경로 설정
			const recordingDir = this.$path('userData', 'historydb', this.live.id.toString());
			if (!fs.existsSync(recordingDir)) {
				fs.mkdirSync(recordingDir, { recursive: true });
			}

			// 라이브 정보 저장
			const liveFile = path.join(recordingDir, `live.json`);
			if (!fs.existsSync(liveFile)) {
				try {
					const liveObj = serialize(this.live);
					delete (liveObj as any)._client;
					fs.writeFileSync(liveFile, safeStringify(liveObj, null, '  '), 'utf-8');
				} catch (e) {
					console.error('[FFMPEG-RECORD] 메타 파일 생성 실패:', e);
				}
			}

			// 메타 정보 저장
			const metaFile = path.join(recordingDir, `meta.json`);
			if (!fs.existsSync(metaFile)) {
				fs.writeFileSync(metaFile, '[]', 'utf-8');
			}

			// 메타 정보 가져오기
			const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')) as any[];

			// 방송 시작 시간과 현재 시간 차이 계산
			const liveStartTime = new Date(this.live.created).getTime();
			const currentTime = Date.now();
			const silentDuration = (currentTime - liveStartTime) / 1000; // 초 단위

			console.log(`[FFMPEG-RECORD] 방송 시작: ${new Date(this.live.created)}`);
			console.log(`[FFMPEG-RECORD] 현재 접속: ${new Date(currentTime)}`);
			console.log(`[FFMPEG-RECORD] 무음 채우기: ${silentDuration}초`);

			// 현재 녹음 파일.
			this.recordingPath = path.join(recordingDir, `${this.live.id}_${currentTime}.m4a`);

			// 메타에 추가
			meta.push({
				currentTime,
				file: path.basename(this.recordingPath),
			});
			fs.writeFileSync(metaFile, safeStringify(meta, null, '  '), 'utf-8');
			
			// 임시 파일들
			
			// 2단계: HLS 스트림 녹음 시작
			console.log(`[FFMPEG-RECORD] 2단계: HLS 스트림 녹음 시작`);
			const ffmpegPath = getPath('ffmpeg');
			const args = [
				'-i', this.live.url_hls,
				'-c:a', 'aac',
				'-b:a', '128k',
				'-movflags', 'frag_keyframe+empty_moov',
				this.recordingPath
			];

			this.recordingProcess = spawn(ffmpegPath, args);
			this.isRecording = true;

			this.recordingProcess.stdout?.on('data', (data: any) => {
				// console.log(`[FFMPEG-RECORD] stdout: ${data}`);
			});

			this.recordingProcess.stderr?.on('data', (data: any) => {
				// console.log(`[FFMPEG-RECORD] stderr: ${data}`);
			});

			this.recordingProcess.on('close', async (code: number) => {
				console.log(`[FFMPEG-RECORD] 프로세스 종료, 코드: ${code}`);
				this.isRecording = false;
			});

			this.recordingProcess.on('error', (error: any) => {
				console.error('[FFMPEG-RECORD] 프로세스 에러:', error);
				this.isRecording = false;
			});
			
		} catch (error) {
			logger.err('live', 'HLS 스트림 녹음 시작 실패:', error);
			this.isRecording = false;
		}
	}

	// 녹음 중지
	public stopRecording(): Promise<string | null> {
		return new Promise((resolve) => {
			if (!this.isRecording || !this.recordingProcess) {
				resolve(this.recordingPath || null);
				return;
			}

			console.log('[FFMPEG-RECORD] 녹음 중지 요청');
			
			// 5초 후 강제 종료
			const timeout = setTimeout(() => {
				console.log('[FFMPEG-RECORD] 강제 종료');
				if (this.recordingProcess) {
					this.recordingProcess.kill('SIGKILL');
				}
				this.isRecording = false;
				this.recordingProcess = null;
				resolve(this.recordingPath || null);
			}, 5000);
			
			this.recordingProcess.on('exit', () => {
				clearTimeout(timeout);
				console.log('[FFMPEG-RECORD] 녹음 중지 완료');
				resolve(this.recordingPath || null);
			});
			this.recordingProcess.stdin?.write('q');
		});
	}

	public async load(live: Live) {
		this.live = live;
		
		if (live.engine_name === 'ssm') {
			this.player = await new SSMConnector(window.$sopia)
					.Live(live)
					.Connect();
		} else {
			this.player = new Hls();
			this.player.loadSource(live.url_hls);
			this.player.attachMedia(this.audio);
		}
		
		// 스트림 로드 후 자동으로 녹음 시작
		await this.startRecording();
	}

	// Player.vue에서 필요한 connect 메서드 추가
	public connect(live: Live) {
		return this.load(live);
	}
}
