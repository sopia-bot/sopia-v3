import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import AdmZip from 'adm-zip';
import pkg from '../../package.json';
import { bun, bunx } from './bun';
import vm from 'vm';
import { createRequire } from 'module';

// Path helpers
type PathType = 'home' | 'appData' | 'userData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps' | 'sessionData';
const getPath = (type: PathType, ...args: string[]) => path.resolve(app.getPath(type), ...args);

// Helper to read directory recursively
const readDirectory = (dir: string, cb: (path: string, isDir: boolean) => void, oriDir?: string) => {
    if (!oriDir) {
        oriDir = dir;
        dir = '';
    }

    const target = path.resolve(oriDir, dir);
    if (!fs.existsSync(target)) return;

    const items = fs.readdirSync(target);
    items.forEach((item: string) => {
        const t = path.resolve(target, item);
        const st = path.join(dir, item).replace(/\\/g, '/');
        const stat = fs.statSync(t);
        cb(st, stat.isDirectory());
        if (stat.isDirectory()) {
            readDirectory(st, cb, oriDir);
        }
    });
};

export interface BackupOptions {
    name: string;
    description: string;
    items: {
        bundles?: string[];
        sopiaCode?: boolean;
        history?: boolean;
        appSettings?: boolean;
        cmdSettings?: boolean;
        localStorage?: boolean;
    };
    onProgress?: (progress: number, message: string) => void;
}

const waitImmediate = () => new Promise<void>(resolve => setImmediate(resolve));

