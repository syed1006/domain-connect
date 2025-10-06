import { HttpRequestOptions } from "src/types";
import { NetworkContext } from "./context";
import { httpRequest } from "./http-request";

export async function httpRequestJson(
    context: NetworkContext,
    options: HttpRequestOptions,
): Promise<[any, number]> {
    const [response, status] = await httpRequest(context, options);
    try {
        return [JSON.parse(response), status];
    } catch (e) {
        throw new Error(`Invalid JSON returned (${status}): ${response}`);
    }
}
