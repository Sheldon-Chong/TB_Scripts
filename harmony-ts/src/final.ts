// Function to list all columns and their types
function listAllColumns() {
    var columnCount = column.numberOf();
    for (var j = 0; j < columnCount; ++j) {
        var colName = column.getName(j);
        var colType = column.type(colName);
        MessageLog.trace("Column: " + colName + ", Type: " + colType);
    }
}

// Function to log properties of a specific keyframe
function logKeyframeProperties(frameNumber) {
    var columnCount = column.numberOf();
    for (var j = 0; j < columnCount; ++j) {
        var colName = column.getName(j);
        var colType = column.type(colName);
        var keyValue = column.getEntry(colName, 1, frameNumber);
        MessageLog.trace("Frame: " + frameNumber + ", Column: " + colName + ", Type: " + colType + ", Value: " + keyValue);
    }
}

// Function to copy and paste keyframes
function copyAndPasteKeyframes(startFrame, endFrame) {
    var count = 0;
    var currentFrame = frame.current();

    var activeColumnName = node.getName(selection.selectedNode(0)).replace("top/", ""); // Get the currently active column and remove "top/" prefix

    var childrenColumns = retrieveChildrenColumns(activeColumnName);

    for (var i = startFrame; i <= endFrame; ++i) {
        var targetFrame = currentFrame + (i - startFrame);

        for (var j = 0; j < childrenColumns.length; ++j) {
            var childColumnName = childrenColumns[j];
            var keyValue = column.getEntry(activeColumnName, 1, i);
            column.setEntry(childColumnName, 1, targetFrame, keyValue);
            column.setKeyFrame(childColumnName, targetFrame);
        }
    }

    // Handle keyframes for function columns
    var columnCount = column.numberOf();
    for (var j = 0; j < columnCount; ++j) {
        var funcColumn = column.getName(j);
        var funcColumnType = column.type(funcColumn);
        var subColumnName = column.getDisplayName(funcColumn).split(":")[1];

        if (column.getDisplayName(funcColumn).split(":")[0] !== activeColumnName) {
            continue;
        }

        if (funcColumnType === "BEZIER" || funcColumnType === "EASE" || funcColumnType === "EXPRESSION" || funcColumnType === "3DPATH") {
            count++;
            MessageLog.trace("column " + funcColumn);
            for (var i = startFrame; i <= endFrame; ++i) {
                var targetFrame = currentFrame + (i - startFrame);
                var param = column.getDisplayName(funcColumn).split(":")[1];
                var col = retrieveChildColumnByKey("Drawing", param.substring(1));

                if (funcColumnType === "3DPATH") {
                    // Copy all sub-columns for 3DPATH
                    for (var subCol = 1; subCol <= 4; ++subCol) {
                        var keyValue = column.getEntry(col, subCol, i);
                        column.setEntry(funcColumn, subCol, targetFrame, keyValue);
                        column.setKeyFrame(funcColumn, targetFrame);
                    }
                } else {
                    var keyValue = column.getEntry(col, 1, i);
                    MessageLog.trace("ffo : |" + param + "| " + retrieveChildColumnByKey("Drawing", param.substring(1)));
                    column.setEntry(funcColumn, 1, targetFrame, keyValue);
                    column.setKeyFrame(funcColumn, targetFrame);
                }
            }
        }
    }

    MessageLog.trace("count " + count);
}


function retrieveDrawingColumns()
{
	var drawing_columns = [];

	for (var i = 0; i < column.numberOf(); i ++) {
		var name = column.getName(i);
		var type = column.type(name);
		if (type === "DRAWING") {
		drawing_columns.push(name);
		}
	}

	return (drawing_columns);
}

function retrieveChildrenColumns(parentName) {
	var children = [];

	for (var i = 0; i < column.numberOf(); i ++) {
		var name = column.getName(i);
		var type = column.type(name);
		var pName = column.getDisplayName(name).split(":")[0];
		if (type === "DRAWING") {
		
		}
		else if (parentName === pName)
		{
			children.push(name);
		}
	}
	return children;
}

// Example usage
function moderateBob() {
	copyAndPasteKeyframes(1, 8);
}

function smallBob() {
	copyAndPasteKeyframes(13, 19);
}

function fromLeftBob() {
	copyAndPasteKeyframes(22, 30);
}

function fromRightBob() {
	copyAndPasteKeyframes(34, 42);
}

function jumpBob() {
	copyAndPasteKeyframes(48, 55);
}

function retrieveChildColumnByKey(parentName, key) {
    for (var i = 0; i < column.numberOf(); i++) {
        var name = column.getName(i);
        var type = column.type(name);
        var displayNameParts = column.getDisplayName(name).split(":");
        var pName = displayNameParts[0];
        var columnKey = displayNameParts[1];

	if (type === "DRAWING")
		continue;
        if (pName === parentName && columnKey.substring(1) === key) {
		MessageLog.trace(">>>>" +columnKey );
            return name;
        }
    }
    return null; // Return null if no matching child column is found
}

MessageLog.trace(retrieveChildColumnByKey("Drawing", "Skew"));