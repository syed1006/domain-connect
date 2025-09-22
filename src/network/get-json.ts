import { NetworkContext } from "./context";
import { getHttp } from "./get-http";

export async function getJson(context: NetworkContext, url: string): Promise<any> {
    const response = await getHttp(context, url);
    return JSON.parse(response);
}
