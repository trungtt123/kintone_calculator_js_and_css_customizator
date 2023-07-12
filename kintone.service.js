async function createCursor(body) {
    // auto get 500 records
    return new Promise((resolve, reject) => {
        kintone.api(kintone.api.url('/k/v1/records/cursor', true), 'POST', body, function (resp) {
            // success
            resolve(resp);
        }, function (error) {
            // error
            reject(error);
        });
    });
}
function deleteCursor(cursorId) {
    return new Promise((resolve, reject) => {
        kintone.api(kintone.api.url('/k/v1/records/cursor', true), 'DELETE', { id: cursorId }, function (resp) {
            // success
            resolve(resp);
        }, function (error) {
            // error
            reject(error);
        });
    });
}
async function getRecordByCursor(cursor) {
    var body = {
        'id': cursor.id
    };
    return new Promise((resolve, reject) => {
        kintone.api(kintone.api.url('/k/v1/records/cursor', true), 'GET', body, function (resp) {
            // success
            let records = resp.records;
            if (resp.next) {
                resolve(getRecordByCursor(cursor)
                    .then(nextRecords => records.concat(nextRecords)).catch(e => {
                        console.error(e);
                    }));
            }
            resolve(records);
        }, function (error) {
            // error
            reject(error);
        });
    })
}
async function getAllRecordsFromKintone(body) {
    try {
        // create cursor
        const cursor = await createCursor(body);
        // fetch all data
        let allRecords = await getRecordByCursor(cursor);
        // delete cursor
        // await deleteCursor(cursor.id);
        return allRecords;
    }
    catch (e) {
        console.error(e);
    }
}