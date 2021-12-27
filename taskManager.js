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
            return (ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
        });

        let servers = [];
        for (let serverName of serversToSetup) {
            servers.push({
                'hostname': serverName,
                'ramMax': ns.getServerMaxRam(serverName),
                'ramReserved': 0,
                'tasks': [],
            })

            await ns.scp(filesToCopy, serverName);
        }

        await optimizeTargetServersBeforeRun(ns, targets, servers);

        while (true) {
            // We rebuild this queue every run
            let queue = buildQueue(ns, targets);
            for (let batch of queue) {
                let batchRamUse = 0;
                for (let job of batch) {
                    batchRamUse += job.ramUse;
                }
                // Search servers that can be assigned to each job in the queue
                for (let serverToSetup of servers) {
                    // Find smallest possible server for job
                    let availableRam = (serverToSetup.ramMax - serverToSetup.ramReserved);
                    if (availableRam < batchRamUse) {
                        continue;
                    }
                    let encodedBatch = JSON.stringify(batch);
                    if (ns.isRunning('taskRunner.ns', 'home', encodedBatch, serverToSetup.hostname)) {
                        continue;
                    }
                    if ((ns.getServerMaxRam('home') - ns.getServerUsedRam('home')) < ns.getScriptRam('taskRunner.ns', 'home')) {
                        continue;
                    }
                    serverToSetup.ramReserved += batchRamUse;
                    let pid = ns.run('taskRunner.ns', 1, encodedBatch, serverToSetup.hostname);
                    serverToSetup.tasks.push({ pid: pid, ramReserved: batchRamUse });
                    break;
                }
            }

            await ns.sleep(1000 * 5);

            // Adjust reserved ram for scripts that stopped running
            let runningScripts = ns.ps('home');
            // array_column
            let runningScriptPids = runningScripts.map(function (value, index) {
                return value['pid'];
            })
            for (let server of servers) {
                if (server.tasks.length === 0) {
                    continue;
                }
                let stillRunningTasks = [];
                for (let t = 0; t < server.tasks.length; t++) {
                    let task = server.tasks[t];
                    if (runningScriptPids.includes(task.pid)) {
                        stillRunningTasks.push(task);
                        continue;
                    }

                    server.ramReserved -= task.ramReserved;
                }
                server.tasks = stillRunningTasks;
            }
        }
    }
}

/**
 * @param {NS} ns
 * @param {array} targets
 * @param {array} servers
 **/
export async function optimizeTargetServersBeforeRun(ns, targets, servers) {
    let optimQueue = buildQueueForOptimization(ns, targets);
    let batchesRun = [];
    while (batchesRun.length < optimQueue.length) {
        for (let batch of optimQueue) {
            let batchRamUse = 0;
            for (let job of batch) {
                batchRamUse += job.ramUse;
            }
            // Search servers that can be assigned to each job in the queue
            for (let serverToSetup of servers) {
                // Find smallest possible server for job
                let availableRam = (serverToSetup.ramMax - serverToSetup.ramReserved);
                if (availableRam < batchRamUse) {
                    continue;
                }
                let encodedBatch = JSON.stringify(batch);
                if (batchesRun.includes(encodedBatch)) {
                    continue;
                }
                if ((ns.getServerMaxRam('home') - ns.getServerUsedRam('home')) < ns.getScriptRam('taskRunner.ns', 'home')) {
                    continue;
                }
                batchesRun.push(encodedBatch);
                serverToSetup.ramReserved += batchRamUse;
                let pid = ns.run('taskRunner.ns', 1, encodedBatch, serverToSetup.hostname);
                serverToSetup.tasks.push({ pid: pid, ramReserved: batchRamUse });
                break;
            }
        }

        await ns.sleep(1000 * 5);

        // Adjust reserved ram for scripts that stopped running
        let runningScripts = ns.ps('home');
        // array_column
        let runningScriptPids = runningScripts.map(function (value, index) {
            return value['pid'];
        })
        for (let server of servers) {
            if (server.tasks.length === 0) {
                continue;
            }
            let stillRunningTasks = [];
            for (let t = 0; t < server.tasks.length; t++) {
                let task = server.tasks[t];
                if (runningScriptPids.includes(task.pid)) {
                    stillRunningTasks.push(task);
                    continue;
                }

                server.ramReserved -= task.ramReserved;
            }
            server.tasks = stillRunningTasks;
        }
    }

    while (ns.scriptRunning('taskRunner.ns', 'home')) {
        await ns.sleep(1000 * 10);
    }
}

