# domain-connect-ts

A TypeScript/JavaScript implementation of the [Domain Connect Protocol](https://domainconnect.org/) for automated domain DNS configuration.

## Installation

```bash
npm install domain-connect-ts
```

## Table of Contents

- [Quick Start](#quick-start)
- [Synchronous Flow](#synchronous-flow)
- [Asynchronous Flow](#asynchronous-flow)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Quick Start

```typescript
import { DomainConnect } from "domain-connect-ts";

const dc = new DomainConnect();

// Get domain configuration
const config = await dc.getDomainConfig("example.com");
console.log(config);
```

## Synchronous Flow

The synchronous flow generates a URL that redirects users to their DNS provider to authorize and apply DNS template changes immediately.

### Basic Sync Flow

```typescript
import { DomainConnect } from "domain-connect-ts";

const dc = new DomainConnect();

const syncUrl = await dc.getDomainConnectTemplateSyncUrl(
    "example.com", // Domain to configure
    "myservice.com", // Provider ID
    "subdomain", // Service/Template ID
    "https://myservice.com/callback", // Redirect URI after completion
    {
        // Template parameters
        ARecordIP: "192.168.1.1",
        host: "app",
    },
);

console.log("Redirect user to:", syncUrl);
```

### Sync Flow with OAuth Signing

For secure template application, sign requests with your private key:

```typescript
import { DomainConnect } from "domain-connect-ts";
import { readFileSync } from "node:fs";

const dc = new DomainConnect();
const privateKey = readFileSync("./private_key.pem", "utf-8");

const syncUrl = await dc.getDomainConnectTemplateSyncUrl(
    "syedcodes.lol",
    "certdashboard.cloud",
    "subdomain",
    "certdashboard.cloud",
    {
        ARecordIP: "192.168.22.0",
        host: "lol",
    },
    undefined, // state (optional)
    [], // groupIds (optional)
    true, // sign the request
    privateKey, // your private key
    "_dck1", // key identifier
);

console.log(syncUrl);
```

### Sync Flow with State and Groups

```typescript
const syncUrl = await dc.getDomainConnectTemplateSyncUrl(
    "example.com",
    "provider.com",
    "template-id",
    "https://provider.com/callback",
    { param1: "value1" },
    "custom-state-data", // State to preserve through redirect
    ["group1", "group2"], // Group IDs for template grouping
    false, // No signing
);
```

## Asynchronous Flow

The asynchronous flow uses OAuth for authorization and allows for more complex, multi-step DNS configurations.

### Step 1: Get Async Context and Consent URL

```typescript
import { DomainConnect } from "domain-connect-ts";

const dc = new DomainConnect();

const context = await dc.getDomainConnectTemplateAsyncContext(
    "example.com",
    "provider-id",
    "service-id", // Can be string or array of strings
    "https://provider.com/callback",
    { param1: "value1" },
    "optional-state",
);

console.log("Redirect user to:", context.asyncConsentUrl);
```

### Step 2: Exchange Authorization Code for Access Token

After the user authorizes and is redirected back with a code:

```typescript
import { DomainConnectAsyncCredentials } from "domain-connect-ts";

// Set the authorization code from callback
context.code = "authorization-code-from-callback";

// Create credentials object
const credentials = new DomainConnectAsyncCredentials(
    "https://api.provider.com", // API URL
    "client-id",
    "client-secret",
);

// Get access token
const authenticatedContext = await dc.getAsyncToken(context, credentials);
```

### Step 3: Apply Template

```typescript
await dc.applyDomainConnectTemplateAsync(
    authenticatedContext,
    "subdomain", // host (optional, uses context default if not provided)
    "service-id", // serviceId (optional, uses context default if not provided)
    { ARecordIP: "192.168.1.1" }, // Additional parameters
    false, // force (apply even if conflicts exist)
    ["group1"], // groupIds (optional)
);

console.log("Template applied successfully!");
```

### Multiple Services

```typescript
const context = await dc.getDomainConnectTemplateAsyncContext(
    "example.com",
    "provider-id",
    ["service-id-1", "service-id-2"], // Array of service IDs
    "https://provider.com/callback",
    {},
    undefined,
    false, // serviceIdInPath must be false for multiple services
);
```

### Refresh Token Flow

The library automatically handles token refresh:

```typescript
// If access token is expired and refresh token exists,
// getAsyncToken will automatically refresh it
const refreshedContext = await dc.getAsyncToken(context, credentials);
```

## API Reference

### `DomainConnect`

Main class for Domain Connect operations.

#### Constructor

```typescript
constructor(networkContext?: NetworkContext)
```

Creates a new DomainConnect instance with optional custom network context.

#### Methods

##### `getDomainConfig(domain: string): Promise<DomainConnectConfig>`

Retrieves Domain Connect configuration for a domain.

**Returns:** Configuration object containing domain settings and API endpoints.

##### `getDomainConnectTemplateSyncUrl()`

```typescript
getDomainConnectTemplateSyncUrl(
    domain: string,
    providerId: string,
    serviceId: string,
    redirectUri?: string,
    params?: Record<string, any>,
    state?: string,
    groupIds?: string[],
    sign?: boolean,
    privateKey?: string,
    keyId?: string
): Promise<string>
```

Generates synchronous authorization URL for DNS template application.

**Parameters:**

- `domain`: Domain to configure
- `providerId`: Service provider identifier
- `serviceId`: Template/service identifier
- `redirectUri`: Callback URL after completion (optional)
- `params`: Template variables as key-value pairs (default: `{}`)
- `state`: State parameter for OAuth flow (optional)
- `groupIds`: Array of group identifiers (optional)
- `sign`: Whether to sign request with OAuth (default: `false`)
- `privateKey`: Private key for signing (required if `sign` is `true`)
- `keyId`: Key identifier for signing (required if `sign` is `true`)

**Returns:** Authorization URL string

##### `getDomainConnectTemplateAsyncContext()`

```typescript
getDomainConnectTemplateAsyncContext(
    domain: string,
    providerId: string,
    serviceId: string | string[],
    redirectUri: string,
    params?: Record<string, any>,
    state?: string,
    serviceIdInPath?: boolean
): Promise<DomainConnectAsyncContext>
```

Creates async context and consent URL for OAuth flow.

**Parameters:**

- `domain`: Domain to configure
- `providerId`: Service provider identifier
- `serviceId`: Template identifier(s) - string or array
- `redirectUri`: OAuth callback URL
- `params`: Template variables (default: `{}`)
- `state`: OAuth state parameter (optional)
- `serviceIdInPath`: Include service ID in URL path vs query (default: `false`)

**Returns:** `DomainConnectAsyncContext` with consent URL

##### `getAsyncToken()`

```typescript
getAsyncToken(
    context: DomainConnectAsyncContext,
    credentials: DomainConnectAsyncCredentials
): Promise<DomainConnectAsyncContext>
```

Exchanges authorization code for access token or refreshes expired token.

**Parameters:**

- `context`: Async context with authorization code
- `credentials`: Client credentials for OAuth

**Returns:** Updated context with access token

##### `applyDomainConnectTemplateAsync()`

```typescript
applyDomainConnectTemplateAsync(
    context: DomainConnectAsyncContext,
    host?: string,
    serviceId?: string | string[],
    params?: Record<string, any>,
    force?: boolean,
    groupIds?: string[]
): Promise<void>
```

Applies DNS template using async flow.

**Parameters:**

- `context`: Authenticated async context
- `host`: Subdomain/host to configure (optional, uses context default)
- `serviceId`: Template identifier(s) (optional, uses context default)
- `params`: Template variables (default: `{}`)
- `force`: Apply even with conflicts (default: `false`)
- `groupIds`: Group identifiers (optional)

##### `checkTemplateSupported()`

```typescript
checkTemplateSupported(
    config: DomainConnectConfig,
    providerId: string,
    serviceIds: string | string[]
): Promise<void>
```

Verifies if template(s) are supported by the DNS provider.

**Throws:** `TemplateNotSupportedException` if template not available

#### Static Methods

##### `identifyDomainRoot(domain: string): string`

Extracts the root domain from a subdomain.

```typescript
const root = DomainConnect.identifyDomainRoot("app.example.com");
// Returns: "example.com"
```

## Error Handling

The library throws specific exceptions for different error cases:

```typescript
import {
    DomainConnectException,
    NoDomainConnectRecordException,
    InvalidDomainConnectSettingsException,
    TemplateNotSupportedException,
    AsyncTokenException,
    ApplyException,
    ConflictOnApplyException,
} from "domain-connect-ts";

try {
    await dc.applyDomainConnectTemplateAsync(context);
} catch (error) {
    if (error instanceof ConflictOnApplyException) {
        // Handle DNS record conflicts
        console.log("Conflict detected, retry with force=true");
    } else if (error instanceof AsyncTokenException) {
        // Handle token/auth errors
        console.log("Authentication failed");
    } else if (error instanceof TemplateNotSupportedException) {
        // Handle unsupported template
        console.log("Template not supported by DNS provider");
    }
}
```

## Examples

### Complete Sync Flow Example

```typescript
import { DomainConnect } from "domain-connect-ts";
import { readFileSync } from "node:fs";

async function setupDomain() {
    const dc = new DomainConnect();

    // Check domain configuration
    const config = await dc.getDomainConfig("example.com");
    console.log("Domain config:", config);

    // Generate signed sync URL
    const privateKey = readFileSync("./private_key.pem", "utf-8");
    const syncUrl = await dc.getDomainConnectTemplateSyncUrl(
        "example.com",
        "myservice.com",
        "subdomain-template",
        "https://myservice.com/success",
        {
            ARecordIP: "192.168.1.1",
            host: "app",
        },
        "user-123",
        [],
        true,
        privateKey,
        "_dck1",
    );

    console.log("Redirect user to:", syncUrl);
}

setupDomain().catch(console.error);
```

### Complete Async Flow Example

```typescript
import { DomainConnect, DomainConnectAsyncCredentials } from "domain-connect-ts";

async function asyncSetup() {
    const dc = new DomainConnect();

    // Step 1: Get consent URL
    const context = await dc.getDomainConnectTemplateAsyncContext(
        "example.com",
        "provider-id",
        "service-id",
        "https://myapp.com/callback",
        { initialParam: "value" },
        "user-session-123",
    );

    console.log("Consent URL:", context.asyncConsentUrl);

    // Step 2: User authorizes and returns with code
    // (In real app, this comes from OAuth callback)
    context.code = "auth-code-from-callback";

    // Step 3: Exchange code for token
    const credentials = new DomainConnectAsyncCredentials(
        "https://api.provider.com",
        "my-client-id",
        "my-client-secret",
    );

    const authedContext = await dc.getAsyncToken(context, credentials);

    // Step 4: Apply template
    await dc.applyDomainConnectTemplateAsync(
        authedContext,
        "www",
        undefined,
        { ARecordIP: "192.168.1.1" },
        false,
        ["production"],
    );

    console.log("DNS configured successfully!");
}

asyncSetup().catch(console.error);
```

### Handling Conflicts

```typescript
import { ConflictOnApplyException } from "domain-connect-ts";

try {
    await dc.applyDomainConnectTemplateAsync(context);
} catch (error) {
    if (error instanceof ConflictOnApplyException) {
        console.log("Conflict detected, applying with force...");
        await dc.applyDomainConnectTemplateAsync(
            context,
            undefined,
            undefined,
            {},
            true, // force=true to overwrite existing records
        );
    }
}
```

## OAuth Key Generation

For signed sync requests, generate RSA keys:

```bash
# Generate private key
openssl genrsa -out private_key.pem 2048

# Extract public key
openssl rsa -in private_key.pem -pubout -out public_key.pem
```

Register the public key with your DNS provider using a key identifier (e.g., `_dck1`).

## Resources

- [Domain Connect Protocol](https://domainconnect.org/)
- [Domain Connect Specification](https://github.com/Domain-Connect/spec)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
