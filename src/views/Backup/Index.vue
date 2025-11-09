<!--
 * Index.vue
 * Created on Tue Oct 14 2025
 *
 * Copyright (c) Raravel. Licensed under the MIT License.
-->
<template>
	<v-main class="custom indigo lighten-5" style="min-height: calc(100vh - var(--titlebar-height)); overflow-y: auto; max-height: calc(100vh - var(--titlebar-height));">
		<v-container fluid class="pa-6">
			<!-- 헤더 -->
			<v-row class="mb-4">
				<v-col cols="12">
					<h1 class="text-h4 font-weight-bold">백업 및 복원</h1>
					<p class="text-subtitle-1 grey--text text--darken-1">SOPIA의 설정과 데이터를 안전하게 백업하고 복원할 수 있습니다.</p>
					<p class="text-subtitle-1 grey--text text--darken-1">일부 공식 번들이 복원되지 않을 수 있습니다. (EBUSY 어쩌구 에러 발생시.) 이건 구조적 결함때문에 발생하는 문제인데, 일단 다른 기능의 백업 / 복원이 시급한 것 같아 이 기능을 급하게 출시했습니다.</p>
					<p class="text-subtitle-1 red--text text--darken-1">백업 기능은 100% 데이터를 보장하지 않습니다. 다만, 안 하는 것보다는 낫습니다. 백업하지 않고 유실된 데이터에 대한 책임은 문의받지 않습니다.</p>
				</v-col>
			</v-row>

			<!-- 디스크 정보 카드 -->
			<v-row class="mb-4">
				<v-col cols="12" md="6">
					<v-card elevation="3" class="rounded-lg">
						<v-card-title class="pb-2">
							<v-icon left color="primary">mdi-harddisk</v-icon>
							C 드라이브 용량
						</v-card-title>
						<v-card-text>
							<div v-if="diskInfo.loading" class="text-center py-4">
								<v-progress-circular indeterminate color="primary"></v-progress-circular>
							</div>
							<div v-else>
								<v-progress-linear
									:value="diskUsagePercent"
									height="25"
									rounded
									color="primary"
									class="mb-2"
								>
									<template v-slot:default="{ value }">
										<strong class="white--text">{{ Math.ceil(value) }}%</strong>
									</template>
								</v-progress-linear>
								<div class="d-flex justify-space-between text-caption grey--text">
									<span>사용: {{ formatBytes(diskInfo.used) }}</span>
									<span>전체: {{ formatBytes(diskInfo.total) }}</span>
								</div>
								<div class="mt-1 text-caption grey--text">
									<span>사용 가능: {{ formatBytes(diskInfo.free) }}</span>
								</div>
							</div>
						</v-card-text>
					</v-card>
				</v-col>

				<v-col cols="12" md="6">
					<v-card elevation="3" class="rounded-lg">
						<v-card-title class="pb-2">
							<v-icon left color="secondary">mdi-folder</v-icon>
							SOPIA 폴더 용량
						</v-card-title>
						<v-card-text>
							<div v-if="folderSizes.loading" class="text-center py-4">
								<v-progress-circular indeterminate color="secondary"></v-progress-circular>
							</div>
							<div v-else>
								<div class="mb-2">
									<div class="d-flex justify-space-between mb-1">
										<span class="font-weight-medium">전체 용량</span>
										<span class="font-weight-bold">{{ formatBytes(folderSizes.total) }}</span>
									</div>
									<div class="text-caption grey--text">
										C 드라이브의 {{ sopiaFolderPercent }}%
									</div>
								</div>
								<v-divider class="my-2"></v-divider>
								<div class="folder-list" style="max-height: 150px; overflow-y: auto;">
									<div
										v-for="[name, size] in sortedFolderItems"
										:key="name"
										class="d-flex justify-space-between text-caption py-1"
									>
										<span>{{ name }}</span>
										<span class="grey--text">{{ formatBytes(size) }}</span>
									</div>
								</div>
							</div>
						</v-card-text>
					</v-card>
				</v-col>
			</v-row>

			<!-- 액션 버튼 -->
			<v-row class="mb-4">
				<v-col cols="12">
					<v-card elevation="3" class="rounded-lg">
						<v-card-text class="d-flex justify-space-between align-center">
							<div>
								<div class="text-h6 font-weight-bold mb-1">백업 관리</div>
								<div class="text-caption grey--text">백업을 생성하거나 기존 백업을 관리할 수 있습니다.</div>
							</div>
							<div class="d-flex gap-2">
								<v-btn
									color="primary"
									large
									@click="openCreateBackupDialog"
									class="rounded-lg"
								>
									<v-icon left>mdi-plus-circle</v-icon>
									새 백업 생성
								</v-btn>
								<v-btn
									color="secondary"
									large
									outlined
									@click="openBackupFolder"
									class="rounded-lg"
								>
									<v-icon left>mdi-folder-open</v-icon>
									백업 폴더 열기
								</v-btn>
							</div>
						</v-card-text>
					</v-card>
				</v-col>
			</v-row>

			<!-- 백업 목록 -->
			<v-row>
				<v-col cols="12">
					<v-card elevation="3" class="rounded-lg">
						<v-card-title class="pb-2">
							<v-icon left color="primary">mdi-archive</v-icon>
							백업 목록
							<v-spacer></v-spacer>
							<v-btn icon @click="loadBackupList">
								<v-icon>mdi-refresh</v-icon>
							</v-btn>
						</v-card-title>
						<v-card-text>
							<div v-if="backups.loading" class="text-center py-8">
								<v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
							</div>
							<div v-else-if="backups.list.length === 0" class="text-center py-8">
								<v-icon size="64" color="grey lighten-1">mdi-archive-outline</v-icon>
								<p class="text-h6 grey--text mt-4">백업 파일이 없습니다.</p>
								<p class="text-caption grey--text">새 백업을 생성하여 시작하세요.</p>
							</div>
							<v-list v-else two-line class="transparent">
								<v-list-item
									v-for="(backup, index) in backups.list"
									:key="index"
									class="mb-2 rounded-lg"
									style="background: rgba(255,255,255,0.5);"
								>
									<v-list-item-avatar color="primary" class="rounded">
										<v-icon dark>mdi-archive</v-icon>
									</v-list-item-avatar>
									<v-list-item-content>
										<v-list-item-title class="font-weight-bold">
											{{ backup.metadata.name || backup.fileName }}
										</v-list-item-title>
										<v-list-item-subtitle>
											{{ backup.metadata.description || '설명 없음' }}
										</v-list-item-subtitle>
										<div class="d-flex gap-3 mt-1">
											<v-chip x-small outlined>
												<v-icon x-small left>mdi-calendar</v-icon>
												{{ formatDate(backup.createdAt) }}
											</v-chip>
											<v-chip x-small outlined>
												<v-icon x-small left>mdi-file</v-icon>
												{{ formatBytes(backup.size) }}
											</v-chip>
											<v-chip x-small outlined>
												<v-icon x-small left>mdi-package-variant</v-icon>
												{{ getBackupItemsCount(backup.metadata) }}개 항목
											</v-chip>
										</div>
									</v-list-item-content>
									<v-list-item-action>
										<div class="d-flex gap-1">
											<v-btn
												icon
												small
												color="info"
												@click="showBackupDetails(backup)"
											>
												<v-icon>mdi-information-outline</v-icon>
											</v-btn>
											<v-btn
												icon
												small
												color="primary"
												@click="openRestoreDialog(backup)"
											>
												<v-icon>mdi-restore</v-icon>
											</v-btn>
											<v-btn
												icon
												small
												color="error"
												@click="confirmDeleteBackup(backup)"
											>
												<v-icon>mdi-delete</v-icon>
											</v-btn>
										</div>
									</v-list-item-action>
								</v-list-item>
							</v-list>
						</v-card-text>
					</v-card>
				</v-col>
			</v-row>

			<!-- 백업 생성 다이얼로그 -->
			<v-dialog v-model="createDialog.show" max-width="800" persistent>
				<v-card>
					<v-card-title class="primary white--text">
						<v-icon left dark>mdi-plus-circle</v-icon>
						새 백업 생성
					</v-card-title>
					<v-card-text class="pt-4">
						<v-text-field
							v-model="createDialog.name"
							label="백업 이름 *"
							outlined
							dense
							:rules="[v => !!v || '백업 이름은 필수입니다.']"
							hint="예: 2025년 10월 백업"
						></v-text-field>
						<v-textarea
							v-model="createDialog.description"
							label="설명 (선택사항)"
							outlined
							dense
							rows="2"
							hint="백업에 대한 간단한 설명을 입력하세요."
						></v-textarea>

						<v-divider class="my-4"></v-divider>

						<h3 class="text-h6 mb-3">백업할 항목 선택</h3>

						<!-- 번들 리스트 -->
						<v-card outlined class="mb-3">
							<v-card-text>
								<v-checkbox
									v-model="createDialog.selectAllBundles"
									label="번들 리스트 전체 선택"
									@change="toggleAllBundles"
									hide-details
									class="mt-0"
								></v-checkbox>
								<v-expand-transition>
									<div v-if="bundles.list.length > 0" class="mt-2 ml-8">
										<v-checkbox
											v-for="bundle in bundles.list"
											:key="bundle.id"
											v-model="createDialog.selectedBundles"
											:value="bundle.id"
											:label="`${bundle.name} (v${bundle.version})`"
											:hide-details="true"
											:dense="true"
											class="my-1"
										></v-checkbox>
									</div>
									<div v-else class="ml-8 text-caption grey--text">
										설치된 번들이 없습니다.
									</div>
								</v-expand-transition>
							</v-card-text>
						</v-card>

						<!-- 기타 항목 -->
						<v-card outlined>
							<v-card-text>
								<v-checkbox
									v-model="createDialog.items.sopiaCode"
									label="소피아 코드 (sopia 폴더)"
									hide-details
									dense
								></v-checkbox>
								<v-checkbox
									v-model="createDialog.items.history"
									label="방송 기록 (historydb 폴더)"
									hide-details
									dense
								></v-checkbox>
								<v-checkbox
									v-model="createDialog.items.appSettings"
									label="앱 설정 (app.cfg)"
									hide-details
									dense
								></v-checkbox>
								<v-checkbox
									v-model="createDialog.items.localStorage"
									label="Local Storage"
									hide-details
									dense
								></v-checkbox>
								<v-checkbox
									v-model="createDialog.items.cmdSettings"
									label="명령어 설정 (cmd.cfg)"
									hide-details
									dense
								></v-checkbox>
							</v-card-text>
						</v-card>

						<!-- 진행률 표시 -->
						<v-expand-transition>
							<div v-if="createDialog.progress.show" class="mt-4">
								<v-progress-linear
									:value="createDialog.progress.value"
									height="25"
									rounded
									color="primary"
									class="mb-2"
								>
									<template v-slot:default="{ value }">
										<strong>{{ Math.ceil(value) }}%</strong>
									</template>
								</v-progress-linear>
								<p class="text-center text-caption">{{ createDialog.progress.message }}</p>
							</div>
						</v-expand-transition>
					</v-card-text>
					<v-card-actions>
						<v-spacer></v-spacer>
						<v-btn text @click="closeCreateDialog" :disabled="createDialog.progress.show">취소</v-btn>
						<v-btn
							color="primary"
							@click="createBackup"
							:loading="createDialog.progress.show"
							:disabled="!canCreateBackup"
						>
							백업 생성
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>

			<!-- 백업 상세 정보 다이얼로그 -->
			<v-dialog v-model="detailsDialog.show" max-width="700">
				<v-card>
					<v-card-title class="info white--text">
						<v-icon left dark>mdi-information</v-icon>
						백업 상세 정보
					</v-card-title>
					<v-card-text class="pt-4">
						<div v-if="detailsDialog.backup">
							<h3 class="text-h6 mb-2">{{ detailsDialog.backup.metadata.name }}</h3>
							<p class="text-body-2 grey--text">{{ detailsDialog.backup.metadata.description }}</p>

							<v-divider class="my-3"></v-divider>

							<div class="mb-3">
								<div class="d-flex justify-space-between mb-1">
									<span class="font-weight-medium">생성일:</span>
									<span>{{ formatDate(detailsDialog.backup.createdAt) }}</span>
								</div>
								<div class="d-flex justify-space-between mb-1">
									<span class="font-weight-medium">파일 크기:</span>
									<span>{{ formatBytes(detailsDialog.backup.size) }}</span>
								</div>
								<div class="d-flex justify-space-between mb-1">
									<span class="font-weight-medium">버전:</span>
									<span>{{ detailsDialog.backup.metadata.version }}</span>
								</div>
							</div>

							<v-divider class="my-3"></v-divider>

							<h4 class="text-subtitle-1 font-weight-bold mb-2">포함된 항목</h4>
							<v-chip-group column>
								<v-chip
									v-if="detailsDialog.backup.metadata.items.bundles"
									small
									outlined
									color="primary"
								>
									<v-icon small left>mdi-package-variant</v-icon>
									번들 ({{ detailsDialog.backup.metadata.items.bundles.length }}개)
								</v-chip>
								<v-chip
									v-if="detailsDialog.backup.metadata.items.sopiaCode"
									small
									outlined
									color="secondary"
								>
									<v-icon small left>mdi-code-braces</v-icon>
									소피아 코드
								</v-chip>
								<v-chip
									v-if="detailsDialog.backup.metadata.items.history"
									small
									outlined
									color="accent"
								>
									<v-icon small left>mdi-history</v-icon>
									방송 기록
								</v-chip>
								<v-chip
									v-if="detailsDialog.backup.metadata.items.appSettings"
									small
									outlined
									color="success"
								>
									<v-icon small left>mdi-cog</v-icon>
									앱 설정
								</v-chip>
								<v-chip
									v-if="detailsDialog.backup.metadata.items.localStorage"
									small
									outlined
									color="warning"
								>
									<v-icon small left>mdi-database</v-icon>
									Local Storage
								</v-chip>
								<v-chip
									v-if="detailsDialog.backup.metadata.items.cmdSettings"
									small
									outlined
									color="error"
								>
									<v-icon small left>mdi-console</v-icon>
									명령어 설정
								</v-chip>
							</v-chip-group>

							<v-divider class="my-3"></v-divider>

							<h4 class="text-subtitle-1 font-weight-bold mb-2">파일 목록</h4>
							<div v-if="detailsDialog.fileList.loading" class="text-center py-4">
								<v-progress-circular indeterminate color="primary"></v-progress-circular>
							</div>
							<v-list v-else dense class="transparent" style="max-height: 300px; overflow-y: auto;">
								<v-list-item v-for="(file, index) in detailsDialog.fileList.files" :key="index">
									<v-list-item-icon>
										<v-icon small>mdi-file</v-icon>
									</v-list-item-icon>
									<v-list-item-content>
										<v-list-item-title class="text-caption">{{ file.name }}</v-list-item-title>
									</v-list-item-content>
									<v-list-item-action>
										<span class="text-caption grey--text">{{ formatBytes(file.size) }}</span>
									</v-list-item-action>
								</v-list-item>
							</v-list>
						</div>
					</v-card-text>
					<v-card-actions>
						<v-spacer></v-spacer>
						<v-btn text @click="detailsDialog.show = false">닫기</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>

			<!-- 복원 다이얼로그 -->
			<v-dialog v-model="restoreDialog.show" max-width="800" persistent>
				<v-card>
					<v-card-title class="primary white--text">
						<v-icon left dark>mdi-restore</v-icon>
						백업 복원
					</v-card-title>
					<v-card-text class="pt-4">
						<div v-if="restoreDialog.backup">
							<v-alert type="warning" outlined dense class="mb-4">
								<strong>주의:</strong> 복원하면 기존 데이터를 덮어씁니다. 신중하게 선택하세요.
							</v-alert>

							<h3 class="text-h6 mb-3">{{ restoreDialog.backup.metadata.name }}</h3>
							<p class="text-body-2 grey--text mb-4">{{ restoreDialog.backup.metadata.description }}</p>

							<h4 class="text-subtitle-1 font-weight-bold mb-3">복원할 항목 선택</h4>

							<!-- 번들 리스트 -->
							<v-card v-if="restoreDialog.backup.metadata.items.bundles && restoreDialog.backup.metadata.items.bundles.length > 0" outlined class="mb-3">
								<v-card-text>
									<div class="text-subtitle-2 font-weight-bold mb-2">번들 ({{ restoreDialog.backup.metadata.items.bundles.length }}개)</div>
									<v-checkbox
										v-for="bundleId in restoreDialog.backup.metadata.items.bundles"
										:key="bundleId"
										v-model="restoreDialog.selectedBundles"
										:value="bundleId"
										:label="getBundleDisplayName(bundleId)"
										:hide-details="true"
										:dense="true"
										class="my-1"
									></v-checkbox>
								</v-card-text>
							</v-card>

							<!-- 기타 항목 -->
							<v-card outlined>
								<v-card-text>
									<v-checkbox
										v-if="restoreDialog.backup.metadata.items.sopiaCode"
										v-model="restoreDialog.selectedItems.sopiaCode"
										label="소피아 코드"
										hide-details
										dense
									></v-checkbox>
									<v-checkbox
										v-if="restoreDialog.backup.metadata.items.history"
										v-model="restoreDialog.selectedItems.history"
										label="방송 기록"
										hide-details
										dense
									></v-checkbox>
									<v-checkbox
										v-if="restoreDialog.backup.metadata.items.appSettings"
										v-model="restoreDialog.selectedItems.appSettings"
										label="앱 설정"
										hide-details
										dense
									></v-checkbox>
									<v-checkbox
										v-if="restoreDialog.backup.metadata.items.localStorage"
										v-model="restoreDialog.selectedItems.localStorage"
										label="Local Storage"
										hide-details
										dense
									></v-checkbox>
									<v-checkbox
										v-if="restoreDialog.backup.metadata.items.cmdSettings"
										v-model="restoreDialog.selectedItems.cmdSettings"
										label="명령어 설정"
										hide-details
										dense
									></v-checkbox>
								</v-card-text>
							</v-card>
						</div>
					</v-card-text>
					<v-card-actions>
						<v-spacer></v-spacer>
						<v-btn text @click="closeRestoreDialog">취소</v-btn>
						<v-btn
							color="primary"
							@click="checkConflictsAndRestore"
							:disabled="!hasSelectedRestoreItems"
							:loading="restoreDialog.loading"
						>
							복원
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>

			<!-- 충돌 처리 다이얼로그 -->
			<v-dialog v-model="conflictDialog.show" max-width="700" persistent>
				<v-card>
					<v-card-title class="warning white--text">
						<v-icon left dark>mdi-alert</v-icon>
						데이터 충돌 확인
					</v-card-title>
					<v-card-text class="pt-4">
						<v-alert type="warning" outlined dense class="mb-4">
							다음 항목들이 이미 존재합니다. 각 항목을 어떻게 처리할지 선택하세요.
						</v-alert>

						<v-list dense>
							<v-list-item v-for="(conflict, index) in conflictDialog.conflicts" :key="index">
								<v-list-item-content>
									<v-list-item-title>{{ conflict.name }}</v-list-item-title>
									<v-list-item-subtitle class="text-caption">{{ conflict.message }}</v-list-item-subtitle>
								</v-list-item-content>
								<v-list-item-action>
									<v-select
										v-model="conflictDialog.resolutions[conflict.id]"
										:items="[
											{ text: '덮어쓰기', value: true },
											{ text: '건너뛰기', value: false }
										]"
										dense
										outlined
										hide-details
										style="width: 150px;"
									></v-select>
								</v-list-item-action>
							</v-list-item>
						</v-list>
					</v-card-text>
					<v-card-actions>
						<v-spacer></v-spacer>
						<v-btn text @click="conflictDialog.show = false">취소</v-btn>
						<v-btn color="primary" @click="executeRestore" :loading="restoreDialog.loading" :disabled="restoreDialog.loading">복원 실행</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>
		</v-container>
	</v-main>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
