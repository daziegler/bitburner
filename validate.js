// This script will scan for Servers that already have root access or can be hacked with the given Skillset.
// It will create two txt files:
// - validServers.txt contains all servers, that could be hacked and are below the skill level of the user
// - invalidServers.txt contains all servers, that are too high level, have to many required ports etc.
function validateScript(args = []) {
    // Servers that should be ignored. This is useful to prevent hacking your own servers.
    var serversToIgnore = [
        "home",
    ];

    if (args.length > 0) {
        serversToIgnore = args[0].split(',');
    }

    var serversToHack = scan("home");
    var validatedServers = [];
    var ignoredServers = [];
    var hackingLevel = getHackingLevel();
  
    while ((ignoredServers.length + validatedServers.length) < serversToHack.length) {
        for (var v = 0; v < serversToHack.length; v++) {
            var serverToValidate = serversToHack[v];
            if (serversToIgnore.includes(serverToValidate)) {
                ignoredServers.push(serverToValidate);
                continue;
            }

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
              
                // atm we only have brutessh available, so the amount is one.
                // TODO: Change when more Port Hack Scripts are available.
                var availablePortScriptAmount = 1;
                if (requiredPortAmountForServer > availablePortScripts) {
                    ignoredServers.push(serverToValidate);
                    continue;
                }

                // TOOD: Add more Port Hack Scripts when they are available.
                if (requiredPortAmountForServer > 0) {
                    brutessh(serverToValidate);
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
}
