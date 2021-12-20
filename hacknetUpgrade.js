/** @param {NS} ns **/
export async function main(ns) {
    let data = ns.flags([
		['number', 3],
		['lvl', 200],
		['ram', 64],
		['cpu', 16],
	]);

	const number = data.number;
	const level = data.lvl;
	const ram = data.ram;
	const core = data.cpu;

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
	
	if (lastNodeIndex <= nextNodeIndex) {
		ns.exit();
	}

	for (let i = nextNodeIndex; i < lastNodeIndex; i++) {
		let newNodeCost = ns.hacknet.getPurchaseNodeCost();
		while (ns.getPlayer().money < newNodeCost) {
			ns.print(sprintf(
				'Need $%d to buy next node. Have $%d',
				newNodeCost,
				ns.getPlayer().money
			));
			await ns.sleep(waitTime);
		}

		let newNode = ns.hacknet.purchaseNode();
		if (ns.hacknet.getNodeStats(newNode).level < level) {
			while (ns.hacknet.getNodeStats(newNode).level < level) {
				let lvlCost = ns.hacknet.getLevelUpgradeCost(newNode, 1);
				while (ns.getPlayer().money < lvlCost) {
					ns.print(sprintf(
						'Need $%d for the upgrade of node %d from lvl %d. Have $%d',
						lvlCost,
						newNode,
						ns.hacknet.getNodeStats(newNode).level,
						ns.getPlayer().money
					));
					await ns.sleep(waitTime);
				}
				ns.hacknet.upgradeLevel(newNode, 1);
			}
		}

		if (ns.hacknet.getNodeStats(newNode).ram < ram) {
			while (ns.hacknet.getNodeStats(newNode).ram < ram) {
				let ramCost = ns.hacknet.getRamUpgradeCost(newNode, 1);
				while (ns.getPlayer().money < ramCost) {
					ns.print(sprintf(
						'Need $%d for the upgrade of node %d from ram %d. Have $%d',
						ramCost,
						newNode,
						ns.hacknet.getNodeStats(newNode).ram,
						ns.getPlayer().money
					));
					await ns.sleep(waitTime);
				}
				ns.hacknet.upgradeRam(newNode, 1);
			}
		}
		
		if (ns.hacknet.getNodeStats(newNode).cores < core) {
			while (ns.hacknet.getNodeStats(newNode).cores < core) {
				let coreCost = ns.hacknet.getCoreUpgradeCost(newNode, 1);
				while (ns.getPlayer().money < coreCost) {
					ns.print(sprintf(
						'Need $%d for the upgrade of node %d from core %d. Have $%d',
						coreCost,
						newNode,
						ns.hacknet.getNodeStats(newNode).ram,
						ns.getPlayer().money
					));
					await ns.sleep(waitTime);
				}
				ns.hacknet.upgradeCore(newNode, 1);
			}
		}

		ns.tprint('HackNet Node #' + newNode + ' finished!');
	}
	
    ns.tprint('HackNet upgrade finished!');
}
