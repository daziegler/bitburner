function buyServers(args = []) {
    // Default, we buy until we hit the limit
    var purchasedServers = getPurchasedServers();
    var numberOfServers = getPurchasedServerLimit() - purchasedServers.length;
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
    for (var r = 1; Math.pow(2, r) <= purchasedServerMaxRam; r++) {
        var ram = Math.pow(2, r);
        if ((getPurchasedServerCost(ram) * numberOfServers) < player.money) {
            maxAffordableRam = ram;
            continue;
        }

        break;
    }

    if (maxAffordableRam === 0) {
        exit();
    }

    for (var i = 0; i < numberOfServers; i++) {
        var newServerName = serverNameTemplate + i;
        if (purchasedServers.includes(newServerName)) {
            // If we already own the server, and it is better, than the best possible update, we buy a new one
            // If it would be worse, we upgrade the server instead
            if (getServerMaxRam(newServerName) >= maxAffordableRam) {
                numberOfServers++;
                continue;
            } else {
                deleteServer(newServerName);
            }
        }
        purchaseServer(newServerName, maxAffordableRam);
    }

    spawn('validateServers.script');
}
