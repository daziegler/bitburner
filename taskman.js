/** @param {NS} ns **/
export async function main(ns) {
    const filesToCopy = [
        'hack.ns',
        'weaken.ns',
        'grow.ns',
    ];

    disableLogs(ns);

    while (true) {
        let serversToSetup = await validateServers(ns);
        let serversToHack = await getServersToHack(ns, serversToSetup);

        let targets = [];
        for (let target of serversToHack) {
            const targetServer = ns.getServer(target);

            if (targetServer.moneyMax === 0) {
                continue;
            }

            // We use a perfect Mock for all our calculations, since this is basically what we will have
            const perfectServerToHack = getHackPerfectServer(targetServer);
            const perfectServerToGrow = getGrowPerfectServer(targetServer);

            const optimumHackThreads = getHackThreadsForServer(ns, perfectServerToHack);
            const optimumGrowThreads = getGrowThreadsForServer(ns, perfectServerToGrow);

            const hackSecurityIncrease = ns.hackAnalyzeSecurity(optimumHackThreads);
            const growSecurityIncrease = ns.growthAnalyzeSecurity(optimumGrowThreads);

            const minDifficultyForTarget = targetServer.minDifficulty;

            const optimumWeakenThreadsAfterHack = getWeakenThreads(minDifficultyForTarget, minDifficultyForTarget + hackSecurityIncrease);
            const optimumWeakenThreadsAfterGrow = getWeakenThreads(minDifficultyForTarget, minDifficultyForTarget + growSecurityIncrease);

            const targetInfo = {
                targetServer: perfectServerToHack,
                hackThreads: optimumHackThreads,
                growThreads: optimumGrowThreads,
                weakenThreadsAfterHack: optimumWeakenThreadsAfterHack,
                weakenThreadsAfterGrow: optimumWeakenThreadsAfterGrow
            };

            targets.push(targetInfo);
        }

        serversToSetup.sort(function (a, b) {
            return (ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
        });

        await optimizeTargetServersBeforeRun(ns, targets, serversToSetup);
        await optimizeTargetServersBeforeRun(ns, targets, serversToSetup);

        ns.exit();

        let runsBeforeReset = 100;
        while (runsBeforeReset > 0) {
            // We rebuild this queue every run
            let queue = buildQueue(ns, targets);

            // Search servers that can be assigned to each job in the queue
            for (let serverToSetup of serversToSetup) {
                // For the first run, we kill all scripts
                if (runsBeforeReset === 100) {
                    await ns.scp(filesToCopy, serverToSetup);
                    ns.killall(serverToSetup);
                }

                const maxRam = ns.getServerMaxRam(serverToSetup);
                for (let job of queue) {
                    let usedRam = ns.getServerUsedRam(serverToSetup);
                    let availableRam = maxRam - usedRam;

                    // If the server can not run the next job, skip to the next server since the jobs MUST run in order
                    if (availableRam < job.ramUse) {
                        break;
                    }

                    job.host = serverToSetup;
                }
            }

            queue = cleanupQueue(queue, 4);
            for (let job of queue) {
                await workJob(ns, job);
            }

            runsBeforeReset--;
        }
    }
}

/**
 * @param {NS} ns
 * @param {array} targets
 * @param {Server[]} servers
 **/
export async function optimizeTargetServersBeforeRun(ns, targets, servers) {
    let waitTime = 1000;
    for (let target of targets) {
        let targetName = target.targetServer.hostname;
        let job = flatlineServerSecurity(ns, targetName);
        if (job === null) {
            continue;
        }
        for (let server of servers) {
            let ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
            if(ramAvailable > job.ramUse) {
                job.host = server;
            } else {
                break;
            }
        }

        if (job.waitTime > waitTime) {
            waitTime = job.waitTime;
        }

        ns.exec(job.script, job.host, job.threads, job.target, 0);
    }
    await ns.sleep(waitTime);
    waitTime = 1000;
    for (let target of targets) {
        let targetName = target.targetServer.hostname;
        let job = maxoutServerMoney(ns, targetName);
        if (job === null) {
            continue;
        }
        for (let server of servers) {
            let ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
            if(ramAvailable > job.ramUse) {
                job.host = server;
            } else {
                break;
            }
        }

        if (job.waitTime > waitTime) {
            waitTime = job.waitTime;
        }

        ns.exec(job.script, job.host, job.threads, job.target, 0);
    }
    await ns.sleep(waitTime);
    waitTime = 1000;
    for (let target of targets) {
        let targetName = target.targetServer.hostname;
        let job = flatlineServerSecurity(ns, targetName);
        if (job === null) {
            continue;
        }
        for (let server of servers) {
            let ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
            if(ramAvailable > job.ramUse) {
                job.host = server;
            } else {
                break;
            }
        }

        if (job.waitTime > waitTime) {
            waitTime = job.waitTime;
        }

        ns.exec(job.script, job.host, job.threads, job.target, 0);
    }
    await ns.sleep(waitTime);
}

/**
 * @param {NS} ns
 * @param {array} targets
 **/
function buildQueue(ns, targets) {
    let queue = [];
    for (let target of targets) {
        let hackTime = ns.formulas.hacking.hackTime(target.targetServer, ns.getPlayer());
        let growTime = ns.formulas.hacking.growTime(target.targetServer, ns.getPlayer());
        let weakenTime = ns.formulas.hacking.weakenTime(target.targetServer, ns.getPlayer());

        queue.push(
            createJob(ns, target, 'weaken.ns', target.weakenThreadsAfterHack, 100, 2)
        );
        queue.push(
            createJob(ns, target, 'weaken.ns', target.weakenThreadsAfterGrow, (weakenTime - growTime - 100), 4)
        )
        queue.push(
            createJob(ns, target, 'grow.ns', target.growThreads, (growTime - hackTime - 100), 3)
        );
        queue.push(
            // TODO: We do not need the wait time here, and just wait at the end of the queue for maxHackTime. For now, this is good enough
            createJob(ns, target, 'hack.ns', target.hackThreads, (hackTime + 100), 1)
        );
    }

    return queue;
}

// Returns a queue that only contains jobs that have an assigned host and would fully cover the target
function cleanupQueue(queue, maxBatchSize) {
    let batchSize = maxBatchSize;
    let batch = '';
    for (let j = 0; j < queue.length; j++) {
        let job = queue[j];
        // Remove jobs, that could not be assigned a host
        if (job.host === '') {
            queue.splice(j, 1);
            continue;
        }

        if (batch !== job.target) {
            // This indicates that not enough ram for all 4 required jobs per server was available
            if (batchSize < maxBatchSize) {
                queue.splice(j, 1);
                continue;
            }

            batch = job.target;
            batchSize = 0;
        }

        batchSize++;
    }

    return queue;
}

export function createJob(ns, target, scriptName, threads, waitTime, order) {
    let ramUse = threads * ns.getScriptRam(scriptName);

    return {
        target: target,
        script: scriptName,
        threads: threads,
        waitTime: waitTime,
        order: order,
        ramUse: ramUse,
        host: ''
    };
}

export async function workJob(ns, job) {
    ns.print(
        ns.sprintf(
            'Running script %s (%d threads) targetting %s on server %s',
            job.script,
            job.threads,
            job.target,
            job.host
        )
    )

    ns.exec(job.script, job.host, job.threads, job.target, job.order);
    await ns.sleep(job.waitTime);
}

/**
 * @param {NS} ns
 * @param {array} servers
 **/
export async function getOptimalServer(ns, servers) {
    let optimalServer = '';
    let optimalVal = 0;
    let currVal;
    let currTime;

    for (let i = 0; i < servers.length; i++) {
        currVal = ns.getServerMaxMoney(servers[i]);
        currTime = ns.getWeakenTime(servers[i]) + ns.getGrowTime(servers[i]) + ns.getHackTime(servers[i]);
        currVal /= currTime;
        if (currVal >= optimalVal) {
            optimalVal = currVal;
            optimalServer = servers[i];
        }
    }

    return optimalServer;
}

/** @param {NS} ns **/
export async function validateServers(ns) {
    let serversToHack = ns.scan('home');
    let validatedServers = [];
    let ignoredServers = [];
    let availablePortScripts = getAvailablePortScripts(ns)

    while ((ignoredServers.length + validatedServers.length) < serversToHack.length) {
        for (let v = 0; v < serversToHack.length; v++) {
            let serverToValidate = serversToHack[v];
            if (ignoredServers.includes(serverToValidate) || validatedServers.includes(serverToValidate)) {
                continue;
            }

            if (validatedServers.includes(serverToValidate) === false) {
                if (ns.serverExists(serverToValidate) === false) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }

                let newTargets = ns.scan(serverToValidate);
                for (let x = 0; x < newTargets.length; x++) {
                    if (serversToHack.includes(newTargets[x])) {
                        continue;
                    }

                    serversToHack.push(newTargets[x]);
                }

                if (ns.getServerRequiredHackingLevel(serverToValidate) > ns.getHackingLevel()) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
                if (serverToValidate === 'home') {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
            }

            if (ns.hasRootAccess(serverToValidate) === false) {
                let requiredPortAmountForServer = ns.getServerNumPortsRequired(serverToValidate);
                if (requiredPortAmountForServer > availablePortScripts) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }

                if (ns.fileExists("BruteSSH.exe", "home")) {
                    ns.brutessh(serverToValidate);
                }
                if (ns.fileExists("FTPCrack.exe", "home")) {
                    ns.ftpcrack(serverToValidate);
                }
                if (ns.fileExists("RelaySMTP.exe", "home")) {
                    ns.relaysmtp(serverToValidate);
                }
                if (ns.fileExists("HTTPWorm.exe", "home")) {
                    ns.httpworm(serverToValidate);
                }
                if (ns.fileExists("SQLInject.exe", "home")) {
                    ns.sqlinject(serverToValidate);
                }

                ns.nuke(serverToValidate);
            }

            validatedServers.push(serverToValidate);
        }
    }

    return validatedServers;
}

