<!--
 * TreeView.vue
 * Created on Fri Aug 28 2020
 *
 * Copyright (c) Tree Some. Licensed under the MIT License.
-->
<template>
	<div class="wrapper" style="width:100%;" @click="wrapperClick($event)" @contextmenu.stop="$emit('contextmenu', $event)">
		<v-dialog
			v-model="namebox"
			width="260px"
			style="height: 70px;"
			content-class="custom namebox px-4 py-1"
			@click:outside.stop="nbOutsideClick"
			@keydown="nbKeydown"
			ref="namebox">
			<v-text-field
				ref="name-input"
				v-model="newName"
				dark></v-text-field>
		</v-dialog>
		<div v-if="treeRenderer" style="width: 100%;">
			<tree
				class="custom"
				ref="tree"
				:key="folderKey"
				:options="treeOptions"
				style="overflow-y: auto;"
				:data.sync="folderTree"
				@node:dragging:finish="moveNode"
			>
				<span class="tree-text" slot-scope="{ node }">
					<!-- S:Folder -->
					<template v-if="node.data.isFolder">
						<div
							class="tree-item tree-folder"
							:ref="node.data.value"
							@contextmenu.stop="$emit('contextmenu', $event, node)">
							<i class="tree-item-icon mdi" :class="node.expanded() ? 'mdi-folder-open' : 'mdi-folder'"></i>
							<span class="tree-item-name">{{ node.text }}</span>
						</div>
					</template>
					<!-- E:Folder -->

					<!-- S:File -->
					<template v-else>
						<div
							class="tree-item tree-file"
							:ref="node.data.value"
							@contextmenu.stop="$emit('contextmenu', $event, node)">
							<i class="tree-item-icon" :class="node.data.icon"></i>
							<span class="tree-item-name">{{ node.text }}</span>
						</div>
					</template>
					<!-- E:File -->
				</span>
			</tree>
		</div>
		<div v-else class="loading-container">
			<div class="loading-content">
				<v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
				<span class="loading-text">폴더 내용을 로딩중입니다...</span>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import logger from '@/plugins/logger';
const path = window.require('path');
const fs = window.require('fs');
const os = window.require('os');
const rimraf = window.require('rimraf');
const { readFile, readdir, stat } = window.require('fs/promises');

@Component
export default class TreeView extends Mixins(GlobalMixins) {
	/* S:For Tree */
	public treeRenderer: boolean = true;
	public folderKey: number = 0;
	public folderTree: any = [];
	public selectPath: string = '';
	public ignorePath: string[] = [
		'extensions',
		'blob_storage',
		'Session Storage',
		'Local Storage',
		'GPUCache',
		'Dictionaries',
		'Crashpad',
		'Crash Reports',
		'Code Cache',
		'Cache',
		'\.org\.chromium\.Chromium\..*',
		'Cookies',
		'Cookies-journal',
		'Network Persistent State',
		'Preferences',
		'TransportSecurity',
		'Network',
		'Local Extension Settings',
		'.updaterId',
		'Local State',
		'ko-3-0.bdic',
		'.*node_modules.*',
		'firefox',
		'historydb',
		'QuotaManager*',
		'ext*',
		'restore-flag',
		'Service Worker',
		'login-ext',
		'databases',
		'IndexedDB',
		'Storage',
		'WebStorage',
		'Shared Dictionary',
		'File System',
		'DawnWebGPUCache',
		'historydb',
		'DawnGraphiteCache',
		'DawnCache',
		'SharedStorage*',
	];
	public treeOptions = {
		dnd: true,
		multiple: true,
		fetchData: (node: any) => this.fetchChildren(node),
	};
	/* E:For Tree */

	public namebox: boolean = false;
	public newName: string = '';
	public nbnew: boolean = false; // true: new file or directory
	public nbdir: string = '';
	public nbtype: 'FILE' | 'DIR' | 'RENAME' = 'FILE';

