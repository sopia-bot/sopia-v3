<!--
 * LiveItem.vue
 * Created on Tue Aug 25 2020
 *
 * Copyright (c) Tree Some. Licensed under the MIT License.
-->
<template>
	<v-hover v-slot="{ hover }">
		<v-card
			width="200"
			height="330"
			@click.stop="$evt.$emit('live-join', live, isMembership)"
			class="mx-auto live-card"
			:class="{ 'live-card--hover': hover }"
			:elevation="0"
			style="cursor: pointer; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);"
		>
			<!-- 라이브 이미지 섹션 -->
			<div class="live-image-container">
				<v-img
					:src="live.img_url"
					height="160"
					cover
					class="live-image"
				>
					<!-- Choice 배지 -->
					<!-- <div class="choice-badge">
						<span class="choice-text">Choice</span>
					</div> -->

					<!-- 호버 오버레이 -->
					<div class="hover-overlay" :class="{ 'show': hover }">
						<div class="play-button">
							<v-icon size="40" color="white">mdi-play</v-icon>
						</div>
					</div>

					<!-- 통계 오버레이 -->
					<div class="live-stats-overlay">
						<div class="stats-item">
							<v-icon x-small color="white">mdi-account</v-icon>
							<span class="stats-text">{{ formatNumber(live.member_count) }}</span>
						</div>
						<div class="stats-item">
							<v-icon x-small color="white">mdi-heart</v-icon>
							<span class="stats-text">{{ formatNumber(live.like_count) }}</span>
						</div>
					</div>
				</v-img>
			</div>

			<!-- 카드 내용 -->
			<div class="live-content">
				<!-- 프로필 이미지와 제목 -->
				<div class="profile-section">
					<v-avatar size="32" class="profile-avatar" @click.stop="clickProfile(live)">
						<v-img :src="live.author.profile_url">
							<template v-slot:placeholder>
								<v-icon color="grey lighten-1">mdi-account</v-icon>
							</template>
						</v-img>
					</v-avatar>
					<div class="title-section">
						<div class="live-title">{{ live.title }}</div>
						<div class="author-info" @click.stop="clickProfile(live)">
							<span class="author-name">{{ live.author.nickname }}</span>
							<v-icon v-if="live.author.is_verified" x-small color="#1976d2" class="verified-icon">mdi-check-circle</v-icon>
						</div>
					</div>
				</div>

				<!-- 통계 -->
				<div class="stats-section">
					<span class="stats-text">
						<v-icon x-small>mdi-account</v-icon>
						{{ formatNumber(live.member_count) }}
					</span>
					<span class="stats-text">
						<v-icon x-small>mdi-heart</v-icon>
						{{ formatNumber(live.like_count) }}
					</span>
				</div>

				<!-- 태그 (임시로 더미 데이터 사용) -->
				<div class="tags-section" v-if="live.tags.length">
					<v-chip v-for="tag of live.tags" :key="tag" x-small outlined class="tag-chip">{{ tag }}</v-chip>
				</div>
			</div>
		</v-card>
	</v-hover>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { Live } from '@sopia-bot/core';

@Component
export default class LiveItem extends Mixins(GlobalMixins) {
	@Prop(Object) public live!: Live;
	@Prop(Boolean) public isMembership!: boolean;

	public formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}

	public clickProfile(live: Live) {
		this.$assign(`/user/${live.author.id}`);
	}
}
</script>

<style scoped>
.live-card {
	border-radius: 12px !important;
	overflow: hidden;
	background: #ffffff;
	border: none;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.live-image-container {
	position: relative;
	overflow: hidden;
	border-radius: 12px 12px 0 0;
}

.live-image {
	transition: all 0.3s ease;
}

.choice-badge {
	position: absolute;
	top: 8px;
	left: 8px;
	background: #ff6b35;
	padding: 4px 8px;
	border-radius: 4px;
	z-index: 3;
}

.choice-text {
	color: white;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
}

.hover-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.3s ease;
	z-index: 2;
}

.hover-overlay.show {
	opacity: 1;
}

.play-button {
	background: rgba(255, 255, 255, 0.2);
	border: 2px solid white;
	border-radius: 50%;
	width: 60px;
	height: 60px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
}

.play-button:hover {
	background: rgba(255, 255, 255, 0.3);
	transform: scale(1.1);
}

.live-stats-overlay {
	position: absolute;
	top: 8px;
	right: 8px;
	display: flex;
	gap: 6px;
	z-index: 3;
}

.stats-item {
	display: flex;
	align-items: center;
	gap: 2px;
	background: rgba(0, 0, 0, 0.7);
	padding: 2px 6px;
	border-radius: 4px;
	backdrop-filter: blur(4px);
}

.stats-text {
	color: white;
	font-size: 10px;
	font-weight: 500;
}

.live-content {
	padding: 12px;
	background: white;
}

.profile-section {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin-bottom: 8px;
}

.profile-avatar {
	flex-shrink: 0;
}

.profile-avatar:hover {
	border: 1px solid #ddd;
}

.title-section {
	flex: 1;
	min-width: 0;
}

.live-title {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.3;
	color: #1a1a1a;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-bottom: 2px;
}

.author-info {
	display: flex;
	align-items: center;
	gap: 4px;
}

.author-info:hover {
	text-decoration: underline;
}

.author-name {
	font-size: 12px;
	font-weight: 500;
	color: #666;
}

.verified-icon {
	margin-left: 2px;
}

.stats-section {
	display: flex;
	gap: 12px;
	margin-bottom: 8px;
}

.stats-section .stats-text {
	color: #666;
	font-size: 12px;
	display: flex;
	align-items: center;
	gap: 4px;
}

.tags-section {
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
}

.tag-chip {
	font-size: 10px !important;
	height: 20px !important;
	color: #666 !important;
	border-color: #ddd !important;
}

/* 다크 모드 지원 */
.theme--dark .live-card {
	background: #2d2d2d;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.theme--dark .live-content {
	background: #2d2d2d;
}

.theme--dark .live-title {
	color: #ffffff;
}

.theme--dark .author-name {
	color: #b3b3b3;
}

.theme--dark .stats-section .stats-text {
	color: #b3b3b3;
}

.theme--dark .tag-chip {
	color: #b3b3b3 !important;
	border-color: #555 !important;
}
</style>
