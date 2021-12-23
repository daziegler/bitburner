/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args.length === 0) {
        ns.exit();
    }
    let serversToGrow = ns.args[0].split(',');
    for (let i = 0; i < serversToGrow.length; i++) {
        await ns.grow(serversToGrow[i]);
    }
}