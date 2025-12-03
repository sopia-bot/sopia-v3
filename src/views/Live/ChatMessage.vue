<!--
 * ChatMessage.vue
 * Created on Mon Oct 12 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<div class="chat-message">
		<v-list color="transparent" v-if="evt.event === LiveEvent.LIVE_MESSAGE || evt.event === LiveEvent.LIVE_PRESENT">
			<v-list-item>
				<v-list-item-avatar
					style="cursor: pointer;"
					@click="openProfileModal">
					<v-img :src="profileURL"></v-img>
				</v-list-item-avatar>

				<v-list-item-content>
					<div class="d-flex align-center flex-wrap">
						<span class="white--text" v-text="author.nickname"></span>
						<div class="user-badges ml-2">
							<span v-if="isVip" class="badge vip-badge">VIP</span>
							<span v-if="isDj" class="badge dj-badge">DJ</span>
							<span v-if="isSubscribed" class="badge sub-badge">구독</span>
							<span v-if="isManager" class="badge manager-badge">매니저</span>
						</div>
					</div>
				</v-list-item-content>

				<v-list-item-action>
					<v-list-item-action-text>
						<v-btn
							small icon
							dark
							@click="blockUser(evt.data.user.id)"
							color="red accent-2">
							<v-icon>mdi-account-cancel</v-icon>
						</v-btn>
					</v-list-item-action-text>
				</v-list-item-action>
			</v-list-item>
			<v-list-item>
				<v-list-item-avatar>
				</v-list-item-avatar>
				<div :class="{
					'shine-border': isSpecial,
					'normal-border': !isSpecial,
					[shineColor || 'none']: true,
				}">
					<v-card
						tile dark
						width="100%"
						class="message-card">
						<v-list-item-content v-if="evt.event === LiveEvent.LIVE_MESSAGE" class="mx-4">
							<pre style="white-space: pre-wrap;" class="chat-message" v-html="message"></pre>
						</v-list-item-content>
						<v-list-item v-else-if="evt.event === LiveEvent.LIVE_PRESENT" class="mx-4">
							<v-list-item-avatar>
								<v-img style="width: 100%;" :src="stickerImg" />
							</v-list-item-avatar>
							<v-list-item-title>
								<h4>
									{{ evt.data.amount }}{{ $t('spoon') }}
									<span v-if="evt.data.combo > 1" class="font-weight-bold indigo--text text--accent-1">X {{ evt.data.combo }}</span>
								</h4>
							</v-list-item-title>
						</v-list-item>
					</v-card>
				</div>
			</v-list-item>
		</v-list>
		<p
			class="indigo--text text--lighten-4 font-weight-bold mt-4"
			style="overflow-wrap: anywhere;"
			v-else-if="evt.event === LiveEvent.LIVE_JOIN">
			{{ author.nickname }}{{ $t('lives.notice.join') }}
		</p>
		<p
			class="indigo--text text--lighten-4 font-weight-bold mt-4"
			style="overflow-wrap: anywhere;"
			v-else-if="evt.event === LiveEvent.LIVE_LIKE">
			{{ author.nickname }}{{ $t('lives.notice.like') }}
		</p>
		<p
			class="red--text text--lighten-2 font-weight-bold mt-4"
			style="overflow-wrap: anywhere;"
			v-else-if="evt.event === LiveEvent.LIVE_BLOCK">
			{{ author.nickname }}{{ $t('lives.notice.block') }}
		</p>
		<p
			class="red--text text--lighten-2 font-weight-bold mt-4"
			style="overflow-wrap: anywhere;"
			v-else-if="evt.event === LiveEvent.LIVE_COMMAND && evt.detail.command === 'chat'">
			{{ evt.detail.user.nickname }}{{ $t('lives.notice.chatban-' + evt.detail.state) }}
		</p>
	</div>
</template>
<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { LiveEvent as EventList, User } from '@sopia-bot/core';

const URL_REGIX = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;

@Component
export default class ChatMessage extends Mixins(GlobalMixins) {
	@Prop(Object) public evt: any;
	@Prop(Boolean) public isSpecial?: boolean;
	@Prop({
		type: String,
		default: '',
	}) public shineColor?: string;
	@Prop({
		type: Array,
		default: () => [],
	}) public managerIds!: number[];
	public LiveEvent = EventList;

	public defaultProfileUrl = require('assets/default-profile.png');

	get author(): User {
		return this.evt.data.user || this.evt.data.author;
	}

	get profileURL() {
		return this.evt.data.user?.profile_url || this.defaultProfileUrl;
	}

	get isManager(): boolean {
		return this.managerIds.includes(this.author?.id);
	}

	get isVip(): boolean {
		return this.author?.is_vip || false;
	}

	get isDj(): boolean {
		return this.author?.is_dj || false;
	}

	get isSubscribed(): boolean {
		return (this.author as any)?.subscribed_to_dj || false;
	}

	public mounted() {
		console.log('isSpecial', this.isSpecial, this.shineColor);
	}

	public blockUser(id: number) {
		this.$evt.$emit('live-block', id);
	}

	public openProfileModal() {
		this.$evt.$emit('live-profile-modal', this.author);
	}

	public escapeHtml(unsafe) {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	get stickerImg() {
		return this.$sopia.sticker.findSticker(this.evt.data.sticker)?.image_thumbnail;
	}

	get message(): string {
		let msg = this.escapeHtml(this.evt.update_component.message.value as string);

		const m = msg.match(URL_REGIX);
		if ( m ) {
		for ( const url of m ) {
			msg = msg.replace(url, `<a href="${url}" target="_blank" class="indigo--text text--lighten-2">${url}</a>`);
		}
		}
		return msg;
	}
}
</script>
<style>
.chat-message {
	font-family: JoyPixels, GangwonEdu_OTFBoldA, sans-serif !important;
}

.message-card {
	background: rgba(0, 0, 0, 0.5);
	border: thin solid rgb(255 255 255 / 30%);
}

.normal-border {
	border: thin solid rgb(255 255 255 / 30%);
	width: 100%;
}

.shine-border {
	position: relative;
	border-radius: 8px;
	width: 100%;
	padding: 2px;
	background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dda0dd);
	background-size: 400% 400%;
	animation: shine 2s ease-in-out infinite;
}

.shine-border.shine {
	background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dda0dd);
	background-size: 400% 400%;
}

.shine-border.red {
	background: linear-gradient(45deg, #ffacd6, #ffadd6, #ffa2cf, #ffa5cd, #ff5c97, #ffa6d2);
	background-size: 400% 400%;
}

.shine-border.none {
	background: none;
}

.shine-border .message-card {
	position: relative;
	z-index: 1;
	border-radius: 6px;
}

@keyframes shine {
	0% {
		background-position: 0% 50%;
	}
	50% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0% 50%;
	}
}

/* 사용자 배지 스타일 */
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
</style>