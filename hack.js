/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args.length === 0) {
        ns.exit();
    }
    let serversToHack = ns.args[0].split(',');
    for (let i = 0; i < serversToHack.length; i++) {
        await ns.hack(serversToHack[i]);
    }
}