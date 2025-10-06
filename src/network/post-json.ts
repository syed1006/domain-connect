import { ContentType, HttpMethod, HttpStatus } from "src/types";
import { NetworkContext } from "./context";
import { httpRequest } from "./http-request";

export async function postJson(
    context: NetworkContext,
    url: string,
    content: any,
    basicAuth?: [string, string],
    bearer?: string,
): Promise<string> {
    const [response, status] = await httpRequest(context, {
        method: HttpMethod.POST,
        url,
        body: JSON.stringify(content),
        basicAuth,
        bearer,
        contentType: ContentType.APPLICATION_JSON,
    });

    if (status !== HttpStatus.OK) {
        throw new Error(`Failed to POST json to ${url}`);
    }

    return response;
}
