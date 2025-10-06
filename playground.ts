import { DomainConnect } from "./src";
import { readFileSync } from "node:fs";

async function main() {
    const dc = new DomainConnect();

    const private_key_content = readFileSync("./private_key.pem");

    const res = await dc.getDomainConnectTemplateSyncUrl(
        "syedcodes.lol",
        "certdashboard.cloud",
        "subdomain",
        "certdashboard.cloud",
        { ARecordIP: "192.168.22.0", host: "lol" },
        undefined,
        [],
        true,
        private_key_content.toString(),
        "_dck1",
    );
    console.log(res);
    console.log(await dc.getDomainConfig("syedcodes.lol"));
}

main().catch(console.error);
