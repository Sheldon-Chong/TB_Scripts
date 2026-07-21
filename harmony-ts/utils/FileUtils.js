MessageLog.clearLog();
function readFrom(file_path) {
    var file = new PermanentFile(file_path);
    if (file.open(1)) {
        var contents = file.read();
        file.close();
        return contents;
    }
    else {
        MessageLog.trace("Failed to open file for reading.");
        return null;
    }
}
function writeTo(file_path, output) {
    var file = new PermanentFile(file_path);
    if (file.open(2)) {
        file.write(output, -1);
        file.close();
    }
    else {
        MessageLog.trace("Failed to open file for reading.");
        return null;
    }
}
function listFiles(dirPath, filters) {
    try {
        var dir = new QDir(dirPath);
        return dir.entryList(filters, QDir.Files, QDir.Name);
    }
    catch (e) {
        MessageLog.trace("Error reading directory '" + dirPath + "': " + e.toString());
        return [];
    }
}
function exists(filePath) {
    try {
        var file = new QFile(filePath);
        return file.exists();
    }
    catch (e) {
        MessageLog.trace("Error checking existence of file '" + filePath + "': " + e.toString());
        return false;
    }
}
function getUniqueFileName(basePath, baseName, extension) {
    var counter = 1;
    var fileName = "".concat(baseName).concat(extension);
    while (G.FileUtils.exists("".concat(basePath, "/").concat(fileName))) {
        fileName = "".concat(baseName, "_").concat(counter).concat(extension);
        counter++;
    }
    return fileName;
}
function copyTo(sourcePath, destPath) {
    var sourceFile = new PermanentFile(sourcePath);
    var destFile = new PermanentFile(destPath);
    return sourceFile.copy(destFile);
}
var ReadWriteOperations = {
    readFrom: readFrom,
    writeTo: writeTo,
    listFiles: listFiles,
    exists: exists,
    getUniqueFileName: getUniqueFileName,
    copyTo: copyTo
};
