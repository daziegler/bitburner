// This script copies the relevant scrupts to the valid servers found in the validServer.txt
// It will run the scripts at their highes possible thread count after killing all processes, that were still running on the remote servers.
function serverSetup(args = []) {
    var serversToSetup = read('validServers.txt').split(',');

    var filesToCopy = [
        'hack.script',
        'weaken.script',
        'validServers.txt',
        'validServersWithoutOwn.txt'
    ];

    var scriptsToRun = [
        {name: 'hack.script', ramUse: getScriptRam('hack.script'), args: 1000000},
        {name: 'weaken.script', ramUse: getScriptRam('weaken.script'), args: ''},
    ];

    for (var i = 0; i < serversToSetup.length; i++) {
        var serverName = serversToSetup[i];
        var maxRam = getServerMaxRam(serverName);
        killall(serverName);
        scp(filesToCopy, serverName);

        for (var sr = 0; sr < scriptsToRun.length; sr++) {
            var script = scriptsToRun[sr];
            var usedRam = getServerUsedRam(serverName);
            var threads = 1;
            if (script.ramUse > 0) {
                threads = Math.floor((maxRam - usedRam) / script.ramUse);
            }

            if (threads <= 0) {
                continue;
            }
            exec(script.name, serverName, threads, script.args);
        }
    }
}
