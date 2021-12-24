/** @param {NS} ns **/
export async function main(ns) {
    let target = 'n00dles';

    // First we establish a server with max money and min security
    await flatlineServerSecurity(ns, target);
    await maxoutServerMoney(ns, target);
    await flatlineServerSecurity(ns, target);

    // We use a perfect Mock for all our calculations, since this is basically what we will have
    const targetServer = ns.getServer(target);
    const perfectServerToHack = getHackPerfectServer(targetServer);
    const perfectServerToGrow = getGrowPerfectServer(targetServer);

    const optimumHackThreads = getHackThreadsForServer(ns, perfectServerToHack);
    const optimumGrowThreads = getGrowThreadsForServer(ns, perfectServerToGrow);

    const hackSecurityIncrease = ns.hackAnalyzeSecurity(optimumHackThreads);
    const growSecurityIncrease = ns.growthAnalyzeSecurity(optimumGrowThreads);

    const optimumWeakenThreadsAfterHack = getWeakenThreads(targetServer.minDifficulty, targetServer.minDifficulty + hackSecurityIncrease);
    const optimumWeakenThreadsAfterGrow = getWeakenThreads(targetServer.minDifficulty, targetServer.minDifficulty + growSecurityIncrease);

    // TODO: remove, debug
    let requiredRam =
        ns.getScriptRam('weaken.ns', 'home') * optimumWeakenThreadsAfterHack +
        ns.getScriptRam('weaken.ns', 'home') * optimumWeakenThreadsAfterGrow +
        ns.getScriptRam('hack.ns', 'home') * optimumHackThreads +
        ns.getScriptRam('grow.ns', 'home') * optimumGrowThreads;

    // TODO
    let queue = [];
    while (true) {
        let hackTime = ns.formulas.hacking.hackTime(perfectServerToHack, ns.getPlayer());
        let growTime = ns.formulas.hacking.growTime(perfectServerToHack, ns.getPlayer());
        let weakenTime = ns.formulas.hacking.weakenTime(perfectServerToHack, ns.getPlayer());

        // For simplicity:
        // hack = 3s
        // grow = 11s
        // weaken = 14s

        // weaken (14s)
        // weaken (14s)
        // wait weakenTime - growTime = 14s - 11s = 3s
        // run grow (11s)
        // wait growTime - hackTime = 11s - 3s = 8s
        // run hack (3s)

        // 2. to run
        ns.run('weaken.ns', optimumWeakenThreadsAfterHack, target, 2);

        await ns.sleep(100);

        // 4. to run
        ns.run('weaken.ns', optimumWeakenThreadsAfterGrow, target, 4);

        // Grow is faster than weaken, so it needs to start later
        await ns.sleep(weakenTime - growTime - 100);

        // 3. to run
        ns.run('grow.ns', optimumGrowThreads, target, 3);

        // Hack is faster than grow, so it needs to start later
        await ns.sleep(growTime - hackTime - 100);

        // 1. to run
        ns.run('hack.ns', optimumHackThreads, target, 1);

        await ns.sleep(hackTime + 100);
    }
}

// TODO: Thread assignment over all owned servers
// TODO: Target all/multiple servers
// TODO: Check a target can actually have money

/**
 * @param {NS} ns
 * @param {string} target
 */
async function maxoutServerMoney(ns, target) {
    let serverMaxMoney = ns.getServerMaxMoney(target);
    if (ns.getServerMoneyAvailable(target) === serverMaxMoney) {
        return;
    }

    let growFactor = serverMaxMoney - 1;
    if (ns.getServerMoneyAvailable(target) > 0) {
        growFactor = serverMaxMoney / ns.getServerMoneyAvailable(target);
    }

    let growThreads = Math.ceil(ns.growthAnalyze(target, growFactor));
    let growTime = ns.formulas.hacking.growTime(ns.getServer(target), ns.getPlayer());

    growTime = Math.ceil(growTime + 300);
    ns.run('grow.ns', growThreads, target);
    await ns.sleep(growTime);
}

/**
 * @param {NS} ns
 * @param {string} target
 */
async function flatlineServerSecurity(ns, target) {
    let serverMinSecurity = ns.getServerMinSecurityLevel(target);
    if (ns.getServerSecurityLevel(target) === serverMinSecurity) {
        return;
    }
    let weakenThreads = getWeakenThreads(serverMinSecurity, ns.getServerSecurityLevel(target));
    let weakenTime = ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer());
    weakenTime = Math.ceil(weakenTime + 300);
    ns.run('weaken.ns', weakenThreads, target);
    await ns.sleep(weakenTime);
}

/**
 * @param {NS} ns
 * @param {Server} perfectServerToHack
 */
function getHackThreadsForServer(ns, perfectServerToHack) {
    let desiredHackPercent = 0.5;
    let hackPercentPerThread = ns.formulas.hacking.hackPercent(perfectServerToHack, ns.getPlayer());
    if (hackPercentPerThread === 0) {
        return 1;
    }
    let hackThreads = Math.ceil(desiredHackPercent / hackPercentPerThread);

    return hackThreads;
}

/**
 * @param {NS} ns
 * @param {Server} perfectServerToGrow
 */
function getGrowThreadsForServer(ns, perfectServerToGrow) {
    let growThreads = 0;
    let growthPercent = 0;
    let desiredGrowthPercent = 100;
    while (growthPercent < desiredGrowthPercent) {
        growThreads++;
        growthPercent = ns.formulas.hacking.growPercent(perfectServerToGrow, growThreads, ns.getPlayer());
    }

    return growThreads;
}

/**
 * @param {Number} minDifficulty
 * @param {Number} hackDifficulty
 */
function getWeakenThreads(minDifficulty, hackDifficulty) {
    let weakenPerThread = 0.05;
    let toWeakenBy = hackDifficulty - minDifficulty;
    if (toWeakenBy <= 0) {
        return 1;
    }

    return Math.ceil(toWeakenBy / weakenPerThread);
}

// A server is perfect for hacking if it has 0 security and 100% of its max money
function getHackPerfectServer(server) {
    let optimalServerDeepClone = JSON.parse(JSON.stringify(server));;
    optimalServerDeepClone.moneyAvailable = server.maxMoney;
    optimalServerDeepClone.hackDifficulty = optimalServerDeepClone.minDifficulty;

    return optimalServerDeepClone;
}

// A server is perfect for growth if it has 0 security and 50% of its max money
function getGrowPerfectServer(server) {
    let optimalServerDeepClone = JSON.parse(JSON.stringify(server));
    optimalServerDeepClone.moneyAvailable = optimalServerDeepClone.maxMonex * 0.5;
    optimalServerDeepClone.hackDifficulty = optimalServerDeepClone.minDifficulty;

    return optimalServerDeepClone;
}