import { ProtocolRequest, protocol } from "electron";
import { Application } from 'express';
import supertest, { Response } from "supertest";
import { AllMethods } from "supertest/types";

function requestMockHttp(requestInfo: ProtocolRequest, app: Application): Promise<Response> {
    const url = new URL(requestInfo.url);
    const method = requestInfo.method.toLowerCase();

    console.log(`request stp info :: domain: [${url.host}] url: [${url.pathname + url.search}] method: [${method}]`, requestInfo)
    const req = supertest(app)[method as AllMethods](url.pathname + url.search);

    Object.entries(requestInfo.headers).forEach(([key, value]) => {
        req.set(key, value);
    });

    if ( requestInfo.uploadData?.length ) {
        const data = JSON.parse(requestInfo.uploadData[0].bytes.toString('utf-8'));
        req.send(data);
    }

    return req;
}

const PROTOCOL_SCHEMA = 'stp';
const hosts: Map<string, Application> = new Map();

export function registerStpApp(domain: string, expressApp: Application) {
    console.log(`register stp app :: domain=${domain}`);
    if ( hosts.has(domain) ) {
        hosts.delete(domain);
    }
    hosts.set(domain, expressApp);
}

export function registerSopiaTextProtocol(app: Electron.App) {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: PROTOCOL_SCHEMA,
            privileges: {
                secure: true,
                standard: true,
                supportFetchAPI: true,
                corsEnabled: false,
            },
        },
    ]);

    app.on('ready', () => {
        protocol.registerStringProtocol(PROTOCOL_SCHEMA, async (request: ProtocolRequest, callback) => {
            const url = new URL(request.url);
            if ( hosts.has(url.host) ) {
                const expressApp = hosts.get(url.host) as Application;
                const res = await requestMockHttp(request, expressApp);

                const cbData = {
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: res.text,
                };

                console.log('stp response :: ', cbData);
                callback(cbData);
            } else {
                callback({
                    statusCode: 404,
                });
            }
        });
    });
}