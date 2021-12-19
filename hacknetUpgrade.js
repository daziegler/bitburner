/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([
        ['number', 3],
        ['lvl', 200],
        ['ram', 64],
        ['core', 16],
    ]);

    const number = args.number;
    const level = args.lvl;
    const ram = args.ram;
    const core = args.cpu;

    // Time to wait for more money (ms)
    const waitTime = 1000 * 60 * 10;

    if (level < 1 || level > 200) {
        ns.tprintf('Level must be between 1 and 200. %d given', level);
    }
    
    if ([1,2,4,8,16,32,64].includes(ram) === false) {
        ns.tprintf('Ram must be a power of two (up to 64). %d given', ram);
    }
    
    if (core < 1 || core > 16) {
        ns.tprintf('Core must be between 1 and 16. %d given', core);
    }

    const ownedNodes = ns.hacknet.numNodes();
    const nextNodeIndex = ownedNodes;
    const lastNodeIndex = ownedNodes + number;
    const player = ns.getPlayer();  
    
    for (let i = nextNodeIndex; i < lastNodeIndex; i++) {
        let newNodeCost = ns.hacknet.getPurchaseNodeCost();
        while (player.money < newNodeCost) {
            ns.print('Need $' + newNodeCost + ' to buy next node. Have $' + player.money);
            await ns.sleep(waitTime);
        }

        let newNode = ns.hacknet.purchaseNode();
        if (ns.hacknet.getNodeStats(newNode).level !== 200) {
            while (ns.hacknet.getNodeStats(newNode).level < level) {
                let lvlCost = ns.hacknet.getLevelUpgradeCost(n, 1);
                while (player.money < lvlCost) {
                    ns.tprintf(
                        'Need $%d for the upgrade of node %d from lvl %d. Have $%d',
                        lvlCost,
                        n,
                        ns.hacknet.getNodeStats(newNode).level,
                        player.money
                    );
                    await ns.sleep(waitTime);
                }
                ns.hacknet.upgradeLevel(n, 1);
            }
        }
        if (ns.hacknet.getNodeStats(newNode).ram !== 64) {
            while (ns.hacknet.getNodeStats(newNode).ram < ram) {
                let ramCost = ns.hacknet.getRamUpgradeCost(n, 1);
                while (player.money < ramCost) {
                    ns.tprintf(
                        'Need $%d for the upgrade of node %d from ram %d. Have $%d',
                        ramCost,
                        n,
                        ns.hacknet.getNodeStats(newNode).ram,
                        player.money
                    );
                    await ns.sleep(waitTime);
                }
                ns.hacknet.upgradeRam(n, 1);
            }
        }
        if (ns.hacknet.getNodeStats(newNode).cores !== 16) {
            while (ns.hacknet.getNodeStats(newNode).cores < core) {
                let coreCost = ns.hacknet.getCoreUpgradeCost(n, 1);
                while (player.money < coreCost) {
                    ns.tprintf(
                        'Need $%d for the upgrade of node %d from core %d. Have $%d',
                        coreCost,
                        n,
                        ns.hacknet.getNodeStats(newNode).ram,
                        player.money
                    );
                    await ns.sleep(waitTime);
                }
                ns.hacknet.upgradeCore(n, 1);
            }
        }
        ns.tprint('HackNet Node #' + newNode + ' finished!');
    }
    
    ns.tprint('HackNet upgrade finished!');
}
