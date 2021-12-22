/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        let serversToWeaken = [];
        if (ns.args.length > 0) {
            serversToWeaken = ns.args[0].split(',');
        } else {
            serversToWeaken = await ns.read('validServersWithoutOwn.txt').split(',');
        }
        for (let i = 0; i < serversToWeaken.length; i++) {
            await ns.weaken(serversToWeaken[i]);
        }
    }
}