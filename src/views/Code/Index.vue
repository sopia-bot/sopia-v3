<!--
 * Index.vue
 * Created on Wed Aug 26 2020
 *
 * Copyright (c) Tree Some. Licensed under the MIT License.
-->
<script src="../../router/index.ts"></script>
<template>
	<v-main style="overflow-y: hidden;">
		<v-dialog
			v-model="showPreview"
			fullscreen
			content-class="custom-dialog"
			transition="dialog-bottom-transition"
			@click:outside="dialogClick($event)"
		>
			<v-card>
				<v-toolbar
					dark
					color="primary"
				>
					
					<v-toolbar-title>{{ previewTitle }}</v-toolbar-title>
					<v-spacer></v-spacer>
					<!-- <v-btn
						icon
						dark
						@click="showPreview = false"
					>
						<v-icon>mdi-close</v-icon>
					</v-btn> -->
					<v-toolbar-items>
						<v-btn
							dark
							text
							@click="refreshPreview"
						>
							{{ $t('refresh') }}
							<v-icon
								right
								dark
							>
								mdi-refresh
							</v-icon>
						</v-btn>
						<v-btn
							dark
							text
							@click="openPreviewDevtools"
						>
							{{ $t('code.preview.devtools') }}
							<v-icon
								right
								dark
							>
								mdi-monitor
							</v-icon>
						</v-btn>
						<v-btn
							dark
							text
							@click="showPreview = false"
						>
							{{ $t('close') }}
							<v-icon
								right
								dark
							>
								mdi-close
							</v-icon>
						</v-btn>
					</v-toolbar-items>
				</v-toolbar>

				<div style="height: calc(100vh - 48px - 64px)">
					<webview
						ref="webview"
						v-if="webviewRenderer"
						nodeintegration
						:src="previewSrc"
						style="width: 100%; height: 100%;"
						webpreferences="contextIsolation=false"
						allowpopups
					></webview>
				</div>
			</v-card>
		</v-dialog>
		<v-row class="ma-0 h-100v" style=" overflow-y: hidden;">
			<v-col cols="4" md="3" class="pa-0 d-none d-sm-block h-100v" style="border-right: 1px solid #E8EAF6;">
				<v-row class="ma-0" style="border-bottom: 1px solid #E8EAF6;">
					<v-col cols="12" style="padding-top: 10px; padding-bottom: 10px;" align="center">
						<!-- S:Toolbar -->
						<tool-button
							v-for="btn in buttons"
							:key="btn.name"
							:btn="btn"/>
						<!-- E:Toolbar -->
					</v-col>
				</v-row>
				<v-row class="ma-0" style="height: calc(100vh - 61px); overflow: auto;">
					<!-- S:Folder Tree -->
					<tree-view
						ref="treeView"
						v-if="treeRenderer"
						@contextmenu="openContextmenu"
						@selected="selectedItem"
						/>
					<!-- E:Folder Tree -->
					<v-menu
						v-model="showMenu"
						:position-x="menuPosition.x"
						:position-y="menuPosition.y"
						absolute
						offset-y
					>
						<v-list dense>
							<v-list-item
								link
								v-for="(item, index) in contextButtons"
								:key="'ctx-menu' + index"
								@click="item.func"
							>
								<v-list-item-icon>
									<v-icon>{{  item.icon  }}</v-icon>
								</v-list-item-icon>
								<v-list-item-content>
									<v-list-item-title v-text="item.name"></v-list-item-title>
								</v-list-item-content>
							</v-list-item>
						</v-list>
					</v-menu>
				</v-row>
			</v-col>
			<v-col cols="12" sm="8" md="9" class="pa-0" v-if="openFiles.length > 0">
				<v-tabs
					v-model="selectedFile"
	 				background-color="indigo lighten-1"
					show-arrows
					color="white" dark>
					<v-tab
						v-for="(opened, idx) in openFiles"
	  					@click="selectedItem(opened.node, true)"
						style="text-transform: unset;"
	  					class="pr-2"
						:key="opened.name + idx">
						<v-icon small v-if="opened.isEdit" class="mr-2">
							mdi-source-commit-start-next-local
						</v-icon>
						{{ opened.name }}
						<v-btn
							icon small
		  					@click.stop="closeTab"
							class="ml-2 mr-0"
							color="white">
							<v-icon>mdi-close</v-icon>
						</v-btn>
					</v-tab>
				</v-tabs>
				<monaco-editor
					ref="code-editor"
					class="editor"
					v-model="editor.code"
					:language="editor.language"
					@editorDidMount="editorDidMount"
	 				@change="editorChange"
					:theme="editor.theme"
					:options="editor.options"/>
			</v-col>
			<v-col cols="12" sm="8" md="9" lg="10" class="pa-0" v-else>
				<v-row class="ma-0" align="center" style="height: 100%;">
					<v-col cols="12" align="center">
						<h1 class="text-overline" style="font-size: 1.5rem !important;">{{ $t('code.editor.not-opened-file') }}</h1>
					</v-col>
				</v-row>
			</v-col>
		</v-row>
	</v-main>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import MonacoEditor from 'vue-monaco';