export const createBackup = async (options: BackupOptions) => {
    try {
        const backupDir = getPath('userData', 'backup');
        try {
            await fs.promises.mkdir(backupDir, { recursive: true });
        } catch (e) {
            // Ignore if exists (recursive handles it, but just in case)
        }

        const now = new Date();
        // Use provided name or default timestamped name
        const backupFileName = options.name.endsWith('.zip') ? options.name : `${options.name}.zip`;
        const backupFilePath = path.join(backupDir, backupFileName);

        const zip = new AdmZip();
        const metadata: any = {
            name: options.name,
            description: options.description,
            createdAt: now.toISOString(),
            version: pkg.version,
            items: {},
            files: [],
        };

        const userDataPath = getPath('userData');
        let progress = 0;
        const totalSteps = Object.values(options.items).filter(Boolean).length;
        let currentStep = 0;

        const updateProgress = (msg: string) => {
            if (options.onProgress) {
                options.onProgress(progress, msg);
            }
        };

        // Recursive async file processor
        const processAttributes = async (source: string, zipPath: string) => {
            try {
                const stat = await fs.promises.stat(source);
                if (stat.isDirectory()) {
                    const children = await fs.promises.readdir(source);
                    // Process children in parallel? Or sequential to avoid too many open files?
                    // Sequential within a directory is safer to control concurrency.
                    for (const child of children) {
                        if (child === 'node_modules') continue;
                        await processAttributes(path.join(source, child), path.join(zipPath, child));
                    }
                } else {
                    const content = await fs.promises.readFile(source);
                    // zip.addFile takes content as Buffer. 
                    // Warning: AdmZip.addFile might be synchronous CPU work for compression.
                    // But reading the file is now async.
                    zip.addFile(zipPath, content);
                    metadata.files.push(zipPath);

                    // Yield to event loop to prevent UI blocking
                    await waitImmediate();
                }
            } catch (err) {
                console.error(`[Backup Error] Failed to process ${source}:`, err);
            }
        };

        // 번들 백업
        if (options.items.bundles && options.items.bundles.length > 0) {
            metadata.items.bundles = options.items.bundles;
            const bundlesBase = path.join(userDataPath, 'bundles');
            // Check existence async
            try {
                await fs.promises.access(bundlesBase);
                for (const bundleId of options.items.bundles) {
                    const bundlePath = path.join(bundlesBase, bundleId);
                    try {
                        await fs.promises.access(bundlePath);
                        await processAttributes(bundlePath, path.join('bundles', bundleId));
                    } catch {
                        // Bundle dir doesn't exist, skip
                    }
                }
            } catch {
                // Bundles folder doesn't exist
            }

            currentStep++;
            progress = (currentStep / totalSteps) * 100;
            updateProgress('번들 백업 중...');
            await waitImmediate();
        }

        // 소피아 코드 백업
        if (options.items.sopiaCode) {
            metadata.items.sopiaCode = true;
            const sopiaPath = path.join(userDataPath, 'sopia');
            try {
                await fs.promises.access(sopiaPath);
                await processAttributes(sopiaPath, 'sopia');
            } catch { }
            currentStep++;
            progress = (currentStep / totalSteps) * 100;
            updateProgress('소피아 코드 백업 중...');
            await waitImmediate();
        }

        // 방송 기록 백업 (Excluded by default for auto backup, but handled if requested)
        if (options.items.history) {
            metadata.items.history = true;
            const historyPath = path.join(userDataPath, 'historydb');
            try {
                await fs.promises.access(historyPath);
                await processAttributes(historyPath, 'historydb');
            } catch { }
            currentStep++;
            progress = (currentStep / totalSteps) * 100;
            updateProgress('방송 기록 백업 중...');
            await waitImmediate();
        }

        // 앱 설정 백업
        if (options.items.appSettings) {
            metadata.items.appSettings = true;
            const appCfgPath = path.join(userDataPath, 'app.cfg');
            try {
                const content = await fs.promises.readFile(appCfgPath);
                zip.addFile('app.cfg', content);
                metadata.files.push('app.cfg');
            } catch (err) {
                // console.error(`[Backup Error] Failed to add app.cfg`, err);
            }
            currentStep++;
            progress = (currentStep / totalSteps) * 100;
            updateProgress('앱 설정 백업 중...');
            await waitImmediate();
        }

        // Local Storage 백업
        if (options.items.localStorage) {
            metadata.items.localStorage = true;
            const localStoragePath = path.join(userDataPath, 'Local Storage');
            try {
                await fs.promises.access(localStoragePath);
                await processAttributes(localStoragePath, 'Local Storage');
            } catch { }
            currentStep++;
            progress = (currentStep / totalSteps) * 100;
            updateProgress('Local Storage 백업 중...');
            await waitImmediate();
        }

        // 명령어 설정 백업
        if (options.items.cmdSettings) {
            metadata.items.cmdSettings = true;
            const cmdCfgPath = path.join(userDataPath, 'cmd.cfg');
            try {
                const content = await fs.promises.readFile(cmdCfgPath);
                zip.addFile('cmd.cfg', content);
                metadata.files.push('cmd.cfg');
            } catch (err) {
                // console.error(`[Backup Error] Failed to add cmd.cfg`, err);
            }
            currentStep++;
            progress = (currentStep / totalSteps) * 100;
            updateProgress('명령어 설정 백업 중...');
            await waitImmediate();
        }

        // 메타데이터 추가
        zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'));

        // ZIP 파일 저장 (Async write)
        return new Promise((resolve, reject) => {
            zip.writeZip(backupFilePath, (err) => {
                if (err) {
                    console.error('백업 실패:', err);
                    reject(err);
                } else {
                    if (options.onProgress) {
                        options.onProgress(100, '백업 완료!');
                    }
                    resolve({
                        success: true,
                        filePath: backupFilePath,
                        fileName: backupFileName,
                        metadata,
                    });
                }
            });
        });

    } catch (error: any) {
        console.error('백업 생성 오류:', error);
        return { success: false, error: error.message };
    }
};

