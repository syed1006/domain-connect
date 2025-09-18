import * as http from "http";
import * as https from "https";
import { URL } from "url";
import { HttpRequestOptions, HttpStatus } from "src/types";
import { NetworkContext } from "./context";

function parseUrl(requestUrl: string): {
    protocol: string;
    host: string;
    path: string;
    isHttps: boolean;
} {
    const urlParts = requestUrl.match(/^(https?):\/\/([^:\/]+(?::\d+)?)(\/.*)/i);
    if (!urlParts) {
        throw new Error("Given URL is not valid");
    }

    const [, protocol, host, path] = urlParts;
    const isHttps = protocol.toLowerCase() === "https";

    return { protocol, host, path, isHttps };
}

function buildHeaders(options: HttpRequestOptions): Record<string, string> {
    const { basicAuth, bearer, contentType, accepts, cacheControl } = options;
    const headers: Record<string, string> = {};

    if (basicAuth) {
        const [user, password] = basicAuth;
        const credentials = Buffer.from(`${user}:${password}`).toString("base64");
        headers["Authorization"] = `Basic ${credentials}`;
    }

    if (bearer) {
        headers["Authorization"] = `Bearer ${bearer}`;
    }

    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    if (accepts) {
        headers["Accept"] = accepts;
    }

    if (cacheControl) {
        headers["Cache-Control"] = cacheControl;
    }

    return headers;
}

function buildRequestOptions(
    options: HttpRequestOptions,
    headers: Record<string, string>,
    context: NetworkContext,
    parsedUrl: URL,
    isHttps: boolean
): http.RequestOptions {
    const { method } = options;
    const requestOptions: http.RequestOptions = {
        method,
        headers,
    };

    // Handle proxy configuration
    if (context.proxyHost && context.proxyPort) {
        console.debug(`using proxy ${context.proxyHost}:${context.proxyPort}`);

        if (isHttps) {
            requestOptions.hostname = context.proxyHost;
            requestOptions.port = context.proxyPort;
            requestOptions.path = options.url;
        } else {
            requestOptions.hostname = context.proxyHost;
            requestOptions.port = context.proxyPort;
            requestOptions.path = options.url;
        }
    } else {
        requestOptions.hostname = parsedUrl.hostname;
        requestOptions.port = parsedUrl.port;
        requestOptions.path = parsedUrl.pathname + parsedUrl.search;
    }

    if (isHttps) {
        (requestOptions as https.RequestOptions).rejectUnauthorized = false;
    }

    return requestOptions;
}

function createResponseHandler(
    requestUrl: string,
    acceptedStatuses: number[]
): (res: http.IncomingMessage) => Promise<[string, number]> {
    return (res: http.IncomingMessage): Promise<[string, number]> => {
        return new Promise((resolve, reject) => {
            if (!acceptedStatuses.includes(res.statusCode || 0)) {
                console.debug(`Failed to query ${requestUrl}: ${res.statusCode}`);
                reject(
                    new Error(`Failed to read from ${requestUrl}. HTTP code: ${res.statusCode}`)
                );
                return;
            }

            let data = "";
            res.setEncoding("utf8");

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                resolve([data, res.statusCode || 0]);
            });

            res.on("error", (err) => {
                reject(err);
            });
        });
    };
}

function handleHttpsProxy(
    context: NetworkContext,
    parsedUrl: URL,
    options: HttpRequestOptions,
    headers: Record<string, string>
): Promise<[string, number]> {
    return new Promise((resolve, reject) => {
        const { method, body } = options;

        const agent = new https.Agent({
            rejectUnauthorized: false,
        });

        const proxyReq = http.request({
            hostname: context.proxyHost,
            port: context.proxyPort,
            method: "CONNECT",
            path: `${parsedUrl.hostname}:${parsedUrl.port || 443}`,
        });

        proxyReq.on("connect", (res, socket) => {
            if (res.statusCode !== HttpStatus.OK) {
                reject(new Error(`Proxy connection failed: ${res.statusCode}`));
                return;
            }

            const httpsOptions: https.RequestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method,
                headers,
                rejectUnauthorized: false,
                createConnection: () => socket,
            };

            const acceptedStatuses = options.acceptedStatuses || [200];
            const handleResponse = createResponseHandler(options.url, acceptedStatuses);

            const req = https.request(httpsOptions, async (res) => {
                try {
                    const result = await handleResponse(res);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });

            req.on("error", (err) => {
                reject(err);
            });

            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error("Request timeout"));
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });

        proxyReq.on("error", (err) => {
            reject(err);
        });

        proxyReq.end();
    });
}

function executeRequest(
    requestOptions: http.RequestOptions,
    isHttps: boolean,
    options: HttpRequestOptions,
    handleResponse: (res: http.IncomingMessage) => Promise<[string, number]>
): Promise<[string, number]> {
    return new Promise((resolve, reject) => {
        const { body } = options;

        const client = isHttps ? https : http;
        const req = client.request(requestOptions, async (res) => {
            try {
                const result = await handleResponse(res);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

export async function httpRequest(
    context: NetworkContext,
    options: HttpRequestOptions
): Promise<[string, number]> {
    const { method, url: requestUrl } = options;
    const acceptedStatuses = options.acceptedStatuses || [HttpStatus.OK];

    const { protocol, host, path, isHttps } = parseUrl(requestUrl);

    const headers = buildHeaders(options);

    const parsedUrl = new URL(requestUrl);

    console.debug(`method = ${method}, protocol = ${protocol}, host = ${host}, path = ${path}`);

    if (context.proxyHost && context.proxyPort && isHttps) {
        return handleHttpsProxy(context, parsedUrl, options, headers);
    }

    const requestOptions = buildRequestOptions(options, headers, context, parsedUrl, isHttps);

    const handleResponse = createResponseHandler(requestUrl, acceptedStatuses);

    return executeRequest(requestOptions, isHttps, options, handleResponse);
}
