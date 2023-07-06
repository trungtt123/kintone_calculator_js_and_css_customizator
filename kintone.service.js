async function getRecords(appId, size, offset) {
    return new Promise((resolve, reject) => {
        kintone.api(kintone.api.url('/k/v1/records', true), 'GET', { app: appId, query: `limit ${size} offset ${offset}` }, function (resp) {
            resolve(resp);
        }, function (error) {
            reject(error);
        });
    });
}
async function getAllRecordsFromKintone(appId) {
    const allRecords = [];
    let offset = 0;
    let hasMoreRecords = true;

    while (hasMoreRecords) {
        const response = await getRecords(appId, 100, offset);

        const records = response.records;
        allRecords.push(...records);

        if (records.length < 100) {
            hasMoreRecords = false;
        } else {
            offset += 100;
        }
    }

    return allRecords;
}