<!--
 * App.vue
 * Created on Sat Jul 18 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<v-app style="">
		<service-shutdown-dialog />
		<title-bar :isLogin="isLogin" />
		<donation />
		<update-dialog v-if="isLogin"/>
		<bundle-update-dialog v-if="isLogin" v-model="bundleUpdateDialogShow" :items="bundleUpdateList" />
		<side-menu v-if="isLogin"/>
		<div class="ma-0 d-flex">
			<v-sheet id="router-view" tile :key="$route.fullPath" color="white" :style="{ maxWidth: maxWindowWidth }" style="flex-basis: 80%; flex-grow: 1; flex-shrink: 1;">
				<transition name="scroll-y-reverse-transition">
					<router-view></router-view>
				</transition>
			</v-sheet>
			<live-player v-if="isLogin && currentLive.id" :live="currentLive" :isMembership="isMemberShip" :isRejoin="isRejoin" @screen:change="screenChange"/>
		</div>
		<!--<tutorials/>-->
		<!-- <agree-live-info-dialog v-if="isLogin" :open="agreeLiveInfoDialogOpen" @update:open="agreeLiveInfoDialogOpen = $event" /> -->
	</v-app>
</template>
<style>
@import './assets/suit/SUIT-Variable.css';
.h-100v {
	height: calc(100vh - var(--titlebar-height));
}
html, body {
	overflow: hidden;
}
* {
	font-family: 'SUIT Variable';
}
</style>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { User, Live, SpoonClient, ApiLivesInfo } from '@sopia-bot/core';
import CfgLite from '@/plugins/cfg-lite-ipc';
import path from 'path';
import { BundlePackage } from '@/interface/bundle';

import LivePlayer from '@/views/Live/Player.vue';
import LoginDialog from '@/views/Login/Index.vue';
import BundleUpdateDialog from '@/views/Bundle/UpdateDialog.vue';
import UpdateDialog from '@/views/Components/UpdateDialog.vue';
import TitleBar from '@/views/Components/TitleBar.vue';
import SideMenu from '@/views/Components/SideMenu.vue';
import Tutorials from '@/views/Tutorials/Index.vue';
import Donation from '@/views/Components/Donation.vue';
import AgreeLiveInfoDialog from '@/views/Components/AgreeLiveInfoDialog.vue';
import ServiceShutdownDialog from '@/views/Components/ServiceShutdownDialog.vue';

const fs = window.require('fs');

declare global {
	interface Window {
		user: User;
		$spoon: any;
		$sopia: SpoonClient;
		reloadCfg: () => void;
		appCfg: CfgLite;
		logout: () => void;
		$openStickerModal: () => void;
	}
}

@Component({
	components: {
		SideMenu,
		LivePlayer,
		LoginDialog,
		BundleUpdateDialog,
		UpdateDialog,
		TitleBar,
		Tutorials,
		Donation,
		AgreeLiveInfoDialog,
		ServiceShutdownDialog,
	},
})
export default class App extends Mixins(GlobalMixins) {
	public currentLive: Live = {} as Live;
	public isMemberShip: boolean = false;
	public isRejoin: boolean = false;
	public bundleUpdateDialogShow: boolean = false;
	public bundleUpdateList: BundlePackage[] = [];
	public isLogin: boolean = false;
	public agreeLiveInfoDialogOpen: boolean = false;

	public enter(...args: any[]) {
		console.log('enter transition', args);
	}

	private resizeTimeout: any = null;
	private moveTimeout: any = null;
	private isResizing: boolean = false;
	private isMoving: boolean = false;
	private liveFullScreen: boolean = false;

	get maxWindowWidth() {
		console.log('maxWindowWidth', this.liveFullScreen, this.currentLive)
		if ( !this.liveFullScreen ) {
			return '100vw';
		}
		if ( this.currentLive && this.currentLive.id ) {
			return `calc(100vw - 450px)`;
		}
		return '100vw';
	}

	public async created() {
		const req = await this.$sopia.api.users.followings(4324890);
		this.$store.commit('partners', req.res.results);
	}

