<!--
 * Player.vue
 * Created on Sat Oct 03 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<div v-if="live && live.id">
		<div v-show="fullScreen">
			<v-card
				tile
				class="full-screen">
				<player-bar :live="live" @screen:close="fullScreen = false" @close="liveLeave"/>
				<v-app-bar
					dark absolute dense flat
					style="margin-top: 56px;"
					v-if="!isManager"
					color="red darken-3">
					<v-app-bar-title class="text-caption">
						{{ $t('lives.error.not-manager') }}
					</v-app-bar-title>
				</v-app-bar>
				<v-img :src="live.img_url" height="100%">
					<lottie
						v-if="playingLottie"
						ref="lottie"
						:loop="false"
						:autoPlay="false"
						:speed="1"
						:animationData="lottieData"
						@complete="lottieComplete"
						:style="{
							marginTop: $vuetify.breakpoint.mobile ? '56px' : '64px',
							height: `calc(100% - ${$vuetify.breakpoint.mobile ? '56px' : '64px'}`,
						}"
						class="lottie-wrapper"></lottie>
					<div
						class="d-flex"
						style="background: rgba(0, 0, 0, 0.7) !important; flex-direction: column; height: 100%;">
						<vue-scroll
							ref="scroll"
							:style="{
								marginTop: $vuetify.breakpoint.mobile ? '56px' : '64px',
								flexBasis: scrollHeight,
							}"
							style="flex-glow: 1; flex-shrink: 1;">
							<v-row class="ma-0">
								<v-col cols="12">
									<div
										v-for="(event, idx) of liveEvents"
										:key="idx">
										<chat-message :evt="event"></chat-message>
									</div>
								</v-col>
							</v-row>
						</vue-scroll>
						<player-footer
							v-model="footMenuOpen"
							menu-height="230px"
							:live="live"
							:player="player" />
					</div>
				</v-img>
			</v-card>
		</div>
		<div
			v-if="!fullScreen"
			class="minify-button">
			<v-btn
				tile dark
				large
				@click="fullScreen = true;"
				color="indigo accent-5">
				<v-icon left>
					mdi-chevron-up
				</v-icon>
				{{ live.title }}
			</v-btn>
		</div>
	</div>
</template>
<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { Live, LiveInfo, LiveEvent, LiveType, User, HttpRequest, LiveSocket, LiveSocketStruct, LiveEventStruct } from '@sopia-bot/core';
import ChatMessage from '@/views/Live/ChatMessage.vue';
import SopiaProcesser from '@/sopia/processor';
import PlayerBar from './PlayerBar.vue';
import PlayerFooter from './PlayerFooter.vue';
import { Player } from './player';
import pkg from '../../../package.json';
import Lottie from 'lottie-web-vue';
import axios from 'axios';
import Sqlite3, { Statement } from 'better-sqlite3';
import path from 'path';
const fs = window.require('fs');
const Sqlite3 = window.require('better-sqlite3');

const IgnoreEvent = [
	LiveEvent.LIVE_STATE,
	LiveEvent.LIVE_HEALTH,
	LiveEvent.LIVE_FAILOVER,
	LiveEvent.LIVE_RANK,
	LiveEvent.LIVE_RANKLIST,
	LiveEvent.LIVE_LAZY_UPDATE,
];


@Component({
	components: {
		ChatMessage,
		PlayerBar,
		PlayerFooter,
		Lottie,
	},
	data: () => {
		return {
			LiveEvent,
			benched: 0,
		};
	},
})
export default class LivePlayer extends Mixins(GlobalMixins) {
	@Prop(Object) public live!: Live;

	public fullScreen: boolean = true;
	public liveEvents: any = [];
	public footMenuOpen: boolean = false;
	public alertTimer!: NodeJS.Timeout;
	public managerIds: number[] = [];
	public lottieData: any = false;
	public playingLottie: boolean = false;
	public lottieMutex = false;
	public lottieQueue: any[] = [];
	public specialUser: Array<[string, string]> = [
		['7423666', '👑'],
		['5738433', '🪪'],
	];
	public liveDB: Sqlite3;
	public stmt: Statement;

	public player: Player = new Player();

	public get scrollHeight() {
		if ( this.footMenuOpen ) {
			return 'calc(100% - 358px)';
		}
		return 'calc(100% - 138px)';
	}