import TreeView from './TreeView.vue';
import ToolButton, { ToolButtonInterface } from './ToolButton.vue';
import { BundlePackage } from '@/interface/Bundle';
const fs = window.require('fs');
const path = window.require('path');

declare global {
	interface Window {
		monaco: any;
	}
}

interface ContextMenu {
	left: number;
	top: number;
	display: string;
	target: any;
	rename: any;
}

interface TabFile {
	name: string;
	fullPath: string;
	contents: string;
	oriContents: string;
	isEdit: boolean;
	node: any;
}

@Component({
	components: {
		MonacoEditor,
		TreeView,
		ToolButton,
	},
	watch: {
		$route(to, from) {
			const t: any = this;
			t.treeReload();
		},
	},
})
export default class Code extends Mixins(GlobalMixins) {
	public editor: any = {
		options: {
			automaticLayout: true,
			renderIndentGuides: false,
			tabSize: 4,
		},
		language: 'javascript',
		code: '',
		theme: 'vs',
		changed: false,
		tabSize: 4,
	};
	public openFiles: TabFile[] = [];
	public selectedFile: number = -1;
	public selectedDir: string = '';
	public editorContext: any = null;
	public showMenu = false;
	public menuPosition = {
		x: 0,
		y: 0,
	};
	public showPreview = false;
	public previewTitle = '';
	public previewSrc = '';
	public webviewRenderer = false;

	public treeRenderer: boolean = true;

	public cm: ContextMenu = {
		left: 0,
		top: 0,
		display: 'none',
		target: null,
		rename: {
			display: 'none',
			value: '',
		},
	};

	public contextButtons: ToolButtonInterface[] = [];
	public buttons: ToolButtonInterface[] = [
		{
			icon: 'mdi-file-document-multiple',
			name: this.$t('code.menu.new-file'),
			func: this.TB_NewFile,
			isContext: () => true,
		},
		{
			icon: 'mdi-folder-plus',
			name: this.$t('code.menu.new-folder'),
			func: this.TB_NewFolder,
			isContext: () => true,
		},
		{
			icon: 'mdi-form-textbox',
			name: this.$t('code.menu.rename'),
			func: this.TB_Rename,
			isContext: (node) => !!node,
		},
		{
			icon: 'mdi-delete',
			name: this.$t('code.menu.unlink'),
			func: this.TB_Unlink,
			isContext: (node) => !!node,
		},
		{
			icon: 'mdi-refresh',
			name: this.$t('code.menu.refresh'),
			func: this.TB_Refresh,
			isContext: (node) => true,
		},
		{
			icon: 'mdi-content-save',
			name: this.$t('code.menu.save'),
			func: this.TB_Save,
			isContext: (node) => false,
		},
	];

