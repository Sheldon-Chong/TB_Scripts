/**
 * Returns the end position given a start position, rotation (radians), and distance.
 * @param {{x: number, y: number}} start - The starting position.
 * @param {number} rotation - The angle in radians.
 * @param {number} distance - The distance to move from the start position.
 * @returns {{x: number, y: number}} The end position.
 */
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
    return !(
        rectA.x1 < rectB.x0 || // A is completely left of B
        rectA.x0 > rectB.x1 || // A is completely right of B
        rectA.y1 < rectB.y0 || // A is completely below B
        rectA.y0 > rectB.y1    // A is completely above B
    );
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