	public get isManager() {
		return this.managerIds.includes(this.$store.getters.user.id);
	}

	public setPartners() {
		const partners = this.$store.state.partners || [];
		partners.forEach((user) => {
			this.specialUser.push([user.id, '💖']);
		});
	}

	public setSponsors() {
		const sponsors = this.$store.state.sponsors || [];
		sponsors.forEach((user) => {
			this.specialUser.push([user.spoon_id, '💎']);
		});
	}

	public async created() {
		this.setPartners();
		this.setSponsors();
		if ( this.live ) {
			console.log("🚀 ~ LivePlayer ~ created ~ live:", this.live);
			this.$sopia.liveMap.forEach((live: LiveInfo, liveId: number) => {
				//socket.destroy(); TODO:
			});

			try {
				await this.createDB(this.live.id);
				await this.live.join();
			} catch (err: any) {
				if ( err.res ) {
					switch ( err.res.error.code ) {
						case 30021:
							this.$swal({
								html: this.$t(`lives.error.30021`),
								toast: true,
								timer: 3000,
								position: 'top-end',
								icon: 'error',
							});
							break;
						default:
							this.$swal({
								html: this.$t(`lives.error.unknown`, err.res.error.code),
								toast: true,
								timer: 3000,
								position: 'top-end',
								icon: 'error',
							});
							break;
					}
					this.liveLeave();
					return;
				}
				this.$logger.err('live-join', err);
			}

			this.player.connect(this.live);
			if ( this.$cfg.get('player.isMute') ) {
				this.player.volume = 0;
			} else {
				this.player.volume = (this.$cfg.get('player.volume') ?? 0) * 0.01;
			}
			this.alertTimer = setInterval(() => {
				if ( this.isManager && !this.$store.getters.isSponsor ) {
					this.live.socket.message(this.$t('lives.alert', pkg.version));
				}
			}, 1000 * 60 * 10 /* 10min */);
			this.live.socket.on(LiveEvent.LIVE_EVENT_ALL, (evt: any) => {
				setImmediate(async () => {
					// 오류가 나더라도 이후 동작은 안전하게 하기 위함.
					try {
						await this.logLiveHistory(evt);
					} catch(err) {
						console.error(err);
					}
				});
				if ( evt?.data?.live?.manager_ids ) {
					this.managerIds = evt.data.live.manager_ids;
				}
				if ( evt.event === LiveEvent.LIVE_JOIN && evt.data.author.id === this.$sopia.logonUser.id ) {
					// Joined logon account event ignore
					return;
				}

				this.replaceSpecialInformation(evt);
				if ( this.isManager ) {
					SopiaProcesser(evt as any, this.live.socket);
				}

				if ( evt.event === LiveEvent.LIVE_PRESENT ) {
					const sticker = this.$sopia.sticker.findSticker(evt.data.sticker);
					if ( sticker && sticker.lottie_url ) {
						axios.get(sticker.lottie_url)
							.then((res) => {
								this.lottiePlay(res.data);
							});
					}
				}

				if ( IgnoreEvent.includes(evt.event) ) {
					return;
				}

				this.liveEvents.push(evt);
				if ( this.liveEvents.length > 100 ) {
					this.liveEvents.shift();
				}

				if ( this.fullScreen ) {
					this.$nextTick(() => {
						const scroll: any = this.$refs['scroll'];
						const { v, h } = scroll.getScrollProcess();
						const size =  scroll?._data?.bar?.vBar?.state?.size || 0;
						const threshold = 1 - (size * 0.5);
						//console.log('scroll', threshold, size, v, h, scroll);
						if ( (size === 0 || size >= 0.75) || (v >= threshold) ) {
							scroll.scrollBy({ dy: '100%' }, 100, 'easeInQuad');
						}
					});
				}
			});
			this.$evt.$off('live-block');
			this.$evt.$on('live-block', async (id: number) => {
				this.$swal({
					title: this.$t('lives.block'),
					html: this.$t('lives.block-user'),
					showCloseButton: true,
					confirmButtonText: this.$t('confirm'),
					cancelButtonText: this.$t('cancel'),
				}).then((result) => {
					if ( result.isConfirmed ) {
						// TODO: this api is not support now
						//await this.live.block(id);
					}
				});
			});
			{
				const scroll: any = this.$refs['scroll'];
				scroll.scrollBy({ dy: '100%' }, 100, 'easeInQuad');
			}

			// TODO: this api is not support now
			await this.$sopia.sticker.initSignatureSticker(this.live.author.id);
		}
	}

