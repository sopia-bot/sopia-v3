
const transducer = {
    'application/json': (mimeType: string, body: Buffer) => {
        return JSON.parse(body.toString());
    }
}

export default function(mimeType: string, body: Buffer) {
    const type = mimeType.split(';')[0];
    if ( transducer[type] ) {
        return transducer[type](mimeType, body);
    }
    return body;
}