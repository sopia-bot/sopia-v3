<template>
	<!-- S: Dialog -->
	<v-dialog
		v-model="value"
		persistent
		max-width="700px"
		width="90%">
		<v-card elevation="8" class="rounded-lg">
			<v-card-title class="text-h5 font-weight-bold primary white--text">
				<v-icon left color="white" class="mr-2">mdi-package-variant</v-icon>
				{{ $t('bundle.update.need') }}
			</v-card-title>
			
			<v-card-text class="pa-0">
				<v-container class="py-4">
					<v-row>
						<v-col cols="12">
							<div class="text-subtitle-1 mb-3 grey--text text--darken-1">
								업데이트 가능한 번들 목록
							</div>
							<v-list class="transparent">
								<update-list-item
									v-for="(pkg, index) of items"
									:key="pkg.name"
									:pkg="pkg"
									:ref="pkg.name"
									:class="{ 'mb-2': index < items.length - 1 }"
									@install:done="resolve"/>
							</v-list>
						</v-col>
					</v-row>
				</v-container>
			</v-card-text>
			
			<v-divider></v-divider>
			
			<v-card-actions class="pa-4" v-if="installDone">
				<v-spacer></v-spacer>
				<v-btn
					large
					rounded
					color="success"
					dark
					:disabled="installing"
					@click="$emit('input', false)">
					<v-icon left>mdi-check-circle</v-icon>
					{{ $t('close') }}
				</v-btn>
			</v-card-actions>
			
			<v-card-actions class="pa-4" v-else>
				<v-btn
					large
					rounded
					outlined
					color="grey darken-1"
					:disabled="installing"
					@click="$emit('input', false)">
					<v-icon left>mdi-close</v-icon>
					{{ $t('close') }}
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn
					large
					rounded
					color="primary"
					dark
					:disabled="installing"
					:loading="installing"
					@click="installAll">
					<v-icon left>mdi-open-in-new</v-icon>
					번들 매니저 열기
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
	<!-- E: Dialog -->
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import BundleMixin from './bundle-mixin';
import { BundlePackage } from '@/interface/bundle';
import UpdateListItem from './UpdateListItem.vue';
const { ipcRenderer } = window.require('electron');

@Component({
	components: {
		UpdateListItem,
	},
})
export default class BundleUpdateDialog extends Mixins(BundleMixin) {

	@Prop(Boolean) public value!: boolean;
	@Prop(Array) public items!: BundlePackage[];

	public installing: boolean = false;
	public installDone: boolean = false;
	public resolve: (value: unknown) => void = () => { /* empty */ };

	public async installAll() {
		await ipcRenderer.invoke('open-bundle-manager');
	}

	public async installSelect() {
		this.installing = true;
		for (const item of this.items) {
			await this.install(item);
		}
		this.installDone = true;
		this.installing = false;
	}

	private install(pkg: BundlePackage, force = false) {
		return new Promise((resolve) => {
			const [ref] = this.$refs[pkg.name] as UpdateListItem[];
			if ( ref ) {
				this.resolve = resolve;
				ref.$emit('install:start', force);
			}
		});
	}

}
</script>
