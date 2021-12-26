/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args.length < 2) {
        return;
    }

    let batch = JSON.parse(ns.args[0]);
    let server = ns.args[1]

    await workBatch(ns, batch, server, waitUntilDone);
}

/**
 * @param {NS} ns
 * @param {array} batch
 * @param {string} server
 **/
async function workBatch(ns, batch, server) {
    let order = 0;
    let lastJob = null;
    for (let job of batch) {
        if (job.order >= order) {
            lastJob = job;
            order = job.order;
        }

        ns.print(
            ns.sprintf(
                'Running script %s (%d threads) targetting %s on server %s',
                job.script,
                job.threads,
                job.target,
                server
            )
        )

        ns.exec(job.script, server, job.threads, job.target, job.order);
        await ns.sleep(job.waitTime);
    }

    ns.tprint(lastJob);
    ns.tprint(server);

    // wait until the final script stops running
    while(ns.isRunning(lastJob.script, server, lastJob.target, lastJob.order)) {
        await ns.sleep(1000 * 10);
    }
}