	get selectedNode(): any {
		const treeRef = this.$refs.tree as any;
		const tree = treeRef.tree;
		if ( this.selectPath ) {
			const node = this.searchNode(tree.model, this.selectPath);
			return node;
		}
	}

	get targetFolder() {
		const m = this.$route.path.match(/\/code\/(.*)?\//);
		if ( m ) {
			return m[1];
		}
		this.$logger.err('code', 'No selected folder');
		return '';
	}

	get treeRef(): any {
		return this.$refs.tree as any;
	}

	public mounted() {
		this.treeRenderer = false;
		this.folderTree = this.buildFolderTree(this.$path('userData', this.targetFolder));
		this.$logger.debug('tree-view', 'mounted tree');

		this.$evt.$off('code:new');
		this.$evt.$on('code:new', (dir: string, type: 'FILE' | 'DIR') => {
			this.nbdir = dir;
			this.nbtype = type;
			this.nbnew = true;
			this.$logger.debug('code', `New content [${dir}]`);
			this.openNameBox(10, 10, '');
		});

		this.$evt.$off('code:rename');
		this.$evt.$on('code:rename', (dir: string) => {
			const node = this.selectedNode;
			this.nbdir = dir;
			this.nbtype = 'RENAME';
			if ( node ) {
				const sel = this.$refs[node.data.value] as HTMLElement;
				const position = sel.getBoundingClientRect();

				const x = position.x + 50;
				const y = position.y - 80;

				this.openNameBox(x, y, sel.innerText);
			} else {
				this.$logger.err('code', 'No selected file.');
				this.$swal({
					icon: 'error',
					title: this.$t('error'),
					html: this.$t('code.msg.no-selected'),
				});
			}
		});

		this.$evt.$off('code:remove');
		this.$evt.$on('code:remove', () => {
			const selectedNodes = this.treeRef.findAll({
				state: { selected: true }
			});

			if (selectedNodes.length === 0) {
				this.$logger.err('code', 'No selected file.');
				this.$swal({
					icon: 'error',
					title: this.$t('error'),
					html: this.$t('code.msg.no-selected'),
				});
				return;
			}

			for (let i = 0; i < selectedNodes.length; i++) {
				const node = selectedNodes[i];
				if (node) {
					const nodePath = node.data.value;
					rimraf.sync(nodePath);
					// 트리에서 노드만 제거 (전체 리로드 없음)
					this.removeNode(nodePath);
					// Index.vue에 삭제 알림 (열린 탭 정리용)
					this.$evt.$emit('code:tree-rerender');
				}
			}
		});

		this.$evt.$off('code:select');
		this.$evt.$on('code:select', (p: string) => {
			const treeRef = this.$refs.tree as any;
			if ( !treeRef || !treeRef.tree || !treeRef.tree.model ) {
				this.$nextTick(() => {
					this.$evt.$emit('code:select', p);
				});
				return;
			}

			this.selectPath = p;
			const node = this.selectedNode;
			this.$logger.debug('code', `Select path [${p}] node`, node);
			if ( node ) {
				node.select(true);
			}
		});


		this.treeReload((tree: any) => {
			/*
			TODO: LAST Opend File open
			const file = this.$route.params.file;
			if ( file ) {
				const fullPath = this.$path('userData', path.join(folder, file));
				console.log(fullPath);
				const t = tree.model;

				const node = this.searchNode(t, fullPath);
				if ( node ) {
					node.select(true);
				}
			}
			*/
		});
	}

	public openNameBox(x: number, y: number, str: string = '') {
		this.namebox = true;

		this.$nextTick(() => {
			const namebox = document.querySelector('.custom.namebox') as HTMLElement;
			namebox.style.left = x + 'px';
			namebox.style.top = y + 'px';

			this.$nextTick(() => {
				this.$nextTick(() => {
					const ni = this.$refs['name-input'] as any;
					ni.focus();
				});
				this.newName = str.trim();
			});
		});
	}

	public nbKeydown(evt: KeyboardEvent) {
		switch ( evt.key ) {
			case 'Enter':
				this.applyNameBox();
				break;
			default:
				this.$logger.debug('code', 'Input namebox key.', evt);
				break;
		}
	}

	public nbOutsideClick() {
		this.$logger.debug('code', 'Click the outside of namebox');
		this.applyNameBox();
	}

	public applyNameBox() {
		if ( this.newName === '' ) {
			return;
		}


		const m: any = this.newName.match(/[a-zA-Z0-9\._-]*/);
		if ( !m && m[0] !== this.newName ) {
			this.$swal({
				icon: 'error',
				html: this.$t('code.msg.special-char'),
				toast: true,
				timer: 3000,
				position: 'top-end',
				showCloseButton: false,
				showConfirmButton: false,
			});
			return;
		}

		const target = path.join(this.nbdir, this.newName);
		const oldTarget = this.selectedNode?.data.value;

		if ( target === oldTarget ) {
			return;
		}

		if ( fs.existsSync(target) ) {
			this.$logger.err('code', `Exists file or directory. [${target}]`);
			this.$swal({
				icon: 'error',
				title: this.$t('error'),
				html: this.$t('code.msg.exists'),
			});
			return;
		}

		if ( !fs.existsSync(this.nbdir) ) {
			this.$logger.err('code', `No such file or directory. [${this.nbdir}]`);
		}

		const isFolder = this.nbtype === 'DIR';

		switch (this.nbtype) {
			case 'FILE':
				fs.writeFileSync(target, '');
				break;
			case 'DIR':
				fs.mkdirSync(target);
				break;
			case 'RENAME':
				fs.renameSync(oldTarget, target);
				this.$logger.success('code', `Rename [${oldTarget}] -> [${target}]`);
				break;
		}

		this.nbnew = false;
		this.namebox = false;
		this.newName = '';

		// 부분 업데이트 적용
		if (this.nbtype === 'RENAME') {
			// 이름 변경: 노드의 속성만 업데이트
			const renamedNode = this.renameNode(oldTarget, target);
			if (renamedNode) {
				renamedNode.select(true);
				// Index.vue에 변경 알림 (열린 탭 업데이트용)
				this.$evt.$emit('code:tree-rerender', target, !renamedNode.data.isFolder);
			}
		} else {
			// 파일/폴더 생성: 노드만 추가
			this.addNode(this.nbdir, target, isFolder).then((addedNode) => {
				if (addedNode) {
					addedNode.select(true);
				}
			});
		}
	}

	public checkFolder(): Promise<void> {
		return new Promise((resolve, reject) => {
			const dist = this.$path('userData', this.targetFolder);
			if ( !fs.existsSync(dist) ) {
				fs.mkdir(dist, (err: any) => {
					if ( err ) {
						reject(err);
						return;
					}
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	public iconFinder(ext: string) {
		switch (ext.toLowerCase()) {
			case '.md': return 'mdi mdi-language-markdown';
			case '.js': return 'mdi mdi-language-javascript';
			case '.ts': return 'mdi mdi-language-typescript';
			case '.vue': return 'mdi mdi-vuejs';
			case '.json': return 'mdi mdi-code-json';
			case '.html': return 'mdi mdi-language-html5';
		}
		return 'mdi mdi-file-document';
	}

	public async treeReload(cb: (...args: any) => any = () => {/* empty */}) {
		this.treeRenderer = false;
		this.folderTree = await this.buildFolderTree(this.$path('userData', this.targetFolder));
		await this.$nextTick();
		this.treeRenderer = true;
		this.$forceUpdate();
		this.folderKey += 1;

		await this.$nextTick();
		const treeRef = this.$refs.tree as any;
		if (!treeRef) {
			cb(null);
			return;
		}
		const tree = treeRef.tree;
		treeRef.$off('node:selected');
		treeRef.$on('node:selected', (node: any) => {
			const file = node.data.value;
			this.selectPath = file;
			this.$emit('selected', node);
		});

		if (this.selectPath) {
			const node = this.selectedNode;
			if (node) {
				node.select(true);
			}
		}

		cb(tree);
	}

	public searchNode(nodes: any, value: any): any {
		for ( const node of nodes ) {
			if ( node.children.length === 0 ) {
				// file
				if ( node.data.value === value ) {
					return node;
				}
			} else {
				// folder
				if ( value === node.data.value ) {
					return node;
				} else if ( value.indexOf(node.data.value) === 0 ) {
					if ( !node.states.expanded ) {
						node.toggleExpand();
					}
					return this.searchNode(node.children, value);
				}
			}
		}
	}

	public isIgnorePath(p: string) {
		for ( const ignore of this.ignorePath ) {
			const regxStr = path.join(
				this.$path('userData', '').replaceAll('.', '\\.'),
				ignore.replaceAll('/', '\\/'),
			);
			if ( os.platform() === 'win32' ) {
				const regx = new RegExp(regxStr.replaceAll('\\', '\\\\'));
				if ( regx.test(p) ) {
					return true;
				}
			} else {
				const regx = new RegExp(regxStr);
				if (regx.test(p)) {
					return true;
				}
			}
		}
		return false;
	}

	public async buildFolderTree(src: string, selectedFile: string = '') {
		return await this.readSingleLevel(src);
	}

	/**
	 * 단일 레벨만 읽어서 트리 데이터를 반환합니다.
	 * 폴더인 경우 isBatch: true를 설정하여 lazy loading을 활성화합니다.
	 */
	public async readSingleLevel(targetPath: string): Promise<any[]> {
		try {
			if (!fs.existsSync(targetPath)) {
				await this.checkFolder();
				return [];
			}

			const files = await readdir(targetPath);
			const arr: any[] = [];

			if (!Array.isArray(files)) {
				return [];
			}

			// 폴더 우선 정렬
			const sorted = files.sort((a: string, b: string) => {
				const statsA = fs.statSync(path.join(targetPath, a));
				const statsB = fs.statSync(path.join(targetPath, b));
				if (statsA.isDirectory() && !statsB.isDirectory()) return -1;
				if (!statsA.isDirectory() && statsB.isDirectory()) return 1;
				return a.localeCompare(b);
			});

			for (const fileName of sorted) {
				const fullPath = path.join(targetPath, fileName);

				if (this.isIgnorePath(fullPath)) {
					continue;
				}

				const stats = await stat(fullPath);
				const isFolder = stats.isDirectory();

				const node: any = {
					text: fileName,
					data: {
						value: fullPath,
						isFolder,
						icon: isFolder ? '' : this.iconFinder(path.extname(fileName)),
					},
					state: {
						dropable: isFolder,
					},
				};

				if (isFolder) {
					// isBatch: true로 설정하면 확장 시 fetchData가 호출됨
					node.isBatch = true;
					node.children = [];
				}

				arr.push(node);
			}

			return arr;
		} catch (err) {
			logger.err('code', `readSingleLevel error`, err);
			return [];
		}
	}

	/**
	 * 폴더 확장 시 호출되는 fetchData 콜백
	 * 해당 폴더의 하위 항목을 로드합니다.
	 */
	public async fetchChildren(node: any): Promise<any[]> {
		const folderPath = node.data.value;
		return await this.readSingleLevel(folderPath);
	}

	/**
	 * 특정 폴더의 내용만 새로고침합니다.
	 * 전체 트리를 리로드하지 않고 해당 폴더의 자식들만 업데이트합니다.
	 */
	public async refreshFolder(folderPath: string, cb?: (node?: any) => void): Promise<void> {
		const treeRef = this.$refs.tree as any;
		if (!treeRef) {
			if (cb) cb();
			return;
		}

		// 폴더 노드 찾기
		const nodes = treeRef.find({ data: { value: folderPath } });
		const folderNode = nodes.length > 0 ? nodes[0] : null;

		if (folderNode) {
			// 기존 자식 노드들 제거
			while (folderNode.children.length > 0) {
				folderNode.children[0].remove();
			}

			// 새로운 자식 노드들 로드
			const children = await this.readSingleLevel(folderPath);
			for (const child of children) {
				folderNode.append(child);
			}

			// 폴더가 확장 상태 유지
			if (!folderNode.expanded()) {
				folderNode.expand();
			}

			if (cb) cb(folderNode);
		} else {
			// 루트 폴더인 경우 전체 리로드
			await this.treeReload(() => {
				if (cb) cb();
			});
		}
	}

	/**
	 * 노드를 트리에 추가합니다.
	 */
	public async addNode(parentPath: string, newNodePath: string, isFolder: boolean): Promise<any> {
		const treeRef = this.$refs.tree as any;
		if (!treeRef) return null;

		const fileName = path.basename(newNodePath);
		const newNode: any = {
			text: fileName,
			data: {
				value: newNodePath,
				isFolder,
				icon: isFolder ? '' : this.iconFinder(path.extname(fileName)),
			},
			state: {
				dropable: isFolder,
			},
		};

		if (isFolder) {
			newNode.isBatch = true;
			newNode.children = [];
		}

		// 부모 노드 찾기
		const parentNodes = treeRef.find({ data: { value: parentPath } });
		if (parentNodes.length > 0) {
			const parentNode = parentNodes[0];
			parentNode.append(newNode);
			if (!parentNode.expanded()) {
				parentNode.expand();
			}
			// 새로 추가된 노드 찾아서 반환
			const addedNodes = treeRef.find({ data: { value: newNodePath } });
			return addedNodes.length > 0 ? addedNodes[0] : null;
		} else {
			// 루트에 추가
			treeRef.append(newNode);
			const addedNodes = treeRef.find({ data: { value: newNodePath } });
			return addedNodes.length > 0 ? addedNodes[0] : null;
		}
	}

	/**
	 * 노드를 트리에서 제거합니다.
	 */
	public removeNode(nodePath: string): boolean {
		const treeRef = this.$refs.tree as any;
		if (!treeRef) return false;

		const nodes = treeRef.find({ data: { value: nodePath } });
		if (nodes.length > 0) {
			nodes[0].remove();
			return true;
		}
		return false;
	}

	/**
	 * 노드 이름을 변경합니다.
	 */
	public renameNode(oldPath: string, newPath: string): any {
		const treeRef = this.$refs.tree as any;
		if (!treeRef) return null;

		const nodes = treeRef.find({ data: { value: oldPath } });
		if (nodes.length > 0) {
			const node = nodes[0];
			const newName = path.basename(newPath);
			node.text = newName;
			node.data.value = newPath;
			if (!node.data.isFolder) {
				node.data.icon = this.iconFinder(path.extname(newName));
			}
			return node;
		}
		return null;
	}

	public async moveNode(targetNode, distNode) {
		const targetNodeList = this.treeRef.findAll({
			state: {
				selected: true,
			},
		});
		const distDir = distNode.data.isFolder ? distNode.data.value : path.dirname(distNode.data.value);

		// 이동할 노드들의 원래 경로 저장 (복원용)
		const originalPaths: Array<{ node: any; oldPath: string }> = [];
		for (const node of targetNodeList) {
			originalPaths.push({ node, oldPath: node.data.value });
		}

		for (let i = 0; i < targetNodeList.length; i++) {
			const node = targetNodeList[i];
			const oldPath = originalPaths[i].oldPath;
			const distTarget = path.join(distDir, node.text);

			if (fs.existsSync(distTarget)) {
				const res = await this.$swal({
					title: this.$t('confirm'),
					html: this.$t('code.msg.override-sure'),
					icon: 'question',
					confirmButtonText: this.$t('yes'),
					showCancelButton: true,
					cancelButtonText: this.$t('no'),
				});
				if (!res.isConfirmed) {
					// 취소: 소스 폴더만 새로고침하여 노드 복원
					const sourceDir = path.dirname(oldPath);
					await this.refreshFolder(sourceDir);
					return;
				}
				await rimraf(distTarget);
			}

			// 파일 시스템에서 이동
			fs.renameSync(oldPath, distTarget);

			// 노드의 경로 업데이트 (LiquorTree가 이미 노드를 이동시켰으므로 data만 업데이트)
			node.data.value = distTarget;

			// Index.vue에 이동 알림 (열린 탭 업데이트용)
			this.$evt.$emit('code:tree-rerender', distTarget, !node.data.isFolder);
		}
	}

	public wrapperClick(event) {
		this.$nextTick(() => {
			const nodes = this.treeRef.findAll({
				state: {
					selected: true,
				},
			});
			this.$logger.debug('tree-view', 'wrapper click selected nodes::', nodes);
			nodes.unselect(true);
		});
	}

}
</script>
<style>
/* Tree Container */
.wrapper {
	background-color: #f5f5f5;
	padding-top: 4px;
}

/* Tree Arrow (Chevron) */
.custom .tree-arrow {
	width: 18px;
	height: 22px;
	margin-left: 0 !important;
	margin-right: 0;
}

.custom .tree-arrow.has-child:after {
	border: 1.5px solid #757575;
	border-left: 0;
	border-top: 0;
	left: 7px;
	top: 50%;
	height: 6px;
	width: 6px;
	transform: rotate(-45deg) translateY(-50%) translateX(0);
	transition: transform 0.15s ease;
}

.custom .tree-arrow.has-child.expanded:after {
	transform: rotate(45deg) translateY(-50%) translateX(0);
}

/* Tree Node */
.custom .tree-anchor {
	margin: 0;
	padding: 0;
}

.custom .tree-node .tree-content {
	padding: 0 8px 0 0 !important;
	padding-left: 0 !important;
	height: 22px;
	display: flex;
	align-items: center;
}

/* Tree Item (File/Folder) */
.tree-item {
	display: flex;
	align-items: center;
	gap: 6px;
	width: 100%;
	white-space: nowrap;
	overflow: hidden;
}

.tree-item-icon {
	font-size: 16px;
	flex-shrink: 0;
	width: 16px;
	text-align: center;
}

/* Folder Icon Colors */
.tree-item-icon.mdi-folder,
.tree-item-icon.mdi-folder-open {
	color: #90a4ae;
}

/* File Icon Colors */
.custom .mdi-language-javascript {
	color: #f7df1e;
}

.custom .mdi-vuejs {
	color: #41b883;
}

.custom .mdi-code-json {
	color: #f5a623;
}

.custom .mdi-language-typescript {
	color: #3178c6;
}

.custom .mdi-language-html5 {
	color: #e44d26;
}

.custom .mdi-language-markdown {
	color: #083fa1;
}

.custom .mdi-file-document {
	color: #90a4ae;
}

.tree-item-name {
	font-size: 13px;
	color: #37474f;
	overflow: hidden;
	text-overflow: ellipsis;
}


/* Tree Indentation */
.custom ul.tree-children {
	padding-left: 0;
	margin-left: 16px;
	border-left: 1px solid #e0e0e0;
}

/* Hover & Selection States */
.custom .tree-node:not(.selected) > .tree-content:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.custom .tree-node.selected > .tree-content {
	background-color: #e3f2fd;
}

.custom .tree-node.selected > .tree-content .tree-item-name {
	color: #1565c0;
}

/* Drag & Drop States */
.custom .tree-node.dragging {
	opacity: 0.5;
}

.custom .tree-node.drag-over > .tree-content {
	background-color: #bbdefb;
	outline: 1px dashed #1976d2;
}

/* Name Input Dialog */
.custom.v-dialog {
	position: fixed !important;
	background: rgba(33, 33, 33, 0.9) !important;
	height: 73px;
	overflow: hidden;
	border-radius: 6px;
}

/* Loading State */
.loading-container {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
	height: 100px;
}

.loading-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
}

.loading-text {
	color: #616161;
	font-size: 12px;
	font-weight: 500;
}
</style>
