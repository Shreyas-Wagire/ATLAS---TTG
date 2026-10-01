import { resolve as pathResolve, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') || specifier.startsWith('file://')) {
        const parentURL = context.parentURL;
        if (parentURL) {
            let resolvedUrl;
            try {
                resolvedUrl = new URL(specifier, parentURL);
            } catch {
                return nextResolve(specifier, context);
            }
            const resolvedPath = fileURLToPath(resolvedUrl);
            if (!extname(resolvedPath)) {
                for (const ext of ['.js', '.jsx', '.json', '.mjs']) {
                    if (existsSync(resolvedPath + ext)) {
                        return {
                            format: ext === '.json' ? 'json' : 'module',
                            shortCircuit: true,
                            url: pathToFileURL(resolvedPath + ext).href,
                        };
                    }
                }
            }
        }
    }
    return nextResolve(specifier, context);
}
