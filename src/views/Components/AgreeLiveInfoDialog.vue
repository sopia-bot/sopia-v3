<template>
	<div>
		<v-dialog
			v-model="open"
			persistent
			max-width="750px"
			width="70%">
			<v-card color="blue-grey darken-4" dark tile>
				<v-card-text class="pt-8">
					<v-row class="ma-0" align="center">
						<v-col cols="12" align="center">
							<h1 class="mb-2 d-flex text-h4 font-weight-bold">
								<span class="mx-auto d-flex indigo--text text--accent-1" style="align-items: center">
                  방송 정보 수집 및 이용 동의 안내
								</span>
							</h1>
						</v-col>
					</v-row>
					<v-row class="ma-0 chat-message" align="center">
						<v-col cols="12" align="left">
							<p class="mb-4">안녕하세요. 개발자 윤군입니다. 서비스 품질 향상을 위해 여러분의 방송정보를 수집하고자 합니다. 이는 개인정보 처리방침에 따라 안전하게 보관됩니다. 동의하지 않을경우 수집하지 않습니다.</p>
							<p class="mb-4">
								방송 수집 관련 정보는 방송 시간, 채팅, 참여자 정보 등 방송 관련 정보를 수집합니다.
							</p>
							<v-row class="ma-0" align="center">
								<v-col cols="auto">
									<v-checkbox
										v-model="dontShowFor24Hours"
										label="24시간 동안 보지 않기"
										hide-details
										dense
										class="mt-0"
									></v-checkbox>
								</v-col>
								<v-spacer></v-spacer>
								<v-col cols="auto">
									<v-btn color="red" @click="disagreeCollection">취소</v-btn>
								</v-col>
								<v-col cols="auto">
									<v-btn color="green" @click="agreeCollection">동의합니다</v-btn>
								</v-col>
							</v-row>
							<v-row class="ma-0 mt-4">
							</v-row>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
		</v-dialog>
	</div>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

@Component
export default class AgreeLiveInfoDialog extends Mixins(GlobalMixins) {

	@Prop(Boolean) public open!: boolean;
	public dontShowFor24Hours = false;

	public async created(this: any) {
	}

	public async refreshSponsor() {
		const res = await this.$api.req('GET', '/user/sponsor');
		this.$store.state.sponsors = res.data || [];
	}

	public beforeUnmount() {
	}

	public agreeCollection() {
		// TODO: 정보 수집 동의 처리
		this.open = false;
		this.$api.setUserInfo({
			... this.$api.user,
			agree_live_info: true,
		});
	}

	public disagreeCollection() {
		// TODO: 정보 수집 비동의 처리
		this.open = false;
		if (this.dontShowFor24Hours) {
			const now = new Date();
			const expire = new Date(now.getTime() + 1000 * 60 * 60 * 24);
			localStorage.setItem('agreeLiveInfoDialog', expire.getTime().toString());
		}
	}

}
</script>
<style>
.chat-message {
	font-family: JoyPixels, GangwonEdu_OTFBoldA, sans-serif !important;
	font-size: 13pt;
}
</style>