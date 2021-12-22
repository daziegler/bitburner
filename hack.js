/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        let serversToHack = [];
        if (ns.args.length > 0) {
            serversToHack = ns.args[0].split(',');
        } else {
            serversToHack = await ns.read('validServersWithoutOwn.txt').split(',');
        }

        for (let i = 0; i < serversToHack.length; i++) {
            await ns.hack(serversToHack[i]);
        }
    }
}