/**
 * @param {NS} ns
 * @param {array} validServers
 **/
export async function getServersToHack(ns, validServers) {
    let ownServers = ns.getPurchasedServers();
    let validatedServersWithoutOwn = [];
    for (let v = 0; v < validServers.length; v++) {
        if (ownServers.includes(validServers[v])) {
            continue;
        }
        validatedServersWithoutOwn.push(validServers[v]);
    }

    // Order valid servers by "value"
    let orderedServersToHack = [];
    while (validatedServersWithoutOwn.length > 0) {
        let optimalServer = await getOptimalServer(ns, validatedServersWithoutOwn);
        orderedServersToHack.push(optimalServer);
        validatedServersWithoutOwn.splice(validatedServersWithoutOwn.indexOf(optimalServer), 1);
    }

    return orderedServersToHack;
}

/**
 * @param {NS} ns
 * @param {Server} server
 */
export function getHackThreadsForServer(ns, server) {
    let desiredHackPercent = 0.5;
    let hackPercentPerThread = ns.formulas.hacking.hackPercent(server, ns.getPlayer());
    if (hackPercentPerThread === 0) {
        return 1;
    }

    return Math.ceil(desiredHackPercent / hackPercentPerThread);
}

/**
 * @param {NS} ns
 * @param {Server} server
 */
