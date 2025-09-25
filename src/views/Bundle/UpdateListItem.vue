<template>
	<v-card 
		class="mb-3 mx-2" 
		elevation="2" 
		outlined
		hover>
		<v-card-title class="pb-2">
			<div class="d-flex align-center justify-space-between w-100">
				<div class="d-flex align-center">
					<v-icon color="primary" class="mr-3">mdi-package</v-icon>
					<div>
						<div class="text-h6 font-weight-medium">{{ pkg.name }}</div>
						<div class="text-caption grey--text">버전 {{ pkg.version }}</div>
					</div>
				</div>
			</div>
		</v-card-title>
		
		<v-card-text class="pt-0">
			<div class="text-body-2 mb-2">
				<v-icon small color="info" class="mr-1">mdi-information</v-icon>
				{{ message }}
			</div>
		</v-card-text>
		
		<v-expansion-panels 
			v-if="!!releaseNote" 
			flat 
			tile
			class="transparent">
			<v-expansion-panel>
				<v-expansion-panel-header class="px-4 py-2">
					<div class="d-flex align-center">
						<v-icon color="grey darken-1" class="mr-2">mdi-text-box-outline</v-icon>
						<span class="text-body-2 font-weight-medium">{{ $t('bundle.store.show-release-note') }}</span>
					</div>
				</v-expansion-panel-header>
				<v-expansion-panel-content>
					<v-card 
						flat 
						color="grey lighten-5" 
						class="pa-4 mt-2">
						<div 
							v-html="releaseNote" 
							class="text-body-2 release-note-content">
						</div>
					</v-card>
				</v-expansion-panel-content>
			</v-expansion-panel>
		</v-expansion-panels>
	</v-card>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import BundleMixin from './bundle-mixin';
import { BundlePackage } from '@/interface/bundle';
const fs = window.require('fs');

@Component
export default class UpdateListItem extends Mixins(BundleMixin) {

	@Prop(Object) public pkg!: BundlePackage;
	public message: string = this.$t('bundle.update.ready', this.pkg.version);

	public updateFlag = false;

	public mounted() {
		this.$off('install');
		this.$on('install:start', async (force = false) => {
			console.log('start', this.pkg.name, force, this.updateFlag);
			if ( force === false && this.updateFlag === false ) {
				await this.$sleep(100);
				this.$emit('install:done');
				return;
			}
			this.message = this.$t('bundle.update.download');
			await this.bundleInstall(this.pkg, false);
			this.message = this.$t('bundle.update.done');
			this.$emit('install:done');
		});
	}

	get releaseNote() {
		return this.pkg['release-note']?.[this.pkg.version];
	}

	public getStatusColor(): string {
		if (this.message.includes('완료') || this.message.includes('done')) {
			return 'success';
		} else if (this.message.includes('다운로드') || this.message.includes('download')) {
			return 'warning';
		} else {
			return 'info';
		}
	}

	public getStatusTextColor(): string {
		return 'white';
	}

	public getStatusText(): string {
		if (this.message.includes('완료') || this.message.includes('done')) {
			return '완료';
		} else if (this.message.includes('다운로드') || this.message.includes('download')) {
			return '다운로드 중';
		} else {
			return '업데이트 준비';
		}
	}

}
</script>

<style scoped>
.release-note-content {
	line-height: 1.6;
}

.release-note-content h1,
.release-note-content h2,
.release-note-content h3,
.release-note-content h4,
.release-note-content h5,
.release-note-content h6 {
	margin-top: 16px;
	margin-bottom: 8px;
	font-weight: 600;
}

.release-note-content p {
	margin-bottom: 8px;
}

.release-note-content ul,
.release-note-content ol {
	margin-left: 20px;
	margin-bottom: 8px;
}

.release-note-content li {
	margin-bottom: 4px;
}

.release-note-content code {
	background-color: rgba(0, 0, 0, 0.1);
	padding: 2px 4px;
	border-radius: 4px;
	font-family: 'Courier New', monospace;
}

.release-note-content pre {
	background-color: rgba(0, 0, 0, 0.05);
	padding: 12px;
	border-radius: 8px;
	overflow-x: auto;
	margin: 8px 0;
}
</style>