	public screenChange(fullScreen: boolean) {
		this.liveFullScreen = fullScreen;
	}

	public onResize() {
		// 리사이즈 중임을 표시
		this.isResizing = true;
		
		// 기존 타이머가 있다면 취소
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}
		
		// 500ms 후에 설정 저장 (디바운싱)
		this.resizeTimeout = setTimeout(() => {
			this.saveWindowSize();
			this.isResizing = false;
		}, 500);
	}

	public onMove() {
		// 윈도우 이동 중임을 표시
		this.isMoving = true;
		
		// 기존 타이머가 있다면 취소
		if (this.moveTimeout) {
			clearTimeout(this.moveTimeout);
		}
		
		// 500ms 후에 설정 저장 (디바운싱)
		this.moveTimeout = setTimeout(() => {
			this.saveWindowSize();
			this.isMoving = false;
		}, 500);
	}

	public onMouseUp() {
		// 마우스를 뗐을 때 리사이즈 또는 이동 중이었다면 즉시 저장
		if (this.isResizing || this.isMoving) {
			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}
			if (this.moveTimeout) {
				clearTimeout(this.moveTimeout);
			}
			this.saveWindowSize();
			this.isResizing = false;
			this.isMoving = false;
		}
	}

	private saveWindowSize() {
		// 윈도우 크기와 위치 모두 저장
		const windowState = {
			width: window.innerWidth,
			height: window.innerHeight,
			x: window.screenX,
			y: window.screenY
		};
		this.$cfg.set('window-state', windowState);
		this.$cfg.save();
	}

	public beforeDestroy() {
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('mouseup', this.onMouseUp);
		// 윈도우 이동 이벤트는 Electron의 메인 프로세스에서 처리되므로 여기서는 제거하지 않음
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}
		if (this.moveTimeout) {
			clearTimeout(this.moveTimeout);
		}
	}

	public async mounted() {
		const auth = this.$cfg.get('auth');

		window.addEventListener('resize', this.onResize);
		window.addEventListener('mouseup', this.onMouseUp);

		window.$openStickerModal = this.$openStickerModal;
		
		// Electron IPC로 윈도우 이동 이벤트 수신
		const { ipcRenderer } = window.require('electron');
		
		// 윈도우 이동 중 (연속 호출)
		ipcRenderer.on('window-moving', () => {
			this.onMove();
		});
		
		// 윈도우 이동 완료 (드래그 종료)
		ipcRenderer.on('window-moved', () => {
			// 이동이 완료되었으므로 즉시 저장
			if (this.moveTimeout) {
				clearTimeout(this.moveTimeout);
			}
			this.saveWindowSize();
			this.isMoving = false;
		});

		window.logout = () => {
			this.$cfg.delete('auth');
			this.$cfg.save();
			setTimeout(() => {
				this.isLogin = false;
				this.$assign('/login');
			}, 100);
		};

		if ( auth && auth.sopia && auth.spoon ) {
			const res = await this.$api.req('GET', `/user/${auth.sopia.user_id}`);
			if ( res.error ) {
				this.$cfg.delete('auth');
				this.$cfg.save();
				this.isLogin = false;
				this.$assign('/login');
			} else {
				this.$api.user = {
					...auth.sopia,
					...res.data[0],
				};
				this.$cfg.set('auth.sopia', this.$api.user);
				this.$cfg.save();

				let payload: any = null;
				let isExpired: boolean = false;
				try {
					payload = JSON.parse(
						Buffer.from(auth.spoon.token?.split('.')?.[1] || '', 'base64').toString('utf8')
					);
					isExpired = payload.exp < Date.now() / 1000;
					this.$sopia.deviceUUID = payload.did;
				} catch(err) {
					console.log(err);
				}

				if ( isExpired ) {
					if ( auth.spoon.refresh_token) {
						try {
							const res = await fetch('https://kr-auth.spooncast.net/tokens/', {
								method: 'PUT',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									device_unique_id: this.$sopia.deviceUUID,
									refresh_token: auth.spoon.refresh_token,
									user_id: auth.spoon.id,
								}),
							}).then((res) => res.json())
							.catch((err) => {
								window.logout();
							});
							if ( res?.data?.jwt ) {
								auth.spoon.token = res.data.jwt;
								this.$cfg.set('auth.spoon.token', res.data.jwt);
								this.$cfg.save();

								this.$sopia.loginToken(auth.spoon.id, auth.spoon.token)
									.then(async (user) => {
										this.$store.commit('user', user);
										this.$evt.$emit('user', user);
										await this.$api.activityLog('relogon');
									})
									.catch((err) => {
										window.logout();
									});
							} else {
								window.logout();
							}
						} catch(err) {
							window.logout();
						}
					} else {
						window.logout();
					}
				} else {
					this.$sopia.loginToken(auth.spoon.id, auth.spoon.token, auth.spoon.refresh_token)
						.then(async (user) => {
							try {
								const token = await this.$sopia.refreshToken(user.id, auth.spoon.token, auth.spoon.refresh_token);
								if ( token ) {
									auth.spoon.token = token;
									this.$store.commit('user', user);
									this.$evt.$emit('user', user);
									this.$cfg.set('auth.spoon.token', token);
									this.$cfg.save();

									this.isLogin = true;

									await this.$api.activityLog('logon');

									if ( !this.$api.user.agree_live_info ) {
										this.showAgreeLiveInfoDialog();
									}
								} else {
									window.logout();
								}
							} catch(err) {
								window.logout();
							}
						})
					.catch((err) => {
						window.logout();
					});
				}
			}
		} else {
			this.isLogin = false;
			this.$assign('/login');
		}

		this.$evt.$off('live-join');
		this.$evt.$on('live-join', async (live: number, isMembership: boolean, isRejoin: boolean = false) => {
			// 이미 참여 중인 라이브가 있는 경우 안내
			if (this.currentLive && this.currentLive.id) {
				await this.$swal({
					title: '라이브 참여 중',
					html: '현재 참여 중인 라이브가 있습니다.<br>기존 라이브를 종료한 후 다시 시도해주세요.',
					icon: 'warning',
					confirmButtonText: '확인',
				});
				return;
			}

			const joinLive = async () => {
				let config!: ApiLivesInfo.Request;
				if ( isMembership ) {
					const req = await this.$sopia.api.lives.token(live, {
						'data': {
							'device_unique_id': this.$sopia.deviceUUID,
						},
					});
					if ( req.res.status_code !== 200 ) {
						throw req;
					}
					config = {
						headers: {
							'x-live-authorization': 'Bearer ' + req.res.results[0]?.jwt,
						}
					};
				}
				const req = await this.$sopia.api.lives.info(live, config);
				await this.$nextTick();
				this.currentLive = req.res.results[0];
				this.isMemberShip = isMembership;
				this.isRejoin = isRejoin;
				this.$api.activityLog('live-join', req.res.results[0].id.toString());
			};

			if ( isRejoin ) {
				joinLive();
			} else {
				joinLive();
			}
		});

		this.$evt.$off('live-leave');
		this.$evt.$on('live-leave', () => {
			this.currentLive = {} as Live;
			this.isMemberShip = false;
		});

		this.$evt.$off('user');
		this.$evt.$on('user', (user: User) => {
			this.isLogin = true;
		});

		if ( !this.$store.state.loginDialog ) {
			this.checkBundleUpldate();
		}

		// auto-launch 상태 이벤트 리스너
		ipcRenderer.off('auto-launch-enabled', this.autoLaunchListener);
		ipcRenderer.on('auto-launch-enabled', this.autoLaunchListener);
	}

	private autoLaunchListener() {
		console.log('Auto-launch is enabled - 10초마다 체크됨');
		// 여기에 auto-launch가 활성화되었을 때 실행할 로직 추가
		// 예: DJ 보드 자동 참가 로직, 알림 표시 등
		const djboard = this.$cfg.get('djboard');
		if ( djboard ) {
			if ( this.currentLive.id ) {
				return;
			}
			this.$sopia.api.users.miniProfile(djboard.id)
				.then((req) => {
					const user = req.res.results[0];
					if ( user.current_live?.id ) {
						const liveId = user.current_live.id;
						this.$evt.$emit('live-join', liveId, false, false);
						
					}
				})
		}
	}

	public async checkBundleUpldate() {
		const bundleDirectory = this.$path('userData', 'bundles');
		const updateRequest = fs.readdirSync(bundleDirectory)
			.filter((item: string) => fs.lstatSync(path.join(bundleDirectory, item)).isDirectory())
			.map(async (item: string) => {
				try {
					return await this.$api.req('GET', `/bundle/${item}`)
				} catch {
					return;
				}
			});

		const deleteQueue: any[] = [];
		const bundleInfoList = (await Promise.all(updateRequest) as any[])
			.filter((res) => res && !res.error)
			.map((res) => res.data[0])
			.filter((bundle) => {
				const pkgPath = path.join(bundleDirectory, bundle.name, 'package.json');
				const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
				console.log(pkg.name, pkg.version, bundle.version);
				if ( bundle.deleted === 1 ) {
					deleteQueue.push(bundle);
				}
				return pkg.version !== bundle.version;
			});

		if ( bundleInfoList.length > 0 ) {
			this.bundleUpdateList = bundleInfoList;
			this.bundleUpdateDialogShow = true;
		}

		if ( deleteQueue.length > 0 ) {
			const bundleNames = deleteQueue.map((bundle) => bundle.name).join(', ');
			await this.$swal({
				title: '번들 삭제',
				html: `다음 번들이 삭제됩니다:<br><br><strong>${bundleNames}</strong>`,
				icon: 'warning',
				confirmButtonText: '확인',
				allowOutsideClick: false,
			});

			// 번들 폴더 삭제
			for (const bundle of deleteQueue) {
				try {
					const bundlePath = path.join(bundleDirectory, bundle.name);
					if (fs.existsSync(bundlePath)) {
						fs.rmSync(bundlePath, { recursive: true, force: true });
						console.log(`Deleted bundle: ${bundle.name}`);
					}
				} catch (err) {
					console.error(`Failed to delete bundle: ${bundle.name}`, err);
				}
			}
			location.reload();
		}
	}

	public async showAgreeLiveInfoDialog() {
		const expire = this.$cfg.get('agreeLiveInfoDialog');
		console.log('showAgreeLiveInfoDialog - expire:', expire);
		console.log('showAgreeLiveInfoDialog - current date:', new Date());
		console.log('showAgreeLiveInfoDialog - expire date:', expire ? new Date(Number(expire)) : null);
		
		if (expire && new Date(Number(expire)) > new Date()) {
			console.log('Dialog is expired, not showing');
			return;
		}
		
		console.log('showAgreeLiveInfoDialog before:', this.agreeLiveInfoDialogOpen);
		this.agreeLiveInfoDialogOpen = true;
		console.log('showAgreeLiveInfoDialog after:', this.agreeLiveInfoDialogOpen);
	}

}
</script>
<style lang="scss">
@font-face {
	font-family: JoyPixels;
	src: url('./assets/JoyPixels-SBIX.woff2') format('woff2');
	/* using the unicode-range attribute to limit the reach of the JoyPixels web font */
    unicode-range: U+00A9, U+00AE, U+203C, U+2049, U+20E3, U+2122, U+2139, U+2194-2199, U+21A9-21AA, U+231A, U+231B, U+2328, U+23CF, U+23E9-23F3, U+23F8-23FA, U+24C2, U+25AA, U+25AB, U+25B6, U+25C0, U+25FB-25FE, U+2600-27EF, U+2934, U+2935, U+2B00-2BFF, U+3030, U+303D, U+3297, U+3299, U+1F000-1F02F, U+1F0A0-1F0FF, U+1F100-1F64F, U+1F680-1F6FF, U+1F910-1F96B, U+1F980-1F9E0;
}
@font-face {
    font-family: 'GangwonEdu_OTFBoldA';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEdu_OTFBoldA.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}
.v-application {
   font-family: JoyPixels, sans-serif !important;
}
:root {
	--sidebar-width: 80px;
	--titlebar-height: 77px;
}
.no-drag {
	-webkit-app-region: no-drag;
}
</style>