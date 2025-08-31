<template>
	<v-main class="split-view-root">
		<!-- 상단 툴바 -->
		<v-app-bar dense color="primary" dark class="split-toolbar">
			<v-btn icon @click="goBack">
				<v-icon>mdi-arrow-left</v-icon>
			</v-btn>
			<v-toolbar-title>{{ liveTitle || `Split View - ${liveId}` }}</v-toolbar-title>
		</v-app-bar>

		<!-- 메인 컨테이너 -->
		<div class="split-container">
			<!-- 뷰 A (Player) -->
			<div 
				:class="['view-container', 'view-a', { 
					'is-main': mainView === 'A', 
					'is-mini': mainView === 'B',
					'animating': isAnimating 
				}]"
				@click="mainView === 'B' ? swapViews() : null"
				:tabindex="mainView === 'B' ? 0 : -1"
				@keydown.enter="mainView === 'B' ? swapViews() : null"
				@keydown.space.prevent="mainView === 'B' ? swapViews() : null"
			>
				<div class="view-content">
					<Player 
						:live-id="liveId" 
						@add-image-to-editor="handleAddImageToEditor"
						@set-editor-background="handleSetEditorBackground"
						@switch-to-editor="switchToEditor"
					/>
				</div>
				<!-- 미니 뷰일 때 오버레이 -->
				<div v-if="mainView === 'B'" class="mini-overlay">
					<v-icon color="white" size="32">mdi-swap-horizontal</v-icon>
					<div class="mini-hint">클릭하여 전환</div>
				</div>
			</div>

			<!-- 뷰 B (Editor) -->
			<div 
				:class="['view-container', 'view-b', { 
					'is-main': mainView === 'B', 
					'is-mini': mainView === 'A',
					'animating': isAnimating 
				}]"
				@click="mainView === 'A' ? swapViews() : null"
				:tabindex="mainView === 'A' ? 0 : -1"
				@keydown.enter="mainView === 'A' ? swapViews() : null"
				@keydown.space.prevent="mainView === 'A' ? swapViews() : null"
			>
				<div class="view-content">
					<Editor 
						:live-id="liveId" 
						ref="editorRef"
					/>
				</div>
				<!-- 미니 뷰일 때 오버레이 -->
				<div v-if="mainView === 'A'" class="mini-overlay">
					<v-icon color="white" size="32">mdi-swap-horizontal</v-icon>
					<div class="mini-hint">클릭하여 전환</div>
				</div>
			</div>
		</div>
	</v-main>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import Player from './Player.vue';
import Editor from './Editor/Index.vue';
const Database = window.require('better-sqlite3');

type ViewType = 'A' | 'B';

@Component({
	components: {
		Player,
		Editor,
	},
})
export default class MasterView extends Mixins(GlobalMixins) {
	// 현재 메인 뷰 상태 ('A' = Player, 'B' = Editor)
	private mainView: ViewType = 'A';
	
	// 라이브 ID
	private liveId = (this.$route.params.liveId as string) || '';

	// 방송 제목
	private liveTitle = '';

	// 애니메이션 상태
	private isAnimating = false;

	// 스케일 계산을 위한 상수
	private readonly BASE_WIDTH = 1280;
	private readonly BASE_HEIGHT = 800;
	private readonly MINI_SIZE = 200;

	async mounted() {
		// 방송 제목 로드
		await this.loadLiveTitle();

		// GPU 가속을 위한 will-change 설정
		this.$nextTick(() => {
			const miniElements = document.querySelectorAll('.mini-inner');
			miniElements.forEach(el => {
				(el as HTMLElement).style.willChange = 'transform';
			});
		});

		// 전역 이벤트 리스너 등록
		this.$root.$on('master:switch-to-editor', this.switchToEditor);
		this.$root.$on('editor:add-image', this.handleAddImageToEditor);
		this.$root.$on('editor:set-background', this.handleSetEditorBackground);
	}

	// 방송 제목 로드
	async loadLiveTitle(): Promise<void> {
		try {
			if (!this.liveId) return;
			
			
			
			const dbPath = this.$path('userData', 'historydb', `${this.liveId}.db`);
			
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
					this.liveTitle = data.data.live.title || '제목 없음';
				}
			}
		} catch (error) {
			console.error('방송 제목 로드 실패:', error);
			this.liveTitle = '제목 없음';
		}
	}

	beforeDestroy() {
		// 전역 이벤트 리스너 해제
		this.$root.$off('master:switch-to-editor', this.switchToEditor);
		this.$root.$off('editor:add-image', this.handleAddImageToEditor);
		this.$root.$off('editor:set-background', this.handleSetEditorBackground);
	}

	/**
	 * 메인/미니 뷰 스왑
	 */
	private async swapViews(): Promise<void> {
		if (this.isAnimating) return;
		
		this.isAnimating = true;
		this.mainView = this.mainView === 'A' ? 'B' : 'A';
		
		// 애니메이션 완료 후 상태 리셋
		setTimeout(() => {
			this.isAnimating = false;
		}, 600); // 애니메이션 시간과 맞춤
	}

	/**
	 * 에디터로 전환
	 */
	private switchToEditor(): void {
		if (this.mainView !== 'B') {
			this.swapViews();
		}
	}

	/**
	 * 에디터에 이미지 추가
	 */
	private handleAddImageToEditor(imageData: any): void {
		try {
			const editorRef = this.$refs.editorRef as any;
			console.log('에디터 레퍼런스:', editorRef);
			if (editorRef && editorRef.addImageItem) {
				editorRef.addImageItem(imageData);
				console.log('에디터에 이미지 추가됨:', imageData.name);
			} else {
				console.warn('에디터 레퍼런스를 찾을 수 없습니다.');
			}
		} catch (error) {
			console.error('에디터에 이미지 추가 실패:', error);
		}
	}

	/**
	 * 에디터 배경 설정
	 */
	private handleSetEditorBackground(backgroundData: any): void {
		try {
			const editorRef = this.$refs.editorRef as any;
			if (editorRef && editorRef.setBackgroundImage) {
				editorRef.setBackgroundImage(backgroundData.src);
				console.log('에디터 배경 설정됨');
			} else {
				console.warn('에디터 레퍼런스를 찾을 수 없습니다.');
			}
		} catch (error) {
			console.error('에디터 배경 설정 실패:', error);
		}
	}

	/**
	 * 뒤로가기
	 */
	private goBack(): void {
		this.$router.go(-1);
	}

	/**
	 * 미니 뷰 스케일 계산
	 */
	get miniScale(): number {
		return Math.min(
			this.MINI_SIZE / this.BASE_WIDTH,
			this.MINI_SIZE / this.BASE_HEIGHT
		);
	}
}
</script>

