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

						<v-list-item link @click="openDevTools">
							<v-list-item-icon>
								<v-icon>mdi-console</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>개발자도구 열기</v-list-item-title>
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

						<v-list-item link @click.stop="resetApp">
							<v-list-item-icon>
								<v-icon color="orange darken-1">mdi-refresh</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>초기화</v-list-item-title>
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

	private openDevTools() {
		ipcRenderer.send('open-dev-tools');
	}

	private checkAndShowTutorial() {
		// 로그인 먼저 확인
		if (!this.$sopia.logonUser) {
			return;
		}

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

	public async resetApp() {
		this.avatarMenu = false;

		const result = await this.$swal({
			title: '앱 초기화',
			html: `
				<div class="reset-dialog-content">
					<div class="reset-warning-banner">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
						</svg>
						<span>이 작업은 되돌릴 수 없습니다</span>
					</div>

					<p class="reset-description">다음 데이터가 모두 삭제됩니다:</p>

					<div class="reset-items">
						<div class="reset-item">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
							</svg>
							<span>로그인 정보</span>
						</div>
						<div class="reset-item">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
							</svg>
							<span>설치된 번들</span>
						</div>
						<div class="reset-item">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
							</svg>
							<span>설정 값</span>
						</div>
					</div>

					<label class="reset-checkbox-label">
						<input type="checkbox" id="reset-confirm-checkbox" class="reset-checkbox">
						<span class="reset-checkbox-custom"></span>
						<span class="reset-checkbox-text">위 내용을 확인했습니다</span>
					</label>
				</div>

				<style>
					.reset-dialog-content {
						text-align: left;
					}
					.reset-warning-banner {
						display: flex;
						align-items: center;
						gap: 10px;
						background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
						color: white;
						padding: 12px 16px;
						border-radius: 8px;
						margin-bottom: 20px;
						font-weight: 500;
						font-size: 14px;
					}
					.reset-description {
						color: #555;
						font-size: 14px;
						margin-bottom: 12px;
					}
					.reset-items {
						background: #f8f9fa;
						border-radius: 8px;
						padding: 12px;
						margin-bottom: 20px;
					}
					.reset-item {
						display: flex;
						align-items: center;
						gap: 12px;
						padding: 10px 8px;
						color: #333;
						font-size: 14px;
						border-bottom: 1px solid #eee;
					}
					.reset-item:last-child {
						border-bottom: none;
					}
					.reset-item svg {
						color: #666;
						flex-shrink: 0;
					}
					.reset-checkbox-label {
						display: flex;
						align-items: center;
						gap: 12px;
						cursor: pointer;
						padding: 12px 16px;
						background: #fff3e0;
						border: 2px solid #ffb74d;
						border-radius: 8px;
						transition: all 0.2s ease;
					}
					.reset-checkbox-label:hover {
						background: #ffe0b2;
					}
					.reset-checkbox {
						display: none;
					}
					.reset-checkbox-custom {
						width: 22px;
						height: 22px;
						border: 2px solid #ff9800;
						border-radius: 4px;
						display: flex;
						align-items: center;
						justify-content: center;
						transition: all 0.2s ease;
						flex-shrink: 0;
					}
					.reset-checkbox:checked + .reset-checkbox-custom {
						background: #ff9800;
						border-color: #ff9800;
					}
					.reset-checkbox:checked + .reset-checkbox-custom::after {
						content: '';
						width: 6px;
						height: 10px;
						border: solid white;
						border-width: 0 2px 2px 0;
						transform: rotate(45deg);
						margin-bottom: 2px;
					}
					.reset-checkbox-text {
						font-size: 14px;
						font-weight: 500;
						color: #e65100;
					}
				</style>
			`,
			icon: undefined,
			showCancelButton: true,
			confirmButtonText: '초기화 진행',
			cancelButtonText: '취소',
			confirmButtonColor: '#d32f2f',
			cancelButtonColor: '#9e9e9e',
			reverseButtons: true,
			customClass: {
				popup: 'reset-dialog-popup',
				title: 'reset-dialog-title',
				confirmButton: 'reset-confirm-btn',
				cancelButton: 'reset-cancel-btn',
			},
			preConfirm: () => {
				const checkbox = document.getElementById('reset-confirm-checkbox') as HTMLInputElement;
				if (!checkbox || !checkbox.checked) {
					this.$swal.showValidationMessage('체크박스를 선택해주세요.');
					return false;
				}
				return true;
			},
		});

		if (result.isConfirmed) {
			this.$cfg.set('reset-flag', true);
			this.$cfg.save();
			ipcRenderer.send('app:reload');
		}
	}

	public maximize() {
		ipcRenderer.send('app:maximize');
	}

	public minimize() {
		ipcRenderer.send('app:minimize');
	}

	public async quit() {
		// 종료 확인 다이얼로그
		const result = await this.$swal({
			title: '프로그램을 종료하시겠습니까?',
			text: '만약 방송에 참가중이라면 트레이 이동시 봇 동작을 계속합니다.',
			icon: 'question',
			showCancelButton: true,
			showDenyButton: true,
			confirmButtonText: '트레이',
			denyButtonText: '종료',
			cancelButtonText: '취소',
			confirmButtonColor: '#3085d6',
			denyButtonColor: '#d33',
			cancelButtonColor: '#6c757d',
			reverseButtons: false
		});

		if (result.isConfirmed) {
			// 트레이 선택
			ipcRenderer.send('app:hide-to-tray');
		} else if (result.isDenied) {
			// 종료 선택
			this.$evt.$emit('app:quit');
			setTimeout(() => {
				ipcRenderer.send('app:quit');
			}, 500);
		}
		// 취소 선택시 아무것도 하지 않음
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