<!--
 * LoginSpoon.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div style="position:absolute; top: 0; left: 0; height: 100vh; width: 100%;">
		<v-row class="ma-0 h-100v" align="center">
			<v-col cols="12" align="center" style="width: 100%;">
				<h3>스푼 로그인 하는 방법</h3>
				<p class="mb-0">소피아는 구동하기 위해서 사용자의 스푼계정을 사용합니다.</p>
				<p class="red--text text--darken-3">반드시 방송용 계정 말고 매니저용 계정을 별도로 사용해 주세요.</p>
				<v-carousel
					height="300px"
					hide-delimiter-background
					hide-delimiters
				>
					<v-carousel-item>
						<Picture :src="require('./assets/로그인가이드1.png')"></Picture>
						<!-- <v-img contain height="300px" src="./assets/로그인가이드1.png"></v-img> -->
					</v-carousel-item>
				</v-carousel>
				
				<v-btn
					depressed
					class="mt-5"
					large
					dark
					color="red darken-1"
					@click="loginSpoonExtension">
					{{ $t('app.login.login-webpage') }}
				</v-btn>
			</v-col>
		</v-row>
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
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

	public tabItem: SnsType[] = [ SnsType.PHONE, SnsType.EMAIL ];
	public tab: number = 0;
	public auth: any = { id: '', pw: '' };
	public errorMsg: string = '';
	public dialog = false;
	public loading = false;
	public guidImgs: Array<{ src: any }> = [
		{
			src: './assets/로그인가이드1.png',
		},
	];

	public get snsType() {
		return this.tabItem[this.tab] || this.tabItem[0];
	}


	public async loginSpoonExtension() {
		const result = await ipcRenderer.invoke('ext-login-open');
		if ( !result.success ) {
			return;
		}
		const userInfo = result.data as LogonUser;
		await this.$sopia.loginToken(userInfo.id, userInfo.token, userInfo.refresh_token)
		
		this.$emit('logon', userInfo);
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