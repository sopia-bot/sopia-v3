<!--
 * ProfileModal.vue
 * Created on 2024
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<v-dialog
		v-model="show"
		max-width="400"
		content-class="profile-modal-dialog">
		<v-card class="profile-modal-card" dark>
			<!-- 로딩 상태 -->
			<div v-if="loading" class="loading-container">
				<v-progress-circular
					indeterminate
					color="primary"
					size="48"
				></v-progress-circular>
			</div>

			<!-- 에러 상태 -->
			<div v-else-if="error" class="error-container">
				<v-icon large color="error">mdi-alert-circle</v-icon>
				<p class="mt-2">{{ error }}</p>
				<v-btn small text color="primary" @click="fetchProfile">
					{{ $t('common.retry') }}
				</v-btn>
			</div>

			<!-- 프로필 내용 -->
			<template v-else-if="profile">
				<!-- 커버 이미지 & 프로필 헤더 -->
				<div class="profile-header">
					<div
						class="profile-cover"
						:class="{ ... (profile.profile_cover_url === '' ? {'no-cover': true } : {}) }"
						:style="profile.profile_cover_url ? { backgroundImage: `url(${profile.profile_cover_url})` } : {}">
						<div class="cover-overlay"></div>
					</div>

					<div class="profile-info-overlay">
						<v-avatar size="72" class="profile-avatar">
							<v-img :src="profile.profile_url">
								<template v-slot:placeholder>
									<v-icon large color="white">mdi-account</v-icon>
								</template>
							</v-img>
						</v-avatar>

						<div class="profile-name-section">
							<div class="d-flex align-center flex-wrap">
								<h3 class="profile-nickname">{{ profile.nickname }}</h3>
								<div class="user-badges ml-2">
									<span v-if="profile.is_vip" class="badge vip-badge">VIP</span>
									<span v-if="profile.is_dj" class="badge dj-badge">DJ</span>
									<span v-if="isSubscribed" class="badge sub-badge">구독</span>
									<span v-if="isUserManager" class="badge manager-badge">매니저</span>
								</div>
							</div>
							<p v-if="profile.tag" class="profile-tag">@{{ profile.tag }}</p>
						</div>
					</div>
				</div>

				<!-- 통계 -->
				<v-card-text class="profile-stats">
					<v-row no-gutters>
						<v-col cols="6" class="stat-item">
							<div class="stat-value">{{ formatNumber(profile.follower_count) }}</div>
							<div class="stat-label">{{ $t('users.fan') }}</div>
						</v-col>
						<v-col cols="6" class="stat-item">
							<div class="stat-value">{{ favoriteTemperature }}°</div>
							<div class="stat-label">호감온도</div>
						</v-col>
					</v-row>
				</v-card-text>

				<!-- 추가 정보 -->
				<v-card-text v-if="profile.top_fan_rank > 0" class="profile-extra-info">
					<!-- 팬 랭킹 -->
					<div class="info-row">
						<span class="info-label">팬 랭킹</span>
						<v-chip small color="warning" text-color="black">
							#{{ profile.top_fan_rank }}
						</v-chip>
					</div>
				</v-card-text>

				<!-- 자기소개 -->
				<v-card-text v-if="profile.self_introduction" class="profile-intro">
					<v-divider class="mb-3"></v-divider>
					<h4 class="intro-title">자기소개</h4>
					<p class="intro-text">{{ profile.self_introduction }}</p>
				</v-card-text>

							</template>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Watch, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { User } from '@sopia-bot/core';

@Component
export default class ProfileModal extends Mixins(GlobalMixins) {
	@Prop({ type: Boolean, default: false }) public value!: boolean;
	@Prop({ type: Object, default: null }) public user!: User | null;
	@Prop({ type: Array, default: () => [] }) public managerIds!: number[];

	public profile: any = null;
	public loading: boolean = false;
	public error: string | null = null;

	get show(): boolean {
		return this.value;
	}

	set show(val: boolean) {
		this.$emit('input', val);
	}

