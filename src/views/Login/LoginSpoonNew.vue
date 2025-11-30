<!--
 * LoginSpoon.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div class="spoon-login-container">
		<!-- Header Section -->
		<div class="login-header text-center mb-8">
			<div class="icon-container mb-4">
				<v-avatar size="72" class="elevation-4 primary">
					<v-icon size="40" color="white">mdi-microphone</v-icon>
				</v-avatar>
			</div>
			<h2 class="text-h4 font-weight-light primary--text mb-3">
				스푼라디오 연동
			</h2>
			<p class="text-body-1 grey--text text--darken-1 mb-2">
				SOPIA가 스푼라디오와 연동하여 작동합니다
			</p>
		</div>

		<!-- Information Cards -->
		<div class="info-cards mb-6">
			<v-card class="info-card mb-4" elevation="2" outlined>
				<v-card-text class="pa-4">
					<div class="d-flex align-center">
						<v-icon color="primary" class="mr-3" size="24">mdi-information</v-icon>
						<div>
							<p class="text-body-2 mb-0 font-weight-medium">
								소피아는 구동하기 위해서 사용자의 스푼계정을 사용합니다.
							</p>
						</div>
					</div>
				</v-card-text>
			</v-card>

			<v-card class="info-card warning-card" elevation="2" outlined>
				<v-card-text class="pa-4">
					<div class="d-flex align-center">
						<v-icon color="warning" class="mr-3" size="24">mdi-alert</v-icon>
						<div>
							<p class="text-body-2 mb-0 font-weight-medium warning--text text--darken-2">
								반드시 방송용 계정 말고 매니저용 계정을 별도로 사용해 주세요.
							</p>
						</div>
					</div>
				</v-card-text>
			</v-card>
		</div>

		<!-- Guide Section -->
		<div class="guide-section mb-6">
			
			<v-card class="guide-card" elevation="4">
				<div class="guide-image-container">
					<v-carousel
						height="320"
						hide-delimiter-background
						show-arrows-on-hover
						cycle
						interval="8000"
						class="rounded-t-lg"
					>
						<v-carousel-item>
							<div class="carousel-content">
								<Picture 
									:src="require('./assets/로그인가이드1.png')"
									class="guide-image"
								></Picture>
							</div>
						</v-carousel-item>
					</v-carousel>
				</div>
				
				<v-card-text class="pa-6 text-center">
					<h4 class="text-h6 font-weight-medium mb-3">
						브라우저에서 스푼라디오 로그인
					</h4>
					<p class="text-body-2 grey--text text--darken-1 mb-4">
						버튼을 클릭하면 브라우저가 열리고, 스푼라디오에 로그인하여 계정을 연동할 수 있습니다.
					</p>
				</v-card-text>
			</v-card>
		</div>

		<!-- Action Button -->
		<div class="action-section text-center">
			<v-btn
				x-large
				color="primary"
				elevation="6"
				:loading="loading"
				@click="loginSpoonExtension"
				class="login-button"
			>
				<v-icon left size="24">mdi-web</v-icon>
				{{ $t('app.login.login-webpage') }}
			</v-btn>
			
			<p class="text-caption grey--text mt-4 mb-0">
				안전한 브라우저 환경에서 로그인이 진행됩니다
			</p>
		</div>

		<!-- Loading Overlay -->
		<v-overlay :value="loading">
			<div class="text-center">
				<v-progress-circular
					indeterminate
					size="64"
					width="4"
					color="primary"
					class="mb-4"
				></v-progress-circular>
				<p class="text-h6 white--text mb-2">스푼라디오 연동 중...</p>
				<p class="text-body-2 white--text opacity-80">
					브라우저에서 로그인을 완료해주세요
				</p>
				<v-btn
					depressed
					outlined
					color="white"
					@click="cancelLogin"
				>
					취소
				</v-btn>
			</div>
		</v-overlay>
	</div>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { SnsType, LogonUser } from '@sopia-bot/core';
import Picture from '@/views/Components/Picture.vue';
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');

@Component({
	components: {
		Picture,
	},
})
export default class LoginSpoon extends Mixins(GlobalMixins) {

	public loading = false;
	public errorMsg = '';
	private loginResultHandler: ((_event: any, result: any) => void) | null = null;

	public mounted() {
		// IPC 리스너 등록
		this.loginResultHandler = (_event: any, result: any) => {
			this.handleLoginResult(result);
		};
		ipcRenderer.on('ext-login-result', this.loginResultHandler);
	}

	public beforeDestroy() {
		// IPC 리스너 제거
		if (this.loginResultHandler) {
			ipcRenderer.removeListener('ext-login-result', this.loginResultHandler);
		}
		// 로딩 중이었다면 취소 요청
		if (this.loading) {
			ipcRenderer.send('ext-login-cancel');
		}
	}

