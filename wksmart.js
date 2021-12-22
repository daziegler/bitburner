/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        let serversToWeaken = [];
        if (ns.args.length > 0) {
            serversToWeaken = ns.args[0].split(',');
        } else {
            serversToWeaken = await ns.read('validServersWithoutOwn.txt').split(',');
        }
        let fullyWeakenedServers = [];
        for (let i = 0; i < serversToWeaken.length; i++) {
            if (ns.getServerSecurityLevel(serversToWeaken[i]) <= (ns.getServerMinSecurityLevel(serversToWeaken[i]) * 1.1)) {
                fullyWeakenedServers.push(serversToWeaken[i]);
                continue;
            }
            await ns.weaken(serversToWeaken[i]);
        }

        // If nothing can be weakened, wait a minute and try again.
        if (fullyWeakenedServers.length < serversToWeaken.length) {
            fullyWeakenedServers = [];
            continue;
        }

        await ns.sleep(1000 * 60);
    }
}