	get isUserManager(): boolean {
		return this.managerIds.includes(this.profile?.id);
	}

	get isSubscribed(): boolean {
		return (this.user as any)?.subscribed_to_dj || false;
	}

	get favoriteTemperature(): number {
		return (this.user as any)?.favorite_temperature || 0;
	}

	mounted() {
	}

	@Watch('value')
	onValueChange(newVal: boolean) {
		if (newVal && this.user) {
			console.log('user', this.user);
			this.fetchProfile();
		}
	}

	public async fetchProfile() {
		if (!this.user?.id) return;

		this.loading = true;
		this.error = null;

		try {
			const response = await fetch(`https://kr-api.spooncast.net/users/${this.user.id}/`, {
				headers: {
					'accept': 'application/json, text/plain, */*',
				},
				method: 'GET',
				mode: 'cors',
				credentials: 'include',
			});

			const data = await response.json();

			if (data.status_code === 200 && data.results && data.results.length > 0) {
				this.profile = data.results[0];
				console.log('profile', this.profile);
			} else {
				this.error = '프로필 정보를 불러올 수 없습니다.';
			}
		} catch (err) {
			console.error('Failed to fetch profile:', err);
			this.error = '프로필 로딩 실패';
		} finally {
			this.loading = false;
		}
	}

	public formatNumber(num: number): string {
		if (!num) return '0';
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		}
		if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	}
}
</script>

<style scoped>
.profile-modal-card {
	background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
	border-radius: 16px !important;
	overflow: hidden;
}

.loading-container,
.error-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 48px;
}

.profile-header {
	position: relative;
	height: 180px;
}

.profile-cover {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 120px;
	background-size: cover;
	background-position: center;
}

.profile-cover.no-cover {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
}

.cover-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%);
}

.profile-info-overlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 16px;
	display: flex;
	align-items: flex-end;
	gap: 16px;
}

.profile-avatar {
	border: 3px solid white;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.profile-name-section {
	flex: 1;
	min-width: 0;
}

.profile-nickname {
	font-size: 1.25rem;
	font-weight: 600;
	color: white;
	margin: 0;
}

.profile-tag {
	font-size: 0.875rem;
	color: rgba(255, 255, 255, 0.7);
	margin: 4px 0 0 0;
}

/* 배지 스타일 */
.user-badges {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-wrap: wrap;
}

.badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.vip-badge {
	background: linear-gradient(135deg, #FFD700, #FFA500);
	color: #000;
}

.dj-badge {
	background: linear-gradient(135deg, #9C27B0, #673AB7);
	color: #fff;
}

.sub-badge {
	background: linear-gradient(135deg, #2196F3, #03A9F4);
	color: #fff;
}

.manager-badge {
	background: linear-gradient(135deg, #4CAF50, #8BC34A);
	color: #fff;
}

/* 통계 */
.profile-stats {
	background: rgba(255, 255, 255, 0.05);
	padding: 16px !important;
}

.stat-item {
	text-align: center;
}

.stat-value {
	font-size: 1.25rem;
	font-weight: 700;
	color: white;
}

.stat-label {
	font-size: 0.75rem;
	color: rgba(255, 255, 255, 0.6);
	margin-top: 4px;
}

/* 추가 정보 */
.profile-extra-info {
	padding: 16px !important;
}

.info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.info-row:last-child {
	margin-bottom: 0;
}

.info-label {
	font-size: 0.875rem;
	color: rgba(255, 255, 255, 0.7);
}

/* 자기소개 */
.profile-intro {
	padding: 0 16px 16px !important;
}

.intro-title {
	font-size: 0.875rem;
	font-weight: 500;
	color: rgba(255, 255, 255, 0.8);
	margin-bottom: 8px;
}

.intro-text {
	font-size: 0.875rem;
	color: rgba(255, 255, 255, 0.6);
	line-height: 1.5;
	margin: 0;
	white-space: pre-wrap;
}

</style>
