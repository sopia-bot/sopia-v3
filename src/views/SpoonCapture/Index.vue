<template>
	<v-main class="custom" style="max-height: calc(100vh - 48px); min-height: calc(100vh - 48px); overflow-y: auto;">
		<v-container fluid>
			<!-- 헤더 -->
			<v-row class="mb-4">
				<v-col cols="12">
					<v-card>
						<v-card-title class="headline">
							<v-icon left>mdi-video-vintage</v-icon>
							방송 다시보기 플레이어
						</v-card-title>
						<v-card-subtitle>
							저장된 방송 기록을 재생하고 화면을 캡쳐할 수 있습니다.
						</v-card-subtitle>
						<v-card-actions>
							사용방법에 대한 자세한 내용은 <v-btn text color="indigo" class="text-decoration-underline text-blue" @click="$assign('https://sopia.dev/docs/spoon-taxi/spoon-capture', true)">이곳</v-btn>을 클릭해주세요.
						</v-card-actions>
					</v-card>
				</v-col>
			</v-row>

			<!-- 방송 목록 또는 플레이어 -->
			<v-row v-if="!selectedLive">
				<v-col cols="12">
					<v-card-text class="d-flex align-center">
						<v-icon left>mdi-format-list-bulleted</v-icon>
						방송 목록
						<v-spacer></v-spacer>
						<v-btn @click="() => loadLiveList(true)" :loading="loading" color="primary">
							<v-icon left>mdi-refresh</v-icon>
							새로고침
						</v-btn>
					</v-card-text>
					
					<!-- 로딩 상태 -->
					<v-card-text v-if="loading">
						<v-skeleton-loader type="list-item-avatar-three-line@3"></v-skeleton-loader>
					</v-card-text>
					
					<!-- 방송 목록이 없을 때 -->
					<v-card-text v-else-if="liveList.length === 0">
						<v-alert type="info" outlined>
							<v-icon slot="prepend">mdi-information</v-icon>
							저장된 방송 기록이 없습니다.
						</v-alert>
					</v-card-text>
					
					<!-- 방송 목록 -->
					<v-card-text v-else>
						<v-row>
							<v-col
								v-for="live in liveList"
								:key="live.liveId"
								cols="12"
								sm="6"
								md="4"
								lg="3"
							>
								<v-card
									class="live-card"
									hover
									@click="selectLive(live)"
								>
									<v-img
										:src="live.imgUrl"
										:alt="live.title"
										height="200"
										class="white--text align-end"
										gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
									>
										<template v-slot:placeholder>
											<v-row class="fill-height ma-0" align="center" justify="center">
												<v-icon large color="grey lighten-1">mdi-video</v-icon>
											</v-row>
										</template>
										
										<v-card-title class="text-h6">
											{{ live.title }}
										</v-card-title>
									</v-img>
									
									<v-card-text>
										<div class="text--primary">
											<v-icon small class="mr-1">mdi-calendar</v-icon>
											{{ formatDate(live.created) }}
										</div>
										<div class="text--secondary mt-1">
											<v-icon small class="mr-1">mdi-identifier</v-icon>
											Live ID: {{ live.liveId }}
										</div>
										
										<!-- DJ 정보 -->
										<v-divider class="my-2"></v-divider>
										<div class="dj-info">
											<div class="d-flex align-center mb-2">
												<v-avatar size="32" class="mr-2">
													<v-img :src="live.authorProfileUrl" :alt="live.authorNickname">
														<template v-slot:placeholder>
															<v-icon small>mdi-account</v-icon>
														</template>
													</v-img>
												</v-avatar>
												<div>
													<div class="font-weight-medium text--primary">
														{{ live.authorNickname }}
													</div>
													<div class="caption text--secondary" v-if="live.authorTag">
														@{{ live.authorTag }}
													</div>
												</div>
											</div>
										</div>
									</v-card-text>
									
									<v-card-actions>
										<v-spacer></v-spacer>
										<v-btn
											color="primary"
											text
											@click.stop="selectLive(live)"
										>
											<v-icon left>mdi-play</v-icon>
											재생
										</v-btn>
									</v-card-actions>
								</v-card>
							</v-col>
						</v-row>
						
						<!-- 더보기 로딩 상태 -->
						<div v-if="isLoadingMore" class="text-center py-4">
							<v-progress-circular
								indeterminate
								color="primary"
								size="40"
							></v-progress-circular>
							<div class="mt-2 text--secondary">더 많은 방송을 불러오는 중...</div>
						</div>
						
						<!-- 더 이상 로드할 데이터가 없을 때 -->
						<div v-else-if="!hasMore && liveList.length > 0" class="text-center py-4">
							<v-icon color="grey">mdi-check-circle</v-icon>
							<div class="mt-2 text--secondary">모든 방송을 불러왔습니다.</div>
						</div>
					</v-card-text>
				</v-col>
			</v-row>
		</v-container>
	</v-main>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