const { ipcRenderer } = window.require('electron');

@Component
export default class Backup extends Mixins(GlobalMixins) {
	// 디스크 정보
	diskInfo = {
		loading: true,
		total: 0,
		used: 0,
		free: 0,
	};

	// 폴더 용량
	folderSizes = {
		loading: true,
		total: 0,
		items: {} as Record<string, number>,
		path: '',
	};

	// 번들 리스트
	bundles = {
		loading: true,
		list: [] as any[],
	};

	// 백업 목록
	backups = {
		loading: true,
		list: [] as any[],
	};

	// 백업 생성 다이얼로그
	createDialog = {
		show: false,
		name: '',
		description: '',
		selectAllBundles: false,
		selectedBundles: [] as string[],
		items: {
			sopiaCode: false,
			history: false,
			appSettings: false,
			localStorage: false,
			cmdSettings: false,
		},
		progress: {
			show: false,
			value: 0,
			message: '',
		},
	};

	// 백업 상세 다이얼로그
	detailsDialog = {
		show: false,
		backup: null as any,
		fileList: {
			loading: false,
			files: [] as any[],
		},
	};

	// 복원 다이얼로그
	restoreDialog = {
		show: false,
		backup: null as any,
		selectedBundles: [] as string[],
		selectedItems: {
			sopiaCode: false,
			history: false,
			appSettings: false,
			localStorage: false,
			cmdSettings: false,
		},
		loading: false,
	};

