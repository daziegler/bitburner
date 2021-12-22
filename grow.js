/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        let serversToGrow = [];
        if (ns.args.length > 0) {
            serversToGrow = ns.args[0].split(',');
        } else {
            serversToGrow = await ns.read('validServersWithoutOwn.txt').split(',');
        }
        for (let i = 0; i < serversToGrow.length; i++) {
            await ns.grow(serversToGrow[i]);
        }
    }
}