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
    args = [path.replace(/\//g, '\\')];
    process.start('explorer', args);
  } else if (about.isMacArch()) {
    // macOS: use 'open -R' to reveal file, or 'open' for folder
    if (path.match(/\.[^\\/]+$/)) {
      // Looks like a file
      args = ['-R', path];
    } else {
      args = [path];
    }
    process.start('open', args);
  } else if (about.isLinuxArch()) {
    // Linux: use 'xdg-open'
    args = [path];
    process.start('xdg-open', args);
  } else {
    MessageLog.trace('Unsupported OS for opening file explorer.');
    return false;
  }
  return true;
}

function stringify(obj) {
  MessageLog.trace('🅰️' + JSON.stringify(obj, null, 2));
}

function hasKeys(subject, requiredKeys) {
  return requiredKeys.every(function (key) {
    return subject.hasOwnProperty(key);
  });
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
  return scene.currentProjectPath() + '/' + scene.currentVersionName() + '.xstage';
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
  currentPath: string = '',
): any {
  const isLeaf = !(obj !== null && typeof obj === 'object');
  const result = callback(obj, currentPath, isLeaf);
  if (result !== undefined) {
    // If callback modifies the value, do not recurse further
    return result;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newPath = currentPath ? currentPath + '.' + key : key;
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
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  if (obj.constructor && obj.constructor.name !== 'Object') return obj; // preserve class instances
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

  var bgColor =
    typeof color === 'string' ? color : 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.5)';
  var styleSheet =
    'QWidget { background-color: ' +
    bgColor +
    '; color: white; border-radius: 10px; padding: 10px; font-family: Arial; font-size: 12pt; }';
  toast.setStyleSheet(styleSheet);

  var layout = new QHBoxLayout(toast);
  layout.addWidget(new QLabel(labelText), 0, Qt.AlignmentFlag.AlignLeft);

  toast.setAttribute(Qt.WA_DeleteOnClose);

  var win = window ?? QApplication.activeWindow();
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
    args = ['/c', 'start', '', filePath.replace(/\//g, '\\')];
    process.start('cmd', args);
  } else if (about.isMacArch()) {
    // macOS: use 'open'
    args = [filePath];
    process.start('open', args);
  } else if (about.isLinuxArch()) {
    // Linux: use 'xdg-open'
    args = [filePath];
    process.start('xdg-open', args);
  } else {
    MessageLog.trace('Unsupported OS for opening files.');
    return false;
  }
  return true;
}

var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      if (typeof b !== 'function' && b !== null)
        throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null');
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
    };
  })();

this.__proto__.__extends = __extends;

interface StyledButtonOptions {
  label: string;
  onClick: () => void;
  width?: number;
  height?: number;
  color?: string;
}

function styledButton(options: StyledButtonOptions) {
  var label = options.label;
  var onClick = options.onClick;
  var width = options.width !== undefined ? options.width : 100;
  var height = options.height !== undefined ? options.height : 30;
  var color = options.color !== undefined ? options.color : '#4CAF50';

  var button = new QPushButton(label);
  button.setFixedSize(width, height);
  button.setStyleSheet(
    'QPushButton {' +
      'background-color: ' +
      color +
      ';' +
      'color: white;' +
      'border: none;' +
      'border-radius: 4px;' +
      'padding: 6px 12px;' +
      'font-size: 14px;' +
      '}' +
      'QPushButton:hover {' +
      'background-color: ' +
      getHoverColor(color) +
      '}',
  );
  button['clicked()'].connect(onClick);
  return button;
}

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
  openInFileExplorer,
  confirm,
  prompt,
  styledButton,
};

function getHoverColor(color) {
  // Convert hex color to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Increase brightness by 20%
  const increaseBrightness = (value) => Math.min(Math.floor(value * 1.2), 255);

  const newR = increaseBrightness(r);
  const newG = increaseBrightness(g);
  const newB = increaseBrightness(b);

  // Convert back to hex (compatible with older JS engines)
  const toHex = (value) => (value < 16 ? '0' : '') + value.toString(16);
  return '#' + toHex(newR) + toHex(newG) + toHex(newB);
}

function buttonRow(buttons: QPushButton[], spacing: number = 10) {
  var layout = new QHBoxLayout();
  layout.spacing = spacing;
  for (var i = 0; i < buttons.length; i++) {
    layout.addWidget(buttons[i], 0, 0);
  }
  return layout;
}

