<!--
 * Index.vue
 * Created on Sat Jul 18 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
-->
<template>
	<!-- S: Login Dialog -->
	<div style="position: relative;">
		<v-row class="ma-0" style="height: 100vh;">
			<!-- <v-col cols="6" class="blue-grey lighten-5"  style="height: 100%;">
				<v-row style="height: 100%;" align="center">
					<v-col cols="12" class="text-center">
						<img @click="upEGG" alt="" src="../../assets/sopia-sd.png" style="width: 100%">
					</v-col>
				</v-row>
			</v-col> -->
			<v-col cols="8" lg="6" offset="2" offset-lg="3" align="center" style="position: relative">
				<v-scroll-x-reverse-transition>
					<login-sopia v-if="sopiaShow" @logon="sopiaLogon"/>
					<login-spoon v-if="spoonShow" @logon="spoonLogon"/>
				</v-scroll-x-reverse-transition>
			</v-col>
			<v-col cols="12" class="text-center">
			</v-col>
		</v-row>
		<div style="position: absolute; right: 0; top: 0;">
			<v-dialog
				v-model="dialog"
				width="500"
			>
				<template v-slot:activator="{ on, attrs }">
					<v-btn
						class="ma-4"
						fab
						dark
						color="deep-orange"
						v-bind="attrs"
          				v-on="on"
					>
						<v-icon dark>
							mdi-exclamation-thick
						</v-icon>
					</v-btn>
				</template>
				<v-card>
					<v-card-title class="text-h5">
						{{ $t('app.login.login-help') }}
					</v-card-title>

					<v-card-text class="py-0">
						<div class="text-body-1" v-html="$t('app.login.login-help-desc')"></div>
					</v-card-text>

					<v-divider></v-divider>

					<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn
						color="primary"
						text
						@click="removeAppCfg"
					>
						{{ $t('app.login.login-help-button') }}
					</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>
		</div>
	</div>
	<!-- E: Login Dialog -->
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
		} else {
			const { id, token, refresh_token } = this.$cfg.get('auth.spoon') || {};
			if ( !token || !refresh_token ) {
				this.sopiaShow = false;
				this.spoonShow = true;
			} else {
				await this.$sopia.loginToken(id, token, refresh_token);
				this.loginSpoon(this.$sopia.logonUser);
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

		this.loginSpoon(this.$sopia.logonUser);
	}

	public loginSpoon(user: LogonUser) {
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
