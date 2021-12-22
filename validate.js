/** @param {NS} ns **/
export async function main(ns) {
    let serversToHack = ns.scan("home");
    let validatedServers = [];
    let ignoredServers = [];
    let availablePortScripts = await getAvailablePortScripts(ns)

    // Validation
    while ((ignoredServers.length + validatedServers.length) < serversToHack.length) {
        for (let v = 0; v < serversToHack.length; v++) {
            let serverToValidate = serversToHack[v];
            if (ignoredServers.includes(serverToValidate) || validatedServers.includes(serverToValidate)) {
                continue;
            }

            // Validation
            if (validatedServers.includes(serverToValidate) === false) {
                if (serverToValidate === 'home') {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
                if (ns.serverExists(serverToValidate) === false) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
                if (ns.getServerRequiredHackingLevel(serverToValidate) > ns.getHackingLevel()) {
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

    await ns.write('validServers.txt', validatedServers, 'w');
    await ns.write('invalidServers.txt', ignoredServers, 'w');

    let ownServers = ns.getPurchasedServers();
    let validatedServersWithoutOwn = [];
    for (let v = 0; v < validatedServers.length; v++) {
        if (ownServers.includes(validatedServers[v])) {
            continue;
        }
        validatedServersWithoutOwn.push(validatedServers[v]);
    }

    await ns.write('validServersWithoutOwn.txt', validatedServersWithoutOwn, 'w');

    ns.spawn('setup.ns');
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