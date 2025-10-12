/*
 * background.ts
 * Created on Sat Jul 18 2020
 *
 * Copyright (c) TreeSome. Licensed under the MIT License.
 */
'use strict';

import { app } from 'electron';
import createBundleManagerWindow from './app/bundle-manager/create-window';
import createMainWindow from './app/main/create-window';

let args: any = {};
const argv = app.isPackaged ? process.argv.slice(1) : process.argv.slice(2);

for (let i = 0; i < argv.length; i++) {
	if (argv[i].startsWith('--')) {
		const key = argv[i].slice(2);
		const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
		args[key] = value;
		if (value !== true) i++; // 다음 인자가 값이었다면 건너뛰기
	}
}

if (args.mode === 'bundle-manager') {
	process.title = 'Sopia Bundle Manager';
	app.setName('Sopia Bundle Manager');
	createBundleManagerWindow();
} else if (args.mode === 'autolaunch') {
	process.title = 'Sopia';
	app.setName('Sopia');
	// autolaunch 모드에서는 백그라운드로 실행
	createMainWindow(true); // 숨김 모드로 실행
} else {
	process.title = 'Sopia';
	app.setName('Sopia');
	createMainWindow();	
}