export const listBackups = async () => {
    try {
        const backupDir = getPath('userData', 'backup');
        try {
            await fs.promises.access(backupDir);
        } catch {
            return { success: true, backups: [] };
        }

        const files = await fs.promises.readdir(backupDir);
        const backups: any[] = [];

        // Parallel processing of backup metadata?
        // Reading many zip files might be slow.
        // Let's do it sequentially with yielding to avoid spike.

        for (const file of files) {
            if (file.endsWith('.zip')) {
                const filePath = path.join(backupDir, file);
                try {
                    const stats = await fs.promises.stat(filePath);

                    // Reading zip to get metadata is heavy and synchronous with AdmZip
                    // We can wrap it in a promise but it's CPU bound.
                    // We yield before doing it.
                    await waitImmediate();

                    const zip = new AdmZip(filePath);
                    const metadataEntry = zip.getEntry('metadata.json');
                    let metadata: any = {};

                    if (metadataEntry) {
                        metadata = JSON.parse(metadataEntry.getData().toString('utf-8'));
                    }

                    // Fallback name if not in metadata
                    if (!metadata.name) {
                        metadata.name = file;
                    }

                    backups.push({
                        fileName: file,
                        filePath,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        metadata,
                    });
                } catch (error) {
                    console.error(`백업 파일 읽기 오류 (${file}):`, error);
                }
            }
        }

        // 최신순 정렬 (Created At descending)
        backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { success: true, backups };
    } catch (error: any) {
        console.error('백업 목록 조회 오류:', error);
        return { success: false, error: error.message };
    }
};

export const getAllBundleIds = async () => {
    try {
        const bundlesPath = getPath('userData', 'bundles');
        try {
            await fs.promises.access(bundlesPath);
            return await fs.promises.readdir(bundlesPath);
        } catch {
            return [];
        }
    } catch (error) {
        console.error('번들 목록 조회 오류:', error);
        return [];
    }
}

// ... (original exports)

export interface RestoreOptions {
    backupFilePath: string;
    items: {
        bundles?: string[];
        sopiaCode?: boolean;
        history?: boolean;
        appSettings?: boolean;
        cmdSettings?: boolean;
        localStorage?: boolean;
    };
    overwrite: Record<string, boolean>;
}

