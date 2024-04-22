<!--
 * LoginSpoon.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div>
		<h3>스푼 로그인 하는 방법</h3>
		<p class="mb-0">소피아는 구동하기 위해서 사용자의 스푼계정을 사용합니다.</p>
		<p class="red--text text--darken-3">반드시 방송용 계정 말고 매니저용 계정을 별도로 사용해 주세요.</p>
		<v-carousel
			height="300px"
		>
			<v-carousel-item
				reverse-transition="fade-transition"
				transition="fade-transition"
			>
				<v-img contain height="300px" src="./assets/로그인가이드1.png"></v-img>
			</v-carousel-item>
			<v-carousel-item
				reverse-transition="fade-transition"
				transition="fade-transition"
			>
				<v-img contain height="300px" src="./assets/로그인가이드2.png"></v-img>
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
		console.log('userInfo', userInfo);
		// api 로그인을 사용했기 때문에 직접 로그인 결과를 삽입함.
		this.$sopia.logonUser = userInfo;
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