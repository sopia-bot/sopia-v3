<template>
	<v-app-bar
		color="grey lighten-4"
		dense
		:elevation="0"
		style="z-index: 10; height: var(--titlebar-height) !important; max-height: var(--titlebar-height);"
		class="sopia-title-bar">
		<v-btn icon plain class="mr-2 no-drag" v-if="$route.name !== 'Home' && isLogin" @click="$assign('/')">
			<v-icon>mdi-arrow-left-thin</v-icon>
		</v-btn>

		<div v-if="!isMacOS" style="display:flex;align-items:center;">
			<img src="../../assets/sopia-sd.png" width="32px" class="mr-4 no-drag" @click="upEGG">
			<span class="text-caption">SOPIA - {{ version }}</span>
		</div>
		<v-spacer></v-spacer>
		<template v-if="isLogin">
			<search-box></search-box>
			<v-spacer></v-spacer>
			<v-menu
				v-model="avatarMenu"
				:close-on-content-click="false"
				offset-y
				left
				transition="slide-y-transition"
				:nudge-width="280"
				:nudge-bottom="10">
				<template v-slot:activator="{ on, attrs }">
					<v-btn
						class="no-drag profile-menu-btn"
						text
						rounded
						v-bind="attrs"
						v-on="on">
						<v-avatar size="28" class="mr-2">
							<img :src="$store.getters.user.profile_url">
						</v-avatar>
						<span class="profile-name">{{ $store.getters.user.nickname }}</span>
						<v-icon small class="ml-1">mdi-chevron-down</v-icon>
					</v-btn>
				</template>
				<v-card class="profile-menu-card" elevation="8">
					<v-list-item class="profile-header" @click="$assign(userLink)">
						<v-list-item-avatar size="48">
							<v-img :src="$store.getters.user.profile_url"></v-img>
						</v-list-item-avatar>
						<v-list-item-content>
							<v-list-item-title class="font-weight-medium">{{ $store.getters.user.nickname }}</v-list-item-title>
							<v-list-item-subtitle class="text-caption">@{{ $store.getters.user.tag }}</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-icon small color="grey">mdi-open-in-new</v-icon>
						</v-list-item-action>
					</v-list-item>
					
					<v-divider></v-divider>
					
					<v-list dense>
						<v-list-item link @click="$assign('/release-note')">
							<v-list-item-icon>
								<v-icon color="blue">mdi-information</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>{{ $t('show-release-note') }}</v-list-item-title>
							</v-list-item-content>
						</v-list-item>
						
						<v-list-item link @click="$evt.$emit('donation:open')">
							<v-list-item-icon>
								<v-icon color="pink lighten-1">mdi-hand-coin</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>{{ $t('donation') }}</v-list-item-title>
							</v-list-item-content>
						</v-list-item>
						
						<v-divider class="my-1"></v-divider>
						
						<v-list-item link @click.stop="spoonLogout">
							<v-list-item-icon>
								<v-icon color="red">mdi-logout</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>{{ $t('spoon-logout') }}</v-list-item-title>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-card>
			</v-menu>
		</template>

		<v-spacer></v-spacer>

		<div v-if="!isMacOS">
			<v-btn class="no-drag mr-2" plain small icon @click.stop="minimize">
				<v-icon style="font-size: 15px;">mdi-window-minimize</v-icon>
			</v-btn>
			<v-btn class="no-drag mr-2" plain small icon @click.stop="maximize">
				<v-icon style="font-size: 15px;">mdi-window-maximize</v-icon>
			</v-btn>
			<v-btn color="red" class="no-drag" plain small icon @click.stop="quit">
				<v-icon style="font-size: 15px;">mdi-close</v-icon>
			</v-btn>
		</div>
		<div v-else style="display:flex;align-items:center;">
			<img src="../../assets/sopia-sd.png" width="32px" class="mr-4 no-drag" @click="upEGG">
			<span class="text-caption">SOPIA - {{ version }}</span>
		</div>

		<template v-if="isLogin" v-slot:extension>
			<div class="no-drag compact-nav" style="padding-left: calc(var(--sidebar-width) - 15px); height: 28px; display: flex; align-items: flex-end;">
				<div class="chrome-tabs">
					<div
						v-for="(bundle, index) in localBundleList"
						:key="bundle.name"
						class="chrome-tab"
						:class="{ 
							'active': bundle.name === currentBundle, 
							'dragging': draggedIndex === index,
							'drop-target': dropTargetIndex === index && draggedIndex !== -1 && draggedIndex !== index,
							'drag-source': draggedIndex === index
						}"
						@click="onTabClick(bundle)"
						@dragstart="onDragStart($event, index)"
						@dragover="onDragOver($event, index)"
						@dragleave="onDragLeave($event, index)"
						@drop="onDrop($event, index)"
						@dragend="onDragEnd"
						draggable="true"
					>
						<span class="chrome-tab-text">{{ bundle['name:ko'] || bundle.name }}</span>
						<div class="drag-handle" @mouseenter="showDragHandle = index" @mouseleave="showDragHandle = -1">
							<v-icon 
								small 
								class="drag-icon"
								:class="{ 'drag-ready': showDragHandle === index }"
							>
								mdi-drag
							</v-icon>
						</div>
					</div>
				</div>
			</div>
		</template>
	</v-app-bar>
