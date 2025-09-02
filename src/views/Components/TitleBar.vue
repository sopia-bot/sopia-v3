<template>
	<v-app-bar
		color="grey lighten-4"
		dense
		:elevation="0"
		style="z-index: 10; height: var(--titlebar-height) !important;"
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
				:nudge-width="250"
				:nudge-bottom="10">
				<template v-slot:activator="{ on, attrs }">
					<v-avatar size="32" class="no-drag" v-bind="attrs" v-on="on">
						<img :src="$store.getters.user.profile_url">
					</v-avatar>
				</template>
				<v-card color="blue-grey lighten-4">
					<v-list-item class="px-2" link @click="$assign(userLink)">
						<v-list-item-avatar color="black">
							<v-img :src="$store.getters.user.profile_url"></v-img>
						</v-list-item-avatar>

						<v-list-item-content>
							<v-list-item-title class="title" style="font-size: 1rem !important;">{{ $store.getters.user.nickname }}</v-list-item-title>
							<v-list-item-subtitle style="font-size: 0.6rem !important;">@{{ $store.getters.user.tag }}</v-list-item-subtitle>
							<v-list-item-action-text class="mt-2">
								<v-btn x-small text class="text-caption text-decoration-underline py-3" @click.stop="spoonLogout">
									<span style="font-size: 0.7rem;">{{ $t('spoon-logout') }}</span>
								</v-btn>
							</v-list-item-action-text>
						</v-list-item-content>
					</v-list-item>
					<v-list-item class="px-2 white" link @click="$assign('/release-note')">
						<v-list-item>
							{{ $t('show-release-note') }}
						</v-list-item>
					</v-list-item>
					<v-list-item class="px-2 white" link @click="$evt.$emit('donation:open')">
						<v-list-item>
							<v-icon class="mr-2" color="pink lighten-3">mdi-hand-coin</v-icon>
							{{ $t('donation') }}
						</v-list-item>
					</v-list-item>
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
						v-for="bundle in localBundleList"
						:key="bundle.name"
						class="chrome-tab"
						:class="{ 'active': bundle.name === currentBundle }"
						@click="onTabClick(bundle)"
					>
						<span class="chrome-tab-text">{{ bundle['name:ko'] || bundle.name }}</span>
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
.compact-nav {
	background-color: var(--v-blue-grey-darken2) !important;
}

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
	background: rgba(255, 255, 255, 0.1);
	border-radius: 3px;
	margin-right: 3px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
	border: 1px solid rgba(255, 255, 255, 0.2);
}

.chrome-tab:hover {
	background: rgba(255, 255, 255, 0.15);
	border-color: rgba(255, 255, 255, 0.3);
}

.chrome-tab.active {
	background: rgba(255, 255, 255, 0.2);
	/* border-color: #2196F3; */
	border-bottom: 2px solid #2196F3;
}

.chrome-tab-text {
	font-size: 0.7rem;
	font-weight: 400;
	color: rgba(0, 0, 0, 0.7);
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	padding: 0 8px;
}

.chrome-tab.active .chrome-tab-text {
	color: rgba(0, 0, 0, 0.9);
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
</style>