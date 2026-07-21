function openInFileExplorer(path) {
    var process = new QProcess();
    var args = [];
    if (about.isWindowsArch()) {
        args = [path.replace(/\//g, "\\")];
        process.start("explorer", args);
    }
    else if (about.isMacArch()) {
        if (path.match(/\.[^\\/]+$/)) {
            args = ["-R", path];
        }
        else {
            args = [path];
        }
        process.start("open", args);
    }
    else if (about.isLinuxArch()) {
        args = [path];
        process.start("xdg-open", args);
    }
    else {
        MessageLog.trace("Unsupported OS for opening file explorer.");
        return false;
    }
    return true;
}
function stringify(obj) {
    MessageLog.trace("🅰️" + JSON.stringify(obj, null, 2));
}
function hasKeys(subject, requiredKeys) {
    return (requiredKeys.every(function (key) { return subject.hasOwnProperty(key); }));
}
function merge(objA, objB) {
    var merged = {};
    for (var key in objA) {
        if (objA.hasOwnProperty(key)) {
            merged[key] = objA[key];
        }
    }
    for (var key in objB) {
        if (objB.hasOwnProperty(key)) {
            merged[key] = objB[key];
        }
    }
    return merged;
}
function arrayToDict(arr, fn) {
    var dict = {};
    for (var i = 0; i < arr.length; i++) {
        var pair = fn(arr[i], i);
        var key = pair[0];
        var value = pair[1];
        dict[key] = value;
    }
    return dict;
}
function objectForEach(obj, callback) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            callback(key, obj[key]);
        }
    }
}
function getCurrentXstage() {
    return scene.currentProjectPath() + "/" + scene.currentVersionName() + ".xstage";
}
function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(deepCopy);
    }
    if (obj.constructor && obj.constructor !== Object) {
        var copy_1 = Object.create(Object.getPrototypeOf(obj));
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy_1[key] = Object._.Utils.deepCopy(obj[key]);
            }
        }
        return copy_1;
    }
    var copy = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = Object._.Utils.deepCopy(obj[key]);
        }
    }
    return copy;
}
function filterArray(arr, callback) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        if (callback(arr[i], i, arr)) {
            result.push(arr[i]);
        }
    }
    return result;
}
function startsWith(str, needle) {
    return str.substring(0, needle.length) === needle;
}
function copyFile(sourcePath, destPath) {
    var sourceFile = new PermanentFile(sourcePath);
    var destFile = new PermanentFile(destPath);
    return sourceFile.copy(destFile);
}
function pathExists(path) {
    var file = new PermanentFile(path);
    return file.exists();
}
function forEachLeafValue(obj, callback, currentPath) {
    if (currentPath === void 0) { currentPath = ""; }
    var isLeaf = !(obj !== null && typeof obj === "object");
    var result = callback(obj, currentPath, isLeaf);
    if (result !== undefined) {
        return result;
    }
    if (obj !== null && typeof obj === "object") {
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                var newPath = currentPath ? currentPath + "." + key : key;
                var childResult = Object._.Utils.forEachLeafValue(obj[key], callback, newPath);
                if (childResult !== undefined) {
                    obj[key] = childResult;
                }
            }
        }
    }
    return obj;
}
function bind(fn, context) {
    return function () {
        return fn.apply(context, arguments);
    };
}
function getValueByPath(obj, path) {
    return path.split('.').reduce(function (acc, part) { return acc && acc[part]; }, obj);
}
function deepClone(obj) {
    if (obj === null || typeof obj !== "object")
        return obj;
    if (Array.isArray(obj))
        return obj.map(deepClone);
    if (obj.constructor && obj.constructor.name !== "Object")
        return obj;
    var copy = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            copy[key] = deepClone(obj[key]);
        }
    }
    return copy;
}
function shallowCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.slice();
    }
    var copy = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            copy[key] = obj[key];
        }
    }
    return copy;
}
function getMethods(obj) {
    var methods = [];
    for (var prop in obj) {
        if (typeof obj[prop] === 'function') {
            methods.push(prop);
        }
    }
    return methods;
}
function toast(labelText, position, duration, color, window) {
    var toast = new QWidget();
    toast.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);
    var bgColor = typeof color === "string" ? color : "rgba(" + color.r + "," + color.g + "," + color.b + ",0.5)";
    var styleSheet = "QWidget { background-color: " + bgColor + "; color: white; border-radius: 10px; padding: 10px; font-family: Arial; font-size: 12pt; }";
    toast.setStyleSheet(styleSheet);
    var layout = new QHBoxLayout(toast);
    layout.addWidget(new QLabel(labelText), 0, 0);
    toast.setAttribute(Qt.WA_DeleteOnClose);
    var win = window !== null && window !== void 0 ? window : QApplication.activeWindow();
    if (win && win.geometry) {
        var geom = win.geometry;
        var x = geom.x();
        var y = geom.y();
    }
    toast.move(x, y);
    toast.show();
    var timer = new QTimer();
    timer.singleShot = true;
    timer.timeout.connect(function () {
        toast.close();
    });
    timer.start(duration || 2000);
}
function listFilesInDirectory(dirPath, filters) {
    try {
        var dir = new QDir(dirPath);
        return dir.entryList(filters, QDir.Files, QDir.Name);
    }
    catch (e) {
        MessageLog.trace("Error reading directory '" + dirPath + "': " + e.toString());
        return [];
    }
}
function openWithDefaultApp(filePath) {
    var process = new QProcess();
    var args = [];
    if (about.isWindowsArch()) {
        args = ["/c", "start", "", filePath.replace(/\//g, "\\")];
        process.start("cmd", args);
    }
    else if (about.isMacArch()) {
        args = [filePath];
        process.start("open", args);
    }
    else if (about.isLinuxArch()) {
        args = [filePath];
        process.start("xdg-open", args);
    }
    else {
        MessageLog.trace("Unsupported OS for opening files.");
        return false;
    }
    return true;
}
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
this.__proto__.__extends = __extends;
var Utils = {
    stringify: stringify,
    hasKeys: hasKeys,
    merge: merge,
    copyFile: copyFile,
    arrayToDict: arrayToDict,
    objectForEach: objectForEach,
    getCurrentXstage: getCurrentXstage,
    deepCopy: deepCopy,
    shallowCopy: shallowCopy,
    filterArray: filterArray,
    forEachLeafValue: forEachLeafValue,
    getValueByPath: getValueByPath,
    bind: bind,
    deepClone: deepClone,
    getMethods: getMethods,
    toast: toast,
    listFilesInDirectory: listFilesInDirectory,
    openWithDefaultApp: openWithDefaultApp,
    openInFileExplorer: openInFileExplorer
};
