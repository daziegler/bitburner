// Function will weaken servers from the validServersWithoutOwn.txt if possible

/** @param {NS} ns **/
export async function main(ns) {
    let serversToWeaken = await ns.read('validServersWithoutOwn.txt').split(',');
    let serversToIgnore = [];
    while (serversToIgnore.length < serversToWeaken.length) {
        for (let i = 0; i < serversToWeaken.length; i++) {
            let serverToWeaken = serversToWeaken[i];
            if (serversToIgnore.includes(serverToWeaken)) {
                continue;
            }

            if (ns.getServerSecurityLevel(serverToWeaken) > ns.getServerMinSecurityLevel(serverToWeaken)) {
                await ns.weaken(serverToWeaken);
                continue;
            }

            serversToIgnore.push(serverToWeaken);
        }
    }
}
