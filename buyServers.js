/** @param {NS} ns **/
export async function main(ns) {
    let data = ns.flags([
        ['num', 5],
        ['name', 'hackserv-']
    ]);

    // Default, we buy until we hit the limit
    let purchasedServers = ns.getPurchasedServers();
    let maxServersToBuy = ns.getPurchasedServerLimit() - purchasedServers.length;
    let numberOfServers = data.num;
    if (numberOfServers > maxServersToBuy) {
        numberOfServers = maxServersToBuy;
    }

    const serverNameTemplate = data.name;

    let maxAffordableRam = 0;
    let purchasedServerMaxRam = ns.getPurchasedServerMaxRam();
    for (let r = 1; Math.pow(2, r) <= purchasedServerMaxRam; r++) {
        let ram = Math.pow(2, r);
        if ((ns.getPurchasedServerCost(ram) * numberOfServers) < ns.getPlayer().money) {
            maxAffordableRam = ram;
            continue;
        }

        break;
    }

    if (maxAffordableRam === 0) {
        ns.print('Can not afford to buy ANY server');
        ns.exit();
    }

    for (let i = 0; i < numberOfServers; i++) {
        let newServerName = serverNameTemplate + i;
        if (purchasedServers.includes(newServerName)) {
            // If we already own the server, and it is better, than the best possible update, we buy a new one
            // If it would be worse, we upgrade the server instead
            if (ns.getServerMaxRam(newServerName) >= maxAffordableRam) {
                numberOfServers++;
                continue;
            } else {
                ns.killall(newServerName);
                ns.deleteServer(newServerName);
            }
        }
        ns.purchaseServer(newServerName, maxAffordableRam);
    }

    ns.spawn('validate.ns');
}