	public loginSpoonExtension() {
		this.loading = true;
		this.errorMsg = '';

		console.log('send ext-login-open');
		ipcRenderer.send('ext-login-open');
	}

	public cancelLogin() {
		this.loading = false;
		ipcRenderer.send('ext-login-cancel');
	}

	private async handleLoginResult(result: any) {
		console.log('ext-login-result', result);

		if (!result.success) {
			this.errorMsg = result.error || '로그인 창을 열 수 없습니다. 다시 시도해주세요.';
			this.loading = false;
			return;
		}

		try {
			// 타입 안전성을 위한 검증
			const rawUserInfo = result.data;
			console.log('userInfo', rawUserInfo);
			if (!rawUserInfo || typeof rawUserInfo !== 'object') {
				console.error('Invalid user info received from extension');
				this.errorMsg = '잘못된 사용자 정보를 받았습니다.';
				return;
			}

			// 필수 필드 검증
			if (!rawUserInfo.id || !rawUserInfo.token) {
				console.error('Missing required fields in user info');
				this.errorMsg = '필수 로그인 정보가 누락되었습니다.';
				return;
			}

			// 스푼라디오 로그인 토큰으로 인증
			await this.$sopia.loginToken(rawUserInfo.id, rawUserInfo.token, rawUserInfo.refresh_token);

			// JWT 토큰에서 디바이스 UUID 추출
			const payload = JSON.parse(Buffer.from(rawUserInfo.token.split('.')[1], 'base64').toString('utf-8'));
			this.$sopia.deviceUUID = payload.did;

			// 성공적으로 로그인된 사용자 정보 전달
			this.$emit('logon', this.$sopia.logonUser);

		} catch (error: any) {
			console.error('Spoon login error:', error);
			this.errorMsg = error.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
		} finally {
			this.loading = false;
		}
	}

}
</script>

<style scoped>
/* Modern spoon login styling */
.spoon-login-container {
	width: 100%;
	padding: 0;
	padding-bottom: 20px;
}

/* Header styling */
.login-header {
	margin-bottom: 20px;
}

.icon-container {
	animation: fadeInScale 0.6s ease-out;
}

/* Information cards */
.info-cards {
	margin-bottom: 16px;
}

.info-card {
	border-radius: 12px !important;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.info-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
}

.warning-card {
	background: linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%) !important;
	border-color: rgba(255, 193, 7, 0.2) !important;
}

/* Guide section */
.guide-section {
	margin-bottom: 20px;
}

.guide-card {
	border-radius: 16px !important;
	overflow: hidden;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.guide-card:hover {
	transform: translateY(-4px);
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
}

.guide-image-container {
	position: relative;
	overflow: hidden;
}

.carousel-content {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.guide-image {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
	border-radius: 8px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* Action section */
.action-section {
	margin-bottom: 24px;
}

.login-button {
	height: 56px !important;
	border-radius: 28px !important;
	text-transform: none !important;
	font-weight: 600 !important;
	font-size: 16px !important;
	padding: 0 32px !important;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.login-button:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 25px rgba(25, 118, 210, 0.3) !important;
}

.login-button:active {
	transform: translateY(0);
}

.opacity-80 {
	opacity: 0.8;
}

/* Animations */
@keyframes fadeInScale {
	from {
		opacity: 0;
		transform: scale(0.8);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes slideInUp {
	from {
		opacity: 0;
		transform: translateY(30px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Staggered animation for cards */
.info-card:nth-child(1) {
	animation: slideInUp 0.6s ease-out 0.1s both;
}

.info-card:nth-child(2) {
	animation: slideInUp 0.6s ease-out 0.2s both;
}

.guide-section {
	animation: slideInUp 0.6s ease-out 0.3s both;
}

.action-section {
	animation: slideInUp 0.6s ease-out 0.4s both;
}

/* Dark theme support */
.theme--dark .info-card {
	background: rgba(255, 255, 255, 0.05) !important;
	border-color: rgba(255, 255, 255, 0.1) !important;
}

.theme--dark .warning-card {
	background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%) !important;
	border-color: rgba(255, 193, 7, 0.3) !important;
}

.theme--dark .guide-card {
	background: rgba(255, 255, 255, 0.05) !important;
}

.theme--dark .carousel-content {
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
}

/* Carousel improvements */
.v-carousel .v-window__container {
	border-radius: 12px 12px 0 0;
}

.v-carousel__controls {
	background: rgba(0, 0, 0, 0.2);
}

/* Button loading state */
.v-btn--loading {
	pointer-events: none;
}

.v-btn--loading .v-btn__content {
	opacity: 0;
}
</style>