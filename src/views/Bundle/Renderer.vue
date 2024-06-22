<!--
 * Index.vue
 * Created on Thu Oct 28 2021
 *
 * Copyright (c) Raravel. Licensed under the MIT License.
-->
<template>
	<div>
		<div v-if="version === 2" style="padding-left: 80px; height: calc(100vh - 48px);">
			<webview ref="webview" :src="pageSrc" style="width: 100%; height: 100%;"></webview>
		</div>
		<component v-else :is="page"></component>
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import Store from './Store.vue';
import path from 'path';
import { BundlePackage } from '@/interface/bundle';
import * as VuetifyComponents from 'vuetify/lib/components';
import Scripts from '@/sopia/script';

const fs = window.require('fs');
const vm = window.require('vm');

@Component({
	components: {
		Store,
	},
})
export default class BundleRenderer extends Mixins(GlobalMixins) {

	public basePath: string = this.$path('userData', 'bundles');
	public bundlePath: string = path.join(this.basePath, this.bundle);
	public package!: BundlePackage;
	public page: any = null;
	public version = 1;
	public pageSrc: string = '';

	get bundle() {
		const m = this.$route.path.match(/\/bundle\/(.*)?\//);
		if ( m ) {
			return m[1];
		}
		this.$logger.err('bundle', 'Wrong path ', this.$route.path);
		return '';
	}

	public mounted() {
		this.loadBundlePage();
	}

	public getInnerString(txt: string, tag: string) {
		const regx = new RegExp(`<${tag}>((?:.|\r|\n)*)?</${tag}>`);
		const m: any = txt.match(regx);
		if ( m ) {
			return m[1];
		}
	}

	public loadBundlePage() {
		const packageFile = path.join(this.bundlePath, 'package.json');
		if ( !fs.existsSync(packageFile) ) {
			this.$logger.err('bundle', 'Could not find file.', packageFile);
			return;
		}
		this.package = JSON.parse(
			fs.readFileSync(
				packageFile,
				'utf8',
			),
		);

		if ( this.package['page-version'] > 1 ) {
			if ( this.package.pageType === 'http' ) {
				this.pageSrc = this.package.page;
			} else {
				this.pageSrc = `yulx://${this.package.name}/${this.package.page}`;
			}
			this.version = this.package['page-version'];
			if ( this.package.debug ) {
				this.$nextTick(() => {
					const webview = this.$refs['webview'] as any;
					webview.addEventListener('did-finish-load', () => {
						if ( webview.isDevToolsOpened() ) {
							return;
						}
						webview.openDevTools();
					});
				});

			}
			return;
		}

		const pageFile = path.join(this.bundlePath, this.package.page as string);
		if ( !fs.existsSync(pageFile) ) {
			this.$logger.err('bundle', 'Can not find bundle page file.', pageFile);
			return;
		}

		const page = fs.readFileSync(pageFile, 'utf8');
		const template = this.getInnerString(page, 'template');
		const script = this.getInnerString(page, 'script')
			.replace(/export\s+default\s+{/, 'module = {');

		const vmScript = new vm.Script(script);
		const context: any = {};
		context.module = {};
		context.window = window;
		context.__dirname = this.bundlePath;
		context.console = console;
		vmScript.runInNewContext(context);

		const component: any = {
			template,
			...context.module,
			mixins: [Mixins(GlobalMixins)],
		};
		if ( !component.methods ) {
			component.methods = {};
		}
		component.methods.reload = () => {
			Scripts.reload(this.package.name);
		};
		component.components = { ...VuetifyComponents };
		this.page = component;
	}

}
</script>
