// include("Shapes.js");


var xKeys = ["x0", "x1", "x", "ox", "xx", "xy"];
var yKeys = ["y0", "y1", "y", "oy", "yx", "yy"];

function PositionTransformer(obj) {
    this.obj = obj;
}

var MyEnum = {
    TRANSLATE: 0,
    ROTATE: 1,
    SCALE: 2
};


function isXKey(key) { return xKeys.indexOf(key) !== -1; }
function isYKey(key) { return yKeys.indexOf(key) !== -1; }


var SingularCoordinateType = {
    X: "x",
    Y: "y"
};

function SingularCoordinate(value, key) {
    this.value = value;
    this.type = isXKey(key) ? SingularCoordinateType.X : isYKey(key) ? SingularCoordinateType.Y : null;
}



PositionTransformer.prototype.applyToPositions = function(callback) {
    var obj = this.obj;
    if (typeof obj === "object" && obj !== null) {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            if ((xKeys.indexOf(key) !== -1 || yKeys.indexOf(key) !== -1) 
                && typeof obj[key] === "number") {
                obj[key] = callback(new SingularCoordinate(obj[key], key), key);
            } 
            
            else if (typeof obj[key] === "object") {
                var nested = new PositionTransformer(obj[key]);
                nested.applyToPositions(callback);
            }
        }
    }
};



function main2() {
    MessageLog.trace("test");
    var currentNode  = selection.selectedNode(0);
    var currentFrame = frame.current();

    var data = Drawing.query.getData({ drawing: { node: currentNode, frame: currentFrame } });

    calculateBoundingBox(data.arts[0].layers);
}

// 4 is append
// 2 is write

// // Example usage:
// applyToPositions(someJson, function(val, key) { return val * 2; }); // scales all positions by 2
// applyToPositions(someJson, function(val, key) { return val + 5; }); // translates all positions by 5