<style lang="scss" scoped>
// 루트 컨테이너
.split-view-root {
	height: 100vh;
	overflow: hidden;
	background: var(--v-background-base);
    padding: 0px 0px 0px 80px !important;
}

// 툴바
.split-toolbar {
	z-index: 10;
}

// 메인 분할 컨테이너
.split-container {
	position: relative;
	height: calc(100vh - 48px); // 툴바 높이 제외
	padding: 16px;
	box-sizing: border-box;
}

// 뷰 컨테이너 공통 스타일
.view-container {
	position: absolute;
	overflow: hidden;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	background: var(--v-surface-base);
	transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
	transform-origin: center center;
	will-change: transform, width, height, top, left;
}

// 뷰 A (Player) - 항상 왼쪽 위치
.view-a {
	&.is-main {
		top: 0;
		left: 0;
		width: calc(100% - 216px); // 200px 미니뷰 + 16px 간격
		height: 100%;
		z-index: 2;
	}
	
	&.is-mini {
		top: 0;
		left: 0;
		width: 200px;
		height: 200px;
		z-index: 1;
		cursor: pointer;
		
		&:hover {
			transform: scale(1.02);
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
		}
		
		&:focus {
			outline: 3px solid var(--v-primary-base);
			outline-offset: 2px;
		}
		
		&:active {
			transform: scale(0.98);
		}
	}
}

// 뷰 B (Editor) - 항상 오른쪽 위치
.view-b {
	&.is-main {
		top: 0;
		right: 0;
		width: calc(100% - 216px); // 200px 미니뷰 + 16px 간격
		height: 100%;
		z-index: 2;
	}
	
	&.is-mini {
		top: 0;
		right: 0;
		width: 200px;
		height: 200px;
		z-index: 1;
		cursor: pointer;
		
		&:hover {
			transform: scale(1.02);
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
		}
		
		&:focus {
			outline: 3px solid var(--v-primary-base);
			outline-offset: 2px;
		}
		
		&:active {
			transform: scale(0.98);
		}
	}
}

// 뷰 콘텐츠
.view-content {
	width: 100%;
	height: 100%;
	transform: translateZ(0); // GPU 가속
	overflow: hidden;
}

// 미니 뷰일 때 콘텐츠 스케일링
.view-container.is-mini .view-content {
	transform-origin: top left;
	transform: scale(0.15625) translateZ(0); // 200/1280 = 0.15625
	width: 1280px; // 기준 너비
	height: 800px; // 기준 높이
}

// 미니 뷰 오버레이 (클릭 힌트)
.mini-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.3);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.2s ease;
	pointer-events: none;
	z-index: 10;

	.mini-hint {
		color: white;
		font-size: 12px;
		font-weight: 500;
		margin-top: 4px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}
}

.view-container.is-mini:hover .mini-overlay {
	opacity: 1;
}

// 애니메이션 중일 때 호버 효과 비활성화
.view-container.animating {
	pointer-events: none;
	
	&:hover {
		transform: none !important;
	}
}

// 다크 테마 지원
.theme--dark {
	.view-container {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		
		&.is-mini:hover {
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
		}
	}
}

// 반응형 지원 (작은 화면)
@media (max-width: 768px) {
	.split-container {
		padding: 12px;
	}
	
	// 세로 배치로 변경
	.view-a {
		&.is-main {
			top: 0;
			left: 0;
			width: 100%;
			height: calc(100% - 162px); // 150px 미니뷰 + 12px 간격
		}
		
		&.is-mini {
			bottom: 0;
			left: 0;
			right: auto;
			top: auto;
			width: 150px;
			height: 150px;
		}
	}
	
	.view-b {
		&.is-main {
			top: 0;
			left: 0;
			width: 100%;
			height: calc(100% - 162px); // 150px 미니뷰 + 12px 간격
		}
		
		&.is-mini {
			bottom: 0;
			right: 0;
			left: auto;
			top: auto;
			width: 150px;
			height: 150px;
		}
	}
	
	// 모바일에서 미니 뷰 스케일 조정
	.view-container.is-mini .view-content {
		transform: scale(0.117) translateZ(0); // 150/1280 ≈ 0.117
	}
}

// 성능 최적화를 위한 GPU 가속
.view-container {
	backface-visibility: hidden;
	perspective: 1000px;
}
</style>
