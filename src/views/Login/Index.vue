<!--
 * Index.vue
 * Created on Sat Jul 18 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<!-- S: Modern Login Layout -->
	<v-app>
		<!-- Main content -->
		<v-main class="login-main">
			<v-container fluid class="fill-height pa-0">
				<v-row class="fill-height ma-0">
					<!-- Left side - Logo and branding -->
					<v-col cols="6" class="d-flex flex-column justify-center align-center login-left-panel">
						<div class="text-center">
							<div class="logo-container mb-6">
								<v-avatar size="120" class="elevation-4">
									<img 
										@click="upEGG" 
										alt="SOPIA Logo" 
										src="../../assets/sopia-sd.png"
										class="logo-image"
									>
								</v-avatar>
							</div>
							<h1 class="text-h2 font-weight-light mb-4 primary--text">
								SOPIA
							</h1>
							<p class="text-h6 grey--text text--darken-1 mb-8">
								스푼라디오 매니저 AI 프로그램
							</p>
							
							<!-- Progress indicator -->
							<div class="progress-container">
								<v-chip-group
									v-model="currentStep"
									mandatory
									class="justify-center"
								>
									<v-chip
										:value="0"
										:color="sopiaShow ? 'primary' : 'grey lighten-3'"
										:text-color="sopiaShow ? 'white' : 'grey darken-1'"
										label
										class="mx-2"
									>
										<v-icon left>mdi-account</v-icon>
										SOPIA 로그인
									</v-chip>
									<v-chip
										:value="1"
										:color="spoonShow ? 'primary' : 'grey lighten-3'"
										:text-color="spoonShow ? 'white' : 'grey darken-1'"
										label
										class="mx-2"
									>
										<v-icon left>mdi-microphone</v-icon>
										스푼 연동
									</v-chip>
								</v-chip-group>
							</div>
						</div>
					</v-col>

					<!-- Right side - Login forms -->
					<v-col cols="6" class="d-flex flex-column justify-center login-right-panel">
						<div class="login-form-container pa-12">
							<v-fade-transition mode="out-in">
								<login-sopia 
									v-if="sopiaShow" 
									@logon="sopiaLogon"
									key="sopia-login"
								/>
								<login-spoon 
									v-else-if="spoonShow" 
									@logon="spoonLogon"
									key="spoon-login"
								/>
							</v-fade-transition>
						</div>
					</v-col>
				</v-row>
			</v-container>
		</v-main>

		<!-- Help button - floating action button -->
		<v-btn
			fab
			fixed
			top
			right
			class="ma-4"
			style="top: 80px;"
			color="orange darken-2"
			elevation="6"
			dark
			@click="dialog = true"
		>
			<v-icon>mdi-help</v-icon>
		</v-btn>

		<!-- Help dialog with improved design -->
		<v-dialog
			v-model="dialog"
			max-width="600"
			persistent
		>
			<v-card class="help-dialog">
				<v-card-title class="text-h5 primary white--text">
					<v-icon left color="white">mdi-help-circle</v-icon>
					{{ $t('app.login.login-help') }}
				</v-card-title>

				<v-card-text class="pa-6">
					<div class="text-body-1" v-html="$t('app.login.login-help-desc')"></div>
				</v-card-text>

				<v-divider></v-divider>

				<v-card-actions class="pa-4">
					<v-spacer></v-spacer>
					<v-btn
						text
						@click="dialog = false"
						class="mr-2"
					>
						취소
					</v-btn>
					<v-btn
						color="primary"
						@click="removeAppCfg"
						elevation="2"
					>
						{{ $t('app.login.login-help-button') }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-app>
	<!-- E: Modern Login Layout -->
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { UserDto } from '@sopia-bot/api-dto';
import { LogonUser } from '@sopia-bot/core';

import LoginSopia from '@/views/Login/LoginSopia.vue';
import LoginSpoon from '@/views/Login/LoginSpoonNew.vue';
import GlobalMixins from '@/plugins/mixins';
const { ipcRenderer } = window.require('electron');

@Component({
	components: {
		LoginSopia,
		LoginSpoon,
	},
})
export default class Login extends Mixins(GlobalMixins) {

	@Prop(Boolean) public value!: boolean;
	public sopiaShow: boolean = true;
	public spoonShow: boolean = false;

	public sopiaUser!: UserDto;
	public countEGG: number = 0;
	public dialog: boolean = false;
	public currentStep: number = 0;

	public upEGG() {
		this.countEGG += 1;
		if ( this.countEGG > 5 ) {
			this.countEGG = 0;
			ipcRenderer.send('open-dev-tools');
		}
	}

	public created() {
		this.$evt.$on('login:skip-sopia-login', (user: UserDto) => {
			this.sopiaUser = user;
			this.sopiaShow = false;
			this.spoonShow = true;
			this.currentStep = 1;
		});
		const sopia = this.$cfg.get('auth.sopia');
		if ( sopia ) {
			this.$evt.$emit('login:skip-sopia-login', sopia);
		}
	}

	public beforeUnmount() {
		this.$evt.$off('login:skip-sopia-login');
	}

	public async sopiaLogon(user: UserDto) {
		this.sopiaUser = user;
		this.$cfg.set('sopia', this.sopiaUser);
		if ( this.sopiaUser.spoon_id === '0' ) {
			this.sopiaShow = false;
			this.spoonShow = true;
			this.currentStep = 1;
		} else {
			const { id, token, refresh_token } = this.$cfg.get('auth.spoon') || {};
			if ( !token || !refresh_token ) {
				this.sopiaShow = false;
				this.spoonShow = true;
				this.currentStep = 1;
			} else {
				await this.$sopia.loginToken(id, token, refresh_token);
				this.onLoginSpoon(this.$sopia.logonUser);
			}
		}
	}


	public async spoonLogon(user: LogonUser) {
		this.$logger.info('Spoon login user', user);
		this.sopiaUser.spoon_id = user.id.toString();
		this.sopiaUser.name = user.tag;
		this.sopiaUser.gender = user.gender;

		try {
			await this.$api.setUserInfo(this.sopiaUser);
		} catch {
			await this.$swal({
				icon: 'error',
				title: this.$t('error'),
				html: this.$t('app.login.unauthorized-logout'),
			});
			window.logout();
			return;
		}

		if ( +this.sopiaUser.spoon_id !== user.id ) {
			await this.$swal({
				icon: 'warning',
				title: this.$t('msg.alert'),
				html: this.$t('app.login.error.diff_id'),
				confirmButtonText: this.$t('confirm'),
			});
			return;
		}

		const { id, token, refresh_token } = this.$sopia.logonUser;
		this.$cfg.set('auth.spoon.id', id);
		this.$cfg.set('auth.spoon.token', token);
		this.$cfg.set('auth.spoon.refresh_token', refresh_token);
		this.$cfg.set('auth.sopia', this.sopiaUser);
		this.$cfg.save();
		console.log('spoon login complete', id, token, refresh_token);

		this.onLoginSpoon(this.$sopia.logonUser);
	}

	public onLoginSpoon(user: LogonUser) {
		this.$emit('input', false);
		this.$evt.$emit('user', user);
		this.$store.commit('user', user);
		this.sopiaShow = false;
		this.spoonShow = false;

		this.$api.activityLog('logon');
		
		this.$assign('/');
	}

	public removeAppCfg() {
		this.$cfg.delete('auth');
		this.$cfg.save();
		setTimeout(() => {
			window.location.reload();
		}, 100);
	}

}
</script>

<style scoped>
/* Main layout */
.login-main {
	background: #ffffff;
	height: 100vh;
	overflow: hidden;
}

/* Left panel - Logo and branding */
.login-left-panel {
	background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
	border-right: 1px solid #dee2e6;
}

/* Right panel - Login forms */
.login-right-panel {
	background: #ffffff;
	overflow: auto;
    max-height: calc(100vh - var(--titlebar-height));
    padding: 0;
}

/* Logo styling */
.logo-container {
	position: relative;
}

.logo-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	cursor: pointer;
	transition: transform 0.2s ease;
}

.logo-image:hover {
	transform: scale(1.05);
}

/* Form container */
.login-form-container {
	width: 100%;
	margin: 0 auto;
	max-height: calc(100vh - var(--titlebar-height));
}

/* Progress indicator */
.progress-container {
	margin-top: 32px;
}

/* Help dialog */
.help-dialog {
	border-radius: 12px !important;
	overflow: hidden;
}

/* Animations */
@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Dark theme support */
.theme--dark .login-main {
	background: #1e1e1e;
}

.theme--dark .login-left-panel {
	background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%);
	border-right: 1px solid #404040;
}

.theme--dark .login-right-panel {
	background: #1e1e1e;
}
</style>
