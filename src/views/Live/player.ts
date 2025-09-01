import { SSMConnector } from '@/plugins/ssm-connector';
import Hls from 'hls.js';
import { Live } from '@sopia-bot/core';
import logger from '@/plugins/logger';
import { getAppPath } from '@/plugins/ipc-renderer';
const path = window.require('path');

export class Player {
	private player!: Hls | SSMConnector;
	private audio = new Audio();
	private live!: Live;
	private audioContext?: AudioContext;
	private mediaRecorder: MediaRecorder | null = null;
	private recordedChunks: Blob[] = [];
	private isRecording: boolean = false;
	private recordingPath?: string;
	private speakerGain?: GainNode;
	private currentVolume: number = 1;
	private recordDestination?: MediaStreamAudioDestinationNode;

	get engine() {
		return this.live.engine_name;
	}

	get volume() {
		return this.currentVolume;
	}

	set volume(val) {
		this.currentVolume = val;
		if (this.speakerGain) {
			this.speakerGain.gain.value = val;
		}
		// HTML audio는 항상 최대 볼륨으로 유지 (Web Audio API에서 제어)
		this.audio.volume = 1;
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
		if ( this.audioContext ) {
			this.audioContext.close();
		}
	}

	// 녹음 시작
	public async startRecording() {
		if (this.isRecording || !this.audioContext) return;

		try {
			// 파일 경로 설정 (AAC 확장자)
			this.recordingPath = this.$path('userData', 'historydb', `${this.live.id}.aac`);
			
			let dest: MediaStreamAudioDestinationNode;
			
			// WebRTC(sing) 엔진이 아닌 경우에만 Web Audio API 라우팅 설정
			if (this.engine !== 'sing') {
				const source = this.audioContext.createMediaElementSource(this.audio);
				dest = this.audioContext.createMediaStreamDestination();
				
				// 스피커 출력용과 녹음용 GainNode를 각각 생성
				this.speakerGain = this.audioContext.createGain();
				const recordGain = this.audioContext.createGain();
				
				// HTML audio 볼륨을 1로 고정하고 speakerGain으로 볼륨 제어
				this.audio.volume = 1;
				this.speakerGain.gain.value = this.currentVolume;
				
				// 녹음용은 항상 원본 볼륨(1.0) 유지
				recordGain.gain.value = 1.0;
				
				// 오디오 라우팅: 소스를 두 경로로 분기
				source.connect(this.speakerGain);  // 스피커 경로
				source.connect(recordGain);   // 녹음 경로
				
				// 각각 다른 목적지로 연결
				this.speakerGain.connect(this.audioContext.destination);  // 스피커 출력
				
				// 녹음용 destination 생성 및 저장
				this.recordDestination = this.audioContext.createMediaStreamDestination();
				recordGain.connect(this.recordDestination);  // 녹음 출력
			} else {
				// WebRTC의 경우 이미 connect()에서 라우팅 설정됨
				if (!this.recordDestination) {
					throw new Error('recordDestination이 초기화되지 않았습니다');
				}
				dest = this.recordDestination;
			}

			// 녹음 데이터 초기화
			this.recordedChunks = [];
			
			// MediaRecorder를 AAC로 설정
			this.mediaRecorder = new MediaRecorder(dest.stream, {
				mimeType: 'audio/mp4;codecs=mp4a.40.2',
				audioBitsPerSecond: 128000
			});

			// 데이터를 메모리에 누적
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.recordedChunks.push(event.data);
				}
			};

			// 에러 처리
			this.mediaRecorder.onerror = (event) => {
				logger.err('live', 'MediaRecorder 에러:', event);
				this.stopRecording();
			};
			if (this.audioContext.state !== 'running') {
				await this.audioContext.resume();
			}

			console.log('AudioContext 상태:', this.audioContext.state);

			// 1초마다 데이터 청크 생성
			this.mediaRecorder.start(1000);
			this.isRecording = true;
			
