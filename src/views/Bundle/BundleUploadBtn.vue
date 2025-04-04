<template>
	<div>
		<v-btn
			color="grey darken-3"
			:dark="!uploadFlag"
			:disabled="uploadFlag"
			:loading="uploadFlag"
			@click="uploadBundle">
			{{ $t('bundle.store.upload') }}
		</v-btn>	
	</div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import BundleMixins from './bundle-mixin';
import path from 'path';
import { AxiosError } from 'axios';
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');

@Component
export default class BundleUploadButton extends Mixins(BundleMixins) {

	public uploadFlag = false;

	public async checkFile(src: string) {
		if ( !fs.existsSync(src) ) {
			this.$logger.err('bundle', 'Could not find index.js from bundle', src);
			await this.$swal({
				icon: 'error',
				title: this.$t('error'),
				html: this.$t('errors.file-not-found', path.basename(src)),
			});
			return false;
		}
		return true;
	}

	public async uploadBundle() {
		if ( this.uploadFlag ) {
			return;
		}
		this.uploadFlag = true;
		const result = await ipcRenderer.invoke('open-dialog', {
			properties: ['openDirectory'],
			title: 'Upload Bundle',
			defaultPath: this.$path('userData', 'bundles'),
		});
		if ( result.canceled ) {
			this.$logger.err('bundle', 'Canceled folder select for bundle upload.');
			this.uploadFlag = false;
			return;
		}

		const target = result.filePaths[0];

		const packageFile = path.join(target, 'package.json');
		if ( !await this.checkFile(packageFile) ) {
			this.uploadFlag = false;
			return;
		}

		// Caching package.json file content when use window.require fucntion.
		// We should not have cache that.
		const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
		this.$logger.debug('bundle', 'Package content', packageFile, pkg);

		if ( !await this.checkPackageProperty(pkg, 'name') ) {
			this.uploadFlag = false;
			return;
		}

		if ( !await this.checkPackageProperty(pkg, 'version') ) {
			this.uploadFlag = false;
			return;
		}

		if ( !pkg['page-version'] || pkg['page-version'] < 2 ) {
			this.uploadFlag = false;
			await this.$swal({
				icon: 'error',
				title: this.$t('error'),
				html: this.$t('bundle.store.error.page-version'),
			});
			return;
		}

		if ( !pkg.description ) {
			pkg.description = 'No description';
		}

		const zipFile = target + '.zip';
		if ( fs.existsSync(zipFile) ) {
			this.$logger.debug('bundle', 'Exists zip file. remove it', zipFile);
			fs.unlinkSync(zipFile);
		}

		ipcRenderer.sendSync('package:create', target, zipFile);

		if ( !fs.existsSync(zipFile) ) {
			this.$logger.err('bundle', 'Create zip file error.', zipFile);
			await this.$swal({
				icon: 'error',
				title: this.$t('error'),
				html: this.$t('bundle.store.error.create-error'),
			});
			this.uploadFlag = false;
			return;
		}

		this.$logger.success('bundle', 'Create zip file success.', zipFile);

		try {
			const formData = new FormData();
			formData.append('name', pkg.name);
			formData.append('version', pkg.version);
			formData.append('file', new Blob([fs.readFileSync(zipFile)], { type: 'application/zip' }), 'bundle.zip');

			const res = await this.$api.req('PUT', '/bundle/', {
					data: formData,
					headers: {
					'Content-Type': 'multipart/form-data'
				}
			});
			fs.unlinkSync(zipFile);
		} catch (err: any) {
			if ( err.isAxiosError ) {
				this.$logger.err('bundle', 'Package upload error', err);
				await this.$swal({
					icon: 'error',
					title: this.$t('error'),
					html: this.$t('bundle.store.error.' + err.response.data.msg),
				});
			}
			fs.unlinkSync(zipFile);
			this.uploadFlag = false;
			return;
		}


		this.$logger.success('bundle', 'Bundle upload done.');

		this.$swal({
			icon: 'success',
			title: this.$t('success'),
			html: this.$t('bundle.store.upload-success'),
		});
		this.uploadFlag = false;
	}
}
</script>
