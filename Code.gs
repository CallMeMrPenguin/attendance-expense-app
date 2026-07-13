/**
 * ===================================================================
 * GOOGLE APPS SCRIPT WEB APP - THỜI KHÓA BIỂU GIA SƯ ĐA LỊCH & MÀU SẮC
 * File 1 trong Apps Script: Code.gs
 * ===================================================================
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Phần Mềm Chấm Công Gia Sư')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Khởi tạo sheet Tài Khoản nếu chưa có
function initAccountsSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var accountSheet = ss.getSheetByName("Tài Khoản");
  if (!accountSheet) {
    accountSheet = ss.insertSheet("Tài Khoản");
    accountSheet.appendRow(["Tên Đăng Nhập", "Mật Khẩu", "Tên Giáo Viên", "Vai Trò"]);
    accountSheet.getRange(1, 1, 1, 4)
      .setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
    
    // Tạo tài khoản admin mặc định
    var adminHash = hashPassword("admin123");
    accountSheet.appendRow(["admin", adminHash, "Admin", "admin"]);
    cleanupEmptyRowsCols(accountSheet);
  }
}

// Trả về mật khẩu gốc (không mã hóa) theo yêu cầu của user
function hashPassword(password) {
  if (!password) password = "";
  return password;
}

// Băm mật khẩu SHA-256 cũ dùng để đối chiếu khi nâng cấp mật khẩu cũ
function oldHashPassword(password) {
  if (!password) password = "";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var hexStr = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteString = byteVal.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    hexStr += byteString;
  }
  return hexStr;
}

// API Đăng nhập
function loginUser(username, password) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initAccountsSheet(ss);
    
    var accountSheet = ss.getSheetByName("Tài Khoản");
    var accountData = accountSheet.getDataRange().getValues();
    
    var targetUser = String(username).trim().toLowerCase();
    var inputHash = oldHashPassword(password);
    
    for (var i = 1; i < accountData.length; i++) {
      var row = accountData[i];
      var storedPassword = String(row[1]);
      if (String(row[0]).toLowerCase() === targetUser) {
        if (storedPassword === password || storedPassword === inputHash) {
          // Nếu đang lưu hash cũ, tự động nâng cấp sang mật khẩu thực
          if (storedPassword === inputHash) {
            accountSheet.getRange(i + 1, 2).setValue(password);
          }
          return {
            status: 'success',
            username: String(row[0]),
            teacherName: String(row[2]),
            role: String(row[3])
          };
        }
      }
    }
    return { status: 'error', message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// API Đổi mật khẩu
function changePassword(username, currentPassword, newPassword) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initAccountsSheet(ss);
    
    var accountSheet = ss.getSheetByName("Tài Khoản");
    var accountData = accountSheet.getDataRange().getValues();
    
    var targetUser = String(username).trim().toLowerCase();
    var currentHash = oldHashPassword(currentPassword);
    var newHash = hashPassword(newPassword);
    
    for (var i = 1; i < accountData.length; i++) {
      var row = accountData[i];
      var storedPassword = String(row[1]);
      if (String(row[0]).toLowerCase() === targetUser) {
        if (storedPassword !== currentPassword && storedPassword !== currentHash) {
          return { status: 'error', message: 'Mật khẩu hiện tại không chính xác!' };
        }
        accountSheet.getRange(i + 1, 2).setValue(newHash);
        return { status: 'success', message: 'Đổi mật khẩu thành công!' };
      }
    }
    return { status: 'error', message: 'Không tìm thấy tài khoản!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// Đồng bộ tài khoản giáo viên tự động dựa trên danh sách giáo viên
function syncAccountsOnServer(ss, teachers) {
  initAccountsSheet(ss);
  var accountSheet = ss.getSheetByName("Tài Khoản");
  var accountData = accountSheet.getDataRange().getValues();
  
  var adminAccounts = [];
  var teacherAccountsMap = {};
  
  for (var i = 1; i < accountData.length; i++) {
    var row = accountData[i];
    if (row[0]) {
      var acc = {
        username: String(row[0]),
        hash: String(row[1]),
        teacherName: String(row[2]),
        role: String(row[3])
      };
      if (acc.role === 'admin') {
        adminAccounts.push(acc);
      } else {
        teacherAccountsMap[acc.teacherName] = acc;
      }
    }
  }
  
  var newAccounts = [];
  // Giữ lại các admin
  adminAccounts.forEach(function(acc) {
    newAccounts.push(acc);
  });
  
  // Duyệt qua giáo viên hiện tại, nếu chưa có tk thì tạo mới, nếu có thì giữ lại
  teachers.forEach(function(tName) {
    if (!tName) return;
    if (teacherAccountsMap[tName]) {
      newAccounts.push(teacherAccountsMap[tName]);
    } else {
      var uName = generateUsername(tName);
      var suffix = 1;
      var uniqueUsername = uName;
      var isTaken = function(uname) {
        return newAccounts.some(function(a) { return a.username === uname; });
      };
      while (isTaken(uniqueUsername)) {
        uniqueUsername = uName + suffix;
        suffix++;
      }
      newAccounts.push({
        username: uniqueUsername,
        hash: hashPassword("123"),
        teacherName: tName,
        role: "teacher"
      });
    }
  });
  
  // Ghi lại bảng tài khoản
  accountSheet.clearContents();
  accountSheet.appendRow(["Tên Đăng Nhập", "Mật Khẩu", "Tên Giáo Viên", "Vai Trò"]);
  accountSheet.getRange(1, 1, 1, 4)
    .setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
    
  newAccounts.forEach(function(acc) {
    accountSheet.appendRow([acc.username, acc.hash, acc.teacherName, acc.role]);
  });
  
  cleanupEmptyRowsCols(accountSheet);
}

// Sinh username từ tên giáo viên
function generateUsername(teacherName) {
  if (!teacherName) return "user";
  var normalized = teacherName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
  return normalized || "user";
}

// API Đổi tên giáo viên an toàn
function renameTeacherOnServer(oldName, newName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Cập nhật bảng Giáo Viên
    var teacherSheet = ss.getSheetByName("Giáo Viên");
    if (teacherSheet) {
      var teacherData = teacherSheet.getDataRange().getValues();
      for (var i = 1; i < teacherData.length; i++) {
        if (String(teacherData[i][0]) === oldName) {
          teacherSheet.getRange(i + 1, 1).setValue(newName);
        }
      }
    }
    
    // 2. Cập nhật bảng Lịch Dạy
    var sessionSheet = ss.getSheetByName("Lịch Dạy");
    if (sessionSheet) {
      var sessionData = sessionSheet.getDataRange().getValues();
      for (var j = 1; j < sessionData.length; j++) {
        if (String(sessionData[j][1]) === oldName) {
          sessionSheet.getRange(j + 1, 2).setValue(newName);
        }
      }
    }
    
    // 3. Cập nhật bảng Tài Khoản
    var accountSheet = ss.getSheetByName("Tài Khoản");
    if (accountSheet) {
      var accountData = accountSheet.getDataRange().getValues();
      for (var k = 1; k < accountData.length; k++) {
        if (String(accountData[k][2]) === oldName) {
          accountSheet.getRange(k + 1, 3).setValue(newName);
          var newUName = generateUsername(newName);
          accountSheet.getRange(k + 1, 1).setValue(newUName);
        }
      }
    }
    
    return { status: 'success', message: 'Đổi tên giáo viên thành công!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// Lấy toàn bộ dữ liệu từ Google Sheet (Cập nhật hỗ trợ cột Ngày Dạy & Auto-Migration)
function getSheetData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initAccountsSheet(ss);
    
    // 1. Sheet Lịch Dạy
    var sessionSheet = ss.getSheetByName("Lịch Dạy") || ss.getActiveSheet();
    sessionSheet.setName("Lịch Dạy");
    
    var sessionData = sessionSheet.getDataRange().getValues();
    var sessions = [];
    if (sessionData.length > 1) {
      for (var i = 1; i < sessionData.length; i++) {
        var row = sessionData[i];
        if (row[0]) {
          sessions.push({
            id: String(row[0]),
            teacherName: String(row[1] || 'Giáo Viên 1'),
            studentName: String(row[2] || ''),
            dayOfWeek: String(row[3] || 'Thứ 2'),
            time: parseCleanTime(row[4]),
            duration: Number(row[5]) || 1.5,
            price: Number(row[6]) || 0,
            status: String(row[7] || 'Chưa dạy'),
            grade: String(row[8] || ''),
            homework: String(row[9] || ''),
            note: String(row[10] || ''),
            monthYear: String(row[11] || getFormattedMonthYear()),
            color: String(row[12] || '#2563eb'),
            date: String(row[13] || '')
          });
        }
      }
    }

    // Auto-migrate sessions với date rỗng sang các ngày thực tế
    var migrationResult = migrateAndExpandSessions(sessions);
    sessions = migrationResult.sessions;
    if (migrationResult.needsSave) {
      writeSessionsToSheet(ss, sessions);
    }

    // 2. Sheet Giáo Viên
    var teacherSheet = ss.getSheetByName("Giáo Viên");
    var teachers = [];
    if (!teacherSheet) {
      teacherSheet = ss.insertSheet("Giáo Viên");
      teacherSheet.appendRow(["Tên Giáo Viên"]);
      teacherSheet.getRange(1, 1).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
      teacherSheet.appendRow(["Giáo Viên 1"]);
      teachers = ["Giáo Viên 1"];
    } else {
      var teacherData = teacherSheet.getDataRange().getValues();
      for (var j = 1; j < teacherData.length; j++) {
        if (teacherData[j][0]) teachers.push(String(teacherData[j][0]));
      }
    }

    if (teachers.length === 0) teachers = ["Giáo Viên 1"];

    // Đồng bộ lại tài khoản giáo viên phòng trường hợp thêm xóa tay trong sheet
    syncAccountsOnServer(ss, teachers);

    return { status: 'success', sessions: sessions, teachers: teachers };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// Lưu dữ liệu lịch dạy
function saveSheetData(payloadJson) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dataObj = JSON.parse(payloadJson);
    var sessions = dataObj.sessions || [];
    var teachers = dataObj.teachers || [];

    // 1. Ghi Lịch Dạy
    writeSessionsToSheet(ss, sessions);

    // 2. Ghi Giáo Viên
    var teacherSheet = ss.getSheetByName("Giáo Viên");
    if (!teacherSheet) teacherSheet = ss.insertSheet("Giáo Viên");
    teacherSheet.clearContents();
    teacherSheet.appendRow(["Tên Giáo Viên"]);
    teacherSheet.getRange(1, 1).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");

    teachers.forEach(function(tName) {
      if (tName) teacherSheet.appendRow([tName]);
    });

    cleanupEmptyRowsCols(teacherSheet);

    // 3. Đồng bộ tài khoản
    syncAccountsOnServer(ss, teachers);

    return { status: 'success', message: 'Đã lưu dữ liệu thành công!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// Hàm ghi sessions xuống sheet
function writeSessionsToSheet(ss, sessions) {
  var sessionSheet = ss.getSheetByName("Lịch Dạy") || ss.getActiveSheet();
  sessionSheet.setName("Lịch Dạy");
  sessionSheet.clearContents();

  var sessionHeaders = [
    "Mã Buổi", "Giáo Viên", "Học Sinh", "Thứ Trong Tuần", 
    "Thời Gian", "Số Giờ", "Học Phí/Buổi", "Trạng Thái", "Điểm Số", 
    "BTVN", "Ghi Chú Buổi Học", "Tháng Dạy", "Màu Sắc", "Ngày Dạy", "Cập Nhật Lần Cuối"
  ];
  sessionSheet.appendRow(sessionHeaders);
  sessionSheet.getRange(1, 1, 1, sessionHeaders.length)
    .setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");

  sessions.forEach(function(s) {
    sessionSheet.appendRow([
      s.id || '',
      s.teacherName || '',
      s.studentName || '',
      s.dayOfWeek || 'Thứ 2',
      s.time || '18:00',
      s.duration || 1.5,
      s.price || 0,
      s.status || 'Chưa dạy',
      s.grade || '',
      s.homework || '',
      s.note || '',
      s.monthYear || getFormattedMonthYear(),
      s.color || '#2563eb',
      s.date || '',
      new Date().toLocaleString('vi-VN')
    ]);
  });

  cleanupEmptyRowsCols(sessionSheet);
}

// Tự động phân bổ lịch lặp tuần của template cũ sang các ngày thực tế của tháng đó
function migrateAndExpandSessions(sessions) {
  var migrated = [];
  var needsSave = false;
  
  sessions.forEach(function(s) {
    if (!s.date) {
      needsSave = true;
      var dates = getDatesForWeekday(s.monthYear, s.dayOfWeek);
      if (dates.length === 0) {
        s.date = s.monthYear + '-01';
        migrated.push(s);
      } else {
        dates.forEach(function(dStr, index) {
          migrated.push({
            id: s.id + '_' + index,
            teacherName: s.teacherName,
            studentName: s.studentName,
            dayOfWeek: s.dayOfWeek,
            time: s.time,
            duration: s.duration,
            price: s.price,
            status: s.status,
            grade: s.grade,
            homework: s.homework,
            note: s.note,
            monthYear: s.monthYear,
            color: s.color,
            date: dStr
          });
        });
      }
    } else {
      migrated.push(s);
    }
  });
  
  return { sessions: migrated, needsSave: needsSave };
}

// Lấy tất cả ngày trong tháng khớp với thứ trong tuần
function getDatesForWeekday(monthYearStr, dayOfWeekStr) {
  if (!monthYearStr || !dayOfWeekStr) return [];
  var parts = monthYearStr.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var dates = [];
  
  var dayMap = {
    "Thứ 2": 1,
    "Thứ 3": 2,
    "Thứ 4": 3,
    "Thứ 5": 4,
    "Thứ 6": 5,
    "Thứ 7": 6,
    "Chủ Nhật": 0
  };
  var targetDay = dayMap[dayOfWeekStr];
  if (targetDay === undefined) return [];
  
  var date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === targetDay) {
      var yyyy = date.getFullYear();
      var mm = String(date.getMonth() + 1).padStart(2, '0');
      var dd = String(date.getDate()).padStart(2, '0');
      dates.push(yyyy + '-' + mm + '-' + dd);
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

function cleanupEmptyRowsCols(sheet) {
  var maxRows = sheet.getMaxRows();
  var lastRow = sheet.getLastRow();
  if (maxRows > lastRow && lastRow > 0) {
    sheet.deleteRows(lastRow + 1, maxRows - lastRow);
  }
  
  var maxCols = sheet.getMaxColumns();
  var lastCol = sheet.getLastColumn();
  if (maxCols > lastCol && lastCol > 0) {
    sheet.deleteColumns(lastCol + 1, maxCols - lastCol);
  }
}

function parseCleanTime(val) {
  if (!val) return '18:00';
  if (val instanceof Date) {
    var h = String(val.getHours()).padStart(2, '0');
    var m = String(val.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  var str = String(val).trim();
  if (str.indexOf('GMT') !== -1 || str.indexOf('1899') !== -1) {
    var match = str.match(/(\d{2}:\d{2})/);
    if (match) return match[1];
  }
  return str.substring(0, 5) || '18:00';
}

function getFormattedMonthYear() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  return d.getFullYear() + '-' + m;
}