			console.log('녹음 시작:', this.recordingPath);
		} catch (error) {
			logger.err('live', '녹음 시작 실패:', error);
		}
	}

	// 녹음 중지 및 파일 저장
	public stopRecording(): Promise<string | null> {
		return new Promise((resolve) => {
			if (!this.isRecording || !this.mediaRecorder) {
				resolve(null);
				return;
			}

			this.mediaRecorder.onstop = async () => {
				this.isRecording = false;
				
				try {
					// 녹음된 데이터를 하나의 Blob으로 합치기
					const recordedBlob = new Blob(this.recordedChunks, { type: 'audio/mp4' });
					
					// 파일로 저장
					const fs = window.require('fs');
					const dir = path.dirname(this.recordingPath!);
					
					// 디렉토리가 없으면 생성
					if (!fs.existsSync(dir)) {
						fs.mkdirSync(dir, { recursive: true });
					}
					
					// Blob을 Buffer로 변환하여 파일에 저장
					const arrayBuffer = await recordedBlob.arrayBuffer();
					const buffer = Buffer.from(arrayBuffer);
					fs.writeFileSync(this.recordingPath!, buffer);
					
					console.log('녹음 완료:', this.recordingPath);
					resolve(this.recordingPath || null);
				} catch (error) {
					logger.err('live', '파일 저장 실패:', error);
					resolve(null);
				}
			};

			this.mediaRecorder.stop();
		});
	}


	// 녹음 상태 확인
	public get recordingStatus() {
		return {
			isRecording: this.isRecording,
			recordingPath: this.recordingPath,
			mediaRecorder: this.mediaRecorder
		};
	}

	public connect(live: Live) {
		this.live = live;

		console.log('player', live);

		// AudioContext 초기화
		this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		
		// HTML audio 볼륨을 1로 고정 (Web Audio API에서 제어)
		this.audio.volume = 1;

		if ( this.engine === 'sing' ) {
			// WEB
			(async () => {
				this.player = await new SSMConnector(window.$sopia)
					.Live(live)
					.Connect();
				
				// WebRTC 스트림을 Web Audio API로 라우팅하기 위해 임시 audio 생성
				const tempAudio = new Audio();
				tempAudio.srcObject = this.player.stream;
				tempAudio.volume = 1; // 원본 볼륨 유지
				tempAudio.muted = true; // 직접 재생 방지
				
				// Web Audio API 라우팅 설정
				const source = this.audioContext!.createMediaElementSource(tempAudio);
				
				// 스피커와 녹음용 GainNode 생성
				this.speakerGain = this.audioContext!.createGain();
				const recordGain = this.audioContext!.createGain();
				
				this.speakerGain.gain.value = this.currentVolume;
				recordGain.gain.value = 1.0;
				
				// 라우팅 연결
				source.connect(this.speakerGain);
				source.connect(recordGain);
				this.speakerGain.connect(this.audioContext!.destination);
				
				// 녹음을 위한 MediaStreamDestination 생성
				this.recordDestination = this.audioContext!.createMediaStreamDestination();
				recordGain.connect(this.recordDestination);
				
				// 메인 audio element는 사용하지 않음
				this.audio.srcObject = null;
				
				// 오디오가 로드되면 녹음 시작
				tempAudio.addEventListener('loadeddata', () => {
					console.log('tempAudio loadeddata');
					tempAudio.play(); // 임시 audio 재생 (muted 상태)
					this.startRecording();
				});
			})();
		} else if ( this.engine === 'sori' || this.engine === 'echo' || this.engine === 'ivs' ) {
			// Mobile
			this.player = new Hls();
			this.player.loadSource(live.url_hls);
			this.player.attachMedia(this.audio);
			
			// 오디오가 로드되면 녹음 시작
			this.audio.addEventListener('loadeddata', () => {
				this.startRecording();
			});
		} else {
			logger.err('live', 'Unknown live engine name', this.live);
			throw Error('Unknown live engine name');
		}
		this.audio.play();

	}

}
