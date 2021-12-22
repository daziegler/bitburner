/** @param {NS} ns **/
export async function main(ns) {
	let data = ns.flags([
		['lvl', 200],
		['ram', 64],
		['cpu', 16],
	]);

	const level = data.lvl;
	const ram = data.ram;
	const core = data.cpu;

	// Interval in which we retry the purchase (ms)
	const waitTime = 1000 * 60;

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
	for(let n = 0; n < ownedNodes; n++) {
		if (ns.hacknet.getNodeStats(n).level < level) {
			while (ns.hacknet.getNodeStats(n).level < level) {
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
		if (ns.hacknet.getNodeStats(n).ram < ram) {
			while (ns.hacknet.getNodeStats(n).ram < ram) {
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
		if (ns.hacknet.getNodeStats(n).cores < core) {
			while (ns.hacknet.getNodeStats(n).cores < core) {
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