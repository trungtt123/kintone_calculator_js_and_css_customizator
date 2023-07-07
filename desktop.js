(async function () {
  'use strict';
  const textCustomize = {
    "Export csv": "CSV出力",
    "End date": "終了日",
    "Calculating": "計算中",
    "Enter the end date!": "終了日を入力してください！"
  }
  const config = {
    sourceAppId: "5",
    sourceDateStarted: "dateStarted",
    sourceDisplayName: "displayName",
    sourceKey: "key",
    sourceProject: "project",
    sourceTimespent: "timeSpent",
    targetDisplayName: "displayName",
    targetEndDate: "date",
    targetPercent: "percent",
    targetProjectId: "projectId",
    targetProjectName: "projectName",
    targetTable: "Table"
  }
  const headerRow = ["工数集計締め年月日", "従業員氏名", "プロジェクト番号", "プロジェクト名称", "割合"];
  let dataExportCsv = [];
  kintone.events.on(['app.record.detail.show'], async function (event) {
    $('#MF-JIRA-CALCULATOR').remove();
    $('#record-gaia').prepend(
      `
        <div class="mf-jiraTimesheet-controls" id="MF-JIRA-CALCULATOR">
          <div class="flex-row">
            <button id="btnExportCsv" class="mf-submit-button plugin-mb-1">${textCustomize["Export csv"]}</button>
          </div>
        </div>
        `
    );
    // init dataExportCsv
    let dataTable = event.record[config?.targetTable];
    dataExportCsv = dataTable.value.map(o => [o.value[config?.targetEndDate].value, o.value[config?.targetDisplayName].value, o.value[config?.targetProjectId].value, o.value[config?.targetProjectName].value, o.value[config?.targetPercent].value])

    $("#btnExportCsv").click(function (event) {
      let filename = "calculator";
      exportToCSV(headerRow, dataExportCsv, filename);
    })
  })
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], async function (event) {
    try {
      $('#MF-JIRA-CALCULATOR').remove();
      let modalDiv = $('<div>', {
        id: 'modalLoading',
        class: 'modal',
        html: `
            <div class="modal-content">
              <div class="loader"></div>
              <p>${textCustomize["Calculating"]} . . .</p>
            </div>
          `,
      });
      $('body').append(modalDiv);
      $('#record-gaia').prepend(
        `
          <div class="mf-jiraTimesheet-controls" id="MF-JIRA-CALCULATOR">
            <div class="flex-row">
              <div class="flex-column">
                <label for="mf-endDate" class="mf-date-label">${textCustomize["End date"]}</label>
                <input type="date" id="mf-endDate" class="mf-date-input plugin-mb-1 plugin-mr-small">
              </div>
              <button id="btnCalculator" class="mf-submit-button plugin-mb-1 plugin-mr-small" style="margin-top: 26px">${textCustomize["Calculating"]}</button>
              <button id="btnExportCsv" class="mf-submit-button plugin-mb-1" style="margin-top: 26px">${textCustomize["Export csv"]}</button>
            </div>
          </div>
          `
      );
      let date15 = new Date();
      date15.setDate(15);
      $("#mf-endDate").val(formatDateToYYYYMMDD(date15));
      // init dataExportCsv
      let dataTable = event.record[config?.targetTable];
      dataExportCsv = dataTable.value.map(o => [o.value[config?.targetEndDate].value, o.value[config?.targetDisplayName].value, o.value[config?.targetProjectId].value, o.value[config?.targetProjectName].value, o.value[config?.targetPercent].value])

      $("#btnExportCsv").click(function (event) {
        let filename = "calculator";
        exportToCSV(headerRow, dataExportCsv, filename);
      })
      $('#btnCalculator').click(async function (event) {
        let endDateValue = $('#mf-endDate').val();
        if (!endDateValue) {
          alert(textCustomize["Enter the end date!"]);
          return;
        }
        let endDate = new Date(endDateValue);
        let startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        let startDateValue = formatDateToYYYYMMDD(startDate);
        modalDiv.show();
        // get all record
        let records = await getAllRecordsFromKintone({
          app: config.sourceAppId,
          query: `${config?.sourceDateStarted} >= "${startDateValue}T00:00:00Z" and ${config?.sourceDateStarted} <= "${endDateValue}T23:59:59Z"`,
          size: 500
        });
        console.log('records', records);
        let expectData = {};
        let projectData = {};
        for (let record of records) {
          let propDisplayName = record[config?.sourceDisplayName]?.value;
          let projectId = record[config?.sourceKey].value.split('-')[0];
          if (!expectData[propDisplayName]) expectData[propDisplayName] = {};
          expectData[propDisplayName][projectId] = (+expectData[propDisplayName][projectId] || 0) + (+record[config?.sourceTimespent].value);
          projectData[projectId] = record[config?.sourceProject].value;
        }
        let users = Object.keys(expectData);
        for (let user of users) {
          let totalTime = 0;
          let projects = Object.keys(expectData[user]);
          for (let projectId of projects) {
            totalTime += (+expectData[user][projectId]);
          }
          let tmp = [];
          let remain = 100;
          for (let projectId of projects) {
            let projectTime = Math.floor((expectData[user][projectId] * 100) / totalTime);
            tmp.push({
              projectId: projectId,
              value: projectTime
            })
            remain -= projectTime;
          }
          tmp.sort((a, b) => {
            if (b.value !== a.value) {
              return b.value - a.value;
            } else {
              return a.projectId.localeCompare(b.projectId);
            }
          });
          for (let i = 0; i < remain; i++) {
            tmp[i].value++;
          }
          expectData[user] = tmp;
        }
        // clear table
        let btnRemoveRow = document.querySelectorAll('.remove-row-image-gaia');
        for (let i = btnRemoveRow.length - 1; i > 0; i--) {
          btnRemoveRow[i].click();
        }
        let lastTr = btnRemoveRow[0].parentElement.parentElement;
        let tds = lastTr.querySelectorAll('td');
        tds[0].querySelector('input').value = '';
        tds[1].querySelector('input').value = '';
        tds[2].querySelector('input').value = '';
        tds[3].querySelector('input').value = '';
        dataExportCsv = [];
        let tableBody = document.querySelector('table tbody')
        for (let i in users) {
          let user = users[i];
          for (let j in expectData[user]) {
            let item = expectData[user][j];
            if (!item?.value || item?.value === "0") continue;
            dataExportCsv.push([formatDateToYYYYMMDD(endDate), user, item?.projectId, projectData[item?.projectId], item?.value.toString()]);
            let arr = tableBody.querySelectorAll('tr');
            let lastTr = arr[arr.length - 1];
            let tds = lastTr.querySelectorAll('td');
            tds[0].querySelector('input').value = formatDateToYYYYMMDD(endDate);
            tds[1].querySelector('input').value = user;
            tds[2].querySelector('input').value = item?.projectId;
            tds[3].querySelector('input').value = projectData[item?.projectId];
            tds[4].querySelector('input').value = item?.value;
            if (i == users.length - 1 && j == expectData[user].length - 1) continue;
            let btnAddRow = lastTr.querySelector('button.add-row-image-gaia');
            btnAddRow.click();
          }
        }
        modalDiv.hide();
      });
    }
    catch (e) {
      console.error(e);
    }
  })
})();
