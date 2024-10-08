<!--
 * LoginSpoon.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div style="position:absolute; top: 0; left: 0; height: 100vh; width: 100%;">
		<v-dialog v-model="dialog" max-width="600px">
			<v-card>
				<v-container>
					<v-row class="ma-0">
						<v-col cols="12">
							<p class="ma-0" v-html="$t('app.login.install-firefox')"></p>
						</v-col>
					</v-row>
					<v-row class="ma-0">
						<v-col cols="12" align="center">
							<v-btn
								depressed
								x-large
								color="indigo"
								dark
								class="mr-4"
								@click="installBrowser"
								:loading="loading">{{ $t('confirm') }}</v-btn>
							<v-btn depressed x-large @click="dialog = false">{{ $t('close') }}</v-btn>
						</v-col>
					</v-row>
				</v-container>
			</v-card>
		</v-dialog>
		<v-row class="ma-0 h-100v" align="center">
			<v-col cols="12" align="center" style="width: 100%;">
				<v-tabs
					v-model="tab"
					color="red"
					class="px-14"
					grow>
					<v-tab
						v-for="item in tabItem"
						:key="item">
						{{ $t('app.login.' + item) }}
					</v-tab>
				</v-tabs>
				<v-card-text class="px-14">
					<v-text-field
						:label="$t('app.login.spoon-id')"
						v-model="auth.id"
						color="red darken-1"
						prepend-icon="mdi-account"
						type="text"
						></v-text-field>

					<v-text-field
						:label="$t('app.login.spoon-password')"
						v-model="auth.pw"
						color="red darken-1"
						prepend-icon="mdi-lock"
						type="password"
						></v-text-field>

					<p class="red--text ma-0 mb-3">{{ errorMsg }}</p>

					<v-btn
						block dark
						text
						@click="loginSpoon"
						style="background: #FE4101;"
						rounded large
						:elevation="3"
						color="white">{{ $t('login') }}</v-btn>

					<v-btn
							block dark
							text tile large
							class="mt-4"
							:elevation="3"
							@click="snsLoginSpoon('google')"
							color="black">
						<img src="../../assets/google.png" width="25px" alt="">
						<v-spacer></v-spacer>
						<span class="font-weight-light">{{ $t('app.login.google') }}</span>
						<v-spacer></v-spacer>
					</v-btn>

					<v-btn
						block dark
						tile depressed
						style="background-color: #475993;"
						large
						class="mt-2"
						:elevation="3"
						@click="snsLoginSpoon('facebook')">
						<div style="background: white; width: 20px; height: 25px;">
							<img src="../../assets/facebook.png" width="25px" alt="" style="margin-left: -3px;">
						</div>
						<v-spacer></v-spacer>
						{{ $t('app.login.facebook') }}
						<v-spacer></v-spacer>
					</v-btn>

					<v-btn
						block dark
						tile depressed
						large
						class="mt-2"
						:elevation="3"
						@click="snsLoginSpoon('apple')"
						color="black darken-3">
						<img src="../../assets/apple.png" width="25px" alt="">
						<v-spacer></v-spacer>
						{{ $t('app.login.apple') }}
						<v-spacer></v-spacer>
					</v-btn>

					<p class="ma-0 mt-6 text-title link" @click="dialog = true;">{{ $t('app.login.dose-not-work-sns-login') }}</p>
				</v-card-text>
			</v-col>
		</v-row>
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { SnsType, LogonUser } from '@sopia-bot/core';
import { snsLoginOpen } from '@/plugins/ipc-renderer';
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');

@Component
export default class LoginSpoon extends Mixins(GlobalMixins) {

	public tabItem: SnsType[] = [ SnsType.PHONE, SnsType.EMAIL ];
	public tab: number = 0;
	public auth: any = { id: '', pw: '' };
	public errorMsg: string = '';
	public dialog = false;
	public loading = false;

	public get snsType() {
		return this.tabItem[this.tab] || this.tabItem[0];
	}

	public async loginSpoon() {
		try {
			if ( this.snsType === SnsType.PHONE ) {
				this.auth.id = +this.auth.id || '';
			}
			const user = await this.$sopia.login(this.auth.id, this.auth.pw, this.snsType);
			this.$emit('logon', user);
		} catch ( err ) {
			this.errorMsg = this.$t('app.login.login-fail');
		}
	}

	public async snsLoginSpoon(snsType: SnsType) {
		try {
			let user: any = await snsLoginOpen(this.$sopia.snsLoginURL(snsType));
			user = await this.$sopia.loginToken(user.id, user.token.replace('Bearer ', ''), user.refresh_token);
			this.$emit('logon', user as LogonUser);
		} catch {
			this.errorMsg = this.$t('app.login.login-fail');
		}
	}

	public async loginSpoonExtension() {
		await ipcRenderer.invoke('ext-login-open');
	}

	public async installBrowser() {

		if ( fs.existsSync(this.$path('userData', 'firefox')) ) {
			this.$swal({
				icon: 'error',
				title: this.$t('msg.alert'),
				html: this.$t('app.login.already-firefox'),
			});
			return;
		}

		this.loading = true;

		await fetch(`https://sopia-v3.s3.ap-northeast-2.amazonaws.com/Mozilla+Firefox.zip`)
			.then((r) => r.arrayBuffer())
			.then((r) => Buffer.from(r))
			.then((buf) => {
				ipcRenderer.sendSync(
					'zip:uncompress-buffer',
					buf.toString('base64'),
					this.$path('userData', 'firefox'),
				);
			})
			.catch(() => {
				this.$swal({
					icon: 'error',
					title: this.$t('error'),
				});
			});

		this.loading = false;
	}

}
</script>
<style>
.link {
	cursor: pointer;
	text-decoration: underline;
}

.link:hover {
	color: #E53935;
}
</style>