	// 충돌 다이얼로그
	conflictDialog = {
		show: false,
		conflicts: [] as any[],
		resolutions: {} as Record<string, boolean>,
	};

	get diskUsagePercent() {
		if (this.diskInfo.total === 0) return 0;
		return (this.diskInfo.used / this.diskInfo.total) * 100;
	}

	get sopiaFolderPercent() {
		if (this.diskInfo.total === 0) return '0.00';
		return ((this.folderSizes.total / this.diskInfo.total) * 100).toFixed(2);
	}

	get canCreateBackup() {
		if (!this.createDialog.name.trim()) return false;
		const hasItems = this.createDialog.selectedBundles.length > 0 ||
			Object.values(this.createDialog.items).some(v => v);
		return hasItems;
	}

	get hasSelectedRestoreItems() {
		return this.restoreDialog.selectedBundles.length > 0 ||
			Object.values(this.restoreDialog.selectedItems).some(v => v);
	}

	get sortedFolderItems() {
		// 폴더 용량을 배열로 변환하고 크기순으로 내림차순 정렬
		return Object.entries(this.folderSizes.items)
			.sort((a, b) => b[1] - a[1]);
	}

	async mounted() {
		await this.loadDiskInfo();
		await this.loadFolderSizes();
		await this.loadBundles();
		await this.loadBackupList();


		// 백업 진행률 이벤트 리스너
		ipcRenderer.on('backup:progress', (evt: any, progress: number, message: string) => {
			this.createDialog.progress.value = progress;
			this.createDialog.progress.message = message;
		});
	}

