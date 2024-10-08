<!--
 * LoginSopia.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div style="position:absolute; top: 0; left: 0; height: 100vh; width: 100%;">
		<v-dialog
			v-model="dialog">
			<v-card>
				<v-card-text class="pt-6" v-html="markdown">
					
				</v-card-text>
			</v-card>
		</v-dialog>

		<v-dialog v-model="findIdDiag" max-width="600px">
			<v-card>
				<v-container>
					<v-row class="ma-0">
						<v-col cols="12" align="left">
							<v-text-field
								v-model="searchText"
								@keydown="searchKeyDown"
								:placeholder="$t('app.login.input-spoon-id')"></v-text-field>
						</v-col>
					</v-row>
					<v-list>
						<v-list-item v-for="user in users" :key="user.tag"  @click="findId(user.id)">
							<v-list-item-avatar class="grey lighten-2">
								<v-img :src="user.profile_url"></v-img>
							</v-list-item-avatar>

							<v-list-item-content>
								<v-list-item-title>
									<p class="blue-grey--text link ma-0">{{ user.nickname }}</p>
								</v-list-item-title>
								<v-list-item-subtitle>@{{ user.tag }}</v-list-item-subtitle>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-container>
			</v-card>
		</v-dialog>

		<v-row class="ma-0 h-100v" align="center">
			<v-col cols="12" align="center" style="width: 100%;">
				<v-card-title class="text-center d-block">
					{{ signinMode ? $t('app.login.sign-title') : $t('app.login.title') }}
				</v-card-title>
				<v-card-text class="px-14">
					<v-text-field
						:label="$t('app.login.id')"
						v-model="auth.id"
						color="indigo"
						prepend-icon="mdi-account"
						type="text"
						></v-text-field>

					<v-text-field
						:label="$t('app.login.password')"
						v-model="auth.pw"
						color="indigo"
						prepend-icon="mdi-lock"
						type="password"
						></v-text-field>

					<v-text-field
						v-if="signinMode"
						:label="$t('app.login.password-check')"
						v-model="auth.pwChk"
						color="indigo"
						prepend-icon="mdi-lock"
						type="password"
						></v-text-field>

					<v-checkbox
						v-if="signinMode"
						v-model="policy"
						color="indigo darken-2">
						<template v-slot:label>
							<div>
								<a
									class="indigo--text text--darken-1"
									href="#"
									@click.stop="showTerm">{{ $t('app.login.policy-agree-0') }}</a>
								{{ $t('app.login.policy-agree-1') }}
								<a
									class="indigo--text text--darken-1"
									href="#"
									@click.stop="showPrivacy">{{ $t('app.login.policy-agree-2') }}</a>
								{{ $t('app.login.policy-agree-3') }}
							</div>
						</template>
					</v-checkbox>

					<p class="red--text">{{ errorMsg }}</p>

					<div v-if="signinMode">
						<v-btn
							block dark
							tile depressed
							@click="signinSopia"
							color="indigo darken-3">{{ $t('app.login.sign-in') }}</v-btn>
						<v-btn
							block depressed
							tile text
							color="red darken-1"
							@click="signinMode = false; errorMsg = ''"
							>{{ $t('app.login.return-login') }}</v-btn>
					</div>
					<div v-else>
						<v-btn
							block dark
							tile depressed
							@click="loginSopia"
							color="indigo darken-3">{{ $t('login') }}</v-btn>
						<p class="text-caption mt-6">
							{{ $t('app.login.sign-description') }}
							<span
								class="indigo--text text--darken-2 font-weight-bold"
								style="cursor: pointer;"
								@click="signinMode = true; errorMsg = ''">{{ $t('app.login.sign-in') }}</span>
						</p>
						<p class="text-caption mt-4 link" @click="findIdDiag = true; findedId = '';">
							{{ $t('app.login.find-id') }}
						</p>
					</div>
				</v-card-text>
			</v-col>
		</v-row>
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import * as marked from 'marked/lib/marked.umd.js';
import { User } from '@sopia-bot/core';

