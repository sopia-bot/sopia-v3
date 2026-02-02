<!--
 * App.vue
 * Created on Sat Jul 18 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<v-app style="">
		<title-bar />
		<donation />
		<update-dialog />
		<bundle-update-dialog v-model="bundleUpdateDialogShow" :items="bundleUpdateList" />
		<side-menu />
		<div class="ma-0 d-flex">
			<v-sheet id="router-view" tile :key="$route.fullPath" color="white" :style="{ maxWidth: maxWindowWidth }" style="flex-basis: 80%; flex-grow: 1; flex-shrink: 1;">
				<transition name="scroll-y-reverse-transition">
					<router-view></router-view>
				</transition>
			</v-sheet>
		</div>
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
import { User, SpoonClient } from '@sopia-bot/core';
import CfgLite from '@/plugins/cfg-lite-ipc';
import { BundlePackage } from '@/interface/bundle';

import BundleUpdateDialog from '@/views/Bundle/UpdateDialog.vue';
import UpdateDialog from '@/views/Components/UpdateDialog.vue';
import TitleBar from '@/views/Components/TitleBar.vue';
import SideMenu from '@/views/Components/SideMenu.vue';
import Donation from '@/views/Components/Donation.vue';
import '@/sopia/processor';

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
		BundleUpdateDialog,
		UpdateDialog,
		TitleBar,
		Donation,
	},
})
export default class App extends Mixins(GlobalMixins) {
	public bundleUpdateDialogShow: boolean = false;
	public bundleUpdateList: BundlePackage[] = [];

	public enter(...args: any[]) {
		console.log('enter transition', args);
	}

	private resizeTimeout: any = null;
	private moveTimeout: any = null;
	private isResizing: boolean = false;
	private isMoving: boolean = false;

	get maxWindowWidth() {
		return '100vw';
	}

	public async created() {
		try {
			const req = await this.$sopia.api.users.followings(4324890);
			this.$store.commit('partners', req.res.results);
		} catch (err) {
			console.warn('Failed to fetch partners (service may be shutdown):', err);
		}
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
			// no-op: Spoon service is shut down
		};

		this.checkBundleUpldate();
	}

	public async checkBundleUpldate() {
		// no-op: bundle update check removed (was dependent on api.sopia.dev)
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