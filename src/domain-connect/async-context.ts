import { DomainConnectConfig } from "./config";

export class DomainConnectAsyncContext {
    config: DomainConnectConfig;
    providerId: string;
    serviceId: string | string[];
    clientSecret = "";
    asyncConsentUrl?: string;
    code?: string;
    params: Record<string, any>;
    returnUrl: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresIn?: number;
    iat?: number;

    constructor(
        config: DomainConnectConfig,
        providerId: string,
        serviceId: string | string[],
        returnUrl: string,
        params: Record<string, any>
    ) {
        this.config = config;
        this.providerId = providerId;
        this.serviceId = serviceId;
        this.returnUrl = returnUrl;
        this.params = params;
    }
}
