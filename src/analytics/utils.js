/**
 * Make a request to the world object (in charge of history logging) to
 * save its log just in case something bad happens
 */
export async function postPersistRequest() {
    const worldObject = realityEditor.worldObjects.getBestWorldObject();
    if (!worldObject) {
        console.warn('postPersistRequest unable to find worldObject');
        return;
    }
    const historyLogsUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/history/persist');
    try {
        const res = await fetch(historyLogsUrl, {
            method: 'POST',
        });

        const body = await res.json();
        console.log('postPersistRequest logName', body);
    } catch (e) {
        console.log('postPersistRequest failed', e);
    }
}
