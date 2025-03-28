const path = require('path');
const MonacoEditorPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');

module.exports = {
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: [
				'src/app/**/*',
			],
			chainWebpackMainProcess: (config) => {
				// supertest의 formidable 패키지에서 발생하는 문제 수정
				config.plugin('gently')
					.use(new webpack.DefinePlugin({ "global.GENTLY": false }))
					.end();
				return config;
			},
			builderOptions: {
				afterPack: (context) => {
					const target = context.targets[0];
					const filename = target.packager.appInfo.productFilename;
					let ext = '';
					if (process.platform === 'win32') {
						ext = '.exe';
					}
					fs.cpSync(path.join(context.appOutDir, `${filename}${ext}`), path.join(context.appOutDir, `SopiaBundleManager${ext}`), { recursive: true });
				},
				publish: [
					{
						"provider": "s3",
						"bucket": "sopia-v3",
						"region": "ap-northeast-2",
					},
				],
				productName: 'SOPIAv3',
				files: [
					"**/*",
					"node_modules/axios/**/*",
					"node_modules/follow-redirects/**/*",
					"node_modules/better-sqlite3/**/*",
					"node_modules/bindings/**/*",
					"node_modules/file-uri-to-path/**/*",
					"node_modules/rimraf/**/*",
					"node_modules/@prisma/client/**/*",
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
						from: 'bun-binary',
						to: '.bun',
					},
				],
			},
			mac: {
				target: "dmg",
				arch: [
					"x64",
					"arm64",
					"universal",
				],
			},
		},
	},
	configureWebpack: {
		resolve: {
			alias: {
				"assets": path.join(__dirname, "src/assets"),
				"@": path.join(__dirname, "src"),
			},
		},
		module: {
			exprContextCritical: false,
		},
		plugins: [
			new MonacoEditorPlugin({
				// https://github.com/Microsoft/monaco-editor-webpack-plugin#options
				// Include a subset of languages support
				// Some language extensions like typescript are so huge that may impact build performance
				// e.g. Build full languages support with webpack 4.0 takes over 80 seconds
				// Languages are loaded on demand at runtime
				languages: ['javascript', 'css', 'html', 'typescript', 'json', 'markdown'],
				features: ['!gotoSymbol'],
			}),
		],
	},
	transpileDependencies: [
		"vuetify"
	],
	runtimeCompiler: true,
}
