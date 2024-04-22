<!--
 * LoginSpoon.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div>
		<v-btn @click="loginSpoonExtension">로그인</v-btn>
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