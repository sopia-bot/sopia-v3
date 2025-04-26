<template>
	<div>
		<v-dialog
			v-model="dialogOpen"
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
const fs = window.require('fs');
const path = window.require('path');

interface UploadHistory {
	user_id: number;
	live_id: number;
	file_name: string;
	saved_time: string;
}

@Component({
	watch: {
		open: {
			handler(newVal: boolean) {
				(this as any).dialogOpen = newVal;
			},
			immediate: true
		}
	}
})
export default class AgreeLiveInfoDialog extends Mixins(GlobalMixins) {

	@Prop(Boolean) public open!: boolean;
	public dialogOpen = true;
	public dontShowFor24Hours = false;
	public timeout: NodeJS.Timeout | null = null;
	public myUploadHistory: UploadHistory[] = [];
	public uploadFlag = false;

	public created() {
		// this.dialogOpen = this.open;
	}
	public async mounted(this: any) {
		console.log('AgreeLiveInfoDialog mounted, open:', this.open);
		console.log('AgreeLiveInfoDialog mounted, agree_live_info:', this.$api.user.agree_live_info);
		if (this.$api.user.agree_live_info) {
			this.uploadLiveInfo();
		}
	}

	public async beforeUnmount() {
		if ( this.timeout ) {
			clearTimeout(this.timeout);
		}
	}

	public async refreshSponsor() {
		const res = await this.$api.req('GET', '/user/sponsor');
		this.$store.state.sponsors = res.data || [];
	}

	public agreeCollection() {
		// TODO: 정보 수집 동의 처리
		this.dialogOpen = false;
		this.$emit('update:open', false);
		this.$api.setUserInfo({
			... this.$api.user,
			agree_live_info: true,
		});
		this.uploadLiveInfo();
	}

	public disagreeCollection() {
		// TODO: 정보 수집 비동의 처리
		this.dialogOpen = false;
		this.$emit('update:open', false);
		if (this.dontShowFor24Hours) {
			const now = new Date();
			const expire = new Date(now.getTime() + 1000 * 60 * 60 * 24);
			this.$cfg.set('agreeLiveInfoDialog', expire.getTime().toString());
			this.$cfg.save();
		}
	}


	public async uploadLiveInfo() {
		if ( this.uploadFlag ) {
			return;
		}
		this.uploadFlag = true;
		const res = await this.$api.req('GET', '/contents/historydb/can-upload?t=' + Date.now());
		
		if ( res?.msg === 'success' ) {
			const data = res.data[0];
			if ( data.canUpload ) {
				const uploadKey = data.key;

				const res = await this.$api.req('GET', '/contents/historydb/history/' + this.$api.user.user_id);
				if ( res?.msg === 'success' ) {
					this.myUploadHistory = res.data;
					console.log('myUploadHistory', this.myUploadHistory);

					const targetDir = this.$path('userData', 'historydb');
					if ( !fs.existsSync(targetDir) ) {
						this.timeout = setTimeout(() => {
							this.uploadLiveInfo();
						}, 1000);
						this.uploadFlag = false;
						return;
					}

					const localHistoryFiles = fs.readdirSync(targetDir)
						.map((file) => path.join(targetDir, file))
						.filter((file) => {
							return path.extname(file) === '.db';
						})
						.filter((file) => {
							const fileStat = fs.statSync(file);
							if ( fileStat.mtime < new Date(Date.now() - 1000 * 60 * 60 * 4) ) {
								return true;
							}
							return false;
						})
						.filter((file) => {
							const liveId = path.basename(file, '.db');
							if ( this.myUploadHistory.find((history) => history.live_id === parseInt(liveId)) ) {
								return false;
							}
							return true;
						})
						.sort((file1, file2) => {
							const liveId1 = path.basename(file1, '.db');
							const liveId2 = path.basename(file2, '.db');
							// 오름차순
							return liveId1 - liveId2;
						});

					if ( localHistoryFiles.length > 0 ) {
						// 첫번째만 가져오기
						const targetFile = localHistoryFiles[0];
						if ( targetFile ) {
							const formData = new FormData();
							const liveId = path.basename(targetFile, '.db');
							formData.append('user_id', this.$api.user.user_id.toString());
							formData.append('live_id', liveId);
							formData.append('file_name', path.basename(targetFile));
							formData.append('file', new Blob([fs.readFileSync(targetFile)], { type: 'application/octet-stream' }));
							await this.$api.req('PUT', '/contents/historydb/' + uploadKey, formData);
							this.timeout = setTimeout(() => {
								this.uploadLiveInfo();
							}, 1000);
						}
					} else {
						// 없으면 나중에 생길 수도 있겠지
						this.uploadFlag = false;
						return;
					}
				}
			} else {
				this.timeout = setTimeout(() => {
					this.uploadLiveInfo();
				}, 1000);
			}
		} else {
			this.timeout = setTimeout(() => {
				this.uploadLiveInfo();
			}, 1000);
		}
		this.uploadFlag = false;
	}

}
</script>
<style>
.chat-message {
	font-family: JoyPixels, GangwonEdu_OTFBoldA, sans-serif !important;
	font-size: 13pt;
}
</style>