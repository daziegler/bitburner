// This script will scan for Servers that already have root access or can be hacked with the given Skillset.
// It will create two txt files:
// - validServers.txt contains all servers, that could be hacked and are below the skill level of the user
// - validServersWithoutOwn.txt as above, but excluding own servers
// - invalidServers.txt contains all servers, that are too high level, have to many required ports etc.
function validate(args = []) {
    var serversToHack = scan("home");
    var validatedServers = [];
    var ignoredServers = [];
    var hackingLevel = getHackingLevel();
    var availablePortScripts = 4;

    // Validation
    while ((ignoredServers.length + validatedServers.length) < serversToHack.length) {
        for (var v = 0; v < serversToHack.length; v++) {
            var serverToValidate = serversToHack[v];
            if (ignoredServers.includes(serverToValidate) || validatedServers.includes(serverToValidate)) {
                continue;
            }

            // Validation
            if (validatedServers.includes(serverToValidate) === false) {
                if (serverToValidate === 'home') {
                    ignoredServers.push(serverToValidate);
                    continue;
                }
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
                if (requiredPortAmountForServer > availablePortScripts) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }

                if (requiredPortAmountForServer > 0) {
                    brutessh(serverToValidate);
                }

                if (requiredPortAmountForServer > 1) {
                    ftpcrack(serverToValidate);
                }

                if (requiredPortAmountForServer > 2) {
                    relaysmtp(serverToValidate);
                }

                if (requiredPortAmountForServer > 3) {
                    httpworm(serverToValidate);
                }

                if (requiredPortAmountForServer > 4) {
                    sqlinject(serverToValidate);
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

    write('validServers.txt', validatedServers, 'w');
    write('invalidServers.txt', ignoredServers, 'w');

    var ownServers = getPurchasedServers();
    var validatedServersWithoutOwn = [];
    for (var v = 0; v < validatedServers.length; v++) {
        if (ownServers.includes(validatedServers[v])) {
            continue;
        }
        validatedServersWithoutOwn.push(validatedServers[v]);
    }

    write('validServersWithoutOwn.txt', validatedServersWithoutOwn, 'w');
}