</template>
<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import pkg from '../../../package.json';
import SearchBox from '../Search/SearchBox.vue';
import { BundlePackage } from '@/interface/bundle';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
const { ipcRenderer } = window.require('electron');
const os = window.require('os');
const path = window.require('path');
const fs = window.require('fs');

@Component({
	components: {
		SearchBox,
	},
})
export default class TitleBar extends Mixins(GlobalMixins) {
	public avatarMenu: boolean = false;
	public countEGG: number = 0;
	public selectedNav: string | null = null;
	public bundleRootPath: string = this.$path('userData', 'bundles');
	public localBundleList: BundlePackage[] = [];
	public currentBundle = '';
	public draggedIndex: number = -1;
	public showDragHandle: number = -1;
	public dropTargetIndex: number = -1;
	public bundleOrder: { order: number, name: string }[] = [];

	@Prop(Boolean) public isLogin!: boolean;

	public get version() {
		console.log(this.$route);
		return pkg.version;
	}

	public get isMacOS() {
		return os.platform() === 'darwin';
	}

	public get userLink() {
		return `/user/${this.$store.getters.user.id}`;
	}

	public mounted() {
		this.$evt.$off('bundle:refresh-local');
		this.$evt.$on('bundle:refresh-local', () => this.refreshLocalBundleList());
		this.refreshLocalBundleList();
		
		// 초기 라우트 변경 처리
		this.onRouteChange();

		this.loadBundleOrder();
	}

	// 라우트 변경 감지
	@Watch('$route')
	public onRouteWatcher() {
		this.onRouteChange();
	}

	public avatarClick() {
		console.log('click');
	}

	public onRouteChange() {
		console.log('route change:', this.$route);

		this.currentBundle = (this.$route.params.bundle || '').replace(/\/+$/g, '');
		console.log('currentBundle:', this.currentBundle);
	}

	public onTabClick(bundle: BundlePackage) {
		console.log('tab click:', bundle);
		this.$assign('/bundle/' + bundle.name + '/');
	}

	public async refreshLocalBundleList() {
		const bundleList = fs.readdirSync(this.bundleRootPath)
			.map((name: string) => path.join(this.bundleRootPath, name, 'package.json'))
			.filter((p: string) => fs.existsSync(p))
			.map((p: string) => {
				try {
					const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
					return { ...pkg, };
				} catch(err) {
					console.warn(`Failed to read package.json: ${p}`, err);
					return {};
				}
			})
			.filter((pkg: BundlePackage | null) => !!pkg?.page);
		this.localBundleList = bundleList || [];
		
		// 저장된 번들 순서 로드
		this.loadBundleOrder();
		
		// bundleOrder 배열 초기화
		this.updateBundleOrder();
		
		// 튜토리얼 실행 조건 체크
		this.checkAndShowTutorial();
	}

	private checkAndShowTutorial() {
		// localStorage에서 튜토리얼 완료 플래그 확인
		const tutorialCompleted = localStorage.getItem('sopia-bundle-tabs-tutorial-completed');
		
		// 조건: 번들 리스트가 1개 이상이고, 튜토리얼을 진행한 적이 없으면
		if (this.localBundleList.length >= 1 && !tutorialCompleted) {
			// 약간의 지연 후 튜토리얼 실행 (DOM이 완전히 렌더링된 후)
			this.$nextTick(() => {
				setTimeout(() => {
					this.showBundleTabsTutorial();
				}, 2000);
			});
		}
	}

