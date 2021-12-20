// It will run the scripts at their highest possible thread count after killing all processes, that were still running on the remote servers.
/** @param {NS} ns **/
export async function main(ns) {
    let serversToSetup = ns.read('validServers.txt').split(',');

    let filesToCopy = [
        'trainHack.ns',
        'hack.script',
        'weaken.script',
        'grow.script',
        'growLight.script',
        'validServers.txt',
        'validServersWithoutOwn.txt'
    ];

    let scriptsToRun = [
        {name: 'hack.script', ramUse: ns.getScriptRam('hack.script'), args: 3000000},
        {name: 'weaken.script', ramUse: ns.getScriptRam('weaken.script'), args: ''},
        {name: 'grow.script', ramUse: ns.getScriptRam('grow.script'), args: ''},
        {name: 'growLight.script', ramUse: ns.getScriptRam('growLight.script'), args: ''},
        {name: 'trainHack.ns', ramUse: getScriptRam('trainHack.ns'), args: ''},
    ];

    for (let i = 0; i < serversToSetup.length; i++) {
        let serverName = serversToSetup[i];
        let maxRam = ns.getServerMaxRam(serverName);
        ns.killall(serverName);
        await ns.scp(filesToCopy, serverName);

        for (let sr = 0; sr < scriptsToRun.length; sr++) {
            let script = scriptsToRun[sr];
            let usedRam = ns.getServerUsedRam(serverName);
            let threads = 1;
            if (script.ramUse > 0) {
                threads = Math.floor((maxRam - usedRam) / script.ramUse);
            }

            if (threads <= 0) {
                continue;
            }
            ns.exec(script.name, serverName, threads, script.args);
        }
    }
}
