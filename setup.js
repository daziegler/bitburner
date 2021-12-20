/** @param {NS} ns **/
export async function main(ns) {
    let data = ns.flags([
        ['train', false]
    ]);

    const doTraining = data.train;

    const filesToCopy = [
        'hack.ns',
        'weaken.ns',
        'grow.ns',
    ];

    // 1 hour (ms)
    const refreshTime = 1000 * 60 * 60;

    while (true) {
        let serversToSetup = await validateServers(ns);
        let serversToHack = await getServersToHack(ns, serversToSetup);
        for (let i = 0; i < serversToSetup.length; i++) {
            let serverName = serversToSetup[i];
            let maxRam = ns.getServerMaxRam(serverName);
            await ns.scp(filesToCopy, serverName);
            ns.killall(serverName);

            let target = '';
            let script = 'hack.ns';
            if (doTraining) {
                target = await getOptimalTrainingServer(ns, serversToHack);
            } else {
                target = await getOptimalMoneyServer(ns, serversToHack);
                script = await selectBestScript(ns, target);
            }

            let scriptRamUse = ns.getScriptRam(script, serverName);
            let usedRam = ns.getServerUsedRam(serverName);
            let threads = 1;
            if (scriptRamUse > 0) {
                threads = Math.floor((maxRam - usedRam) / scriptRamUse);
            }

            if (threads <= 0) {
                continue;
            }

            if (target === '') {
                ns.exec(script, serverName, threads);
            } else {
                ns.exec(script, serverName, threads, target);
            }
        }

        await ns.sleep(refreshTime);
    }
}

/** 
 * @param {NS} ns 
 * @param {array} servers
 **/
async function getOptimalMoneyServer(ns, servers) {
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

/** 
 * @param {NS} ns 
 * @param {array} servers
 **/
async function getOptimalTrainingServer(ns, servers) {
    let optimalServer = '';
    let optimalVal = null;
    let currVal;
    let currTime;

    for (let i = 0; i < servers.length; i++) {
        currTime = ns.getWeakenTime(servers[i]) + ns.getGrowTime(servers[i]) + ns.getHackTime(servers[i]);
        if (optimalVal === null || currTime < optimalVal) {
            optimalVal = currVal;
            optimalServer = servers[i];
        }
    }

    return optimalServer;
}

/** 
 * @param {NS} ns 
 * @param {string} validServers
 **/
async function selectBestScript(ns, target) {
    let moneyThresh = ns.getServerMaxMoney(target) * 0.9;
    let securityThresh = ns.getServerMinSecurityLevel(target) * 1.1;

    if (ns.getServerSecurityLevel(target) > securityThresh) {
        ns.tprint('weakening');
        return 'weaken.ns';
    } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
        ns.tprint('growing');
        return 'grow.ns';
    } else {
        ns.tprint('hacking')
        return 'hack.ns';
    }
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

                if (requiredPortAmountForServer > 0) {
                    ns.brutessh(serverToValidate);
                }

                if (requiredPortAmountForServer > 1) {
                    ns.ftpcrack(serverToValidate);
                }

                if (requiredPortAmountForServer > 2) {
                    ns.relaysmtp(serverToValidate);
                }

                if (requiredPortAmountForServer > 3) {
                    ns.httpworm(serverToValidate);
                }

                if (requiredPortAmountForServer > 4) {
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

    return validatedServersWithoutOwn;
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
