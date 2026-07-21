function getPointAtDistance(start, rotation, distance) {
    return {
        x: start.x + Math.cos(rotation) * distance,
        y: start.y + Math.sin(rotation) * distance
    };
}
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}
function add2d(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
function subtract2d(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
function divide2d(a, scalar) {
    return { x: a.x / scalar, y: a.y / scalar };
}
function distance2d(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function rectanglesCollide(rectA, rectB) {
    return !(rectA.x1 < rectB.x0 ||
        rectA.x0 > rectB.x1 ||
        rectA.y1 < rectB.y0 ||
        rectA.y0 > rectB.y1);
}
var Maths = {
    degreesToRadians: degreesToRadians,
    add2d: add2d,
    divide2d: divide2d,
    subtract2d: subtract2d,
    distance2d: distance2d,
    getPointAtDistance: getPointAtDistance,
    rectanglesCollide: rectanglesCollide
};
