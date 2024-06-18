import { ProtocolRequest, app, protocol } from "electron";
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const BUNDLE_ROOT_DIR = path.join(app.getPath('userData'), 'bundles');


export function registerBundleProtocol(app: Electron.App) {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'yulx',
            privileges: {
                secure: true,
                standard: true,
                supportFetchAPI: true,
                corsEnabled: false,
            },
        },
    ]);

    app.on('ready', () => {
        protocol.registerStringProtocol('yulx', (request: ProtocolRequest, callback) => {
            const url = new URL(request.url);
            console.log('request', request.url);
            if ( request.method === 'GET' ) {
                const bundleName = url.host;
                const bundleDir = path.join(BUNDLE_ROOT_DIR, bundleName);

                const packageFile = path.join(bundleDir, 'package.json');
                if ( !fs.existsSync(packageFile) ) {
                    console.log('No package.json', packageFile);
                    callback({
                        statusCode: 404,
                    });
                    return;
                }

                const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf-8')) as any;
                if ( pkg['page-version'] !== 2 ) {
                    callback({
                        statusCode: 403,
                    });
                    return;
                }

                const target = path.join(bundleDir, (pkg.pageRoot || ''), url.pathname);
                const mimeType = mime.lookup(target) || 'application/octet-stream';

                if ( fs.existsSync(target) ) {
                    const buf = fs.readFileSync(target, 'utf-8');
                    console.log('read', target, buf.length);
                    callback({
                        statusCode: 200,
                        headers: {
                            'Content-Type': mimeType,
                        },
                        data: buf,
                    });
                    return;
                } else {
                    callback({
                        statusCode: 404,
                    });
                }
            }
        });
    });
}