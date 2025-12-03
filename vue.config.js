const path = require('path');
const MonacoEditorPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');

// 환경변수로 빌드 타입 결정 (SOPIAv3 또는 SopiaBundleManager)
const BUILD_TYPE = process.env.BUILD_TYPE || 'SOPIAv3';

module.exports = {
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: [
				'src/app/**/*',
			],
			chainWebpackMainProcess: (config) => {
				config.plugin('gently')
					.use(new webpack.DefinePlugin({ 'global.GENTLY': false }))
					.end();
				return config;
			},

			builderOptions: {
				afterPack: (context) => {
					if (process.platform === 'win32') {
						const target = context.targets[0];
						const filename = target.packager.appInfo.productFilename;
						let ext = '.exe';
						fs.cpSync(path.join(context.appOutDir, `${filename}${ext}`), path.join(context.appOutDir, `SopiaBundleManager${ext}`), { recursive: true });
					}
				},
				publish: [
					{
						provider: 's3',
						bucket: 'sopia-v3',
						region: 'ap-northeast-2',
					},
				],
				productName: BUILD_TYPE,
				appId: BUILD_TYPE === 'SopiaBundleManager' ? 'dev.sopia.bundlemanager' : 'dev.sopia.v3',
				files: [
					"**/*",
					"node_modules/axios/**/*",
					"node_modules/follow-redirects/**/*",
					"node_modules/better-sqlite3/**/*",
					"node_modules/bindings/**/*",
					"node_modules/file-uri-to-path/**/*",
					"node_modules/rimraf/**/*",
					"node_modules/@prisma/client/**/*",
					"node_modules/json-stringify-safe/**/*",
					"node_modules/adm-zip/**/*",
					"build/icudtl.dat"
				],
				extraFiles: [
					{
						from: "node_modules/follow-redirects/",
						to: "resources/node_modules/follow-redirects",
					},
					{
						from: "node_modules/axios/",
						to: "resources/node_modules/axios"
					},
					{
						from: "node_modules/better-sqlite3/",
						to: "resources/node_modules/better-sqlite3"
					},
					{
						from: "node_modules/bindings/",
						to: "resources/node_modules/bindings"
					},
					{
						from: "node_modules/file-uri-to-path/",
						to: "resources/node_modules/file-uri-to-path"
					},
					{
						from: "node_modules/rimraf",
						to: "resources/node_modules/rimraf"
					},
					{
						from: "node_modules/@prisma/client/",
						to: "resources/node_modules/@prisma/client"
					},
					{
						from: "node_modules/json-stringify-safe/",
						to: "resources/node_modules/json-stringify-safe"
					},
					{
						from: "node_modules/adm-zip/",
						to: "resources/node_modules/adm-zip"
					},
					{
						from: 'bun-binary',
						to: '.bun',
					},
					// {
					// 	from: 'ffmpeg-binary',
					// 	to: '.ffmpeg',
					// },
					{
						from: 'public/icon.png',
						to: 'resources/icon.png',
					},
				],
				extraResources: [
					{ from: 'bun-binary', to: '.bun', filter: ['**/*'] },
					{ from: "build/icudtl.dat", to: "icudtl.dat" },
				],
				// mac: {
				// 	target: "dmg",
				// 	arch: [
				// 		"x64",
				// 		"arm64",
				// 		"universal",
				// 	],
				// },
				win: {
					target: "nsis"
				},
				nsis: {
					oneClick: true,
					deleteAppDataOnUninstall: false,
					include: 'build/installer.nsh'
				}
			},
		},
	},

	configureWebpack: {
		resolve: {
			alias: {
				assets: path.join(__dirname, 'src/assets'),
				'@': path.join(__dirname, 'src'),
			},
		},
		module: { exprContextCritical: false },
		plugins: [
			new MonacoEditorPlugin({
				languages: ['javascript', 'css', 'html', 'typescript', 'json', 'markdown'],
				features: ['!gotoSymbol'],
			}),
		],
	},

	transpileDependencies: ['vuetify'],
	runtimeCompiler: true,
};
