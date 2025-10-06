export class DomainConnectAsyncCredentials {
    clientId: string;
    clientSecret: string;
    apiUrl: string;

    constructor(clientId: string, clientSecret: string, apiUrl: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.apiUrl = apiUrl;
    }
}
