<template>
	<div style="display: contents; position: relative;" @click.stop="() => {}">
		<v-text-field
			ref="searchBox"
			v-model="searchText"
			dense solo
			class="no-drag"
			color="primary darken-3"
			:label="$t('app.title.search')"
			append-icon="mdi-magnify"
			hide-details
			@input="onSearchInput"
			@keydown="searchKeyDown"
			@click:append="searchContent"></v-text-field>
			
		<v-card
			:elevation="8"
			style="position: fixed; z-index: 999;"
			:style="boxStyle">
			<v-list>
				<v-list-item v-for="user in users" :key="user.tag" class="pa-2">
					<div class="d-flex align-center" style="width: 100%;">
						<!-- 프로필 이미지와 방송중 표시 -->
						<div class="mr-3" style="position: relative;">
							<v-list-item-avatar class="grey lighten-2">
								<v-img :src="user.profile_url"></v-img>
							</v-list-item-avatar>
							<!-- 방송중 LIVE 배지 -->
							<v-chip
								v-if="user.current_live_id"
								x-small
								color="red accent-4"
								text-color="white"
								class="live-badge"
								style="position: absolute; bottom: 0px; right: 0px; font-weight: bold; font-size: 10px;">
								LIVE
							</v-chip>
						</div>

						<!-- 사용자 정보 -->
						<v-list-item-content class="flex-grow-1">
							<v-list-item-title @click="outerClick">
								<router-link class="blue-grey--text text-decoration-none" :to="`/user/${user.id}/`">
									{{ user.nickname }}
								</router-link>
							</v-list-item-title>
							<v-list-item-subtitle class="text-caption">@{{ user.tag }}</v-list-item-subtitle>
							<!-- 방송중일 때 상태 표시 -->
							<div v-if="user.current_live_id" class="d-flex align-center mt-1">
								<v-icon small color="red accent-4" class="mr-1">mdi-circle</v-icon>
								<span class="text-caption red--text text--accent-4 font-weight-medium">방송중</span>
							</div>
						</v-list-item-content>

						<!-- 방송 참여 버튼 -->
						<v-btn
							v-if="user.current_live_id"
							small
							color="primary"
							elevation="2"
							class="mx-2"
							@click="() => {
								$evt.$emit('live-join', user.current_live_id);
								outerClick();
							}">
							<v-icon small class="mr-1">mdi-play</v-icon>
							참여
						</v-btn>
					</div>
				</v-list-item>
			</v-list>
		</v-card>
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { User } from '@sopia-bot/core';

@Component
export default class PreviewList extends Mixins(GlobalMixins) {

	public searchText: string = '';
	public boxStyle = {
		left: '0',
		top: '0',
		width: '0',
		display: 'none',
	};
	public users: User[] = [];
	private debounceTimer: NodeJS.Timeout | null = null;

	public mounted() {
		this.outerClick = this.outerClick.bind(this);
		this.$nextTick(() => {
			window.addEventListener('click', this.outerClick);
		});
	}

	public beforeUnmount() {
		window.removeEventListener('click', this.outerClick);
		// 컴포넌트 해제시 타이머 정리
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
	}

	public async searchContent() {
		const text = encodeURI(this.searchText);
		this.$assign(`/search/user/${text}`);
	}

	// 새로운 디바운싱 로직을 위한 입력 핸들러
	public onSearchInput() {
		this.updateBoxPosition();
		this.debouncedSearch();
	}

	public async searchKeyDown(evt: KeyboardEvent) {
		if (evt.key === 'Enter') {
			// Enter 키 시 즉시 검색
			this.searchContent();
			return;
		}
		
		// 다른 키 입력시에도 박스 위치 업데이트
		this.updateBoxPosition();
	}

	// 박스 위치 업데이트를 별도 메서드로 분리
	private updateBoxPosition() {
		this.boxStyle.left = Math.floor(this.getCardLeft()) + 'px';
		this.boxStyle.top = Math.floor(this.getCardTop()) + 'px';
		this.boxStyle.width = Math.floor(this.getBoxRect().width) + 'px';
	}

	// 개선된 디바운싱 로직
	private debouncedSearch() {
		// 기존 타이머 취소
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		// 검색어가 있을 때만 디바운싱 적용
		if (this.searchText.trim().length > 0) {
			this.debounceTimer = setTimeout(() => {
				this.search();
			}, 300); // 300ms 디바운싱
		} else {
			// 검색어가 없으면 결과 숨김
			this.boxStyle.display = 'none';
		}
	}

	public async search() {
		const req = await this.$sopia.api.search.user({
			params: {
				keyword: this.searchText,
			},
		});
		this.boxStyle.display = 'block';
		this.users = req.res.results.splice(0, 5);
	}

	public getBoxRect(): DOMRect {
		const box = (this.$refs.searchBox as Vue)?.$el as HTMLElement;
		return box?.getBoundingClientRect();
	}

	public getCardLeft() {
		return this.getBoxRect()?.left || 0;
	}

	public getCardTop() {
		return (this.getBoxRect()?.top + this.getBoxRect()?.height) + 40 || 0;
	}

	public outerClick() {
		this.boxStyle.display = 'none';
	}

}
</script>

<style scoped>
.live-badge {
	animation: pulse 2s infinite;
	box-shadow: 0 0 8px rgba(255, 82, 82, 0.6);
}

@keyframes pulse {
	0% {
		transform: scale(1);
		box-shadow: 0 0 8px rgba(255, 82, 82, 0.6);
	}
	50% {
		transform: scale(1.05);
		box-shadow: 0 0 12px rgba(255, 82, 82, 0.8);
	}
	100% {
		transform: scale(1);
		box-shadow: 0 0 8px rgba(255, 82, 82, 0.6);
	}
}

/* 방송 참여 버튼 호버 효과 */
.v-btn.primary:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4) !important;
}

/* 리스트 아이템 호버 효과 */
.v-list-item:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

/* 프로필 링크 스타일 개선 */
.v-list-item-title a {
	font-weight: 500;
	transition: color 0.2s ease;
}

.v-list-item-title a:hover {
	color: #1976d2 !important;
}
</style>
