// Contains some earlier/easier iterations of Scripts, along with Scripts that I currently lack the tech for

// Script that tries nuking available servers. Unused because of lacking logic for ports and too much manual work
function nukeScript(serverName = '') {
    if (serverExists(serverName) === false) {
        return false;
    }

    if (hasRootAccess(serverName) === true) {
        return true;
    }

    if (getServerRequiredHackingLevel(serverName) <= getHackingLevel()) {
        nuke(serverName);
        return true;
    }

    return false;
}

// Backdoor script that would be usefull if I already had the "installBackdoor" script unlocked
function backdoor(args = []) {
    var serversToInfiltrate = scan("home");
    var finishedOrFailedServers = [];
    while (serversToInfiltrate.length > finishedOrFailedServers.length) {
        for (var i = 0; i < serversToInfiltrate.length; i++) {
            var serverToInfiltrate = serversToInfiltrate[i];
            if (finishedOrFailedServers.includes(serverToInfiltrate)) {
                continue;
            }

            if (getServerRequiredHackingLevel(serverToInfiltrate) > getHackingLevel()) {
                finishedOrFailedServers.push(serverToInfiltrate);
                continue;
            }

            if (hasRootAccess(serverToInfiltrate) === false) {
                // Todo: Start opening ports when we get the programs
                if (getServerNumPortsRequired(serverToInfiltrate) > 0) {
                    finishedOrFailedServers.push(serverToInfiltrate);
                    continue;
                }
                nuke(serverToInfiltrate);
            }

            installBackdoor(serverToInfiltrate);

            // Find new targets if the server we hacked was empty
            var newTargets = scan(serverToInfiltrate);
            for (var x = 0; x < newTargets.length; x++) {
                if (serversToInfiltrate.includes(newTargets[x]) || finishedOrFailedServers.includes(newTargets[x])) {
                    continue;
                }

                serversToInfiltrate.push(newTargets[x]);
            }
        }
    }
}

// Early iteration of the validate Script that did not allow exclusion of owned servers
function validateV1(args = []) {
    var serversToHack = scan("home");
    var validatedServers = [];
    var ignoredServers = [];
    var hackingLevel = getHackingLevel();
    var availablePortScripts = [
        'brutessh',
    ];

    // Validation
    while ((ignoredServers.length + validatedServers.length) < serversToHack.length) {
        for (var v = 0; v < serversToHack.length; v++) {
            var serverToValidate = serversToHack[v];

            if (ignoredServers.includes(serverToValidate) || validatedServers.includes(serverToValidate)) {
                continue;
            }

            // Validation
            if (validatedServers.includes(serverToValidate) === false) {
                if (serverExists(serverToValidate) === false) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
                if (getServerRequiredHackingLevel(serverToValidate) > hackingLevel) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
            }

            if (hasRootAccess(serverToValidate) === false) {
                var requiredPortAmountForServer = getServerNumPortsRequired(serverToValidate);
                if (requiredPortAmountForServer > availablePortScripts.length) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }

                for (var s = 0; s < requiredPortAmountForServer; s++) {
                    run(availablePortScripts[s], 1, serverToValidate);
                }

                nuke(serverToValidate);
            }

            validatedServers.push(serverToValidate);

            var newTargets = scan(serverToValidate);
            for (var x = 0; x < newTargets.length; x++) {
                if (serversToHack.includes(newTargets[x])) {
                    continue;
                }

                serversToHack.push(newTargets[x]);
            }
        }
    }

    write('validServers.txt', validatedServers);
    write('invalidServers.txt', ignoredServers);
}

// Eary iteration of the hack script, that scans for servers instead of using a validated list
function hackScriptV1(args = []) {
    var serversToHack = scan("home");
    var validatedServers = [];
    var ignoredServers = [];
    var toGrow = [];

    while (ignoredServers.length < serversToHack.length) {
        for (var i = 0; i < serversToHack.length; i++) {
            var serverToHack = serversToHack[i];

            if (ignoredServers.includes(serverToHack)) {
                continue;
            }

            // Validation
            if (validatedServers.includes(serverToHack) === false) {
                if (serverExists(serverToHack) === false) {
                    ignoredServers.push(serverToHack);
                    continue;
                }
                if (getServerRequiredHackingLevel(serverToHack) > getHackingLevel()) {
                    ignoredServers.push(serverToHack);
                    continue;
                }

                validatedServers.push(serverToHack);
            }

            if (hasRootAccess(serverToHack) === false) {
                // Todo: Start opening ports when we get the programs
                if (getServerNumPortsRequired(serverToHack) > 0) {
                    ignoredServers.push(serverToHack);
                    continue;
                }
                nuke(serverToHack);
            }

            if (getServerMoneyAvailable(serverToHack) > 0) {
                hack(serverToHack);
                continue;
            }

            toGrow.push(serverToHack);
            ignoredServers.push(serverToHack);

            // Find new targets if the server we hacked was empty
            var newTargets = scan(serverToHack);
            for (var x = 0; x < newTargets.length; x++) {
                if (serversToHack.includes(newTargets[x])) {
                    continue;
                }

                serversToHack.push(newTargets[x]);
            }
        }
    }

    // If we hacked, what we could hack, we grow the servers we have
    while (toGrow.length > 0) {
        for (var j = 0; j < toGrow.length; j++) {
            var serverToGrow = toGrow[j];

            if (getServerMoneyAvailable(serverToGrow) === getServerMaxMoney(serverToGrow)) {
                toGrow.splice(j, 1);
                continue;
            }

            grow(serverToGrow);
        }
    }
}
