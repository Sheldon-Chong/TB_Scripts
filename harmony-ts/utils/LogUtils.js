var LOG_DIR = "C:\\Users\\emers\\AppData\\Roaming\\Toon Boom Animation\\Toon Boom Harmony Premium\\2400-scripts\\logs";
function Logger(filePath) {
    this.filePath = filePath;
}
Logger.prototype.log = function () {
    var data;
    if (arguments.length === 1) {
        data = arguments[0];
    }
    else {
        data = Array.prototype.slice.call(arguments);
    }
    function processItem(item) {
        if (typeof item === 'object' && item !== null) {
            var str = JSON.stringify(item, null, 2);
            if (str.length > 10000) {
                var dir = new Dir;
                dir.path = LOG_DIR;
                var files = dir.entryList("*");
                var fileCount = files.length;
                var constructorName = item.constructor.name;
                var filename = fileCount + "_" + constructorName + ".json";
                var fullPath = LOG_DIR + "\\" + filename;
                writeTo(fullPath, str);
                return "contents can be found in " + filename;
            }
        }
        return item;
    }
    if (Array.isArray(data)) {
        data = data.map(processItem);
    }
    else {
        data = processItem(data);
    }
    var logs = [];
    try {
        var fileContent = readFrom(this.filePath);
        if (fileContent) {
            logs = JSON.parse(fileContent);
            if (!Array.isArray(logs)) {
                logs = [logs];
            }
        }
    }
    catch (e) {
        logs = [];
    }
    logs.push(data);
    writeTo(this.filePath, JSON.stringify(logs, null, 2));
};
