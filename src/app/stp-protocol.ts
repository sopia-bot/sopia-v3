import { ProtocolRequest, protocol } from "electron";
import express, { Application } from 'express';
import supertest, { Response } from "supertest";
import { AllMethods } from "supertest/types";

function requestMockHttp(requestInfo: ProtocolRequest, app: Application): Promise<Response> {
    const url = new URL(requestInfo.url);
    const method = requestInfo.method.toLowerCase();
    const req = supertest(app)[method as AllMethods](url.pathname + url.search);

    Object.entries(requestInfo.headers).forEach(([key, value]) => {
        req.set(key, value);
    });

    return req;
}

const PROTOCOL_SCHEMA = 'stp';
const hosts: Map<string, Application> = new Map();

export function registerStpApp(domain: string, expressApp: Application) {
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
                callback({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: res.body,
                });
            } else {
                callback({
                    statusCode: 404,
                });
            }
        });
    });
}