const path = require('path');
const MonacoEditorPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');

module.exports = {
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: [
				'src/app/*',
			],
			chainWebpackMainProcess: (config) => {
				// supertest의 formidable 패키지에서 발생하는 문제 수정
				config.plugin('gently')
					.use(new webpack.DefinePlugin({ "global.GENTLY": false }))
					.end();
				return config;
			},
			builderOptions: {
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
					"node_modules/better-sqlite3/**/*"
				],
				extraFiles: [
					{
						from: "node_modules/better-sqlite3/",
						to: "resources/node_modules/better-sqlite3"
					}
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
