import { validateServers, getServersToHack, optimizeTargetServersBeforeRun } from "taskman.ns";

/** @param {NS} ns **/
export async function main(ns) {
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

    await optimizeTargetServersBeforeRun(ns, targets, serversToSetup);
}