	get folder() {
		const m = this.$route.path.match(/\/code\/(.*)?\//);
		if ( m ) {
			return m[1];
		}
		this.$logger.err('code', 'No selected folder');
		return '';
	}

	public TB_NewFile() {
		let dir = this.$path('userData', this.folder);
		if ( this.selectedDir ) {
			dir = this.selectedDir;
		} else if ( this.selectedFile >= 0 ) {
			const file: TabFile = this.openFiles[this.selectedFile];
			if ( file ) {
				const stat = fs.statSync(file.fullPath);
				if ( stat.isDirectory() ) {
					dir = file.fullPath;
				} else {
					dir = path.dirname(file.fullPath);
				}
			}
		}

		this.$evt.$emit('code:new', dir, 'FILE');
	}

	public TB_NewFolder() {
		let dir = this.$path('userData', this.folder);
		if ( this.selectedDir ) {
			dir = this.selectedDir;
		} else if ( this.selectedFile >= 0 ) {
			const file: TabFile = this.openFiles[this.selectedFile];
			if ( file ) {
				const stat = fs.statSync(file.fullPath);
				if ( stat.isDirectory() ) {
					dir = file.fullPath;
				} else {
					dir = path.dirname(file.fullPath);
				}
			}
		}

		this.$evt.$emit('code:new', dir, 'DIR');
	}

	public TB_Rename() {
		let dir = this.$path('userData', this.folder);
		if ( this.selectedDir ) {
			dir = this.selectedDir;
		} else if ( this.selectedFile >= 0 ) {
			const file: TabFile = this.openFiles[this.selectedFile];
			if ( file ) {
				const stat = fs.statSync(file.fullPath);
				if ( stat.isDirectory() ) {
					dir = file.fullPath;
				} else {
					dir = path.dirname(file.fullPath);
				}
			}
		}

		this.$evt.$emit('code:rename');
		if ( this.openFiles.length > 0 && this.selectedFile >= 0 ) {
			this.$evt.$emit('code:rename', dir, 'RENAME');
		} else {
			this.$logger.err('code', 'Can not rename file or directory.');
		}
	}

	public TB_Unlink() {
		this.$evt.$emit('code:remove');
	}

	public TB_Refresh() {
		this.treeReload();
	}

	public TB_Save() {
		if ( this.editorContext ) {
			this.save(this.editorContext);
		}
	}

	public pathsAreEqual(path1, path2) {
		path1 = path.resolve(path1);
		path2 = path.resolve(path2);
		if (process.platform == "win32")
			return path1.toLowerCase() === path2.toLowerCase();
		return path1 === path2;
	}

	public TB_Preview(node: any) {
		const treeRef = (this.$refs['treeView'] as TreeView).$refs['tree'] as any;
		const selections = node ? treeRef.find({ id: node.id }) : treeRef.find({
			state: {
				selected: true,
			},
		});
		if ( selections.length < 1 ) {
			this.$swal({
				icon: 'error',
				html: this.$t('code.preview.err.not-select'),
				toast: true,
				position: 'top-end',
				timer: 3000,
			});
			return;
		}

		const selNode = selections[0];
		let dir = selNode.data.value;
		let pkgPath = path.join(dir, 'package.json');

		while ( !fs.existsSync(pkgPath) ) {
			dir = path.dirname(dir);
			pkgPath = path.join(dir, 'package.json');

			if ( this.pathsAreEqual(dir, this.$path('userData', 'bundles')) ) {
				pkgPath = '';
				break;
			}
		}
		if ( pkgPath === '' ) {
			this.$swal({
				icon: 'error',
				html: this.$t('code.preview.err.not-bundle'),
				toast: true,
				position: 'top-end',
				timer: 3000,
			});
		}

		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as BundlePackage;

		if ( pkg['page-version'] >= 2 ) {
			this.showPreview = true;
			this.previewTitle = pkg['name:ko'] ?? pkg['name'];
			if ( pkg.pageType === 'http' ) {
				this.previewSrc = pkg.page;
			} else {
				this.previewSrc = `yulx://${pkg.name}/${pkg.page}`;
			}
			this.webviewRenderer = false;
			
			const webview = this.$refs['webview'] as any;
			if ( webview ) {
				if ( webview.isDevToolsOpened() ) {
					webview.closeDevTools();
				}
			}
			this.$nextTick(() => {
				this.webviewRenderer = true;
			});
		} else {
			this.$swal({
				icon: 'error',
				html: this.$t('code.preview.err.not-preview'),
				toast: true,
				position: 'top-end',
				timer: 3000,
			});
		}
	}

	public refreshPreview() {
		const webview = this.$refs['webview'] as any;
		if ( webview.isDevToolsOpened() ) {
			return;
		}
		webview.reload();
	}

	public openPreviewDevtools() {
		const webview = this.$refs['webview'] as any;
		if ( webview.isDevToolsOpened() ) {
			webview.closeDevTools();
		}
		webview.openDevTools();
	}

	public dialogClick(evt) {
		console.log("🚀 ~ Code ~ dialogClick ~ evt:", evt)
	}

	public treeReload(cb?: () => void) {
		//(this.$refs['treeView'] as TreeView).oriFolderTree = {};
		(this.$refs['treeView'] as TreeView).treeReload(() => {
			if ( typeof cb === 'function' ) {
				cb();
			}
		});
	}

	public closeTab() {
		//TODO: confirm

		this.openFiles.splice(this.selectedFile, 1);
		this.$nextTick()
			.then(() => {
				this.selectedFile = this.openFiles.length - 1;
				if ( this.selectedFile >= 0 && this.openFiles.length > 0 ) {
					this.selectedItem(this.openFiles[this.selectedFile].node);
				}
			});
	}

	public editorDidMount(editor: any) {
		this.editorContext = editor;
		// save
		editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KEY_S, () => {
			this.save(editor);
		});

		// close
		editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KEY_W, () => {
			this.closeTab();
		});