	private showBundleTabsTutorial() {
		const driverObj = driver({
			popoverClass: 'sopia-tutorial-popover',
			stagePadding: 4,
			overlayColor: 'rgba(0, 0, 0, 0.5)',
			overlayOpacity: 0.7,
			onDestroyStarted: () => {
				// 백드롭 클릭이나 ESC 키로 닫힐 때도 완료 플래그 저장
				console.log('destroy started');
				localStorage.setItem('sopia-bundle-tabs-tutorial-completed', 'true');
				driverObj.destroy();
			}
		});

		driverObj.highlight({
			element: '.chrome-tabs',
			popover: {
				title: '번들 탭',
				description: '설정페이지가 있는 번들을 설치하면 이 탭에 페이지로 이동할 수 있는 탭이 추가됩니다. 탭을 눌러 번들 설정 페이지로 이동합니다.',
				side: 'bottom',
				align: 'start',
				onCloseClick: () => {
					// 튜토리얼 완료 플래그 저장
					localStorage.setItem('sopia-bundle-tabs-tutorial-completed', 'true');
					driverObj.destroy();
				},
			}
		});
	}

	public upEGG() {
		this.countEGG += 1;
		if ( this.countEGG > 5 ) {
			this.countEGG = 0;
			ipcRenderer.send('open-dev-tools');
		}
	}

	public spoonLogout() {
		window.logout();
		/*
		this.$cfg.delete('auth.spoon');
		this.$cfg.save();
		this.$store.state.loginDialog = true;
		*/
	}

	public maximize() {
		ipcRenderer.send('app:maximize');
	}

	public minimize() {
		ipcRenderer.send('app:minimize');
	}

	public quit() {
		this.$evt.$emit('app:quit');
		setTimeout(() => {
			ipcRenderer.send('app:quit');
		}, 500);
	}

	// 드래그 드롭 메서드들
	public onDragStart(event: DragEvent, index: number) {
		this.draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', index.toString());
		}
	}

	public onDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		// 드롭 타겟 표시
		if (this.draggedIndex !== -1 && this.draggedIndex !== index) {
			this.dropTargetIndex = index;
		}
	}

	public onDragLeave(event: DragEvent, index: number) {
		// 실제로 탭을 벗어났는지 확인 (자식 요소로 이동하는 경우 제외)
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;
		
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			if (this.dropTargetIndex === index) {
				this.dropTargetIndex = -1;
			}
		}
	}

	public onDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		
		if (this.draggedIndex !== -1 && this.draggedIndex !== dropIndex) {
			const draggedBundle = this.localBundleList[this.draggedIndex];
			const newList = [...this.localBundleList];
			
			// 드래그된 항목 제거
			newList.splice(this.draggedIndex, 1);
			
			// 새 위치에 삽입
			const insertIndex = this.draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
			newList.splice(insertIndex, 0, draggedBundle);
			
			this.localBundleList = newList;
			
			// 순서 변경을 localStorage에 저장
			this.saveBundleOrder();
		}
	}

	public onDragEnd() {
		this.draggedIndex = -1;
		this.dropTargetIndex = -1;
	}

	private saveBundleOrder() {
		const bundleOrder = this.localBundleList.map(bundle => bundle.name);
		localStorage.setItem('sopia-bundle-tab-order', JSON.stringify(bundleOrder));
		// bundleOrder 배열도 함께 업데이트
		this.updateBundleOrder();
	}

	private updateBundleOrder() {
		this.bundleOrder = this.localBundleList.map((bundle, index) => ({
			order: index,
			name: bundle.name
		}));
		this.$cfg.set('bundle-tab-order', this.bundleOrder);
		this.$cfg.save();
	}

	private loadBundleOrder() {
		const savedOrder = this.$cfg.get('bundle-tab-order');
		if (savedOrder) {
			try {
				const order = savedOrder as { order: number, name: string }[];
				// 저장된 순서에 따라 번들 리스트 재정렬
				const orderedList: BundlePackage[] = [];
				const unorderedList: BundlePackage[] = [];
				
				// 저장된 순서대로 먼저 추가
				order.forEach((item) => {
					const bundle = this.localBundleList.find(b => b.name === item.name);
					if (bundle) {
						orderedList.push(bundle);
					}
				});
				
				// 저장된 순서에 없는 새로운 번들들 추가
				this.localBundleList.forEach(bundle => {
					if (!order.some(item => item.name === bundle.name)) {
						unorderedList.push(bundle);
					}
				});
				
				this.localBundleList = [...orderedList, ...unorderedList];
			} catch (error) {
				console.warn('Failed to load bundle order:', error);
			}
		}
	}

}
</script>
<style>
.sopia-title-bar {
	-webkit-app-region: drag;
	-webkit-user-select: none;
}
.sopia-title-bar .no-drag {
	-webkit-app-region: no-drag;
}