/**
 * Custom confirmation dialog — drop-in replacement for the broken MessageBox API.
 * Shows a modal dialog with a message and OK/Cancel (or custom) buttons.
 *
 * @param {string}  message     - The message text to display.
 * @param {string}  title       - Dialog title (default: "Confirm").
 * @param {string}  confirmText - Label for the confirm button (default: "OK").
 * @param {string}  cancelText  - Label for the cancel button (default: "Cancel").
 *                                Pass null or an empty string to show a single-button dialog.
 * @returns {boolean} true when the user clicks the confirm button, false otherwise.
 */
function confirm(
  message: string,
  title?: string,
  confirmText?: string,
  cancelText?: string,
): boolean {
  var dialog = new QDialog();
  dialog.windowTitle = title || 'Confirm';
  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);
  dialog.minimumWidth = 340;
  dialog.modal = true;

  var mainLayout = new QVBoxLayout(dialog);
  mainLayout.setContentsMargins(24, 20, 24, 20);
  mainLayout.spacing = 18;

  // --- message label ---
  var label = new QLabel(message);
  label.wordWrap = true;
  label.textFormat = Qt.PlainText;
  label.styleSheet = 'font-size: 12pt; color: #e0e0e0;';
  mainLayout.addWidget(label, 0, Qt.AlignmentFlag.AlignLeft);

  var result = false;

  var buttons: QPushButton[] = [];

  // Cancel / secondary button
  if (cancelText !== null && cancelText !== '') {
    buttons.push(
      styledButton({
        color: '#555555',
        label: cancelText || 'Cancel',
        onClick: function () {
          result = false;
          dialog.reject();
        },
      }),
    );
  }

  // Confirm / primary button
  buttons.push(
    styledButton({
      color: '#4CAF50',
      label: confirmText || 'OK',
      onClick: function () {
        result = true;
        dialog.accept();
      },
    }),
  );

  // --- button row (right-aligned via stretch) ---
  var buttonRowLayout = buttonRow(buttons);
  buttonRowLayout.addStretch(1);
  mainLayout.addLayout(buttonRowLayout, 0);
  dialog.layout = mainLayout;

  // Style the dialog background
  dialog.styleSheet =
    'QDialog { background-color: #2d2d2d; border: 1px solid #555; border-radius: 6px; }';

  dialog.exec();
  return result;
}

/**
 * Custom text input dialog — prompts the user for a single line of text.
 *
 * @param {string}  message     - The prompt message to display.
 * @param {string}  title       - Dialog title (default: "Input").
 * @param {string}  defaultText - Default value for the text field (default: "").
 * @returns {string | null} The entered text, or null if cancelled.
 */
function prompt(message: string, title?: string, defaultText?: string): string | null {
  var dialog = new QDialog();
  dialog.windowTitle = title || 'Input';
  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);
  dialog.minimumWidth = 340;
  dialog.modal = true;

  var mainLayout = new QVBoxLayout(dialog);
  mainLayout.setContentsMargins(24, 20, 24, 20);
  mainLayout.spacing = 18;

  // --- message label ---
  var label = new QLabel(message);
  label.wordWrap = true;
  label.textFormat = Qt.PlainText;
  label.styleSheet = 'font-size: 12pt; color: #e0e0e0;';
  mainLayout.addWidget(label, 0, Qt.AlignmentFlag.AlignLeft);

  // --- text input ---
  var input = new QLineEdit();
  input.text = defaultText || '';
  input.styleSheet =
    'QLineEdit { background-color: #3d3d3d; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; padding: 6px; font-size: 12pt; }';
  mainLayout.addWidget(input, 0, 0);

  var result: string | null = null;

  // --- button row (Cancel left, OK right) ---
  var buttonLayout = new QHBoxLayout();

  buttonLayout.addWidget(
    styledButton({
      color: '#555555',
      label: 'Cancel',
      onClick: function () {
        result = null;
        dialog.reject();
      },
    }),
    0,
    0,
  );

  buttonLayout.addStretch(1);

  buttonLayout.addWidget(
    styledButton({
      color: '#4CAF50',
      label: 'OK',
      onClick: function () {
        result = input.text;
        dialog.accept();
      },
    }),
    0,
    0,
  );

  mainLayout.addLayout(buttonLayout, 0);
  dialog.layout = mainLayout;

  // Style the dialog background
  dialog.styleSheet =
    'QDialog { background-color: #2d2d2d; border: 1px solid #555; border-radius: 6px; }';

  dialog.exec();
  return result;
}
