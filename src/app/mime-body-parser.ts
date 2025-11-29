import Busboy from 'busboy';
import { Readable } from 'stream';

const transducer = {
    'application/json': (mimeType: string, body: Buffer) => {
        return JSON.parse(body.toString());
    },
    'multipart/form-data': async (mimeType: string, body: Buffer) => {
        return new Promise((resolve, reject) => {
            const busboy = Busboy({ headers: { 'content-type': mimeType } });
            const fields: Record<string, any> = {};
            const files: Array<{ field: string; filename: string; encoding: string; mimetype: string; data: Buffer }> = [];

            busboy.on('field', (name, value) => {
                fields[name] = value;
            });

            busboy.on('file', (name, file, info) => {
                const { filename, encoding, mimeType: mimetype } = info;
                const chunks: Buffer[] = [];
                
                file.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                file.on('end', () => {
                    files.push({
                        field: name,
                        filename,
                        encoding,
                        mimetype,
                        data: Buffer.concat(chunks)
                    });
                });
            });

            busboy.on('finish', () => {
                resolve({ fields, files });
            });

            busboy.on('error', (err) => {
                reject(err);
            });

            const readable = Readable.from(body);
            readable.pipe(busboy);
        });
    }
}

export default async function(mimeType: string, body: Buffer) {
    const type = mimeType.split(';')[0];
    if ( transducer[type] ) {
        return await transducer[type](mimeType, body);
    }
    return body;
}