.sopia-title-bar .v-toolbar__extension {
	height: 28px !important;
}

/* 크롬 스타일 탭 */

.chrome-tabs {
	display: flex;
	height: 28px !important;
	align-items: flex-end;
}

.chrome-tab {
	position: relative;
	height: 24px;
	min-width: 80px;
	max-width: 120px;
	background: rgba(24, 7, 180, 0.5);
	border-radius: 3px;
	margin-right: 3px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: space-between;
	transition: all 0.15s ease;
	border: 1px solid rgba(255, 255, 255, 0.2);
	padding: 0px 16px;
}

.chrome-tab:hover {
	background: rgba(48, 0, 221, 0.7);
	border-color: rgba(255, 255, 255, 0.3);
}

.chrome-tab.active {
	background: #303F9F;
	/* border-color: #2196F3; */
	color: white;
	border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.chrome-tab-text {
	font-size: 0.7rem;
	font-weight: 400;
	color: white;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	flex: 1;
	text-align: center;
}

.drag-handle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	cursor: grab;
	position: absolute;
	right: 0;
}

.drag-handle:active {
	cursor: grabbing;
}

.drag-icon {
	color: rgba(255, 255, 255, 0.7);
	opacity: 0;
	transition: color 0.2s ease, opacity 0.2s ease;
}

.chrome-tab:hover .drag-icon {
	color: rgba(255, 255, 255, 0.9);
	opacity: 1;
}

.drag-icon.drag-ready {
	color: #4CAF50 !important;
	opacity: 1 !important;
	transform: scale(1.2);
	animation: drag-ready-pulse 1.5s ease-in-out infinite;
}

@keyframes drag-ready-pulse {
	0%, 100% {
		transform: scale(1.2);
	}
	50% {
		transform: scale(1.3);
	}
}

.chrome-tab.dragging {
	opacity: 0.5;
	transform: scale(0.95);
}

.chrome-tab.drag-source {
	opacity: 0.6;
	transform: scale(0.98);
	border: 2px dashed rgba(255, 255, 255, 0.5);
	background: rgba(255, 255, 255, 0.1);
}

.chrome-tab.drop-target {
	border: 2px solid #4CAF50;
	background: rgba(76, 175, 80, 0.2);
	transform: scale(1.05);
	box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
	animation: pulse-drop-target 1s ease-in-out infinite alternate;
}

@keyframes pulse-drop-target {
	0% {
		box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
	}
	100% {
		box-shadow: 0 0 25px rgba(76, 175, 80, 0.8);
	}
}

.chrome-tab.active .chrome-tab-text {
	color: rgba(255, 255, 255, 0.801);
	font-weight: 500;
}

/* 튜토리얼 팝오버 스타일 */
.sopia-tutorial-popover .driver-popover {
	background: white;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	max-width: 300px;
}

.sopia-tutorial-popover .driver-popover-title {
	font-size: 1rem;
	font-weight: 600;
	color: #333;
	margin-bottom: 8px;
}

.sopia-tutorial-popover .driver-popover-description {
	font-size: 0.875rem;
	line-height: 1.5;
	color: #666;
}

.sopia-tutorial-popover .driver-popover-close-btn {
	background: #2196F3;
	color: white;
	border: none;
	border-radius: 4px;
	padding: 6px 12px;
	font-size: 0.8rem;
	cursor: pointer;
}

.sopia-tutorial-popover .driver-popover-close-btn:hover {
	background: #1976D2;
}

/* 프로필 메뉴 버튼 스타일 */
.profile-menu-btn {
	transition: all 0.2s ease;
	border: 1px solid transparent;
}

.profile-menu-btn:hover {
	background-color: rgba(0, 0, 0, 0.04) !important;
	border-color: rgba(0, 0, 0, 0.12);
}

.profile-name {
	font-size: 0.875rem;
	font-weight: 500;
	max-width: 120px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* 프로필 메뉴 카드 스타일 */
.profile-menu-card {
	border-radius: 8px !important;
	overflow: hidden;
}

.profile-header {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white !important;
	cursor: pointer;
	transition: background 0.2s ease;
}

.profile-header:hover {
	background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}

.profile-header .v-list-item__title,
.profile-header .v-list-item__subtitle {
	color: white !important;
}
</style>