	beforeDestroy() {
		ipcRenderer.removeAllListeners('backup:progress');
	}

	// 디스크 정보 로드
	async loadDiskInfo() {
		this.diskInfo.loading = true;
		const result = await ipcRenderer.invoke('backup:get-disk-info', 'C:');
		if (result.success) {
			this.diskInfo.total = result.total;
			this.diskInfo.used = result.used;
			this.diskInfo.free = result.free;
		}
		this.diskInfo.loading = false;
	}

	// 폴더 용량 로드
	async loadFolderSizes() {
		this.folderSizes.loading = true;
		const result = await ipcRenderer.invoke('backup:get-folder-sizes');
		if (result.success) {
			this.folderSizes.total = result.total;
			this.folderSizes.items = result.items;
			this.folderSizes.path = result.path;
		}
		this.folderSizes.loading = false;
	}

	// 번들 리스트 로드
	async loadBundles() {
		this.bundles.loading = true;
		const result = await ipcRenderer.invoke('backup:get-bundles');
		if (result.success) {
			this.bundles.list = result.bundles;
		}
		this.bundles.loading = false;
	}

	// 백업 목록 로드
	async loadBackupList() {
		this.backups.loading = true;
		const result = await ipcRenderer.invoke('backup:list');
		if (result.success) {
			this.backups.list = result.backups;
		}
		this.backups.loading = false;
	}

