<!--
 * LoginSopia.vue
 * Created on Fri Jul 02 2021
 *
 * Copyright (c) raravel. Licensed under the MIT License.
-->
<template>
	<div class="sopia-login-container">
		<!-- Terms and Privacy Dialog -->
		<v-dialog v-model="dialog" max-width="700" scrollable>
			<v-card class="modern-dialog">
				<v-card-title class="text-h5 primary white--text">
					<v-icon left color="white">mdi-file-document</v-icon>
					약관 및 정책
				</v-card-title>
				<v-card-text class="pa-6" v-html="markdown"></v-card-text>
				<v-card-actions class="pa-4">
					<v-spacer></v-spacer>
					<v-btn color="primary" @click="dialog = false">
						확인
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<!-- Find ID Dialog -->
		<v-dialog v-model="findIdDiag" max-width="600" persistent>
			<v-card class="modern-dialog">
				<v-card-title class="text-h5 primary white--text">
					<v-icon left color="white">mdi-account-search</v-icon>
					{{ $t('app.login.find-id') }}
				</v-card-title>
				
				<v-card-text class="pa-6">
					<v-text-field
						v-model="searchText"
						@keydown="searchKeyDown"
						:placeholder="$t('app.login.input-spoon-id')"
						prepend-inner-icon="mdi-magnify"
						outlined
						clearable
						hide-details="auto"
						class="mb-4"
					></v-text-field>
					
					<v-list v-if="users.length > 0" class="user-search-list">
						<v-list-item 
							v-for="user in users" 
							:key="user.tag"  
							@click="findId(user.id)"
							class="user-item"
						>
							<v-list-item-avatar class="mr-4">
								<v-img :src="user.profile_url" class="rounded-circle"></v-img>
							</v-list-item-avatar>

							<v-list-item-content>
								<v-list-item-title class="font-weight-medium">
									{{ user.nickname }}
								</v-list-item-title>
								<v-list-item-subtitle class="text-caption">
									@{{ user.tag }}
								</v-list-item-subtitle>
							</v-list-item-content>
							
							<v-list-item-action>
								<v-icon color="primary">mdi-chevron-right</v-icon>
							</v-list-item-action>
						</v-list-item>
					</v-list>
					
					<div v-else-if="searchText && searchText.length > 0" class="text-center py-8">
						<v-icon size="48" color="grey lighten-1">mdi-account-search</v-icon>
						<p class="text-body-2 grey--text mt-2">검색 결과가 없습니다</p>
					</div>
				</v-card-text>
				
				<v-card-actions class="pa-4">
					<v-spacer></v-spacer>
					<v-btn text @click="findIdDiag = false" class="mr-2">
						취소
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<!-- Main Login Form -->
		<div class="login-form-container">
			<div class="form-header mb-8">
				<h2 class="text-h4 font-weight-regular primary--text mb-3">
					{{ signinMode ? $t('app.login.sign-title') : $t('app.login.title') }}
				</h2>
				<p class="text-body-1 grey--text text--darken-1">
					{{ signinMode ? '새 계정을 만들어보세요' : 'SOPIA 계정으로 로그인하세요' }}
				</p>
			</div>

			<v-form ref="loginForm" lazy-validation>
				<!-- ID Field -->
				<v-text-field
					v-model="auth.id"
					:label="$t('app.login.id')"
					prepend-inner-icon="mdi-account-outline"
					outlined
					class="mb-4"
					color="primary"
					hide-details="auto"
				></v-text-field>

				<!-- Password Field -->
				<v-text-field
					v-model="auth.pw"
					:label="$t('app.login.password')"
					:type="showPassword ? 'text' : 'password'"
					prepend-inner-icon="mdi-lock-outline"
					:append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
					@click:append="showPassword = !showPassword"
					@keydown.enter="signinMode ? signinSopia() : loginSopia()"
					outlined
					class="mb-2"
					color="primary"
					hide-details="auto"
				></v-text-field>

				<!-- Remember Credentials Checkbox (Login mode only) -->
				<v-checkbox
					v-if="!signinMode"
					v-model="rememberCredentials"
					color="primary"
					class="mt-0 mb-4"
					hide-details
				>
					<template v-slot:label>
						<div class="text-body-2">
							아이디 비밀번호 저장
						</div>
					</template>
				</v-checkbox>

				<!-- Confirm Password Field (Sign up mode) -->
				<v-text-field
					v-if="signinMode"
					v-model="auth.pwChk"
					:label="$t('app.login.password-check')"
					:type="showConfirmPassword ? 'text' : 'password'"
					prepend-inner-icon="mdi-lock-check-outline"
					:append-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
					@click:append="showConfirmPassword = !showConfirmPassword"
					outlined
					dense
					class="mb-3"
					color="primary"
				></v-text-field>

				<!-- Policy Agreement (Sign up mode) -->
				<v-checkbox
					v-if="signinMode"
					v-model="policy"
					color="primary"
					class="mt-2 mb-4"
					hide-details="auto"
				>
					<template v-slot:label>
						<div class="text-body-2">
							<a
								class="primary--text text-decoration-none"
								href="#"
								@click.stop="showTerm">{{ $t('app.login.policy-agree-0') }}</a>
							{{ $t('app.login.policy-agree-1') }}
							<a
								class="primary--text text-decoration-none"
								href="#"
								@click.stop="showPrivacy">{{ $t('app.login.policy-agree-2') }}</a>
							{{ $t('app.login.policy-agree-3') }}
						</div>
					</template>
				</v-checkbox>

				<!-- Error Message -->
				<v-alert
					v-if="errorMsg"
					type="error"
					dense
					text
					class="mb-4"
				>
					{{ errorMsg }}
				</v-alert>

				<!-- Action Buttons -->
				<div class="action-buttons">
					<div v-if="signinMode" class="signup-actions">
						<v-btn
							block
							large
							color="primary"
							:loading="loading"
							:disabled="!policy"
							@click="signinSopia"
							class="mb-3"
							elevation="2"
						>
							<v-icon left>mdi-account-plus</v-icon>
							{{ $t('app.login.sign-in') }}
						</v-btn>
						
						<v-btn
							block
							text
							color="grey darken-1"
							@click="signinMode = false; errorMsg = ''"
							class="text-capitalize"
						>
							{{ $t('app.login.return-login') }}
						</v-btn>
					</div>
					
					<div v-else class="login-actions">
						<v-btn
							block
							large
							color="primary"
							:loading="loading"
							@click="loginSopia"
							class="mb-4"
							elevation="2"
						>
							<v-icon left>mdi-login</v-icon>
							{{ $t('login') }}
						</v-btn>
						
						<div class="additional-actions text-center">
							<p class="text-body-2 grey--text text--darken-1 mb-2">
								{{ $t('app.login.sign-description') }}
							</p>
							<v-btn
								text
								small
								color="primary"
								@click="signinMode = true; errorMsg = ''"
								class="text-capitalize mr-2"
							>
								{{ $t('app.login.sign-in') }}
							</v-btn>
							<v-btn
								text
								small
								color="primary"
								@click="findIdDiag = true; findedId = '';"
								class="text-capitalize"
							>
								{{ $t('app.login.find-id') }}
							</v-btn>
						</div>
					</div>
				</div>
			</v-form>
		</div>
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
	public showPassword = false;
	public showConfirmPassword = false;
	public loading = false;
	public rememberCredentials = false;

	public async loginSopia() {
		if ( !this.auth.id.trim() ) {
			this.errorMsg = this.$t('app.login.error.input_id');
			return;
		}
		if ( !this.auth.pw.trim() ) {
			this.errorMsg = this.$t('app.login.error.input_pw');
			return;
		}

		this.loading = true;
		try {
			const user = await this.$api.login(this.auth.id, this.auth.pw);
			if ( !user ) {
				this.errorMsg = this.$t('app.login.error.login_fail');
				return;
			}

			// 로그인 성공 시 체크박스가 체크되어 있으면 localStorage에 저장
			if (this.rememberCredentials) {
				this.saveCredentials();
			} else {
				this.clearSavedCredentials();
			}

			this.$store.commit('user', user);
			this.errorMsg = '';
			this.$emit('logon', this.$store.getters.user);
		} catch ( err: any ) {
			this.$logger.err('login', err);
			this.errorMsg = this.$t('app.login.error.' + (err.msg || 'unknown'));
		} finally {
			this.loading = false;
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

		this.loading = true;
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
		} catch ( err: any ) {
			this.$logger.err('login', err);
			this.errorMsg = err.message || this.$t('app.login.error.unknown');
		} finally {
			this.loading = false;
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

	// localStorage에 로그인 정보 저장
	public saveCredentials() {
		try {
			const credentials = {
				id: this.auth.id,
				pw: this.auth.pw,
				remember: true
			};
			localStorage.setItem('sopia_login_credentials', JSON.stringify(credentials));
		} catch (error) {
			console.warn('로그인 정보 저장 실패:', error);
		}
	}

	// localStorage에서 저장된 로그인 정보 삭제
	public clearSavedCredentials() {
		try {
			localStorage.removeItem('sopia_login_credentials');
		} catch (error) {
			console.warn('로그인 정보 삭제 실패:', error);
		}
	}

	// localStorage에서 저장된 로그인 정보 불러오기
	public loadSavedCredentials() {
		try {
			const saved = localStorage.getItem('sopia_login_credentials');
			if (saved) {
				const credentials = JSON.parse(saved);
				if (credentials.remember) {
					this.auth.id = credentials.id || '';
					this.auth.pw = credentials.pw || '';
					this.rememberCredentials = true;
				}
			}
		} catch (error) {
			console.warn('저장된 로그인 정보 불러오기 실패:', error);
			// 오류 발생 시 저장된 정보 삭제
			this.clearSavedCredentials();
		}
	}

	// 컴포넌트 생성 시 저장된 로그인 정보 불러오기
	public created() {
		this.loadSavedCredentials();
	}

}
</script>

<style scoped>
/* Modern login form styling */
.sopia-login-container {
	width: 100%;
	overflow: visible;
}

.login-form-container {
	padding: 0;
}

.form-header {
	margin-bottom: 24px;
}

.action-buttons {
	margin-top: 16px;
}

.additional-actions {
	margin-top: 16px;
}

/* Modern dialog styling */
.modern-dialog {
	border-radius: 12px !important;
	overflow: hidden;
}

.user-search-list {
	max-height: 300px;
	overflow-y: auto;
}

.user-item {
	border-radius: 8px;
	margin-bottom: 4px;
	transition: background-color 0.2s ease;
}

.user-item:hover {
	background-color: rgba(25, 118, 210, 0.04);
}

/* Input field improvements */
.v-text-field--outlined {
	border-radius: 8px;
}

.v-text-field--outlined .v-input__control .v-input__slot {
	min-height: 48px;
}

/* Button improvements */
.v-btn {
	text-transform: none !important;
	font-weight: 500;
	border-radius: 8px;
}

.v-btn--large {
	height: 48px !important;
}

/* Alert styling */
.v-alert {
	border-radius: 8px;
}

/* Checkbox styling */
.v-input--checkbox {
	margin-top: 8px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
	.form-header {
		margin-bottom: 16px;
	}
	
	.login-form-container {
		padding: 0 8px;
	}
}

/* Animation for smooth transitions */
.v-fade-transition-enter-active,
.v-fade-transition-leave-active {
	transition: opacity 0.3s ease;
}

.v-fade-transition-enter,
.v-fade-transition-leave-to {
	opacity: 0;
}
</style>