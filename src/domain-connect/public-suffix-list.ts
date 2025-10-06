import * as psl from "psl";

export class PublicSuffixList {
    privateSuffix(domain: string): string {
        const normalizedDomain = domain.toLowerCase().trim();

        const parsed = psl.parse(normalizedDomain);

        if (isParsedDomain(parsed) && parsed.domain) {
            return parsed.domain;
        }

        return this.fallbackLogic(normalizedDomain);
    }

    private fallbackLogic(domain: string): string {
        const parts = domain.split(".");
        return parts.length >= 2 ? parts.slice(-2).join(".") : domain;
    }
}

function isParsedDomain(
    result: psl.ParsedDomain | psl.ErrorResult<keyof psl.errorCodes>,
): result is psl.ParsedDomain {
    return !("error" in result);
}
