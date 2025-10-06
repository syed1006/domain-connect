import { PublicSuffixList } from "./public-suffix-list";
import { resolveTxt as dnsResolveTxt } from "dns";
import { promisify } from "node:util";
import {
    ApplyException,
    AsyncTokenException,
    ConflictOnApplyException,
    DomainConnectException,
    InvalidDomainConnectSettingsException,
    NoDomainConnectRecordException,
    NoDomainConnectSettingsException,
    TemplateNotSupportedException,
} from "./exceptions";
import { DomainConnectConfig } from "./config";
import { DomainConnectConfigData, HttpMethod, HttpStatus } from "src/types";
import { NetworkContext, getHttp, getJson, httpRequestJson } from "src/network";
import { createSign } from "crypto";
import { DomainConnectAsyncContext } from "./async-context";
import { DomainConnectAsyncCredentials } from "./async-credentials";

const resolveTxt = promisify(dnsResolveTxt);

export class DomainConnect {
    private networkContext: NetworkContext;
    private psl = new PublicSuffixList();

    constructor(networkContext = new NetworkContext()) {
        this.networkContext = networkContext;
    }

    static identifyDomainRoot(domain: string): string {
        const psl = new PublicSuffixList();
        return psl.privateSuffix(domain);
    }

    private async identifyDomainConnectApi(domainRoot: string): Promise<string> {
        try {
            const records = await resolveTxt(`_domainconnect.${domainRoot}`);
            if (records && records.length > 0) {
                const domainConnectApi = records[0].join("").replace(/"/g, "");
                console.log(`Domain Connect API ${domainConnectApi} for ${domainRoot} found.`);
                return domainConnectApi;
            }
        } catch (error) {
            console.log(`Failed to find Domain Connect API for "${domainRoot}": ${error}`);
        }

        throw new NoDomainConnectRecordException(`No Domain Connect API found for "${domainRoot}"`);
    }

    async getDomainConfig(domain: string): Promise<DomainConnectConfig> {
        const domainRoot = this.psl.privateSuffix(domain);

        let host = "";
        if (domainRoot.length !== domain.length) {
            host = domain.replace(`.${domainRoot}`, "");
        }

        const domainConnectApi = await this.identifyDomainConnectApi(domainRoot);
        const config = await this.getDomainConfigForRoot(domainRoot, domainConnectApi);

        return new DomainConnectConfig(domain, domainRoot, host, config);
    }

    private async getDomainConfigForRoot(
        domainRoot: string,
        domainConnectApi: string,
    ): Promise<DomainConnectConfigData> {
        const url = `https://${domainConnectApi}/v2/${domainRoot}/settings`;

        try {
            const response = await getJson(this.networkContext, url);
            console.log(
                `Domain Connect config for ${domainRoot} over ${domainConnectApi}: ${JSON.stringify(
                    response,
                )}`,
            );
            return response;
        } catch (error) {
            console.log(`Exception when getting config: ${error}`);
            throw new NoDomainConnectSettingsException(
                `No Domain Connect config found for ${domainRoot}.`,
            );
        }
    }

    private static generateSignature(privateKey: string, data: string): string {
        const sign = createSign("SHA256");
        sign.update(data);
        const signature = sign.sign(privateKey, "base64");
        return signature;
    }

    private static generateSigParams(
        queryParams: string,
        privateKey?: string,
        keyId?: string,
    ): string {
        if (!privateKey || !keyId) {
            throw new InvalidDomainConnectSettingsException(
                "Private key and/or key ID not provided for signing",
            );
        }

        const signature = DomainConnect.generateSignature(privateKey, queryParams);
        const sigParams = new URLSearchParams({ sig: signature, key: keyId });
        return "&" + sigParams.toString();
    }

    async checkTemplateSupported(
        config: DomainConnectConfig,
        providerId: string,
        serviceIds: string | string[],
    ): Promise<void> {
        const serviceIdArray = Array.isArray(serviceIds) ? serviceIds : [serviceIds];

        for (const serviceId of serviceIdArray) {
            const url = `${config.urlAPI}/v2/domainTemplates/providers/${providerId}/services/${serviceId}`;

            try {
                const response = await getHttp(this.networkContext, url);
                console.log(`Template for serviceId: ${serviceId} from ${providerId}: ${response}`);
            } catch (error) {
                console.log(`Exception when getting config: ${error}`);
                throw new TemplateNotSupportedException(
                    `No template for serviceId: ${serviceId} from ${providerId}`,
                );
            }
        }
    }

    async getDomainConnectTemplateSyncUrl(
        domain: string,
        providerId: string,
        serviceId: string,
        redirectUri?: string,
        params: Record<string, any> = {},
        state?: string,
        groupIds?: string[],
        sign = false,
        privateKey?: string,
        keyId?: string,
    ): Promise<string> {
        const config = await this.getDomainConfig(domain);

        await this.checkTemplateSupported(config, providerId, serviceId);

        if (!config.urlSyncUX) {
            throw new InvalidDomainConnectSettingsException("No sync URL in config");
        }

        params.domain = config.domainRoot;
        if (config.host && config.host !== "") {
            params.host = config.host;
        }
        if (redirectUri) {
            params.redirect_uri = redirectUri;
        }
        if (state) {
            params.state = state;
        }
        if (groupIds) {
            params.groupId = groupIds.join(",");
        }

        const sortedParams: [string, string][] = Object.keys(params)
            .sort()
            .map((key) => [key, params[key]]);

        const queryParams = new URLSearchParams(sortedParams).toString();
        const sigParams = sign
            ? DomainConnect.generateSigParams(queryParams, privateKey, keyId)
            : "";

        return `${config.urlSyncUX}/v2/domainTemplates/providers/${providerId}/services/${serviceId}/apply?${queryParams}${sigParams}`;
    }

    async getDomainConnectTemplateAsyncContext(
        domain: string,
        providerId: string,
        serviceId: string | string[],
        redirectUri: string,
        params: Record<string, any> = {},
        state?: string,
        serviceIdInPath = false,
    ): Promise<DomainConnectAsyncContext> {
        const config = await this.getDomainConfig(domain);

        await this.checkTemplateSupported(config, providerId, serviceId);

        if (!config.urlAsyncUX) {
            throw new InvalidDomainConnectSettingsException("No async UX URL in config");
        }

        if (serviceIdInPath && Array.isArray(serviceId)) {
            throw new DomainConnectException(
                "Multiple services are only supported with serviceIdInPath=false",
            );
        }

        if (redirectUri) {
            params.redirect_uri = redirectUri;
        }
        if (state) {
            params.state = state;
        }

        const context = new DomainConnectAsyncContext(
            config,
            providerId,
            serviceId,
            redirectUri,
            params,
        );

        const serviceIdParam = Array.isArray(serviceId) ? serviceId.join("+") : serviceId;
        const sortedParams: [string, string][] = Object.keys(params)
            .sort()
            .map((key) => [key, params[key]]);
        const queryString = new URLSearchParams(sortedParams).toString();

        if (serviceIdInPath) {
            context.asyncConsentUrl = `${config.urlAsyncUX}/v2/domainTemplates/providers/${providerId}/services/${serviceIdParam}?client_id=${providerId}&scope=${serviceIdParam}&domain=${config.domainRoot}&host=${config.host}&${queryString}`;
        } else {
            context.asyncConsentUrl = `${config.urlAsyncUX}/v2/domainTemplates/providers/${providerId}?client_id=${providerId}&scope=${serviceIdParam}&domain=${config.domainRoot}&host=${config.host}&${queryString}`;
        }

        return context;
    }

    async getAsyncToken(
        context: DomainConnectAsyncContext,
        credentials: DomainConnectAsyncCredentials,
    ): Promise<DomainConnectAsyncContext> {
        if (!context.code) {
            throw new AsyncTokenException("No authorization code provided");
        }

        let params: Record<string, string> = {
            code: context.code,
            grant_type: "authorization_code",
        };

        // Check if we can use refresh token
        if (context.iat && context.accessTokenExpiresIn && context.refreshToken) {
            const now = Math.floor(Date.now() / 1000) + 60;
            if (now > context.iat + context.accessTokenExpiresIn) {
                params = {
                    refresh_token: context.refreshToken,
                    grant_type: "refresh_token",
                    client_id: credentials.clientId,
                    client_secret: credentials.clientSecret,
                };
            } else {
                console.log("Context has a valid access token");
                return context;
            }
        }

        params.redirect_uri = context.returnUrl;

        const queryString: [string, string][] = Object.keys(params)
            .sort()
            .map((key) => [key, params[key]]);
        const url = `${context.config.urlAPI}/v2/oauth/access_token?${new URLSearchParams(
            queryString,
        ).toString()}`;

        try {
            if (credentials.apiUrl !== context.config.urlAPI) {
                throw new AsyncTokenException(
                    "URL API for provider does not match registered one with credentials",
                );
            }

            const [data, status] = await httpRequestJson(this.networkContext, {
                method: HttpMethod.POST,
                url,
                body: JSON.stringify({
                    client_id: credentials.clientId,
                    client_secret: credentials.clientSecret,
                }),
                contentType: "application/json",
                acceptedStatuses: [HttpStatus.OK, HttpStatus.BAD_REQUEST],
            });

            if (status === HttpStatus.BAD_REQUEST) {
                const errorDesc = data.error_description || "";
                throw new AsyncTokenException(
                    `Failed to get async token: ${status} ${data.error} ${errorDesc}`,
                );
            }

            if (
                !data.access_token ||
                !data.expires_in ||
                !data.token_type ||
                data.token_type.toLowerCase() !== "bearer"
            ) {
                throw new AsyncTokenException(`Token not complete: ${JSON.stringify(data)}`);
            }

            context.accessToken = data.access_token;
            context.accessTokenExpiresIn = data.expires_in;
            context.iat = Math.floor(Date.now() / 1000);

            if (data.refresh_token) {
                context.refreshToken = data.refresh_token;
            }

            return context;
        } catch (error) {
            if (error instanceof AsyncTokenException) {
                throw error;
            }
            console.log(`Cannot get async token: ${error}`);
            throw new AsyncTokenException(`Cannot get async token: ${error}`);
        }
    }

    async applyDomainConnectTemplateAsync(
        context: DomainConnectAsyncContext,
        host?: string,
        serviceId?: string | string[],
        params: Record<string, any> = {},
        force = false,
        groupIds?: string[],
    ): Promise<void> {
        const actualHost = host || context.config.host;
        const actualServiceId = serviceId || context.serviceId;

        if (groupIds) {
            params.groupId = groupIds.join(",");
        }

        if (force) {
            params.force = "true";
        }

        const serviceIdParam = Array.isArray(actualServiceId)
            ? actualServiceId.join("+")
            : actualServiceId;
        const sortedParams: [string, string][] = Object.keys(params)
            .sort()
            .map((key) => [key, params[key]]);
        const queryString = new URLSearchParams(sortedParams).toString();

        const url = `${context.config.urlAPI}/v2/domainTemplates/providers/${context.providerId}/services/${serviceIdParam}/apply?domain=${context.config.domainRoot}&host=${actualHost}&${queryString}`;

        try {
            const [res, status] = await httpRequestJson(this.networkContext, {
                method: HttpMethod.POST,
                url,
                bearer: context.accessToken,
                acceptedStatuses: [HttpStatus.OK, HttpStatus.ACCEPTED, HttpStatus.CONFLICT],
            });

            if (status === HttpStatus.CONFLICT) {
                throw new ConflictOnApplyException(`Conflict: ${JSON.stringify(res)}`);
            }
        } catch (error) {
            if (error instanceof ConflictOnApplyException) {
                throw error;
            }
            throw new ApplyException(`Error on apply: ${error}`);
        }
    }
}
