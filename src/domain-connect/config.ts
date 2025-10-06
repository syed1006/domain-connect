import { DomainConnectConfigData } from "src/types";

export class DomainConnectConfig {
    domain: string;
    domainRoot: string;
    host: string;
    hosts: Record<string, any> = {};
    urlSyncUX?: string;
    urlAsyncUX?: string;
    urlAPI?: string;
    providerId?: string;
    providerName?: string;
    providerDisplayName?: string;
    uxSize?: [number, number];
    urlControlPanel?: string;

    constructor(domain: string, domainRoot: string, host: string, config: DomainConnectConfigData) {
        this.domain = domain;
        this.domainRoot = domainRoot;
        this.host = host;

        if (config.urlSyncUX) this.urlSyncUX = config.urlSyncUX;
        if (config.urlAsyncUX) this.urlAsyncUX = config.urlAsyncUX;
        if (config.urlAPI) this.urlAPI = config.urlAPI;
        if (config.providerId) this.providerId = config.providerId;
        if (config.providerName) this.providerName = config.providerName;
        if (config.providerDisplayName) this.providerDisplayName = config.providerDisplayName;
        if (config.width && config.height) this.uxSize = [config.width, config.height];
        if (config.urlControlPanel) this.urlControlPanel = config.urlControlPanel;
    }
}
