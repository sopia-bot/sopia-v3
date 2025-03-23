import { app } from 'electron';
import { spawn, SpawnOptions } from 'child_process';
import path from 'path';

function getPath(file: string) {
    if ( app.isPackaged ) {
        return path.join(path.dirname(process.execPath), `.bun/${file}.exe`);
    } else {
        return path.join(process.cwd(), `bun-binary/${file}.exe`);
    }
}

function bunPath() {
    return getPath('bun');
}

function bunxPath() {
    return getPath('bunx');
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
    await running(bunxPath(), command, options);
}