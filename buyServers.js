function buyServers(args = []) {
    // Default, we buy until we hit the limit
    var numberOfServers = getPurchasedServerLimit() - getPurchasedServers().length;
    if (args.length > 0 && args[0] < numberOfServers) {
        numberOfServers = args[0];
    }

    var serverNameTemplate = 'hackserv-';
    if (args.length > 1) {
        serverNameTemplate = args[1];
    }

    var player = getPlayer();

    var maxAffordableRam = 0;
    var purchasedServerMaxRam = getPurchasedServerMaxRam();
    for (var r = 1; r * r <= (purchasedServerMaxRam/1024); r++) {
        var ram = r * r * 1024
        if (getPurchasedServerCost(numberOfServers * ram) < player.money) {
            maxAffordableRam = ram;
            continue;
        }

        break;
    }

    // TODO: check if we already own the server, and if this would be an upgrade
    for (var i = 0; i < numberOfServers; i++) {
        purchaseServer(serverNameTemplate + i, maxAffordableRam);
    }

    spawn('validateServers.script');
}
