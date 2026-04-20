// // Function to list all columns and their types
// function listAllColumns() {
//     MessageLog.trace(column.numberOf())
//     var columns = [];
//     var columnCount = column.numberOf();
//     for (var j = 0; j < columnCount; ++j) {
//         var colName = column.getName(j);
//         var colType = column.type(colName);
//         columns.push({ name: colName, type: colType });
//     }
//     return columns;
// }


// // Column "class" using a constructor function
// function Column(name, type, displayName) {
//     this.name = name;
//     this.type = type;
//     this.displayName = displayName || name; // Default to name if displayName is not provided
//     this.element = column.getElementIdOfDrawing(name); // Get the element associated with the column
// }

// // Optional: Add a method to Column
// Column.prototype.toString = function () {
//     return  "Display Name: " + this.displayName 
//         + ", Column Name: " + this.name 
//         + ", Type: " + this.type
//         + ", Element" + this.element;
// };



function retrieveColumnsByType(columnType) {
    var columns = [];

    for (var i = 0; i < column.numberOf(); i++) {
        var name = column.getName(i);
        var type = column.type(name);
        var displayName = column.getDisplayName(name); // Get the display name

        var colObj = new Column(name, type, displayName); // Use the Column class

        if (type === columnType) {
            columns.push(colObj);
        }
    }

    return columns;
}

function listAllDrawings(id) {
    var totalDrawings = Drawing.numberOf(id); // Get the total number of drawings
    var drawings = [];

    for (var i = 0; i < totalDrawings; i++) {
        var drawingName = Drawing.name(id, i); // Get the name of each drawing
        drawings.push(drawingName);
    }

    return drawings;
}


function setExposure(columnName, drawingName, startFrame, endFrame) {
    for (var i = startFrame; i <= endFrame; i++) {
        outptut = column.setEntry(columnName, 1, i, drawingName); // Set the exposure of drawing
        MessageLog.trace("Setting exposure for " + columnName + " to " + drawingName + " at frame " + i);
    }
}


function main() {
    var columns = retrieveColumnsByType("DRAWING");

    setExposure(columns[1].name, "3", 1, 5); // Set drawing "A" to be exposed from frame 1 to 5
    setExposure(columns[1].name, "2", 6, 10); // Set drawing "B" to be exposed from frame 6 to 10

    for (var i = 0; i < columns.length; i++) {
        var col = columns[i];
        // MessageLog.trace(col.toString()); // Use the toString method
    }

    MessageLog.trace(">> " + columns[2].toString());
    col = column.addKeyDrawingExposureAt(columns[2].name, 1);
    MessageLog.trace("Column Entry: " + col);

    drawings = listAllDrawings(columns[2].element);
    for (var i = 0; i < drawings.length; i++) {
        MessageLog.trace("Drawing " + i + ": " + drawings[i]);
    }

    var myCopyOptions = copyPaste.getCurrentCreateOptions();
    var dragObject = copyPaste.copy([columns[2].name], 1, 5, myCopyOptions);

    if (!dragObject) {
        MessageLog.trace("No dragObject found.");
        return;
    }


    var myPasteOptions = copyPaste.getCurrentPasteOptions();
    
    myPasteOptions.pasteSpecial = true;  // Ensure special paste mode is active
    myPasteOptions.pasteKeyframes = true; // Try forcing keyframe paste
    myPasteOptions.pasteDrawing = true;   // Try forcing drawing exposure paste
    var result = copyPaste.paste(dragObject, [columns[2].name], 11, 5, myPasteOptions);
}