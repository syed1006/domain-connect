import { HttpMethod } from "src/types";
import { NetworkContext } from "./context";
import { httpRequest } from "./http-request";

export async function getHttp(context: NetworkContext, url: string): Promise<string> {
    const [response] = await httpRequest(context, { method: HttpMethod.GET, url });
    return response;
}