		// openPreview
		editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyMod.Shift | window.monaco.KeyCode.KEY_R, () => {
			const file = this.openFiles[this.selectedFile];
			if ( file?.node ) {
				this.TB_Preview(file.node);
			}
		});
	}

	public editorChange(value: string, editor: any) {
		const openedFile = this.openFiles[this.selectedFile];
		openedFile.contents = value;

		openedFile.isEdit = openedFile.contents !== openedFile.oriContents;
	}

	public openContextmenu(event: any, node: any) {
		this.showMenu = false;
		if ( node ) {
			const treeRef = (this.$refs['treeView'] as TreeView).$refs['tree'] as any;
			const selection = treeRef.findAll({
				id: node.id,
			});
			selection.select(true);
			console.log("🚀 ~ Code ~ openContextmenu ~ selection:", selection)
		}
		this.contextButtons = this.buttons.filter((btn) => {
			if ( typeof btn.isContext === 'function' ) {
				return btn.isContext(node);
			}
			return !!btn.isContext;
		});
		this.contextButtons.push({
			icon: 'mdi-eye',
			name: this.$t('code.preview.contextmenu'),
			func: () => {
				this.TB_Preview(node);
			},
			isContext: (node) => !!node,
		})
		this.menuPosition.x = event.clientX;
		this.menuPosition.y = event.clientY;
		this.$nextTick(() => {
			this.showMenu = true;
		});
		console.log('openContextmenu', event, node);
	}

	public getLanguage(ext: string) {
		switch (ext.toLowerCase()) {
			case '.ts': return 'typescript';
			case '.js': return 'javascript';
			case '.json': return 'json';
			case '.md': return 'markdown';
			case '.vue':
			case '.html':
				return 'html';
		}
		return 'javascript';
	}

	public save(editor: any) {
		try {
			const openedFile = this.openFiles[this.selectedFile];
			const ext = path.extname(openedFile.name);
			let rtn: any = { result: true, line: 0 };

			switch ( ext ) {
				case '.js':
					rtn = this.jsSyntax(openedFile.contents);
					break;
				case '.json':
					rtn = this.jsSyntax(`JSON.parse(\n${openedFile.contents}\n)`);
					rtn.line -= 1;
					break;
			}
			if ( !rtn.result ) {
				this.$swal({
					title: rtn.msg,
					html: `At line ${rtn.line}.<br>${rtn.syntax}`,
					icon: 'error',
					confirmButtonText: this.$t('confirm'),
				});
				return;
			}

			fs.writeFileSync(openedFile.fullPath, openedFile.contents, { encoding: 'utf8' });
			openedFile.oriContents = openedFile.contents;
			openedFile.isEdit = false;

			window.reloadScript();

			this.$swal({
				toast: true,
				icon: 'success',
				text: this.$t('code.msg.save-success'),
				position: 'top-end',
				timer: 2000,
				showCloseButton: false,
				showConfirmButton: false,
			});
		} catch (err) {
			this.$swal({
				icon: 'error',
				title: this.$t('error'),
				text: err.message,
			});
		}
	}

	public selectedItem(node: any) {
		this.$logger.debug('code', `SelectedItem`, node);
		if ( node.data.isFolder ) {
			this.selectedDir = node.data.value;
			node.select(true);
			this.$emit('selected', node);
		} else {
			const file = node.data.value;
			const idx = this.openFiles.findIndex((opened) => opened.fullPath === node.data.value);
			this.selectedDir = '';

			if ( idx >= 0 ) {
				const openFile = this.openFiles[idx];
				this.editor.code = openFile.contents;
				this.editor.language = this.getLanguage(path.extname(openFile.name));

				node.select();
				this.selectedFile = idx;
				this.$emit('selected', node);
			} else if ( fs.existsSync(file) ) {
				const data = fs.readFileSync(file, { encoding: 'utf-8' });
				this.editor.code = data;
				this.editor.language = this.getLanguage(path.extname(file));

				node.select();

				if ( idx === -1 ) {
					this.openFiles.push({
						name: node.data.text,
						fullPath: node.data.value,
						contents: data,
						oriContents: data,
						isEdit: false,
						node,
					});
					this.selectedFile = this.openFiles.length - 1;
				} else {
					this.selectedFile = idx;
				}

				this.$emit('selected', node);
			} else {
				this.$logger.warn(file, 'not exists');
			}
		}
	}

	public mounted() {
		document.addEventListener('click', () => {
			if ( this.cm && this.cm.display ) {
				this.cm.display = 'none';
			}
		});

		this.$evt.$off('code:tree-rerender');
		this.$evt.$on('code:tree-rerender', (newPath: string, isFile: boolean) => {
			if ( newPath ) {
				if ( isFile ) {
					const file = this.openFiles[this.selectedFile];
					file.name = path.basename(newPath);
					file.fullPath = newPath;
					file.node.data.value = newPath;
					this.editor.language = this.getLanguage(path.extname(newPath));
				}
			}

			this.openFiles = this.openFiles.filter((f: TabFile) => fs.existsSync(f.fullPath));
			if ( this.selectedFile >= this.openFiles.length ) {
				this.selectedFile = this.openFiles.length - 1;
			}
			this.treeReload(() => {
				const node = this.openFiles[this.selectedFile] as any;
				if ( node ) {
					this.$evt.$emit('code:select', node.fullPath);
				}
			});
		});
	}
}
</script>
<style scope>
.editor {
	width: 100%;
	height: 100%;
}
.editor > .monaco-editor {
	margin: 0;
	width: 100% !important;
	/* padding-top: 7px; */
}
.editor > .monaco-editor > .overflow-guard {
	margin: 0;
	width: 100% !important;
}
.editor * {
	font-family: Consolas, "Courier New", monospace;
}
.custom-dialog.v-dialog {
	margin-top: 48px;
	height: calc(100% - 48px);
}
</style>