	// 백업 생성 다이얼로그 열기
	openCreateBackupDialog() {
		this.createDialog.show = true;
		this.createDialog.name = '';
		this.createDialog.description = '';
		this.createDialog.selectAllBundles = false;
		this.createDialog.selectedBundles = [];
		this.createDialog.items = {
			sopiaCode: false,
			history: false,
			appSettings: false,
			localStorage: false,
			cmdSettings: false,
		};
		this.createDialog.progress = {
			show: false,
			value: 0,
			message: '',
		};
	}

	closeCreateDialog() {
		this.createDialog.show = false;
	}

	// 전체 번들 선택 토글
	toggleAllBundles() {
		if (this.createDialog.selectAllBundles) {
			this.createDialog.selectedBundles = this.bundles.list.map(b => b.id);
		} else {
			this.createDialog.selectedBundles = [];
		}
	}

	// 백업 생성
	async createBackup() {
		this.createDialog.progress.show = true;
		this.createDialog.progress.value = 0;
		this.createDialog.progress.message = '백업 생성 중...';

		const result = await ipcRenderer.invoke('backup:create', {
			name: this.createDialog.name,
			description: this.createDialog.description,
			items: {
				bundles: this.createDialog.selectedBundles.length > 0 ? this.createDialog.selectedBundles : undefined,
				sopiaCode: this.createDialog.items.sopiaCode,
				history: this.createDialog.items.history,
				appSettings: this.createDialog.items.appSettings,
				localStorage: this.createDialog.items.localStorage,
				cmdSettings: this.createDialog.items.cmdSettings,
			},
		});

		this.createDialog.progress.show = false;

		if (result.success) {
			this.$swal({
				icon: 'success',
				title: '백업 생성 완료',
				text: '백업이 성공적으로 생성되었습니다.',
				timer: 2000,
			});
			this.closeCreateDialog();
			await this.loadBackupList();
		} else {
			this.$swal({
				icon: 'error',
				title: '백업 생성 실패',
				text: result.error || '알 수 없는 오류가 발생했습니다.',
			});
		}
	}

