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
                  감사합니다.
								</span>
							</h1>
						</v-col>
					</v-row>
					<v-row class="ma-0 chat-message" align="center">
						<v-col cols="12" align="left">
							<p class="mb-1">후원해 주셔서 감사합니다.</p>
							<p class="mb-4">이 알림은 후원창 안내 알림입니다. 필수가 <b class="red--text text--lighten-3">아닙</b>니다.</p>
							<v-img width="150px" class="mx-auto" contain height="150px" src="../../assets/카카오페이.png"></v-img>
							<p class="text-center mb-4">국민 620601-01-521114 윤여준</p>
							<p class="mb-4">항상 응원해주시는 분들께 감사드리며, 후원금액 5,000원 이상부터 후원일 기준 1개월동안 아래 기능을 준비했습니다.</p>
							<ul class="mb-4">
								<li><span class="white--text">후원 알림창 제거</span>: 30분마다 반복해서 뜨는 이 창을 띄우지 않습니다. <br>오른쪽 상단 프로필 사진을 눌러 해당 창을 다시 띄울 수 있습니다.</li>
								<li><span class="white--text">소피아 알림 제거</span>: 방송에서 10분마다 반복해서 뜨는 알림창을 띄우지 않습니다.</li>
								<li>
									<span class="white--text">닉네임 특별 문자 부여</span>: 소피아가 모든 방송에서 후원자의 닉네임을 언급할 때마다 앞에 <span>💎</span>를 붙여드립니다.
									<br>
									예) 개발자 윤군님 어서오세요. ➞ 💎개발자 윤군님 어서오세요.
								</li>
							</ul>
							<p class="mb-1">입금하신 분께선 아래에 입금자명 및 적용받을 스푼 계정을 입력하신 후 <b>전송</b>버튼을 누르시면 확인 후 혜택이 적용됩니다. (최대 1일 소요.)</p>
							<p class="mb-2">기타 문의사항은 오픈채팅: <a href="https://open.kakao.com/o/s0L8uSfd" target="_blank">개발자 윤군</a>을 찾아주시기 바랍니다.</p>
							<v-textarea :disabled="loading" solo v-model="message" hide-details rows="5"></v-textarea>
							<v-btn :disabled="loading" block depressed class="mt-2" color="green" @click="sendSponsor">전송</v-btn>
							<v-col cols="12" align="center">
								<v-btn class="mt-2 mx-auto" color="red" @click="closeDialog">닫기</v-btn>
							</v-col>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
		</v-dialog>
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

@Component
export default class Donation extends Mixins(GlobalMixins) {

	public open = false;
	public itv!: NodeJS.Timeout;
	public loading = false;
	public message = '혜택 대상 아이디 2개(검색 가능 단어, DJ/소피아 ID):\n입금자 확인:\n기타 문의:\n\n후원해 주셔서 감사합니다.';

	public async created(this: any) {
		await this.refreshSponsor();
		this.$nextTick(async () => {
			while ( !this.$sopia.logonUser ) await this.$sleep(1000);
			if ( !this.$store.getters.isSponsor ) {
				//this.open = true;
			}
		});
		this.$evt.$off('donation:open');
		this.$evt.$on('donation:open', () => {
			this.message = '혜택 대상 아이디 2개(검색 가능 단어, DJ/소피아 ID):\n입금자 확인:\n기타 문의:\n\n후원해 주셔서 감사합니다.';
			this.open = true;
		});
	}

	public async refreshSponsor() {
		const res = await this.$api.req('GET', '/user/sponsor');
		this.$store.state.sponsors = res.data || [];
	}

	public beforeUnmount() {
		clearTimeout(this.itv);
	}

	public async sendSponsor() {
		this.loading = true;
		try {
			await this.$api.req('PUT', '/user/sponsor', {
				id: this.$sopia.logonUser.id,
				message: this.message,
			});
		} catch {
			/* empty */
		}
		await this.$sleep(2000);
		this.loading = false;
	}

	public closeDialog() {
		this.open = false;
		this.itv = setTimeout(async () => {
			await this.refreshSponsor();
			this.$nextTick(() => {
				if ( !this.$store.getters.isSponsor ) {
					//this.open = true;
				}
			});
		}, 1000 * 60 * 30 /* 30min */);
	}

}
</script>
<style>
.chat-message {
	font-family: JoyPixels, GangwonEdu_OTFBoldA, sans-serif !important;
	font-size: 13pt;
}
</style>