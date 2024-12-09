import { ProtocolRequest, protocol } from "electron";
import { Application } from 'express';
import supertest from "supertest";
import { AllMethods } from "supertest/types";

async function requestMockHttp(requestInfo: Request, app: Application): Promise<Response> {
    const url = new URL(requestInfo.url);
    const method = requestInfo.method.toLowerCase();

    console.log(`request stp info :: domain: [${url.host}] url: [${url.pathname + url.search}] method: [${method}]`, requestInfo)
    const req = supertest(app)[method as AllMethods](url.pathname + url.search);

    Object.entries(requestInfo.headers).forEach(([key, value]) => {
        req.set(key, value);
    });

    if ( requestInfo.body ) {
        req.send(requestInfo.body);
    }

    const serverResponse = await req;

    const headers = new Headers();
    for (const [key, value] of Object.entries(serverResponse.headers)) {
        headers.append(key, value);
        if ( key.toLowerCase() === 'content-type' ) {
            if ( value.includes('application/json') ) {
                serverResponse.body = JSON.stringify(serverResponse.body);
            }
        }
    }

    console.log('body', serverResponse.body);
    return new Response(serverResponse.body, {
        status: serverResponse.status,
        statusText: '',
        headers,
    });
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
        protocol.handle(PROTOCOL_SCHEMA, async (request: Request) => {
            const url = new URL(request.url);
            if ( hosts.has(url.host) ) {
                const expressApp = hosts.get(url.host) as Application;
                const res = await requestMockHttp(request, expressApp);

                console.log('stp response :: ', res);
                return res;
            } else {
                return new Response(JSON.stringify({
                    status: 404,
                }), {
                    headers: { 'content-type': 'application/json' },
                });
            }
        });
    });
}