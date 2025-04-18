<template>
	<div class="mt-3">
		<v-hover>
			<template v-slot:default="{ hover }">
				<v-card
					:elevation="1"
					@click="detail = true;"
					min-height="120px"
					max-height="120px"
					class="pa-0">
					<v-card-text class="py-0">
						<v-row align="center" class="ma-0" style="height: 120px;">
							<v-col cols="5" align="">
								<h3>
									<v-chip
										v-if="pkg.is_official"
										color="blue lighten-2"
										small
										outlined
										class="text-caption py-0 mr-1">
										Official
									</v-chip>
								
									{{ name }}
									<span class="text-caption mb-1 ml-auto text--secondary">^{{ pkg.version }}</span>
								</h3>
								<p class="ma-0 mt-2">{{ description }}</p>
							</v-col>
							<v-col cols="2">
								{{ pkg.owner_name }}
							</v-col>
							<v-col cols="5" align="right">
								<div v-if="isLocal">
									<v-btn
										v-if="pkg.page && isPackageUsing"
										:loading="loading"
										:disabled="loading"
										depressed
										class="mr-3"
										@click.stop="$assign(`/bundle/${pkg.name}/`)"
										color="primary">
										{{ $t('bundle.store.move-bundle-page') }}
									</v-btn>
									<v-btn
										:loading="loading"
										:disabled="loading"
										depressed outlined
										@click.stop="localUninstall"
										color="red">
										{{ $t('bundle.store.remove-bundle') }}
									</v-btn>
								</div>
								<div v-else>
									<v-btn
										v-if="pkg.page && isPackageUsing"
										:loading="loading"
										:disabled="loading"
										depressed
										class="mr-3"
										@click.stop="$assign(`/bundle/${pkg.name}/`)"
										color="primary">
										{{ $t('bundle.store.move-bundle-page') }}
									</v-btn>
									<v-btn
										v-if="canUpdate"
										:loading="loading"
										:disabled="loading"
										depressed outlined
										color="green"
										class="mr-3"
										@click.stop="install">
										{{ $t('update') }}
									</v-btn>
									<v-btn
										v-if=!isPackageUsing
										:loading="loading"
										:disabled="loading"
										depressed outlined
										@click.stop="install">
										{{ $t('bundle.install') }}
									</v-btn>
									<v-btn
										v-else
										:loading="loading"
										:disabled="loading"
										depressed outlined
										@click.stop="uninstall"
										color="red">
										{{ $t('bundle.store.remove-bundle') }}
									</v-btn>
								</div>
							</v-col>
						</v-row>
					</v-card-text>
				</v-card>
			</template>
		</v-hover>
		<v-dialog v-model="detail" flat fullscreen persistent>
			<Detail :pkg="pkg" @close="detail = false;"/>
		</v-dialog>
	</div>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import BundleMixins from '../bundle-mixin';
import { BundlePackage } from '@/interface/bundle';
import Detail from './Detail.vue';
import path from 'path';
const fs = window.require('fs');
const { ipcRenderer } = window.require('electron');

@Component({
	components: {
		Detail,
	},
})
export default class BundleItem extends Mixins(BundleMixins) {

	@Prop(Object) public pkg!: BundlePackage;
	@Prop(Boolean) public isLocal!: Boolean;

	public isPackageUsing = false;
	public loading = false;
	public detail: boolean = false;
	public canUpdate = false;

	public created() {
		this.updatePackageUsing();
		this.updateCanUpdate();
	}

	public async install() {
		await this.$swal({
			icon: 'info',
			html: '<h3>번들 관리는 번들 매니저에서 진행해주세요.</h3>',
			confirmButtonText: '확인',
		});

		await ipcRenderer.invoke('open-bundle-manager');
	}

	public async localUninstall() {
		await this.$swal({
			icon: 'info',
			html: '<h3>번들 관리는 번들 매니저에서 진행해주세요.</h3>',
			confirmButtonText: '확인',
		});
		
		await ipcRenderer.invoke('open-bundle-manager');
	}

	public async uninstall() {
		await this.$swal({
			icon: 'info',
			html: '<h3>번들 관리는 번들 매니저에서 진행해주세요.</h3>',
			confirmButtonText: '확인',
		});

		await ipcRenderer.invoke('open-bundle-manager');
	}

	private updatePackageUsing() {
		this.isPackageUsing = fs.existsSync(this.getBundlePath(this.pkg));
	}

	private updateCanUpdate() {
		if ( this.isPackageUsing ) {
			const localPackage = JSON.parse(
				fs.readFileSync(
					path.join(this.getBundlePath(this.pkg), 'package.json'),
					'utf8'
				)
			);
			this.canUpdate = localPackage.version !== this.pkg.version;
		}
	}

}
</script>