@Component
export default class LoginSopia extends Mixins(GlobalMixins) {

	public auth = { id: '', pw: '', pwChk: '' };
	public errorMsg: string = '';
	public signinMode = false;
	public policy = false;
	public dialog = false;
	public markdown = '';
	public findIdDiag = false;
	public searchText = '';
	public increment = 0;
	public users: User[] = [];
	public findedTag = '';
	public findedId = '';

	public async loginSopia() {
		if ( !this.auth.id.trim() ) {
			this.errorMsg = this.$t('app.login.error.input_id');
			return;
		}
		if ( !this.auth.pw.trim() ) {
			this.errorMsg = this.$t('app.login.error.input_pw');
			return;
		}

		try {
			const user = await this.$api.login(this.auth.id, this.auth.pw);
			if ( !user ) {
				this.errorMsg = this.$t('app.login.error.login_fail');
				return;
			}

			this.$store.commit('user', user);
			this.errorMsg = '';
			this.$emit('logon', this.$store.getters.user);
		} catch ( err ) {
			this.$logger.err('login', err);
			this.errorMsg = this.$t('app.login.error.' + err.msg);
		}
	}

	public async search() {
		const req = await this.$sopia.api.search.user({
			params: {
				keyword: this.searchText,
			},
		});
		this.users = req.res.results.splice(0, 7);
	}

	public async searchKeyDown() {
		if ( this.searchText.trim().length > 0 ) {
			this.increment += 1;
			setTimeout(() => {
				this.increment -= 1;
				if ( this.increment <= 0 ) {
					this.search();
					this.increment = 0;
				}
			}, 500);
		}
	}

	public async findId(id: number) {
		try {
			const res = await this.$api.req('GET', `/user/spoon/${id}`);
			if ( res.status === 200 ) {
				this.$swal({
					icon: 'success',
					title: this.$t('success'),
					html: this.$t('app.login.finded-spoon-id', res.data[0].name, res.data[0].id),
				});
			}
		} catch {
			this.$swal({
				icon: 'error',
				title: this.$t('error'),
				html: this.$t('app.login.cannot-find-id'),
			});
		}
		this.findIdDiag = false;
		this.findedId = '';
		this.findedTag = '';
	}

	public async signinSopia() {
		if ( this.auth.id.length < 4 ) {
			this.errorMsg = this.$t('app.login.error.id_length');
			return;
		}
		if ( this.auth.pw.length < 8 ) {
			this.errorMsg = this.$t('app.login.error.pw_length');
			return;
		}

		if ( this.auth.pw !== this.auth.pwChk ) {
			this.errorMsg = this.$t('app.login.error.fail_chk_pw');
			return;
		}

		if ( !this.policy ) {
			this.errorMsg = this.$t('app.login.error.policy');
			return;
		}

		try {
			const res = await this.$api.req('PUT', '/auth/sign/', {
				name: this.auth.id,
				id: this.auth.id,
				pw: this.auth.pw,
				gender: -1,
			});
			if ( res.error ) {
				this.errorMsg = this.$t('app.login.error.' + res.msg);
				return;
			}

			await this.$swal({
				icon: 'success',
				title: this.$t('success'),
				html: this.$t('app.login.sign-success'),
			});

			this.auth = { id: '', pw: '', pwChk: '' };
			this.errorMsg = '';
			this.signinMode = false;
		} catch ( err ) {
			this.$logger.err('login', err);
			this.errorMsg = err.message;
		}
	}

	public async showTerm() {
		const res = await this.$api.req('GET', '/contents/term/');
		this.markdown = marked.marked(res.data[0]).replace(/\n/g, '<br>');
		this.dialog = true;
	}

	public async showPrivacy() {
		const res = await this.$api.req('GET', '/contents/privacy/');
		this.markdown = marked.marked(res.data[0]).replace(/\n/g, '<br>');
		this.dialog = true;
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