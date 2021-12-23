/** @param {NS} ns **/
export async function main(ns) {
    const filesToCopy = [
        'hack.ns',
        'weaken.ns',
        'grow.ns',
    ];

    let initialSetupDone = false;

    while (true) {
        let refreshTime = -1;
        let serversToSetup = await validateServers(ns);
        let serversToHack = await getServersToHack(ns, serversToSetup);

        serversToSetup.sort(function(a, b) {
            return (ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
        });

        let queue = [];
        for (let ht = 0; ht < serversToHack.length; ht++) {
            let target = serversToHack[ht];

            let serverMinSecurity = ns.getServerMinSecurityLevel(target);
            let serverCurSecurity = ns.getServerSecurityLevel(target);

            let serverMaxMoney = ns.getServerMaxMoney(target);
            let serverCurMoney = ns.getServerMoneyAvailable(target);

            if (serverMaxMoney === 0) {
                continue;
            }

            let moneyThresh = serverMaxMoney * 0.9;
            let securityThresh = serverMinSecurity * 1.1;

            if (serverCurSecurity > securityThresh) {
                let weakenedBy = 0;
                let weakenThreads = 0;
                while (weakenedBy < (serverCurSecurity - securityThresh)) {
                    weakenedBy = ns.weakenAnalyze(++weakenThreads);
                }
                let weakenTime = ns.getWeakenTime(target);
                queue.push(await createJob(target, 'weaken.ns', weakenThreads, weakenTime));

                continue;
            }

            if (serverCurMoney < moneyThresh){
                let growThreads = Math.ceil(ns.growthAnalyze(target, (moneyThresh - serverCurMoney)));
                let growTime = ns.getGrowTime(target);
                queue.push(await createJob(target, 'grow.ns', growThreads, growTime));

                continue;
            }

            let hackThreads = ns.hackAnalyzeThreads(target, serverCurMoney);
            let hackTime = ns.getHackTime(target);

            queue.push(await createJob(target, 'hack.ns', hackThreads, hackTime));
        }

        // If we have no queue, wait a minute, then restart the queueing process.
        if (queue.length === 0) {
            ns.tprint('No tasks were queued. There might be something wrong!');
            await ns.sleep(1000 * 60);
            continue;
        }

        // Fastest job on lowest security server should train hacking the fastest
        let trainingJob = await createJob(
            'n00dles',
            'weaken.ns',
            Number.MAX_SAFE_INTEGER,
            ns.getWeakenTime('n00dles')
        );

        let runs = 0;
        while (serversToSetup.length > 0) {
            if (runs === 3) {
                // If we could not assign a task to a server the third time we tried, there is no server that could handle it.
                break;
            }

            ++runs;

            for (let i = 0; i < serversToSetup.length; i++) {
                let serverName = serversToSetup[i];
                await ns.scp(filesToCopy, serverName);
                // For the first run, we kill all scripts
                if (initialSetupDone === false) {
                    ns.killall(serverName);
                }
                let maxRam = ns.getServerMaxRam(serverName);
                let usedRam = ns.getServerUsedRam(serverName);
                let availableRam = maxRam - usedRam;

                // if we empty the queue but have servers left, train hacking
                if (queue.length === 0) {
                    queue.push(trainingJob);
                }

                // Assign queue items, where applicable
                for (let qi = 0; qi < queue.length; qi++) {
                    // We deepclone the job because we want to run and save different thread sizes
                    let jobInQueue = queue[qi];
                    let jobToRun = JSON.parse(JSON.stringify(jobInQueue));

                    let scriptRamUse = ns.getScriptRam(jobInQueue.script);
                    let maxThreadsForServer = Math.floor(availableRam / scriptRamUse);

                    // If the server can not run the job at least once, ignore it.
                    if (maxThreadsForServer <= 0) {
                        continue;
                    }

                    let threadsForJob = jobInQueue.threads;
                    if (maxThreadsForServer < threadsForJob) {
                        jobInQueue.threads -= maxThreadsForServer;
                        jobToRun.threads = maxThreadsForServer;
                    }

                    await workJob(ns, serverName, jobToRun);

                    if (maxThreadsForServer >= threadsForJob) {
                        // remove job from queue
                        queue.splice(qi, 1);
                    }

                    // set refreshTime to the shortest script time to reassign tasks
                    if (refreshTime === -1 || jobToRun.runTime < refreshTime) {
                        refreshTime = jobToRun.runTime;
                    }
                }
            }
            initialSetupDone = true;
        }

        // If no time is set, no script was run. Just wait and inform player
        if (!refreshTime || refreshTime <= 0) {
            ns.tprint('No script was run. Waiting.');
            refreshTime = 1000 * 60;
        }

        await ns.sleep(refreshTime);
    }
}

async function createJob(target, scriptName, threads, time) {
    // Add one second security buffer to time, then ceil it.
    time += 1000;
    let roundedTime = Math.ceil(time);

    return {
        target: target,
        script: scriptName,
        threads: threads,
        runTime: roundedTime
    };
}

async function workJob(ns, server, job) {
    ns.tprint(
        ns.sprintf(
            'Running script %s (%d threads) targetting %s on server %s',
            job.script,
            job.threads,
            job.target,
            server
        )
    )

    await ns.exec(job.script, server, job.threads, job.target);
}

/**
 * @param {NS} ns
 * @param {array} servers
 **/
async function getOptimalServer(ns, servers) {
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
async function validateServers(ns) {
    let serversToHack = ns.scan('home');
    let validatedServers = [];
    let ignoredServers = [];
    let availablePortScripts = await getAvailablePortScripts(ns)

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

            let newTargets = ns.scan(serverToValidate);
            for (let x = 0; x < newTargets.length; x++) {
                if (serversToHack.includes(newTargets[x])) {
                    continue;
                }

                serversToHack.push(newTargets[x]);
            }
        }
    }

    return validatedServers;
}

/**
 * @param {NS} ns
 * @param {array} validServers
 **/
async function getServersToHack(ns, validServers) {
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

/** @param {NS} ns **/
async function getAvailablePortScripts(ns) {
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