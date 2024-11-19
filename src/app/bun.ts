import { app } from 'electron';
import { spawn, SpawnOptions } from 'child_process';
import path from 'path';

function bunPath() {
    if ( app.isPackaged ) {
        return path.join(path.dirname(process.execPath), '.bun/bun.exe');
    } else {
        return path.join(process.cwd(), 'bun-binary/bun.exe');
    }
}

export async function bun(command: ReadonlyArray<string>, options: SpawnOptions = {}) {
    const ps = spawn(bunPath(), command, options);
    ps.stdout?.on('data', (chunk: any) => {
        console.log(chunk.toString('utf8'));
    });

    return {
        process,
        done: new Promise((resolve, reject) => {
            ps?.once('close', resolve);
            ps?.once('exit', resolve);
            ps?.once('error', reject);
        }),
    };
}