	public beforeUnmount() {
		if ( this.player ) {
			this.player.destroy();
		}
		if ( this.alertTimer ) {
			clearInterval(this.alertTimer);
		}
	}

	public liveLeave() {
		try {
			this.player.destroy();
			if ( this.live?.socket ) {
				console.log(this.live.socket);
				this.live.socket.destroy();
			}
		} catch (err) {
			console.error(err);
		}
		this.$evt.$emit('live-leave');
	}

	public userType(user: User) {
		// empty
	}

	public lottiePlay(data: any = false) {
		if ( data ) this.lottieQueue.push(data);
		if ( this.lottieMutex ) return;
		if ( this.lottieQueue.length <= 0 ) {
			console.log('empty lottie queue');
			return;
		}
		this.lottieMutex = true;
		this.lottieData = this.lottieQueue.shift();
		this.playingLottie = true;
		this.$nextTick(() => {
			(this.$refs.lottie as any)?.play();
		});
	}

	public lottieComplete() {
		this.playingLottie = false;
		this.lottieData = false;
		(this.$refs.lottie as any).stop();
		this.lottieMutex = false;
		this.$nextTick(() => {
			this.lottiePlay();
		});
	}

	public replaceSpecialInformation(evt: any) {
		const user = this.specialUser.find(([id]) => id == evt.data?.user?.id);
		const author = this.specialUser.find(([id]) => id == evt.data?.author?.id);
		
		if ( user ) evt.data.user.nickname = user[1] + evt.data.user.nickname;
		if ( author ) evt.data.author.nickname = author[1] + evt.data.author.nickname;
	}

	public async createDB(liveId: number) {	
		const targetDir = this.$path('userData', 'historydb');
		if ( !fs.existsSync(targetDir) ) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		const targetPath = path.join(targetDir, `${liveId}.db`);
		const isNew = !fs.existsSync(targetPath);
		this.liveDB = new Sqlite3(targetPath);

		if ( isNew ) {
			await this.liveDB.exec(`CREATE TABLE "live_history_tbl" (
				"idx" INTEGER PRIMARY KEY AUTOINCREMENT,
				"live_id" INTEGER NULL,
				"live_event" VARCHAR(256) NULL,
				"live_title" VARCHAR(256) NULL,
				"author_id" INTEGER NULL,
				"author_tag" VARCHAR(256) NULL,
				"author_nickname" VARCHAR(256) NULL,
				"data_json" TEXT NULL,
				"saved_date" DATETIME DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
			);`);
		}
		this.stmt = this.liveDB.prepare(`INSERT INTO live_history_tbl (
			live_id, live_event, live_title,
			author_id, author_tag, author_nickname,
			data_json
		) VALUES(
			${liveId}, @liveEvent, @liveTitle,
			@authorId, @authorTag, @authorNickname,
			@data_json
		)`);
	}

	public logLiveHistory(evt: LiveEventStruct) {
		if ( !this.liveDB ) {
			return;
		}

		if ( evt.isSerializedStruct ) {
			const data = evt.toJSON();
			const liveEvent = evt.event;
			const liveTitle = data.data?.title ||
				data.data?.live.title || '';
			const authorId = data.data?.author?.id ||
				data.data?.user?.id || 0;
			const authorTag = data.data?.author?.tag ||
				data.data?.user?.tag || '';
			const authorNickname = data.data?.author?.nickname ||
				data.data?.user?.nickname || '';
			const data_json = JSON.stringify(data);
			this.stmt.run({
				liveEvent,
				liveTitle,
				authorId,
				authorTag,
				authorNickname,
				data_json,
			});
		}

	}
}
</script>
<style scope>
.full-screen {
	height: 100vh;
	max-width: 450px;
	width: 100%;
	bottom: 0px;
	right:0px;
	z-index: 1;
}

.minify-button {
	position: fixed;
	max-width: 450px;
	bottom: 0px;
	right:0px;
	z-index: 1;
}

.lottie-wrapper {
	position: absolute;
	width: 100%;
	z-index: 5;
}


@media only screen and (max-width: 890px) {
	.full-screen {
		position: fixed !important;
		top: 48px;
	}
}
</style>
