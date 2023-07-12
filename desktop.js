(async function () {
  'use strict';
  const textCustomize = {
    "Export csv": "CSV出力",
    "End date": "終了日",
    "Calculating": "計算中",
    "Enter the end date!": "終了日を入力してください！"
  }
  const config = {
    sourceAppId: "64",
    sourceDateStarted: "日時",
    sourceDisplayName: "表示名",
    sourceKey: "キー",
    sourceProject: "プロジェクト",
    sourceTimespent: "使用時間",
	targetDisplayName: "従業員氏名",
	targetSelectStartDate: '開始日',
    targetSelectEndDate: '終了日',
    targetEndDate: "工数集計締め年月日",
    targetPercent: "割合",
    targetProjectId: "プロジェクト番号",
    targetProjectName: "プロジェクト名称",
    targetTable: "プロジェクト別人件費配賦"
  }
  const headerRow = ["工数集計締め年月日", "従業員氏名", "プロジェクト番号", "プロジェクト名称", "割合"];
  let dataExportCsv = [];
  let selectedEndDate, selectedStartDate;
  kintone.events.on(['app.record.detail.show'], async function (event) {
    $('#MF-JIRA-CALCULATOR').remove();
    $(".control-date-field-gaia")?.last()?.parent()?.append(
      `
      <div class="mf-jiraTimesheet-controls" id="MF-JIRA-CALCULATOR">
        <div class="flex-row">
          <button id="btnExportCsv" class="mf-submit-button" style="margin-top: 20px">${textCustomize["Export csv"]}</button>
        </div>
      </div>
      `
    )
    // init dataExportCsv
    let dataTable = event.record[config?.targetTable];
    dataExportCsv = dataTable.value.map(o => [o.value[config?.targetEndDate].value, o.value[config?.targetDisplayName].value, o.value[config?.targetProjectId].value, o.value[config?.targetProjectName].value, o.value[config?.targetPercent].value])

    $("#btnExportCsv").click(function (event) {
      let filename = "calculator";
      exportToCSV(headerRow, dataExportCsv, filename);
    })
  })
  // update startDate after endDate change
  kintone.events.on([`app.record.create.change.${config.targetSelectEndDate}`, `app.record.edit.change.${config.targetSelectEndDate}`], function(event) {
    const record = event.record;
    selectedEndDate = moment(record[`${config.targetSelectEndDate}`].value).format('YYYY-MM-DD');
    selectedStartDate = moment(record[`${config.targetSelectEndDate}`].value).subtract(1, 'months').add(1, 'days').format('YYYY-MM-DD');
    record[`${config.targetSelectStartDate}`].value = selectedStartDate;
    return event;
  })
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], function (event) {
    try {
      const record = event.record;
      let endDate = moment();
      if (event.type === 'app.record.edit.show'){
        endDate = moment(record[`${config.targetSelectEndDate}`].value);
      }
      else {
        endDate.date(15);
      }
      selectedEndDate = endDate.format('YYYY-MM-DD');
      record[`${config.targetSelectStartDate}`].disabled = true;
      record[`${config.targetSelectEndDate}`].value = selectedEndDate;
      selectedStartDate = moment(selectedEndDate).subtract(1, 'months').add(1, 'days').format('YYYY-MM-DD');
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
      $(".control-date-field-gaia")?.last()?.parent()?.append(
        `
        <div class="mf-jiraTimesheet-controls" id="MF-JIRA-CALCULATOR">
          <div class="flex-row">
            <button id="btnCalculator" class="mf-submit-button mr-2rem" style="margin-top: 32px">${textCustomize["Calculating"]}</button>
            <button id="btnExportCsv" class="mf-submit-button" style="margin-top: 32px">${textCustomize["Export csv"]}</button>
          </div>
        </div>
        `
      )
      // init dataExportCsv
      let dataTable = event.record[config?.targetTable];
      dataExportCsv = dataTable.value.map(o => [o.value[config?.targetEndDate].value, o.value[config?.targetDisplayName].value, o.value[config?.targetProjectId].value, o.value[config?.targetProjectName].value, o.value[config?.targetPercent].value])

      $("#btnExportCsv").click(function (event) {
        let filename = "calculator";
        exportToCSV(headerRow, dataExportCsv, filename);
      })
      $('#btnCalculator').click(async function (event) {
        modalDiv.show();
        // get all record
        let records = await getAllRecordsFromKintone({
          app: config.sourceAppId,
          query: `${config?.sourceDateStarted} >= "${selectedStartDate}T00:00:00Z" and ${config?.sourceDateStarted} <= "${selectedEndDate}T23:59:59Z"`,
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
        tds[4].querySelector('input').value = '';
        dataExportCsv = [];
        let tableBody = document.querySelector('table tbody')
        for (let i in users) {
          let user = users[i];
          for (let j in expectData[user]) {
            let item = expectData[user][j];
            if (!item?.value || item?.value === "0") continue;
            dataExportCsv.push([moment(selectedEndDate).format('YYYY-MM-DD'), user, item?.projectId, projectData[item?.projectId], item?.value]);
            let arr = tableBody.querySelectorAll('tr');
            let lastTr = arr[arr.length - 1];
            let tds = lastTr.querySelectorAll('td');
            tds[0].querySelector('input').value = moment(selectedEndDate).format('YYYY-MM-DD');
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
      return event;
    }
    catch (e) {
      console.error(e);
      modalDiv.hide();
    }

    return event;
  });
})();
