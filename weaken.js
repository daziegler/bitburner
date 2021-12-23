/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args.length === 0) {
        ns.exit();
    }
    let serversToWeaken = ns.args[0].split(',');
    for (let i = 0; i < serversToWeaken.length; i++) {
        await ns.weaken(serversToWeaken[i]);
    }
}