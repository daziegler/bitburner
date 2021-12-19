/** @param {NS} ns **/
export async function main(ns) {
    // Interval in which we retry the purchase (ms)
    const waitTime = 1000 * 60 * 10;

    const ownedNodes = ns.hacknet.numNodes();
    for (let n = 0; n < ownedNodes; n++) {
        if (ns.hacknet.getNodeStats(n).level !== 200) {
            while (ns.hacknet.getNodeStats(n).level < 200) {
                let lvlCost = ns.hacknet.getLevelUpgradeCost(n, 1);
                while (ns.getPlayer().money < lvlCost) {
                    ns.print(ns.sprintf(
                        'Need $%d for the upgrade of node %d from lvl %d. Have $%d',
                        lvlCost,
                        n,
                        ns.hacknet.getNodeStats(n).level,
                        ns.getPlayer().money
                    ));
                    await ns.sleep(waitTime);
                }
                ns.hacknet.upgradeLevel(n, 1);
            }
        }
        if (ns.hacknet.getNodeStats(n).ram !== 64) {
            while (ns.hacknet.getNodeStats(n).ram < 64) {
                let ramCost = ns.hacknet.getRamUpgradeCost(n, 1);
                while (ns.getPlayer().money < ramCost) {
                    ns.print(ns.sprintf(
                        'Need $%d for the upgrade of node %d from ram %d. Have $%d',
                        ramCost,
                        n,
                        ns.hacknet.getNodeStats(n).ram,
                        ns.getPlayer().money
                    ));
                    await ns.sleep(waitTime);
                }
                ns.hacknet.upgradeRam(n, 1);
            }
        }
        if (ns.hacknet.getNodeStats(n).cores !== 16) {
            while (ns.hacknet.getNodeStats(n).cores < 16) {
                let coreCost = ns.hacknet.getCoreUpgradeCost(n, 1);
                while (ns.getPlayer().money < coreCost) {
                    ns.print(ns.sprintf(
                        'Need $%d for the upgrade of node %d from core %d. Have $%d',
                        coreCost,
                        n,
                        ns.hacknet.getNodeStats(n).cores,
                        ns.getPlayer().money
                    ));
                    await ns.sleep(waitTime);
                }
                ns.hacknet.upgradeCore(n, 1);
            }
        }
    }
}
