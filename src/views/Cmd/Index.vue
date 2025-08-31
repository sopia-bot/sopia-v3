<!--
 * Index.vue
 * Created on Fri Nov 27 2020
 *
 * Copyright (c) Raravel. Licensed under the MIT License.
-->
<template>
	<v-main class="modern-cmd-layout" style="overflow-y: auto; max-height: calc(100vh - 48px);">
		<v-container fluid class="pa-0">
			<v-row justify="center" class="ma-0">
				<v-col cols="12" md="10" lg="8" xl="6" class="pa-4">
					<!-- Header Card -->
					<v-card class="header-card elevation-4 rounded-xl mb-6" color="white">
						<v-card-text class="pa-6">
							<v-row align="center" no-gutters>
								<v-col cols="12" md="8" class="d-flex align-center mb-3 mb-md-0">
									<v-avatar color="indigo" size="48" class="mr-4">
										<v-icon color="white" size="28">mdi-cog</v-icon>
									</v-avatar>
									<div>
										<h1 class="text-h4 font-weight-bold indigo--text text--darken-2 mb-1">
											{{ $t('cmd.title') }}
										</h1>
										<p class="text-subtitle-1 grey--text text--darken-1 mb-0" v-html="$t('cmd.'+setType+'-desc')"></p>
									</div>
								</v-col>
								<v-col cols="12" md="4" class="text-md-right">
									<v-card class="switch-card pa-3 rounded-lg" color="grey lighten-5" flat>
										<div class="d-flex align-center justify-md-end">
											<v-icon :color="use ? 'success' : 'grey'" class="mr-2">
												{{ use ? 'mdi-check-circle' : 'mdi-circle-outline' }}
											</v-icon>
											<span class="text-body-2 font-weight-medium mr-3">{{ $t('enable') }}</span>
											<v-switch
												v-model="use"
												color="indigo"
												class="ma-0 pa-0"
												hide-details
												dense
											></v-switch>
										</div>
									</v-card>
								</v-col>
							</v-row>
						</v-card-text>
					</v-card>

					<!-- Navigation Tabs -->
					<v-card class="nav-card elevation-2 rounded-xl mb-4" color="white">
						<v-card-text class="pa-4">
							<v-chip-group
								v-model="selectedTab"
								active-class="indigo white--text"
								mandatory
								class="justify-center"
							>
								<v-chip
									v-for="type of typeList"
									:key="type.href"
									:value="type.href"
									large
									class="mx-1 px-6 rounded-lg font-weight-medium"
									@click="$assign(type.href)"
								>
									<v-icon left size="20">{{ getTabIcon(type.href) }}</v-icon>
									{{ type.text }}
								</v-chip>
							</v-chip-group>
						</v-card-text>
					</v-card>

					<!-- Content Area -->
					<v-card class="content-card elevation-0 rounded-xl mb-4" color="white">
						<v-card-text class="pa-0">
							<transition name="fade-transition" mode="out-in">
								<router-view></router-view>
							</transition>
						</v-card-text>
					</v-card>

					<!-- Action Bar -->
					<v-card class="action-card elevation-2 rounded-xl" color="white">
						<v-card-text class="pa-4">
							<v-row align="center" no-gutters>
								<v-col cols="12" md="8" class="mb-3 mb-md-0">
									<v-alert
										color="info"
										icon="mdi-information"
										text
										dense
										class="ma-0 rounded-lg"
									>
										<span class="text-body-2" v-html="$t('cmd.'+setType+'-ex')"></span>
									</v-alert>
								</v-col>
								<v-col cols="12" md="4" class="text-md-right">
									<v-btn
										large
										rounded
										color="success"
										dark
										:loading="loading"
										:disabled="loading"
										@click="save"
										class="px-8 font-weight-bold elevation-2"
									>
										<v-icon left>mdi-content-save</v-icon>
										{{ $t('apply') }}
									</v-btn>
								</v-col>
							</v-row>
						</v-card-text>
					</v-card>
				</v-col>
			</v-row>
			<div style="height: 50px;"></div>
		</v-container>
	</v-main>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import CfgLite from '@/plugins/cfg-lite-ipc';
import { LiveEvent } from '@sopia-bot/core';