const fs = window.require('fs');
const path = window.require('path');
const Database = window.require('better-sqlite3');

interface LiveInfo {
	liveId: number;
	title: string;
	imgUrl: string;
	created: string;
	dbPath: string;
	authorProfileUrl: string;
	authorNickname: string;
	authorTag: string;
}

interface ChatMessage {
	id: number;
	timestamp: number;
	nickname: string;
	profileUrl: string;
	message: string;
}

@Component({
	components: {
	},
})
export default class SpoonCapture extends Mixins(GlobalMixins) {
	private loading = false;
	private liveList: LiveInfo[] = [];
	private selectedLive: LiveInfo | null = null;
	private isPlaying = false;
	private currentTime = 0;
	private totalTime = 0;
	private currentChats: ChatMessage[] = [];
	private playTimer: NodeJS.Timeout | null = null;
	private allChats: ChatMessage[] = [];
	
	// 페이지네이션 관련
	private currentPage = 0;
	private pageSize = 30;
	private hasMore = true;
	private isLoadingMore = false;
	private allLiveFiles: string[] = [];

	async mounted() {
		await this.loadLiveList();
		this.setupScrollListener();
	}
	
	setupScrollListener() {
		const container = document.querySelector('.v-main');
		if (container) {
			container.addEventListener('scroll', this.handleScroll);
		}
	}

	beforeDestroy() {
		if (this.playTimer) {
			clearInterval(this.playTimer);
		}
		// 스크롤 이벤트 리스너 제거
		const container = document.querySelector('.v-main');
		if (container) {
			container.removeEventListener('scroll', this.handleScroll);
		}
	}
	
	handleScroll = () => {
		if (this.isLoadingMore || !this.hasMore) return;
		
		const container = document.querySelector('.v-main');
		if (!container) return;
		
		// 스크롤이 끝에서 200px 이내에 도달했을 때 더 로드
		const scrollTop = container.scrollTop;
		const scrollHeight = container.scrollHeight;
		const clientHeight = container.clientHeight;
		
		if (scrollTop + clientHeight >= scrollHeight - 200) {
			this.loadMoreLives();
		}
	}
	
	async loadMoreLives() {
		if (this.isLoadingMore || !this.hasMore) return;
		
		await this.loadLiveList(false);
	}

	async loadLiveList(reset = true) {
		if (reset) {
			this.loading = true;
			this.currentPage = 0;
			this.liveList = [];
			this.hasMore = true;
			this.allLiveFiles = [];
		} else {
			this.isLoadingMore = true;
		}
		
		try {
			const historyPath = this.$path('userData', 'historydb');
			
			if (!fs.existsSync(historyPath)) {
				console.log('History directory does not exist:', historyPath);
				this.liveList = [];
				this.hasMore = false;
				return;
			}

			// 첫 번째 로딩일 때만 파일 목록 가져오기
			if (reset) {
				const files = fs.readdirSync(historyPath);
				console.log('Files in history directory:', files);
				this.allLiveFiles = files.filter((file: string) => file.endsWith('.db'));
			}
			
			// 현재 페이지에 해당하는 파일들만 처리
			const startIndex = this.currentPage * this.pageSize;
			const endIndex = startIndex + this.pageSize;
			const currentPageFiles = this.allLiveFiles.slice(startIndex, endIndex);
			
			const newLiveList: LiveInfo[] = [];
			
			for (const dbFile of currentPageFiles) {
				try {
					const liveId = parseInt(dbFile.replace('.db', ''));
					const dbPath = path.join(historyPath, dbFile);
					
					const db = new Database(dbPath, { readonly: true });
					
					// 첫 번째 live_update 이벤트 가져오기
					const stmt = db.prepare(`
						SELECT data_json FROM live_history_tbl 
						WHERE live_event = 'live_update' 
						ORDER BY idx ASC 
						LIMIT 1
					`);
					
					const row = stmt.get();
					db.close();
					
					if (row && row.data_json) {
						const data = JSON.parse(row.data_json);
						if (data.data && data.data.live) {
							const live = data.data.live;
							newLiveList.push({
								liveId: liveId,
								title: live.title || '제목 없음',
								imgUrl: live.img_url || '',
								created: live.created || '',
								dbPath: dbPath,
								authorProfileUrl: live.author?.profile_url || '',
								authorNickname: live.author?.nickname || '알 수 없음',
								authorTag: live.author?.tag || ''
							});
						}
					}
				} catch (error) {
					console.error(`Error processing ${dbFile}:`, error);
				}
			}
			
			// 생성일 기준으로 정렬 (최신순)
			newLiveList.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
			
			// 기존 목록에 추가
			this.liveList.push(...newLiveList);
			
			// 다음 페이지 설정
			this.currentPage++;
			this.hasMore = endIndex < this.allLiveFiles.length;
			
		} catch (error) {
			console.error('Error loading live list:', error);
			this.$noti({
				type: 'error',
				content: '방송 목록을 불러오는데 실패했습니다.'
			});
		} finally {
			this.loading = false;
			this.isLoadingMore = false;
		}
	}

