var Rotate = (function () {
    function Rotate(degrees, point) {
        this.degrees = degrees;
        this.point = point;
    }
    return Rotate;
}());
var Scale = (function () {
    function Scale(size, point) {
        this.size = size;
        this.point = point;
    }
    return Scale;
}());
var SetScale = (function () {
    function SetScale(size, point) {
        this.size = size;
        this.point = point;
    }
    return SetScale;
}());
var Translate = (function () {
    function Translate(vector) {
        this.vector = vector;
    }
    return Translate;
}());
var Position = (function () {
    function Position(vector) {
        this.vector = vector;
    }
    return Position;
}());
var Transformations = {
    Rotate: Rotate,
    Scale: Scale,
    SetScale: SetScale,
    Translate: Translate,
    Position: Position
};
