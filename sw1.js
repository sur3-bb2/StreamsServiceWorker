self.addEventListener('install', event => {
    console.log(event);

    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log(event);

    clients.claim();
});

self.addEventListener('fetch', event => {
    const url = 'https://jakearchibald.github.io/isserviceworkerready/demos/transform-stream/cloud.html';

    if(!event.request.url.startsWith('http://localhost')) return;

    event.respondWith(
        fetch(url).then(response => {
            return replaceResponse(response, 4, /cloud/ig, match => {
                if (match.toUpperCase() == match) return 'BUTT';
                if (match[0] == 'C') return 'Butt';
                return 'butt';
            });
        })
    );
});

function replaceResponse(response, bufferSize, match, replacer) {
    const reader = response.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let bufferStr = '';

    const stream = new ReadableStream({
        pull : controller => {
            return reader.read().then(result => {
                if (result.done) {
                    controller.enqueue(encoder.encode(bufferStr));
                    controller.close();
                    return;
                }

                const bytes = result.value;
                bufferStr += decoder.decode(bytes, {stream: true});

                // this is the end of the final replacement in the FINAL string
                let lastReplaceEnds = 0;
                let replacedLengthDiff = 0;
                bufferStr = bufferStr.replace(match, (...args) => {
                    const matched = args[0];
                    // offset is the offset in the original string, hence replacedLengthDiff
                    const offset = args[args.length - 2];
                    const replacement = replacer(...args);

                    replacedLengthDiff += replacement.length - matched.length;
                    lastReplaceEnds = offset + matched.length + replacedLengthDiff;
                    return replacement;
                });

                const newBufferStart = Math.max(bufferStr.length - bufferSize, lastReplaceEnds);
                controller.enqueue(encoder.encode(bufferStr.slice(0, newBufferStart)));
                bufferStr = bufferStr.slice(newBufferStart);
            });
        },

        cancel : () => {
            reader.close();
        }
    });

    return new Response(stream, {
        headers: response.headers
    });
}