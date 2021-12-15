function removeAllServers(args = []){
  var ownedServers = getPurchasedServers();
  for (var i = 0; i < ownedServers.length; i++) {
    var server = ownedServers[i];
    killall(server);
    deleteServer(server);
  }
}
