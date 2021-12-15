// Function will weaken servers from the validServers.txt if possible
function weakenScript(args = []) {
    var serversToWeaken = read('validServers.txt').split(',');
    var serversToIgnore = [];
    while (serversToIgnore.length < serversToWeaken.length) {
        for (var i = 0; i < serversToWeaken.length; i++) {
            var serverToWeaken = serversToWeaken[i];
            if (serversToIgnore.includes(serverToWeaken)) {
                continue;
            }

            if (hasRootAccess(serverToWeaken) === false) {
                serversToIgnore.push(serverToWeaken);
                continue;
            }

            if (getServerSecurityLevel(serverToWeaken) > getServerMinSecurityLevel(serverToWeaken)) {
                weaken(serverToWeaken);
                continue;
            }

            serversToIgnore.push(serverToWeaken);
        }
    }
}
