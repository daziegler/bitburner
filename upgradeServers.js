// Updates all already owned servers
// If the maximum amount of ram is not affordable, one server will be upgraded to the highest capacity the player can afford
function upgradeServers(args = []) {
    var player = getPlayer();
    var ownedServers = getPurchasedServers();
    var purchasedServerMaxRam = getPurchasedServerMaxRam();
    var maxAffordableRam = 0;

    for (var r = 1; r * r <= purchasedServerMaxRam; r++) {
        var ram = r * r;
        if (getPurchasedServerCost(ownedServers.length * ram) < player.money) {
            maxAffordableRam = ram;
            continue;
        }

        break;
    }

    var requiresUpdate = false;
    for (var i = 0; i < ownedServers.length; i++) {
        var server = ownedServers[i];
        var serverMaxRam = getServerMaxRam(server);
        if (serverMaxRam >= maxAffordableRam) {
            continue;
        }

        deleteServer(server);
        purchaseServer(server, maxAffordableRam);
        requiresUpdate = true;
    }

    if (requiresUpdate) {
        spawn('validateServers.script');
    }
}
