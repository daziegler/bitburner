// Updates all already owned servers
function upgradeServers(args = []) {
    var player = getPlayer();
    var ownedServers = getPurchasedServers();
    var purchasedServerMaxRam = getPurchasedServerMaxRam();
    var maxAffordableRam = 0;

    for (var r = 1; Math.pow(2, r) <= purchasedServerMaxRam; r++) {
        var ram = Math.pow(2, r);
        if ((getPurchasedServerCost(ownedServers.length) * ram) < player.money) {
            maxAffordableRam = ram;
            continue;
        }

        break;
    }

    if (maxAffordableRam === 0) {
        exit();
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
