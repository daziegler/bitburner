/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args.length < 2) {
        return;
    }

    ns.disableLog('sleep');


    let batch = JSON.parse(ns.args[0]);
    let server = ns.args[1]

    await workBatch(ns, batch, server);
}

/**
 * @param {NS} ns
 * @param {array} batch
 * @param {string} server
 **/
async function workBatch(ns, batch, server) {
    let pids = [];
    for (let job of batch) {
        ns.print(
            ns.sprintf(
                'Running script %s (%d threads) targetting %s on server %s',
                job.script,
                job.threads,
                job.target,
                server
            )
        )

        let pid = ns.exec(job.script, server, job.threads, job.target, job.order);
        if (pid === 0) {
            ns.alert(ns.sprintf(
                'Script %s with target %s (called on %s) did not start!',
                job.script,
                job.target,
                server
            ));
        } else {
            pids.push(pid);
        }

        await ns.sleep(job.waitTime);
    }

    let scriptsRunning = true;
    while (scriptsRunning) {
        let runningScripts = ns.ps(server)
        let runningScriptPids = runningScripts.map(function (value, index) {
            return value['pid'];
        });

        let stillRunningPids = runningScriptPids.filter(x => pids.includes(x));
        if (stillRunningPids.length === 0) {
            scriptsRunning = false;
        }

        await ns.sleep(1000 * 10);
    }
}