	// 백업 상세 정보 표시
	async showBackupDetails(backup: any) {
		this.detailsDialog.backup = backup;
		this.detailsDialog.show = true;
		this.detailsDialog.fileList.loading = true;
		this.detailsDialog.fileList.files = [];

		const result = await ipcRenderer.invoke('backup:get-file-list', backup.filePath);
		if (result.success) {
			this.detailsDialog.fileList.files = result.files;
		}
		this.detailsDialog.fileList.loading = false;
	}

	// 복원 다이얼로그 열기
	openRestoreDialog(backup: any) {
		this.restoreDialog.backup = backup;
		this.restoreDialog.show = true;
		// 기본적으로 모든 번들 선택
		this.restoreDialog.selectedBundles = backup.metadata.items.bundles ? [...backup.metadata.items.bundles] : [];
		this.restoreDialog.selectedItems = {
			sopiaCode: !!backup.metadata.items.sopiaCode,
			history: !!backup.metadata.items.history,
			appSettings: !!backup.metadata.items.appSettings,
			localStorage: !!backup.metadata.items.localStorage,
			cmdSettings: !!backup.metadata.items.cmdSettings,
		};
	}

	closeRestoreDialog() {
		this.restoreDialog.show = false;
	}

	// 번들 표시 이름 가져오기
	getBundleDisplayName(bundleId: string) {
		// 현재 설치된 번들 리스트에서 찾기
		const bundle = this.bundles.list.find(b => b.id === bundleId);
		if (bundle) {
			return `${bundle.name} (v${bundle.version})`;
		}
		// 찾지 못하면 bundleId만 표시
		return bundleId;
	}

