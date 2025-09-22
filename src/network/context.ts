import { NetworkContextOptions } from "src/types";

export class NetworkContext {
    proxyHost?: string;
    proxyPort?: number;
    nameservers?: string[];

    constructor(options: NetworkContextOptions = {}) {
        this.proxyHost = options.proxyHost;
        this.proxyPort = options.proxyPort;
        this.nameservers = options.nameservers;
    }
}
