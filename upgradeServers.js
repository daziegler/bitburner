/** @param {NS} ns **/
export async function main(ns) {
    let ownedServers = ns.getPurchasedServers();
    let purchasedServerMaxRam = ns.getPurchasedServerMaxRam();
    let maxAffordableRam = 0;

    for (let r = 1; Math.pow(2, r) <= purchasedServerMaxRam; r++) {
        let ram = Math.pow(2, r);
        if ((ns.getPurchasedServerCost(ram) * ownedServers.length) < ns.getPlayer().money) {
            maxAffordableRam = ram;
            continue;
        }

        break;
    }

    if (maxAffordableRam === 0) {
        ns.exit();
    }

    let requiresUpdate = false;
    for (let i = 0; i < ownedServers.length; i++) {
        let server = ownedServers[i];
        let serverMaxRam = ns.getServerMaxRam(server);
        if (serverMaxRam >= maxAffordableRam) {
            continue;
        }

        ns.killall(server);
        ns.deleteServer(server);
        ns.purchaseServer(server, maxAffordableRam);
        requiresUpdate = true;
    }

    if (requiresUpdate) {
        ns.spawn('validate.ns');
    }
}
