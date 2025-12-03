import { app } from 'electron';
import { spawn, SpawnOptions } from 'child_process';
import path from 'path';
import os from 'os';

function getPath(file: string) {
	if (app.isPackaged) {
		// ✅ 패키지 상태: Resources/.bun
		const base = path.join(process.resourcesPath, '.bun');
		const ext = os.platform() === 'win32' ? '.exe' : '';
		return path.join(base, `${file}${ext}`);
	} else {
		// ✅ 개발 상태: 프로젝트 루트의 bun-binary
		const base = path.join(process.cwd(), 'bun-binary');
		const ext = os.platform() === 'win32' ? '.exe' : '';
		return path.join(base, `${file}${ext}`);
	}
}

function bunPath() {
    return getPath('bun');
}

function bunxPath() {
    return getPath('bun');
}

function running(exec: string, command: ReadonlyArray<string>, options: SpawnOptions = {}) {
    return new Promise((resolve, reject) => {
        const ps = spawn(exec, command, options);
        ps.stdout?.on('data', (chunk: any) => {
            console.log(chunk.toString('utf8'));
        });
        ps?.once('close', resolve);
        ps?.once('exit', resolve);
        ps?.once('error', reject);
    });

}

export async function bun(command: ReadonlyArray<string>, options: SpawnOptions = {}) {
    await running(bunPath(), command, options);
}

export async function bunx(command: ReadonlyArray<string>, options: SpawnOptions = {}) {
    await running(bunxPath(), ['x', ...command], options);
}