/** @param {NS} ns **/
export async function main(ns) {
  let data = ns.flags([
    ['lvl', 200],
    ['ram', 64],
    ['core', 16],
  ]);

  const targetLevel = data.lvl;
  const targetRam = data.ram;
  const targetCore = data.core;

  // Interval in which we retry the purchase (ms)
  const waitTime = 1000 * 10;

  if (targetLevel < 1 || targetLevel > 200) {
    ns.tprintf('Level must be between 1 and 200. %d given', targetLevel);
    return;
  }

  if ([1, 2, 4, 8, 16, 32, 64].includes(targetRam) === false) {
    ns.tprintf('Ram must be a power of two (up to 64). %d given', targetRam);
    return;
  }

  if (targetCore < 1 || targetCore > 16) {
    ns.tprintf('Core must be between 1 and 16. %d given', targetCore);
    return;
  }

  const ownedNodes = ns.hacknet.numNodes();

  let upgradesDone = 0;
  while (upgradesDone < (3 * ownedNodes)) {
    for (let node = 0; node < ownedNodes; node++) {
      if (ns.hacknet.getNodeStats(node).level < targetLevel) {
        upgradesDone += await upgradeNodeLevel(ns, node, targetLevel);
      }
      if (ns.hacknet.getNodeStats(node).ram < targetRam) {
        upgradesDone += await upgradeNodeRAM(ns, node, targetRam);
      }
      if (ns.hacknet.getNodeStats(node).cores < targetCore) {
        upgradesDone += await upgradeNodeCores(ns, node, targetCore);
      }
    }

    await ns.sleep(waitTime);
  }
}

/**
 * @param {NS} ns
 * @param {Number} node
 * @param {Number} targetLevel
 */
async function upgradeNodeLevel(ns, node, targetLevel) {
  while (ns.hacknet.getNodeStats(node).level < targetLevel) {
    if (ns.getPlayer().money < ns.hacknet.getLevelUpgradeCost(node, 1)) {
      return 0;
    }
    ns.hacknet.upgradeLevel(node, 1);
  }
  return 1;
}

/**
 * @param {NS} ns
 * @param {Number} node
 * @param {Number} targetLevel
 */
async function upgradeNodeRAM(ns, node, targetRam) {
  while (ns.hacknet.getNodeStats(node).ram < targetRam) {
    if (ns.getPlayer().money < ns.hacknet.getRamUpgradeCost(node, 1)) {
      return 0;
    }
    ns.hacknet.upgradeRam(node, 1);
  }
  return 1;
}

/**
 * @param {NS} ns
 * @param {Number} node
 * @param {Number} targetCore
 */
async function upgradeNodeCores(ns, node, targetCore) {
  while (ns.hacknet.getNodeStats(node).cores < targetCore) {
    if (ns.getPlayer().money < ns.hacknet.getCoreUpgradeCost(node, 1)) {
      return 0;
    }
    ns.hacknet.upgradeCore(node, 1);
  }
  return 1;
}