@Component
export default class Cmd extends Mixins(GlobalMixins) {
	public setType: string = 'live_join';
	public use: boolean = this.$cfg.get(`cmd.${this.setType}.use`) ?? false;
	public cfgPath: string = this.$path('userData', 'cmd.cfg');
	public cfg: CfgLite = new CfgLite(this.cfgPath);
	public loading: boolean = false;
	public selectedTab: string = '';

	public typeList: any[] = [
		{
			href: '/cmd/live_join/',
			text: this.$t('page.Join'),
			isActive: this.isActive.bind(this),
		},
		{
			href: '/cmd/live_like/',
			text: this.$t('page.Like'),
			isActive: this.isActive.bind(this),
		},
		{
			href: '/cmd/live_present/',
			text: this.$t('page.Present'),
			isActive: this.isActive.bind(this),
		},
		{
			href: '/cmd/live_message/',
			text: this.$t('page.Message'),
			isActive: this.isActive.bind(this),
		},
	];

	public liveLike: string = '';

	public render = {
		present: true,
	};

	public isActive(href: string) {
		return this.$route.path === href;
	}

	public async mounted() {
		const m = this.$route.path.match(/\/cmd\/(.*)?\//);
		if ( m ) {
			this.setType = m[1] as string;
			this.use = this.$cfg.get(`cmd.${this.setType}.use`) ?? false;
		}
		this.selectedTab = this.$route.path;
	}

	public getTabIcon(href: string): string {
		const iconMap: { [key: string]: string } = {
			'/cmd/live_join/': 'mdi-account-plus',
			'/cmd/live_like/': 'mdi-heart',
			'/cmd/live_present/': 'mdi-gift',
			'/cmd/live_message/': 'mdi-message-reply'
		};
		return iconMap[href] || 'mdi-cog';
	}

	public save() {
		this.loading = true;
		
		// 사용 활성화 체크
		if (!this.use) {
			this.$noti({
				type: 'warning',
				content: '설정이 실제로 동작하려면, 오른쪽 상단의 사용이 활성화 되어있어야 합니다.',
				timeout: 4000,
			});
		}

		this.$evt.$emit('cmd:save');
		this.$evt.$emit('cmd:reload');
		this.$swal({
			icon: 'success',
			toast: true,
			position: 'top-end',
			html: this.$t('save-success'),
			showCloseButton: false,
			showConfirmButton: false,
			timer: 5000,
		});

		this.$cfg.set(`cmd.${this.setType}.use`, this.use);
		if ( this.setType === LiveEvent.LIVE_PRESENT ) {
			this.$cfg.set(`cmd.${LiveEvent.LIVE_PRESENT_LIKE}.use`, this.use);
		}
		this.$cfg.save();
		this.$logger.success('cmd', `Save success config file. [${this.cfgPath}]`, this.cfg.get());
		this.loading = false;
		window.reloadCmdCfg();
	}


}
</script>
<style scoped>
.modern-cmd-layout {
	background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
	min-height: 100vh;
}

.header-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
}

.header-card .indigo--text {
	color: white !important;
}

.header-card .grey--text {
	color: rgba(255, 255, 255, 0.8) !important;
}

.switch-card {
	backdrop-filter: blur(10px);
	background: rgba(255, 255, 255, 0.2) !important;
	border: 1px solid rgba(255, 255, 255, 0.3);
}

.nav-card {
	backdrop-filter: blur(10px);
	border: 1px solid rgba(0, 0, 0, 0.05);
}

.content-card {
	backdrop-filter: blur(10px);
	border: 1px solid rgba(0, 0, 0, 0.05);
}

.action-card {
	backdrop-filter: blur(10px);
	border: 1px solid rgba(0, 0, 0, 0.05);
}

.v-chip-group {
	justify-content: center;
}

.v-chip {
	transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.v-chip:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.fade-transition-enter-active,
.fade-transition-leave-active {
	transition: opacity 0.3s ease;
}

.fade-transition-enter,
.fade-transition-leave-to {
	opacity: 0;
}

.v-btn {
	transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.v-btn:hover {
	transform: translateY(-1px);
}

.v-card {
	transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.v-card:hover {
	transform: translateY(-2px);
}

@media (max-width: 960px) {
	.header-card .d-flex {
		flex-direction: column;
		align-items: flex-start !important;
	}
	
	.switch-card {
		margin-top: 1rem;
	}
	
	.text-md-right {
		text-align: left !important;
	}
	
	.justify-md-end {
		justify-content: flex-start !important;
	}
}
</style>
