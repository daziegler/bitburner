/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args.length < 2) {
        return;
    }

    let batch = JSON.parse(ns.args[0]);
    let server = ns.args[1]
    await workBatch(ns, batch, server);
}

async function workBatch(ns, batch, server) {
    for (let job of batch) {
        ns.print(
            ns.sprintf(
                'Running script %s (%d threads) targetting %s on server %s',
                job.script,
                job.threads,
                job.target,
                job.host
            )
        )

        ns.exec(job.script, server, job.threads, job.target, job.order);
        await ns.sleep(job.waitTime);
    }
}