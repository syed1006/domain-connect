export interface NetworkContextOptions {
    proxyHost?: string;
    proxyPort?: number;
    nameservers?: string[];
}

export interface HttpRequestOptions {
    method: string;
    url: string;
    body?: string;
    basicAuth?: [string, string];
    bearer?: string;
    contentType?: string;
    accepts?: string;
    cacheControl?: string;
    acceptedStatuses?: number[];
}
