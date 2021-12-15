// Updates all already owned servers
// If the maximum amount of ram is not affordable, one server will be upgraded to the highest capacity the player can afford
function upgradeServers(args = []) {
    var player = getPlayer();
    var ownedServers = getPurchasedServers();
    var purchasedServerMaxRam = getPurchasedServerMaxRam();
    var serverOptions = [];

    // Create an array with powers of 2 up to the max allowed ram
    for (var r = 0; r * r <= (purchasedServerMaxRam/1024); r++) {
        print(r);
        print(r * r);
        print(r * r * 1024);
        serverOptions.push(r * r * 1024);
    }

    // Sort server options descending
    serverOptions.sort(function(a, b) {
        return a - b;
    });

    print(serverOptions.join(','));

    for (var i = 0; i < ownedServers.length; i++) {
        var server = ownedServers[i];
        var serverMaxRam = getServerMaxRam(server);
        if (serverMaxRam >= purchasedServerMaxRam) {
            continue;
        }

        // try to buy the best server we can, if it is an upgrade
        for (var j = 0; j < serverOptions.length; j++) {
            var ram = serverOptions[j];
            if (player.money < getPurchasedServerCost(ram)) {
                continue;
            }

            deleteServer(server);
            purchaseServer(server, ram);
        }
    }

    spawn('validateServers.script');
}
