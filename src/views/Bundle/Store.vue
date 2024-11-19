<!--
 * Index.vue
 * Created on Thu Oct 28 2021
 *
 * Copyright (c) Raravel. Licensed under the MIT License.
-->
<template>
	<v-main class="pa-6 grey lighten-4" style="min-height: 100vh; margin-left: 80px;">
		<v-row class="ma-0" align="center">
			<v-col cols="4">
				<h1>{{ $t('bundle.store.title') }}</h1>
			</v-col>
			<v-col offset="4" cols="4" align="right">
				<v-text-field
					v-model="searchText"
					solo
					single-line
					:placeholder="$t('bundle.store.search')"
					@keydown="searchKeyDown"
					hide-details></v-text-field>
			</v-col>
		</v-row>
		<v-row class="ma-0 mt-4" align="center">
			<v-col cols="9">
				<h3>{{ $t('bundle.store.subtitle') }}</h3>
				<p class="ma-0">{{ $t('bundle.store.description') }}</p>
				<p class="ma-0 mt-1 d-flex">
					<v-chip
						color="blue lighten-2"
						small
						outlined
						class="text-caption py-0 mr-2">
						Official
					</v-chip>
					{{ $t('bundle.store.description-2') }}
				</p>
			</v-col>
			<v-col cols="3" align="right">
				<bundle-upload-button />
			</v-col>
		</v-row>
		<v-row class="mt-0">
			<v-col cols="12">
				<v-btn
					v-if="onlyOfficial"
					depressed
					class="ma-0 d-flex align-middle pl-0 pr-2"
					@click="toggleOfficial"
					style="font-family: 'SUITE'; text-transform: none;">
					<v-chip
						color="blue lighten-2"
						small
						class="text-caption py-0 mx-2 white--text">
						Official
					</v-chip>
					<span>번들외에도 <span class="font-weight-black">다</span> 보여주세요.</span>
				</v-btn>
				<v-btn
					v-else
					depressed
					class="ma-0 d-flex align-middle"
					@click="toggleOfficial"
					style="font-family: 'SUITE'; text-transform: none;">
					<span>오직</span>
					<v-chip
						color="blue lighten-2"
						small
						outlined
						class="text-caption py-0 mx-2">
						Official
					</v-chip>
					<span>번들만 보고 싶어요.</span>
				</v-btn>
			</v-col>
		</v-row>
		<bundle-item
			v-for="(bundle, idx) in bundleList"
			:key="bundle.name + idx"
			:pkg="bundle">
		</bundle-item>
		<v-row class="ma-0 my-4" align="center">
			<v-col cols="9">
				<h3>{{ $t('bundle.store.local-bundle') }}</h3>
			</v-col>
			<v-col cols="3">
				<v-btn color="green" dark @click="addLocalBundle">
					{{ $t('bundle.store.add-local-bundle') }}
				</v-btn>
			</v-col>
		</v-row>
		<bundle-item
			v-for="bundle in localBundleList"
			:key="bundle.name"
			:pkg="bundle"
			isLocal>
		</bundle-item>
	</v-main>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import BundleMixins from './bundle-mixin';
import BundleUploadButton from './BundleUploadBtn.vue';
import BundleItem from './BundleItem/Index.vue';
import { BundlePackage } from '@/interface/bundle';
import path from 'path';
import { getAppPath, npmInstall } from '@/plugins/ipc-renderer';
const fs = window.require('fs');
const { ipcRenderer } = window.require('electron');

@Component({
	components: {
		BundleUploadButton,
		BundleItem,
	},
})
export default class BundleStore extends Mixins(BundleMixins) {

	public bundleList: BundlePackage[] = [];
	public localBundleList: BundlePackage[] = [];
	public originalBundleList: BundlePackage[] = [];
	public originalLocalBundleList: BundlePackage[] = [];
	public searchText = '';
	public increment = 0;
	public localBundles: string[] = [];
	public onlyOfficial = true;

	public async created() {
		await this.refreshBundleList();
		this.refreshLocalBundleList();
		this.$evt.$off('store:reload');
		this.$evt.$on('store:reload', async () => {
			await this.refreshBundleList();
			this.refreshLocalBundleList();
		});
	}

	public async addLocalBundle() {
		const res = await ipcRenderer.invoke('open-dialog', {
			title: '로컬 번들 경로',
			defaultPath: getAppPath('documents'),
			properties: [
				'openDirectory',
			],
		});

		if ( res.canceled ) {
			return;
		}

		const [ folder ] = res.filePaths;
		const packageSrc = path.join(folder, 'package.json');
		if ( fs.existsSync(packageSrc) ) {
			const pkg = JSON.parse(fs.readFileSync(packageSrc, 'utf-8')) as BundlePackage;
			this.localBundleList.push(pkg);
			fs.symlinkSync(folder,this.getBundlePath(pkg), 'junction');

			if ( pkg.dependencies ) {
				await ipcRenderer.invoke('bun:install', folder);
				// await npmInstall(Object.entries(pkg.dependencies).map(([name, version]) => ({
				// 	name,
				// 	version,
				// })), {
				// 	rootDir: folder,
				// });
			}
		} else {

		}
	}

	public async refreshBundleList() {
		const res = await this.$api.req('GET', '/bundle/');
		this.originalBundleList = res.data.sort((a: BundlePackage, b: BundlePackage) => {
			const $T = fs.existsSync(this.getBundlePath(a));
			const _T = fs.existsSync(this.getBundlePath(b));
			if ( $T === _T ) {
				if ( $T && _T ) {
					return (!!b.page && !a.page) ? 1 : -1;
				}
				return 0;
			}
			return $T > _T ? -1 : 1;
		});
		this.search();
	}

	public async refreshLocalBundleList() {
		const bundleList = fs.readdirSync(this.bundleRootPath)
							.filter((bundle: string) => !this.bundleList.find(({name}) => name === bundle))
							.map((name: string) => path.join(this.bundleRootPath, name, 'package.json'))
							.filter((p: string) => fs.existsSync(p))
							.map((p: string) => JSON.parse(fs.readFileSync(p, 'utf8')));
		this.originalLocalBundleList = this.localBundleList = bundleList || [];
	}

	public searchCondition(bundle: BundlePackage) {
		return bundle['name']?.includes(this.searchText) ||
			bundle['name:ko']?.includes(this.searchText) ||
			bundle['description']?.includes(this.searchText) ||
			bundle['description:ko']?.includes(this.searchText);
	}

	public search() {
		this.increment -= 1;
		if ( this.increment <= 0 ) {
			this.bundleList = this.originalBundleList
				.filter((b: BundlePackage) => this.onlyOfficial ? b.is_official : true)
				.filter(this.searchCondition.bind(this)) || [];
			this.localBundleList = this.originalLocalBundleList
				.filter(this.searchCondition.bind(this)) || [];
			this.increment = 0;
		}
	}

	public searchKeyDown() {
		if ( this.searchText.trim().length > 0 ) {
			this.increment += 1;
			setTimeout(() => this.search(), 500);
		}
	}

	public toggleOfficial() {
		this.onlyOfficial = !this.onlyOfficial;
		this.search();
	}

}
</script>
