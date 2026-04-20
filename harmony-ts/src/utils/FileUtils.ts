MessageLog.clearLog()



function readFrom(file_path) {
    var file = new PermanentFile(file_path);
    if (file.open(1)) {
        var contents = file.read();
        file.close();
        return contents;
    } else {
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


function listFiles(dirPath: string, filters: string[]): string[] {
    try {
        let dir: QDir = new QDir(dirPath);
        return dir.entryList(filters, QDir.Files, QDir.Name);
    } catch (e: any) {
        MessageLog.trace("Error reading directory '" + dirPath + "': " + e.toString());
        return [];
    }
}


function exists(filePath: string): boolean {
    try {
        let file: QFile = new QFile(filePath);
        return file.exists();
    } catch (e: any) {
        MessageLog.trace("Error checking existence of file '" + filePath + "': " + e.toString());
        return false;
    }
}

function getUniqueFileName(basePath: string, baseName: string, extension: string): string {
    let counter = 1;
    let fileName = `${baseName}${extension}`;
    while (G.FileUtils.exists(`${basePath}/${fileName}`)) {
        fileName = `${baseName}_${counter}${extension}`;
        counter++;
    }
    return fileName;
}   


function copyTo(sourcePath: string, destPath: string): boolean {
    var sourceFile = new PermanentFile(sourcePath);
    var destFile = new PermanentFile(destPath);
    return sourceFile.copy(destFile);
}

const ReadWriteOperations = { 
readFrom: readFrom,
writeTo: writeTo,
listFiles: listFiles,
exists: exists,
getUniqueFileName: getUniqueFileName,
copyTo: copyTo
}

// if (file.open(1)) {
//     var contents = GetFileContents(file);
//     var json_data = JSON.parse(contents);
//     MessageLog.trace("contents: " + JSON.stringify(json_data, null, 2));
//     file.close();
// } else {
//     MessageLog.trace("Failed to open file for reading.");
// }

// 1 is read, 3 is write