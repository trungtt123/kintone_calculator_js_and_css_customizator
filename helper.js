function exportToCSV(headerRow, data, filename) {
    let csvContent = headerRow.join(",") + "\r\n";
    // Thêm dữ liệu
    data.forEach(function (row) {
        csvContent += row.join(",") + "\r\n";
    });
    // Tạo liên kết tải xuống tệp CSV
    let encodedUri = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename + ".csv");
    document.body.appendChild(link);
    // Kích hoạt sự kiện nhấp chuột để tải xuống
    link.click();
    link.remove();
}