/** @param {NS} ns **/
export async function main(ns) {
    let ownedServers = ns.getPurchasedServers();
    let purchasedServerMaxRam = ns.getPurchasedServerMaxRam();
    let maxAffordableRam = 0;
    let ownedServersWithLessRam = 0;
    for (let r = 1; Math.pow(2, r) <= purchasedServerMaxRam; r++) {
        let ram = Math.pow(2, r);
        ownedServersWithLessRam = 0;
        for (let s = 0; s < ownedServers.length; s++) {
            if (ns.getServerMaxRam(ownedServers[s]) < ram) {
                ownedServersWithLessRam++;
            }
        }
        let upgradeCostForOwnedServers = (ns.getPurchasedServerCost(ram) * ownedServersWithLessRam);
        if (upgradeCostForOwnedServers < ns.getPlayer().money) {
            maxAffordableRam = ram;
            continue;
        }

        ns.tprint(
            ns.sprintf('Can not afford upgrade %d servers to %d GB ram. That would require $%d.', ownedServersWithLessRam, ram, upgradeCostForOwnedServers)
        );
        break;
    }

    if (maxAffordableRam === 0 || ownedServersWithLessRam === 0) {
        ns.exit();
    }

    let stillRunning = [];
    for (let i = 0; i < ownedServers.length; i++) {
        let server = ownedServers[i];
        let serverMaxRam = ns.getServerMaxRam(server);
        if (serverMaxRam >= maxAffordableRam) {
            continue;
        }

        if (ns.ps(server).length > 0) {
            stillRunning.push(server);
            continue;
        }
        ns.deleteServer(server);
        ns.purchaseServer(server, maxAffordableRam);
    }

    if (stillRunning.length === 0) {
        return;
    }

    let upgradeDone = 0;
    while (upgradeDone < stillRunning.length) {
        for (let s = 0; s < stillRunning.length; s++) {
            let server = stillRunning[s];
            if (ns.ps(server).length > 0) {
                continue;
            }
            ns.deleteServer(server);
            ns.purchaseServer(server, maxAffordableRam);
            upgradeDone++;
        }

        await ns.sleep(1000 * 60);
    }
}