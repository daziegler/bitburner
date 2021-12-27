import { validateServers, getServersToHack, optimizeTargetServersBeforeRun } from "taskManager.ns";

/** @param {NS} ns **/
export async function main(ns) {
    const filesToCopy = [
        'hack.ns',
        'weaken.ns',
        'grow.ns',
    ];

    ns.disableLog('getServerMaxRam');
    ns.disableLog('getServerUsedRam');

    const data = ns.flags([
        ['hosts', []],
        ['targets', []]
    ]);

    let argsHosts = data.hosts;
    let argsTargets = data.targets;
    let serversToSetup = validateServers(ns);
    let serversForHack = serversToSetup;
    if (argsTargets.length > 0) {
        serversForHack = argsTargets
    }
    let serversToHack = getServersToHack(ns, serversForHack);

    let targets = [];
    for (let target of serversToHack) {
        const targetServer = ns.getServer(target);
        if (targetServer.moneyMax === 0) {
            continue;
        }

        const targetInfo = {
            targetServer: targetServer,
        };

        targets.push(targetInfo);
    }

    if (argsHosts.length > 0) {
        serversToSetup = argsHosts
    }

    serversToSetup.sort(function (a, b) {
        return (ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
    });

    let servers = [];
    for (let serverName of serversToSetup) {
        servers.push({
            'hostname': serverName,
            'ramMax': ns.getServerMaxRam(serverName),
            'ramReserved': 0,
            'tasks': [],
        })

        await ns.scp(filesToCopy, serverName);
    }

    await optimizeTargetServersBeforeRun(ns, targets, servers);
}