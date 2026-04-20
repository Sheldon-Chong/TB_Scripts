/**
 * Opens the system file explorer at the given path (folder or file).
 * @param {string} path - The folder or file path to open in the file explorer.
 * @returns {boolean} True if the command was issued, false otherwise.
 */
function openInFileExplorer(path) {
    var process = new QProcess();
    var args = [];

    if (about.isWindowsArch()) {
        // Windows: use 'explorer' for folders or files
        args = [path.replace(/\//g, "\\")];
        process.start("explorer", args);
    } else if (about.isMacArch()) {
        // macOS: use 'open -R' to reveal file, or 'open' for folder
        if (path.match(/\.[^\\/]+$/)) {
            // Looks like a file
            args = ["-R", path];
        } else {
            args = [path];
        }
        process.start("open", args);
    } else if (about.isLinuxArch()) {
        // Linux: use 'xdg-open'
        args = [path];
        process.start("xdg-open", args);
    } else {
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

    // copy keys from objA
    for (var key in objA) {
        if (objA.hasOwnProperty(key)) {
            merged[key] = objA[key];
        }
    }

    // copy keys from objB (overwrites if same key exists)
    for (var key in objB) {
        if (objB.hasOwnProperty(key)) {
            merged[key] = objB[key];
        }
    }

    return merged;
}

/**
 * Build a dictionary from a list using a mapper function.
 * @param {Array} arr - The list to iterate over.
 * @param {Function} fn - Mapper function(item, index) that returns [key, value].
 * @returns {Object} dictionary
 */
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

/**
 * Deeply clones an object or array. Handles nested objects and arrays.
 * Does not clone functions, special types, or circular references.
 * @param {any} obj - The object or array to deep copy.
 * @returns {any} Deep copy of the input.
 */
function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(deepCopy);
    }
    if (obj.constructor && obj.constructor !== Object) {
        // Create a new instance of the same class
        const copy = Object.create(Object.getPrototypeOf(obj));
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = Object._.Utils.deepCopy(obj[key]);
            }
        }
        return copy;
    }
    // Plain object
    const copy = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = Object._.Utils.deepCopy(obj[key]);
        }
    }
    return copy;
}

function filterArray(arr, callback): Array<any> {
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


function copyFile(sourcePath: string, destPath: string): boolean {
    var sourceFile = new PermanentFile(sourcePath);
    var destFile = new PermanentFile(destPath);
    return sourceFile.copy(destFile);
}

function pathExists(path: string) {
    var file = new PermanentFile(path);
    return file.exists();
}

function forEachLeafValue(
    obj: any,
    callback: (value: any, path: string, isLeaf: boolean) => any,
    currentPath: string = ""
): any {
    const isLeaf = !(obj !== null && typeof obj === "object");
    const result = callback(obj, currentPath, isLeaf);
    if (result !== undefined) {
        // If callback modifies the value, do not recurse further
        return result;
    }
    if (obj !== null && typeof obj === "object") {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const newPath = currentPath ? currentPath + "." + key : key;
                const childResult = Object._.Utils.forEachLeafValue(obj[key], callback, newPath);
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
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function deepClone(obj: any): any {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    if (obj.constructor && obj.constructor.name !== "Object") return obj; // preserve class instances
    const copy: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            copy[key] = deepClone(obj[key]);
        }
    }
    return copy;
}

/**
 * Shallowly copies an object or array. Only top-level properties are copied.
 * @param {any} obj - The object or array to shallow copy.
 * @returns {any} Shallow copy of the input.
 */
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


function toast(labelText, position, duration, color, window?) {
	var toast = new QWidget();
	toast.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);

	var bgColor = typeof color === "string" ? color : "rgba(" + color.r + "," + color.g + "," + color.b + ",0.5)";
	var styleSheet = "QWidget { background-color: " + bgColor + "; color: white; border-radius: 10px; padding: 10px; font-family: Arial; font-size: 12pt; }";
	toast.setStyleSheet(styleSheet);

	var layout = new QHBoxLayout(toast);
	layout.addWidget(new QLabel(labelText), 0,0);

	toast.setAttribute(Qt.WA_DeleteOnClose);

	var win = window?? QApplication.activeWindow();
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

/**
 * List files in a directory matching the given filters.
 * @param {string} dirPath - The directory path.
 * @param {string[]} filters - Array of file patterns (e.g., ["*.json"]).
 * @returns {string[]} Array of file names matching the filters, or empty array on error.
 */
function listFilesInDirectory(dirPath: string, filters: string[]): string[] {
    try {
        let dir: QDir = new QDir(dirPath);
        return dir.entryList(filters, QDir.Files, QDir.Name);
    } catch (e: any) {
        MessageLog.trace("Error reading directory '" + dirPath + "': " + e.toString());
        return [];
    }
}

function openWithDefaultApp(filePath) {
	var process = new QProcess();
	var args = [];

	if (about.isWindowsArch()) {
		// Windows: use 'start' via cmd
		args = ["/c", "start", "", filePath.replace(/\//g, "\\")];
		process.start("cmd", args);
	} else if (about.isMacArch()) {
		// macOS: use 'open'
		args = [filePath];
		process.start("open", args);
	} else if (about.isLinuxArch()) {
		// Linux: use 'xdg-open'
		args = [filePath];
		process.start("xdg-open", args);
	} else {
		MessageLog.trace("Unsupported OS for opening files.");
		return false;
	}
	return true;
}


var __extends = (this && this.__extends) || (function () {
	var extendStatics = function (d, b) {
		extendStatics = Object.setPrototypeOf ||
			({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
			function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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

const Utils = {
    stringify,
    hasKeys,
    merge,
    copyFile,
    arrayToDict,
    objectForEach,
    getCurrentXstage,
    deepCopy,
    shallowCopy,
    filterArray,
    forEachLeafValue,
    getValueByPath,
    bind,
    deepClone,
    getMethods,
    toast,
    listFilesInDirectory,
    openWithDefaultApp,
    openInFileExplorer
}