export const restoreBackup = async (options: RestoreOptions) => {
    try {
        const zip = new AdmZip(options.backupFilePath);
        const userDataPath = getPath('userData');
        const conflicts: string[] = [];

        // 충돌 확인
        const metadataEntry = zip.getEntry('metadata.json');
        if (!metadataEntry) {
            return { success: false, error: '메타데이터를 찾을 수 없습니다.' };
        }

        const metadata = JSON.parse(metadataEntry.getData().toString('utf-8'));

        // 번들 복원 - 선택된 번들만
        if (options.items.bundles && options.items.bundles.length > 0) {
            for (const bundleId of options.items.bundles) {
                const bundlePath = path.join(userDataPath, 'bundles', bundleId);
                try {
                    await fs.promises.access(bundlePath);
                    if (options.overwrite[`bundle_${bundleId}`]) {
                        await fs.promises.rm(bundlePath, { recursive: true, force: true });
                    } else {
                        continue; // 건너뛰기
                    }
                } catch {
                    // 존재하지 않으면 그냥 진행
                }

                // 번들 압축 해제 (Using async extraction wrapper if available, otherwise synchronous AdmZip)
                // AdmZip extractAllTo is synchronous. For now, since we are restarting, sync is acceptable, 
                // but we can try to be async if we read entries manually.

                // Let's iterate entries to extract specific bundle
                const entries = zip.getEntries();
                for (const entry of entries) {
                    if (entry.entryName.startsWith(`bundles/${bundleId}/`)) {
                        const targetPath = path.join(userDataPath, entry.entryName);
                        // Using AdmZip's sync extraction for reliability in this critical phase, 
                        // as we are restarting anyway and UI block is less critical (splash screen or hidden).
                        // However, we want to ensure directories exist.

                        // Actually, AdmZip extractEntryToSync handles dirs.
                        if (!entry.isDirectory) {
                            zip.extractEntryTo(entry, path.dirname(targetPath), false, true);
                        } else {
                            // Ensure directory exists
                            // zip.extractEntryTo handles this? usually yes.
                        }
                    }
                }

                // Bun install and postscript execution
                try {
                    console.log(`[Restore] Running bun install for bundle: ${bundleId}`);
                    await bun(['install', '--production'], { cwd: bundlePath });

                    const postscript = path.join(bundlePath, 'postscript.js');
                    if (fs.existsSync(postscript)) {
                        console.log(`[Restore] Running postscript for bundle: ${bundleId}`);
                        const scriptText = await fs.promises.readFile(postscript, 'utf-8');
                        const script = new vm.Script(scriptText);
                        const moduleObj: { exports: any } = { exports: {} };
                        const bundleRequire = createRequire(postscript);
                        const context = {
                            require: function (name: string) {
                                try {
                                    return bundleRequire(name);
                                } catch {
                                    return __non_webpack_require__(name);
                                }
                            },
                            Buffer,
                            __dirname: path.dirname(postscript),
                            __filename: postscript,
                            __pkgdir: bundlePath,
                            module: moduleObj,
                            process,
                            exports: moduleObj.exports,
                            console,
                            bun,
                            bunx,
                        };
                        vm.createContext(context);
                        script.runInContext(context, {
                            displayErrors: true,
                        });
                    }
                } catch (err: any) {
                    console.error(`[Restore Error] Failed to install dependencies for bundle ${bundleId}:`, err);
                }
            } // End for bundleId
        } // End if bundles

        // 소피아 코드 복원
        if (options.items.sopiaCode && metadata.items.sopiaCode) {
            const sopiaPath = path.join(userDataPath, 'sopia');
            let skip = false;
            try {
                await fs.promises.access(sopiaPath);
                if (!options.overwrite.sopiaCode) skip = true;
                else await fs.promises.rm(sopiaPath, { recursive: true, force: true });
            } catch { }

            if (!skip) {
                const entries = zip.getEntries();
                for (const entry of entries) {
                    if (entry.entryName.startsWith('sopia/')) {
                        if (!entry.isDirectory) {
                            zip.extractEntryTo(entry, path.join(userDataPath, path.dirname(entry.entryName)), false, true);
                        }
                    }
                }
            }
        }

        // 방송 기록 복원
        if (options.items.history && metadata.items.history) {
            const historyPath = path.join(userDataPath, 'historydb');
            let skip = false;
            try {
                await fs.promises.access(historyPath);
                if (!options.overwrite.history) skip = true;
                else await fs.promises.rm(historyPath, { recursive: true, force: true });
            } catch { }

            if (!skip) {
                const entries = zip.getEntries();
                for (const entry of entries) {
                    if (entry.entryName.startsWith('historydb/')) {
                        if (!entry.isDirectory) {
                            zip.extractEntryTo(entry, path.join(userDataPath, path.dirname(entry.entryName)), false, true);
                        }
                    }
                }
            }
        }

        // 앱 설정 복원
        if (options.items.appSettings && metadata.items.appSettings) {
            const appCfgPath = path.join(userDataPath, 'app.cfg');
            let doRestore = true;
            try {
                await fs.promises.access(appCfgPath);
                if (!options.overwrite.appSettings) doRestore = false;
            } catch { }

            if (doRestore) {
                const entry = zip.getEntry('app.cfg');
                if (entry) {
                    zip.extractEntryTo(entry, userDataPath, false, true);
                }
            }
        }

        // Local Storage 복원
        if (options.items.localStorage && metadata.items.localStorage) {
            const localStoragePath = path.join(userDataPath, 'Local Storage');
            let skip = false;
            try {
                await fs.promises.access(localStoragePath);
                if (!options.overwrite.localStorage) skip = true;
                else await fs.promises.rm(localStoragePath, { recursive: true, force: true });
            } catch { }

            if (!skip) {
                const entries = zip.getEntries();
                for (const entry of entries) {
                    if (entry.entryName.startsWith('Local Storage/')) {
                        if (!entry.isDirectory) {
                            zip.extractEntryTo(entry, path.join(userDataPath, path.dirname(entry.entryName)), false, true);
                        }
                    }
                }
            }
        }

        // 명령어 설정 복원
        if (options.items.cmdSettings && metadata.items.cmdSettings) {
            const cmdCfgPath = path.join(userDataPath, 'cmd.cfg');
            let doRestore = true;
            try {
                await fs.promises.access(cmdCfgPath);
                if (!options.overwrite.cmdSettings) doRestore = false;
            } catch { }

            if (doRestore) {
                const entry = zip.getEntry('cmd.cfg');
                if (entry) {
                    zip.extractEntryTo(entry, userDataPath, false, true);
                }
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('복원 오류:', error);
        return { success: false, error: error.message };
    }
};

export const requestRestore = async (options: RestoreOptions) => {
    try {
        const restoreFilePath = getPath('userData', 'restore.json');
        await fs.promises.writeFile(restoreFilePath, JSON.stringify(options, null, 2), 'utf-8');
        console.log('Restore requested. Relaunching application...');

        // Relaunch the application
        app.relaunch();
        app.exit(0);
        return { success: true };
    } catch (error: any) {
        console.error('복원 요청 오류:', error);
        return { success: false, error: error.message };
    }
};

export const processPendingRestore = async () => {
    try {
        const restoreFilePath = getPath('userData', 'restore.json');
        try {
            await fs.promises.access(restoreFilePath);
        } catch {
            return; // No pending restore
        }

        console.log('Pending restore found. Processing...');
        const content = await fs.promises.readFile(restoreFilePath, 'utf-8');
        const options: RestoreOptions = JSON.parse(content);

        const result = await restoreBackup(options);

        if (result.success) {
            console.log('Pending restore completed successfully.');
        } else {
            console.error('Pending restore failed:', result.error);
        }

        // Clean up
        await fs.promises.unlink(restoreFilePath);

    } catch (error) {
        console.error('Error processing pending restore:', error);
    }
};

export const checkAndRunDailyBackup = async () => {
    try {
        console.log('Checking for daily backup...');
        const result = await listBackups();
        if (!result.success || !result.backups) {
            console.error('Failed to retrieve backup list:', result.error);
            return;
        }
        const { backups } = result;
        const now = new Date();
        const todayString = now.toDateString();

        // Check if backup exists for today
        const hasBackupToday = backups.some((backup: any) => {
            const backupDate = new Date(backup.createdAt);
            // Check by date text match as well for safety
            return backupDate.toDateString() === todayString;
        });

        if (hasBackupToday) {
            console.log('Daily backup already exists. Skipping.');
            return;
        }

        console.log('No backup found for today. Starting automatic backup...');

        // Rotation: Keep max 10 automatic backups
        const autoBackups = backups.filter((b: any) => b.fileName.includes('자동 백업') || (b.metadata && b.metadata.description === 'Automatic daily backup on startup'));

        if (autoBackups.length >= 10) {
            // Since they are sorted desc, items from index 10 onwards are oldest
            const backupsToDelete = autoBackups.slice(9); // We want to keep 9, so we can add 1 new one. Or just keep 10 and delete 11th? User: "Max 10, start deleting from 11th". 
            // So if we have 10, adding 1 makes 11. 
            // Let's safe space and delete IF count >= 10.
            for (const backup of backupsToDelete) {
                console.log(`[AutoBackup] Deleting old backup: ${backup.fileName}`);
                try {
                    await fs.promises.unlink(backup.filePath);
                } catch (e) {
                    console.error('Failed to delete old backup:', e);
                }
            }
        }

        const allBundles = await getAllBundleIds();
        const nameDate = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;

        await createBackup({
            name: `${nameDate} 자동 백업`,
            description: 'Automatic daily backup on startup',
            items: {
                bundles: allBundles,
                sopiaCode: true,
                history: false,
                appSettings: true,
                cmdSettings: true,
                localStorage: true,
            },
            onProgress: (progress, message) => {
                console.log(`[AutoBackup] ${progress.toFixed(2)}% - ${message}`);
            }
        });
        console.log('Automatic daily backup completed.');

    } catch (error) {
        console.error('Error running daily backup:', error);
    }
};
