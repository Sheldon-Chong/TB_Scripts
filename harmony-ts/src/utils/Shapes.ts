// function Canvas(frameNumber, node) {
//     this.frameNumber = frameNumber;
//     this.node = node

//     this.getData = function() {
//         var data = Drawing.query.getData({ drawing: { node: this.node, frame: this.frameNumber } });
//         return data;
//     }
// }


// var layer = {
//     UNDERLAY_ART : 0,
//     COLOUR_ART   : 1,
//     LINE_ART     : 2,
//     OVERLAY_ART  : 3,
// }

// Canvas.prototype.drawOnCanvas = function(layers, artLayer, label) {
//     var node = this.node;
//     if (typeof label === "undefined")
//         label = "default value";

//     MessageLog.trace(node);

//     DrawingTools.createLayers({
//         label: label,
//         drawing: { node: node, frame: this.frameNumber },
//         art: artLayer,
//         layers: layers
//     });
// }

// // Canvas.prototype.createCircle = function (point, radius) {
// //     var circlePath = Drawing.geometry.createCircle({
// //         x: point.x,
// //         y: point.y,
// //         radius: radius
// //     });

// //     this.drawOnCanvas(
// //         [
// //             {
// //                 contours: [
// //                     {
// //                         stroke: true,
// //                         pencilColorddId: "0000000000000003",
// //                         thickness: 1,
// //                         path: circlePath
// //                     }
// //                 ]
// //             }
// //         ],
// //         layer.LINE_ART
// //     )
// // }

// function main() {
//     var canvas = new Canvas(frame.current());
//     canvas.createCircle(Point2d(2,2000), 200); // Example usage: create a circle at (100, 100) with radius 50
// }


// note: Create a canvas class containing node and current frame, and make createCircleAt a method of that class
// class should contain variety of shapes



/**
 * @param {Object} options - The options object.
 * @param {Point2d} options.start - The start point.
 * @param {Point2d} options.end - The end point.
 * @param {Object} [options.color] - The color object.
 */
class Line {
    start: Point2d;
    end: Point2d;
    color: { r: number; g: number; b: number; a: number };

    constructor(options: { start: Point2d; end: Point2d; color?: { r: number; g: number; b: number; a: number } }) {
        this.start = options.start;
        this.end = options.end;
        this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
    }

    toPath(): Point2d[] {
        return [this.start, this.end];
    }
}

/**
 * @param {Object} options - The options object.
 * @param {Point2d} [options.center] - The center point (alternative to start/end or start/width/height).
 * @param {number} [options.width] - The width (required with center or start).
 * @param {number} [options.height] - The height (required with center or start).
 * 
 * @param {Point2d} [options.start] - The start point (top-left corner, alternative to center/width/height).
 * @param {Point2d} [options.end] - The end point (bottom-right corner, alternative to center/width/height or start/width/height).
 * 
 * @param {number} [options.x0] - The x-coordinate of the top-left corner (alternative to start/end).
 * @param {number} [options.y0] - The y-coordinate of the top-left corner (alternative to start/end).
 * @param {number} [options.x1] - The x-coordinate of the bottom-right corner (alternative to start/end).
 * @param {number} [options.y1] - The y-coordinate of the bottom-right corner (alternative to start/end).
 * 
 * @param {number} [options.rotation] - The rotation angle.
 * @param {Object} [options.color] - The color object.
 */

class Rectangle {
    start: Point2d;
    end: Point2d;
    width: number;
    height: number;
    center: Point2d;
    rotation: number;
    color: { r: number; g: number; b: number; a: number };

    constructor(options: {
        center?: Point2d;
        width?: number;
        height?: number;
        start?: Point2d;
        end?: Point2d;
        x0?: number;
        y0?: number;
        x1?: number;
        y1?: number;
        rotation?: number;
        color?: { r: number; g: number; b: number; a: number };
    }) {
        if (options.x0 !== undefined && options.y0 !== undefined && options.x1 !== undefined && options.y1 !== undefined) {
            this.start = { x: options.x0, y: options.y0 };
            this.end = { x: options.x1, y: options.y1 };
            this.width = Math.abs(options.x1 - options.x0);
            this.height = Math.abs(options.y1 - options.y0);
            this.center = { x: (options.x0 + options.x1) / 2, y: (options.y0 + options.y1) / 2 };
        } else if (options.start && options.end) {
            this.start = options.start;
            this.end = options.end;
            this.width = Math.abs(options.end.x - options.start.x);
            this.height = Math.abs(options.end.y - options.start.y);
            this.center = { x: (options.start.x + options.end.x) / 2, y: (options.start.y + options.end.y) / 2 };
        } else if (options.start && options.width && options.height) {
            this.start = options.start;
            this.end = { x: options.start.x + options.width, y: options.start.y + options.height };
            this.width = options.width;
            this.height = options.height;
            this.center = { x: options.start.x + options.width / 2, y: options.start.y + options.height / 2 };
        } else {
            this.center = options.center!;
            this.width = options.width!;
            this.height = options.height!;
            this.start = { x: options.center!.x - options.width! / 2, y: options.center!.y - options.height! / 2 };
            this.end = { x: options.center!.x + options.width! / 2, y: options.center!.y + options.height! / 2 };
        }
        this.rotation = options.rotation || 0;
        this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
    }

    getCorners(): Point2d[] {
        const w2 = this.width / 2;
        const h2 = this.height / 2;
        const angle = this.rotation;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const cx = this.center.x;
        const cy = this.center.y;
        const corners = [
            { x: cx + (w2 * cosA - h2 * sinA), y: cy + (w2 * sinA + h2 * cosA) },
            { x: cx + (-w2 * cosA - h2 * sinA), y: cy + (-w2 * sinA + h2 * cosA) },
            { x: cx + (-w2 * cosA + h2 * sinA), y: cy + (-w2 * sinA - h2 * cosA) },
            { x: cx + (w2 * cosA + h2 * sinA), y: cy + (w2 * sinA - h2 * cosA) }
        ];
        return corners;
    }

    toPath(): Point2d[] {
        const c = this.getCorners();
        return [c[0], c[1], c[2], c[3], c[0]];
    }
}

class Shapes {
    static Line = Line;
    static Rectangle = Rectangle;
}

