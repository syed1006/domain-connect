export class DomainConnectException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DomainConnectException";
    }
}

export class TemplateDoesNotExistException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "TemplateDoesNotExistException";
    }
}

export class NoDomainConnectRecordException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "NoDomainConnectRecordException";
    }
}

export class NoDomainConnectSettingsException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "NoDomainConnectSettingsException";
    }
}

export class InvalidDomainConnectSettingsException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "InvalidDomainConnectSettingsException";
    }
}

export class TemplateNotSupportedException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "TemplateNotSupportedException";
    }
}

export class ConflictOnApplyException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "ConflictOnApplyException";
    }
}

export class ApplyException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "ApplyException";
    }
}

export class AsyncTokenException extends DomainConnectException {
    constructor(message: string) {
        super(message);
        this.name = "AsyncTokenException";
    }
}