	// 충돌 확인 및 복원
	async checkConflictsAndRestore() {
		const result = await ipcRenderer.invoke(
			'backup:check-conflicts',
			this.restoreDialog.backup.filePath,
			{
				bundles: this.restoreDialog.selectedBundles, // 선택된 번들 배열 전달
				...this.restoreDialog.selectedItems
			}
		);

		if (result.success) {
			if (result.conflicts.length > 0) {
				// 충돌이 있으면 충돌 다이얼로그 표시
				this.conflictDialog.conflicts = result.conflicts;
				this.conflictDialog.resolutions = {};
				result.conflicts.forEach((conflict: any) => {
					this.conflictDialog.resolutions[conflict.id] = true; // 기본값: 덮어쓰기
				});
				this.conflictDialog.show = true;
			} else {
				// 충돌이 없으면 바로 복원
				await this.executeRestore();
			}
		}
	}

	// 복원 실행
	async executeRestore() {
		this.restoreDialog.loading = true;
		const overwrite: Record<string, boolean> = {};

		// 번들 충돌 처리 - 선택된 번들만
		if (this.restoreDialog.selectedBundles.length > 0) {
			this.restoreDialog.selectedBundles.forEach((bundleId: string) => {
				overwrite[`bundle_${bundleId}`] = this.conflictDialog.resolutions[bundleId] !== false;
			});
		}

		// 기타 항목 충돌 처리
		['sopiaCode', 'history', 'appSettings', 'localStorage', 'cmdSettings'].forEach(key => {
			if (this.conflictDialog.resolutions[key] !== undefined) {
				overwrite[key] = this.conflictDialog.resolutions[key];
			}
		});

		window.clearScript();
		await new Promise(resolve => setTimeout(resolve, 1000));
		// 번들에서 관리중인거 다 해제
		const result = await ipcRenderer.invoke('backup:restore', {
			backupFilePath: this.restoreDialog.backup.filePath,
			items: {
				bundles: this.restoreDialog.selectedBundles,
				...this.restoreDialog.selectedItems,
			},
			overwrite,
		});

		this.conflictDialog.show = false;
		this.closeRestoreDialog();
		if (result.success) {
			console.log('bundles', this.restoreDialog.selectedBundles);
			const installResults = await Promise.all(this.restoreDialog.selectedBundles.map(async (bundleId: string) => {
				return await ipcRenderer.invoke('bun:install', this.$path('userData', 'bundles', bundleId));
			}));
			console.log('installResults', installResults);
			window.reloadScript();
			await this.$swal({
				icon: 'success',
				title: '복원 완료',
				text: '백업이 성공적으로 복원되었습니다.',
				timer: 2000,
			});
		} else {
			this.$swal({
				icon: 'error',
				title: '복원 실패',
				html: (result.error || '알 수 없는 오류가 발생했습니다.') + '<br>앱 종료 후 다시 실행한 뒤에 시도해 주세요.',
			});
		}
		this.restoreDialog.loading = false;
	}

