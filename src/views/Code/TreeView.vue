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
					<template v-if="node.hasChildren()">
						<div
							:ref="node.data.value"
							@contextmenu.stop="$emit('contextmenu', $event, node)">
							{{ node.text }}
						</div>
					</template>
					<!-- E:Folder -->

					<!-- S:File -->
					<template v-else>
						<div
							:ref="node.data.value"
							@contextmenu.stop="$emit('contextmenu', $event, node)">
							<i :class="node.data.icon"></i>
							{{ node.text }}
						</div>
					</template>
					<!-- E:File -->
				</span>
			</tree>
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

@Component
export default class TreeView extends Mixins(GlobalMixins) {
	/* S:For Tree */
	public treeRenderer: boolean = true;
	public folderKey: number = 0;
	public folderTree: any = [];
	public oriFolderTree: any = [];
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

			for ( let i=0;i < selectedNodes.length;i++ ) {
				const node = selectedNodes[i];
				if ( node ) {
					const res = rimraf.sync(node.data.value);
					this.$evt.$emit('code:tree-rerender');
				} else {
					this.$logger.err('code', 'No selected file.');
					this.$swal({
						icon: 'error',
						title: this.$t('error'),
						html: this.$t('code.msg.no-selected'),
					});
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

		switch ( this.nbtype ) {
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
		this.treeReload(() => {
			const findNode = (this.$refs['tree'] as any).find({
				data: {
					value: target,
				}
			})[0];
			if ( findNode ) {
				let parent = findNode.parent;
				while ( parent ) {
					console.log(parent);
					parent.expand();
					parent = parent.parent;
				}
				findNode.select(true);
			}
		});
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

	public treeReload(cb: (...args: any) => any = () => {/* empty */}) {
		let treeRef = this.$refs.tree as any;
		let tree = treeRef.tree;
		this.oriFolderTree = tree.model;
		this.treeRenderer = false;
		this.folderTree = this.buildFolderTree(this.$path('userData', this.targetFolder));
		this.$nextTick()
			.then(() => {
				this.treeRenderer = true;
				this.$forceUpdate();
				this.folderKey += 1;

				this.$nextTick()
					.then(() => {
						treeRef = this.$refs.tree as any;
						tree = treeRef.tree;
						treeRef.$off('node:selected');
						treeRef.$on('node:selected', (node: any) => {
							const file = node.data.value;
							this.selectPath = file;
							this.$emit('selected', node);
						});

						if ( this.selectPath ) {
							const node = this.selectedNode;
							if ( node ) {
								node.select(true);
							}
						}

						cb(tree);
					});
			});
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

	public readdir(PATH: string, DIR: string = '', ORI: any, sf?: any[]) {
		try {
			DIR = DIR || '';
			const target = path.join(DIR, PATH);

			if ( fs.existsSync(target) ) {
				const fll = fs.readdirSync(target);
				const arr: any = [];

				if ( Array.isArray(fll) ) {
					const fl = fll.sort((a, b) => {
						const statsA = fs.statSync(path.join(target, a));
						const statsB = fs.statSync(path.join(target, b));
						if ( statsA.isDirectory() ) {
							return -1;
						} else if ( statsB.isDirectory() ) {
							return 1;
						}
						return a > b ? 1 : -1;
					});

					fl.forEach((f) => {
						const fullPath = path.join(target, f);

						if ( this.isIgnorePath(fullPath) ) {
							return;
						}

						const stats = fs.statSync(fullPath);
						const obj: any = { data: {} };
						const oriObjIdx = Array.isArray(ORI) ? ORI.findIndex((oo) => {
							if ( oo.data['value'] === fullPath ) { return true; }
							//if ( oo.data['value'] === this.cm.rename.value ) { return true; }
						}) : -1;
						const oriObj = oriObjIdx >= 0 ? ORI[oriObjIdx] : {};

						obj['text'] = f;
						obj.data['value'] = fullPath;
						obj.data['idChange'] = false;

						if ( stats.isDirectory() ) {
							let expanded = false;
							if ( sf && sf.length > 0 ) {
								const p = sf.shift();
								expanded = (p === f);
							} else {
								expanded = (oriObj['states'] && oriObj['states'].expanded);
							}
							obj['state'] = {
								expanded,
							};
							obj.data['isFolder'] = true;
							obj['children'] = this.readdir(fullPath, '', oriObj && oriObj.children );

						} else {
							obj['state'] = oriObj['state'] || {};
							obj.data['isFolder'] = false;
							obj.data['icon'] = this.iconFinder(path.extname(f));
							obj['state']['dropable'] = false;
						}
						arr.push(obj);
					});
				}
				return arr;
			} else {
				this.checkFolder();
				return [];
			}
		} catch(err) {
			logger.err('code', `readdir error`, err);
		}
		return [];
	}

	public buildFolderTree(src: string, selectedFile: string = '') {
		const ori = this.oriFolderTree;

		const sfs = selectedFile ? selectedFile.split('/') : [];
		return this.readdir(src, '', ori, sfs);
	}

	public async moveNode(targetNode, distNode) {
		const targetNodeList = this.treeRef.findAll({
			state: {
				selected: true,
			},
		});
		let distDir = distNode.data.isFolder ? distNode.data.value : path.dirname(distNode.data.value);
		
		for ( let i=0;i < targetNodeList.length;i++ ) {
			const targetNode = targetNodeList[i];
			const distTarget = path.join(distDir, targetNode.text);
			
			if ( fs.existsSync(distTarget) ) {
				const res = await this.$swal({
					title: this.$t('confirm'),
					html: this.$t('code.msg.override-sure'),
					icon: 'question',
					confirmButtonText: this.$t('yes'),
					showCancelButton: true,
					cancelButtonText: this.$t('no'),
				});
				if ( !res.isConfirmed ) {
					this.treeReload();
					return;
				}
				rimraf.sync(distTarget);
			}

			fs.renameSync(targetNode.data.value, distTarget);
			this.$evt.$emit('code:tree-rerender', distTarget, !targetNode.data.isFolder);
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
<style scope>
.custom .tree-arrow.has-child:after {
	border: 1.5px solid #263238;
	position: absolute;
	border-left: 0;
	border-top: 0;
	left: 9px;
	top: 50%;
	height: 9px;
	width: 9px;
	transform: rotate(-45deg) translateY(-50%) translateX(0);
	transition: transform .25s;
	transform-origin: center;
}

.custom .tree-anchor {
	margin: 0;
	padding-left: 0;
	padding: 0;
}
.custom .tree-anchor .tree-text {
	color: #263238;
	font-size: 10pt;
}
.custom ul.tree-children {
	padding-left: 12px;
}
.custom .tree-node .tree-content {
	padding-left: 12px !important;
	padding-top: 0;
	padding-bottom: 0;
}
.custom .tree-node.selected>.tree-content .tree-text {
}

.custom .tree-node:not(.selected)>.tree-content:hover {
	background: #ECEFF1;
}

.custom .tree-node.selected>.tree-content {
	background: #CFD8DC;
}

.custom .tree-arrow {
	margin-left: 0px;
}

.custom .mdi-language-javascript {
	color: #e8ba00;
}

.custom .mdi-vuejs {
	color: #41B883;
}

.custom .mdi-code-json {
	color: #a86200;
}

.custom .mdi-language-typescript {
	color: #007ACD;
}

.custom .mdi-language-html5 {
	color: #E75212;
}

.custom.v-dialog {
	position: fixed !important;
	background: rgba(32, 38, 104, 0.85) !important;
	height: 73px;
	overflow: hidden;
}
</style>