/**
 * @param {NS} ns
 * @param {array} targets
 **/
function buildQueueForOptimization(ns, targets) {
    let batch = [];
    let queue = [];
    for (let target of targets) {
        let targetServer = ns.getServer(target.targetServer.hostname);
        let weakenTime = ns.getWeakenTime(targetServer.hostname);
        if (targetServer.hackDifficulty > targetServer.minDifficulty) {
            let weakenThreadsBeforeGrow = getWeakenThreads(targetServer.minDifficulty, targetServer.hackDifficulty);
            batch.push(
                createJob(ns, targetServer.hostname, 'weaken.ns', weakenThreadsBeforeGrow, 1000, 1)
            );
        }

        let maxMoney = ns.getServerMaxMoney(targetServer.hostname);
        let availableMoney = ns.getServerMoneyAvailable(targetServer.hostname);

        // Only grow and reweaken if we have need for that
        if (maxMoney > 0 && availableMoney < maxMoney) {
            if (availableMoney === 0) {
                availableMoney = 1;
            }
            let missingMoney = maxMoney - availableMoney;
            let growFactor = Math.ceil((missingMoney / (availableMoney / 100)) / 100);
            let growThreads = Math.ceil(ns.growthAnalyze(targetServer.hostname, growFactor));
            let growTime = ns.getGrowTime(targetServer.hostname);
            if (growThreads < 1) {
                growThreads = 1;
            }

            let growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads);
            let weakenThreadsAfterGrow = getWeakenThreads(targetServer.minDifficulty, (targetServer.hackDifficulty + growSecurityIncrease));

            batch.push(
                createJob(ns, targetServer.hostname, 'weaken.ns', weakenThreadsAfterGrow, (weakenTime - growTime - 500), 3)
            );

            batch.push(
                createJob(ns, targetServer.hostname, 'grow.ns', growThreads, 100, 2)
            );
        }
        if (batch.length === 0) {
            continue;
        }
        queue.push(batch);
        batch = [];
    }

    return queue;
}

/**
 * @param {NS} ns
 * @param {array} targets
 **/
function buildQueue(ns, targets) {
    let batch = [];
    let queue = [];
    for (let target of targets) {
        let hackTime = ns.formulas.hacking.hackTime(target.targetServer, ns.getPlayer());
        let growTime = ns.formulas.hacking.growTime(target.targetServer, ns.getPlayer());
        let weakenTime = ns.formulas.hacking.weakenTime(target.targetServer, ns.getPlayer());

        batch.push(
            createJob(ns, target.targetServer.hostname, 'weaken.ns', target.weakenThreadsAfterHack, 200, 2)
        );
        batch.push(
            createJob(ns, target.targetServer.hostname, 'weaken.ns', target.weakenThreadsAfterGrow, (weakenTime - growTime - 100), 4)
        )
        batch.push(
            createJob(ns, target.targetServer.hostname, 'grow.ns', target.growThreads, (growTime - hackTime - 100), 3)
        );
        batch.push(
            createJob(ns, target.targetServer.hostname, 'hack.ns', target.hackThreads, 100, 1)
        );
        queue.push(batch);
        batch = [];
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
        ramUse: ramUse
    };
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
    optimalServerDeepClone.moneyAvailable = optimalServerDeepClone.maxMoney * 0.5;
    optimalServerDeepClone.hackDifficulty = optimalServerDeepClone.minDifficulty;

    return optimalServerDeepClone;
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