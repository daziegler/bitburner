import { validateServers, getServersToHack, optimizeTargetServersBeforeRun } from "taskman.ns";

/** @param {NS} ns **/
export async function main(ns) {
    const filesToCopy = [
        'hack.ns',
        'weaken.ns',
        'grow.ns',
    ];

    let serversToSetup = await validateServers(ns);
    let serversToHack = await getServersToHack(ns, serversToSetup);

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

    serversToSetup.sort(function (a, b) {
        return (ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
    });

    for (let serverName of serversToSetup) {
        await ns.scp(filesToCopy, serverName);
    }

    await optimizeTargetServersBeforeRun(ns, targets, serversToSetup);

    ns.spawn('taskman.ns');
}