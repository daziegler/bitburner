/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        let serversToGrow = [];
        if (ns.args.length > 0) {
            serversToGrow = ns.args[0].split(',');
        } else {
            serversToGrow = await ns.read('validServersWithoutOwn.txt').split(',');
        }
        let fullyGrownServers = [];
        for (let i = 0; i < serversToGrow.length; i++) {
            if (ns.getServerMoneyAvailable(serversToGrow[i]) > (ns.getServerMaxMoney(serversToGrow[i]) * 0.9)) {
                fullyGrownServers.push(serversToGrow[i]);
                continue;
            }
            await ns.grow(serversToGrow[i]);
        }

        // If nothing can be growed, wait a minute and try again.
        if (fullyGrownServers.length < serversToGrow.length) {
            fullyGrownServers = [];
            continue;
        }

        await ns.sleep(1000 * 60);
    }
}