	selectLive(live: LiveInfo) {
		this.$assign(`/spoon-capture/player/${live.liveId}`);
	}

	goBackToList() {
		this.selectedLive = null;
		this.isPlaying = false;
		this.currentTime = 0;
		this.totalTime = 0;
		this.currentChats = [];
		this.allChats = [];
		if (this.playTimer) {
			clearInterval(this.playTimer);
			this.playTimer = null;
		}
	}

	async loadChatData() {
		if (!this.selectedLive) return;
		
		try {
			const db = new Database(this.selectedLive.dbPath, { readonly: true });
			
			// 모든 채팅 메시지 가져오기
			const stmt = db.prepare(`
				SELECT idx, live_event, data_json, saved_date FROM live_history_tbl 
				WHERE live_event IN ('message', 'join', 'leave')
				ORDER BY idx ASC
			`);
			
			const rows = stmt.all();
			db.close();
			
			this.allChats = [];
			let startTime = 0;
			
			for (const row of rows) {
				try {
					const data = JSON.parse(row.data_json);
					
					if (row.live_event === 'message' && data.data) {
						const messageData = data.data;
						const timestamp = new Date(row.saved_date).getTime();
						
						if (startTime === 0) {
							startTime = timestamp;
						}
						
						this.allChats.push({
							id: row.idx,
							timestamp: Math.floor((timestamp - startTime) / 1000), // 초 단위로 변환
							nickname: messageData.author?.nickname || '알 수 없음',
							profileUrl: messageData.author?.profile_url || '',
							message: messageData.message || ''
						});
					}
				} catch (error) {
					console.error('Error parsing chat data:', error);
				}
			}
			
			// 총 시간 계산 (마지막 채팅 시간 기준)
			if (this.allChats.length > 0) {
				this.totalTime = Math.max(...this.allChats.map(chat => chat.timestamp)) + 60; // 1분 여유
			} else {
				this.totalTime = 3600; // 기본 1시간
			}
			
		} catch (error) {
			console.error('Error loading chat data:', error);
			this.$noti({
				type: 'error',
				content: '채팅 데이터를 불러오는데 실패했습니다.'
			});
		}
	}

	togglePlay() {
		this.isPlaying = !this.isPlaying;
		
		if (this.isPlaying) {
			this.startPlayback();
		} else {
			this.stopPlayback();
		}
	}

	startPlayback() {
		if (this.playTimer) {
			clearInterval(this.playTimer);
		}
		
		this.playTimer = setInterval(() => {
			this.currentTime += 1;
			this.updateCurrentChats();
			
			if (this.currentTime >= this.totalTime) {
				this.stopPlayback();
			}
		}, 1000);
	}

	stopPlayback() {
		this.isPlaying = false;
		if (this.playTimer) {
			clearInterval(this.playTimer);
			this.playTimer = null;
		}
	}

	seekTo(time: number) {
		this.currentTime = time;
		this.updateCurrentChats();
	}

	updateCurrentChats() {
		// 현재 시간 기준으로 표시할 채팅들 필터링 (최근 30초간의 채팅)
		const timeWindow = 30;
		this.currentChats = this.allChats.filter(chat => 
			chat.timestamp <= this.currentTime && 
			chat.timestamp > this.currentTime - timeWindow
		).slice(-10); // 최대 10개만 표시
		
		// 채팅 컨테이너 스크롤을 맨 아래로
		this.$nextTick(() => {
			const container = this.$refs.chatContainer as HTMLElement;
			if (container) {
				container.scrollTop = container.scrollHeight;
			}
		});
	}

	captureScreen() {
		// 화면 캡쳐 기능 - 추후 구현
		this.$noti({
			type: 'info',
			content: '화면 캡쳐 기능은 추후 구현 예정입니다.'
		});
	}

	formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR');
		} catch {
			return dateString;
		}
	}
}
</script>

<style scoped>
.live-card {
	cursor: pointer;
	transition: all 0.3s ease;
	height: 100%;
}

.live-card:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.player-container {
	max-width: 100%;
}

.player-controls {
	background-color: #f5f5f5;
	padding: 16px;
	border-radius: 8px;
}

.time-display {
	font-family: monospace;
	font-size: 14px;
	min-width: 100px;
	text-align: center;
}

.chat-message {
	border-left: 3px solid #e0e0e0;
	padding-left: 8px;
}

.chat-header {
	font-size: 14px;
}

.chat-content {
	font-size: 14px;
	line-height: 1.4;
	word-break: break-word;
}
</style>