export function getGrowThreadsForServer(ns, server) {
    let growThreads = 0;
    let growthPercent = 0;
    let desiredGrowthPercent = 100;
    while (growthPercent < desiredGrowthPercent) {
        growThreads++;
        growthPercent = ns.formulas.hacking.growPercent(server, growThreads, ns.getPlayer());
    }

    return growThreads;
}

/**
 * @param {Number} minDifficulty
 * @param {Number} hackDifficulty
 */
export function getWeakenThreads(minDifficulty, hackDifficulty) {
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

/**
 * @param {NS} ns
 * @param {string} target
 */
function maxoutServerMoney(ns, target) {
    let serverMaxMoney = ns.getServerMaxMoney(target);
    if (ns.getServerMoneyAvailable(target) === serverMaxMoney) {
        return null;
    }

    let growFactor = serverMaxMoney - 1;
    if (ns.getServerMoneyAvailable(target) > 0) {
        growFactor = serverMaxMoney / ns.getServerMoneyAvailable(target);
    }

    let growThreads = Math.ceil(ns.growthAnalyze(target, growFactor));
    let growTime = ns.formulas.hacking.growTime(ns.getServer(target), ns.getPlayer());

    growTime = Math.ceil(growTime + 300);

    return createJob(ns, target, 'grow.ns', growThreads, growTime, 0);
}

/**
 * @param {NS} ns
 * @param {string} target
 */
function flatlineServerSecurity(ns, target) {
    let serverMinSecurity = ns.getServerMinSecurityLevel(target);
    if (ns.getServerSecurityLevel(target) === serverMinSecurity) {
        return null;
    }
    let weakenThreads = getWeakenThreads(serverMinSecurity, ns.getServerSecurityLevel(target));
    let weakenTime = ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer());
    weakenTime = Math.ceil(weakenTime + 300);

    return createJob(ns, target, 'weaken.ns', weakenThreads, weakenTime, 0);
}

/** @param {NS} ns **/
export function getAvailablePortScripts(ns) {
    let availablePortScripts = 0;

    if (ns.fileExists("BruteSSH.exe", "home")) {
        availablePortScripts += 1;
    }
    if (ns.fileExists("FTPCrack.exe", "home")) {
        availablePortScripts += 1;
    }
    if (ns.fileExists("RelaySMTP.exe", "home")) {
        availablePortScripts += 1;
    }
    if (ns.fileExists("HTTPWorm.exe", "home")) {
        availablePortScripts += 1;
    }
    if (ns.fileExists("SQLInject.exe", "home")) {
        availablePortScripts += 1;
    }

    return availablePortScripts;
}

/** @param {NS} ns */
function disableLogs(ns) {
    ns.disableLog('scp');
    ns.disableLog('scan');
    ns.disableLog('exec');
    ns.disableLog('killall');
    ns.disableLog('getHackingLevel')
    ns.disableLog('getServerMinSecurityLevel');
    ns.disableLog('getServerSecurityLevel');
    ns.disableLog('getServerMaxMoney');
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('getServerUsedRam');
    ns.disableLog('getServerRequiredHackingLevel')
}