	// 백업 삭제 확인
	async confirmDeleteBackup(backup: any) {
		const result = await this.$swal({
			icon: 'warning',
			title: '백업 삭제',
			text: `"${backup.metadata.name}" 백업을 삭제하시겠습니까?`,
			showCancelButton: true,
			confirmButtonText: '삭제',
			cancelButtonText: '취소',
			confirmButtonColor: '#d33',
		});

		if (result.isConfirmed) {
			await this.deleteBackup(backup);
		}
	}

	// 백업 삭제
	async deleteBackup(backup: any) {
		const result = await ipcRenderer.invoke('backup:delete', backup.filePath);
		if (result.success) {
			this.$swal({
				icon: 'success',
				title: '삭제 완료',
				text: '백업이 삭제되었습니다.',
				timer: 2000,
			});
			await this.loadBackupList();
		} else {
			this.$swal({
				icon: 'error',
				title: '삭제 실패',
				text: result.error || '알 수 없는 오류가 발생했습니다.',
			});
		}
	}

	// 백업 폴더 열기
	async openBackupFolder() {
		const backupPath = await this.$path('userData', 'backup');
		await ipcRenderer.invoke('backup:open-folder', backupPath);
	}

	// 유틸리티 함수
	formatBytes(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	formatDate(date: string | Date) {
		const d = new Date(date);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}

	getBackupItemsCount(metadata: any) {
		let count = 0;
		if (metadata.items.bundles) count += metadata.items.bundles.length;
		if (metadata.items.sopiaCode) count++;
		if (metadata.items.history) count++;
		if (metadata.items.appSettings) count++;
		if (metadata.items.localStorage) count++;
		if (metadata.items.cmdSettings) count++;
		return count;
	}
}
</script>

<style scoped>
.gap-2 {
	gap: 8px;
}

.gap-3 {
	gap: 12px;
}

.gap-1 {
	gap: 4px;
}

.rounded-lg {
	border-radius: 12px !important;
}
</style>
