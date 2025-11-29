import { ProtocolRequest, UploadRawData, app, ipcMain, protocol, webContents } from "electron";
import fs from 'fs';
import { Writable, Readable, PassThrough } from "stream";
import path from 'path';
import mime from 'mime-types';
import { BundlePackage } from "../interface/bundle";

const BUNDLE_ROOT_DIR = path.join(app.getPath('userData'), 'bundles');
const BundleStream: Record<string, Readable> = {

}

// CustomReadableStream을 만듭니다.
class CustomReadableStream extends Readable {
    data: any;
    index: number;
    constructor(options = {}) {
        super(options);
        this.data = ['Hello', 'world', 'this', 'is', 'a', 'test'];
        this.index = 0;
    }

    // _read 메서드를 오버라이드하여 데이터를 스트림에 푸시합니다.
    _read() {
        console.log('Call read', this.data, this.index);
        if (this.index < this.data.length) {
            // 데이터를 스트림에 푸시합니다.
            this.push(this.data[this.index]);
            this.index++;
        } else {
            // 데이터를 모두 푸시한 경우, 스트림을 종료합니다.
            this.push(null);
        }
    }

    // 외부에서 데이터를 수동으로 푸시하는 메서드를 추가할 수도 있습니다.
    pushData(data) {
        this.push(data);
    }
}


function getJsonBody(request: ProtocolRequest): Record<string, any> {
    const rawData = request.uploadData?.find((_: any) => _.type === 'rawData') as UploadRawData;
    if (rawData) {
        return JSON.parse(rawData.bytes.toString());
    }
    return {};
}

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
            const bundleName = url.host;
            const bundleDir = path.join(BUNDLE_ROOT_DIR, bundleName);

            const packageFile = path.join(bundleDir, 'package.json');
            if (!fs.existsSync(packageFile)) {
                console.log('No package.json', packageFile);
                callback({
                    statusCode: 404,
                });
                return;
            }

            const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf-8')) as BundlePackage;
            if (pkg['page-version'] !== 2) {
                callback({
                    statusCode: 403,
                });
                return;
            }

            if (request.method === 'GET') {
                if (url.pathname === '/connect') {
                    if (BundleStream[bundleName]) {

                    }

                    const stream = new Readable({
                        read() { } // Implement read method as needed
                    });


                    BundleStream[bundleName] = stream;

                    callback({
                        data: stream,
                        mimeType: 'text/event-stream',
                    });
                } else {
                    const target = path.join(bundleDir, (pkg.pageRoot || ''), url.pathname);
                    const mimeType = mime.lookup(target) || 'application/octet-stream';

                    if (fs.existsSync(target)) {
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
            } else if (request.method === 'POST') {
                const web = webContents.fromId(1);
                if (url.pathname === '/write') {
                    const ws = BundleStream[bundleName];
                    console.log('ws', ws);
                    ws.push('Hello World\n\n');
                    callback({
                        statusCode: 200,
                    });
                }

                /*
                if ( web ) {
                    web.send('reloadScript', 'asaasdf');
                }
                */
            }
        });
    });
}