// Hack Servers from the validServer.txt File that have at least a certain amount of money on them.
// If no servers fulfill the requirement, the script will instead grow the amount of money.
function hackScript(args = []) {
    // Arguments:
    var minMoneyToAttemptHack = 1000000;
    if (args.length >= 1) {
        minMoneyToAttemptHack = args[0];
    }

    var serversToHack = read('validServers.txt').split(',');
    var toGrow = [];

    // Validation
    while (true) {
        // Hack until we have no valid servers left
        while (serversToHack.length > toGrow.length) {
            for (var i = 0; i < serversToHack.length; i++) {
                var serverToHack = serversToHack[i];

                // This should never be the case, but better be safe than sorry
                if (toGrow.includes(serverToHack)) {
                    continue;
                }

                if (getServerMoneyAvailable(serverToHack) > minMoneyToAttemptHack) {
                    hack(serverToHack);
                    continue;
                }

                toGrow.push(serverToHack);
            }
        }

        // If all money from all valid servers (everything we could scan and nuke) is gone, start growing again
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
}
