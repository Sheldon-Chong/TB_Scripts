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

// class Line {
//   start: Point2d;
//   end: Point2d;
//   color: { r: number; g: number; b: number; a: number };

//   constructor(options: {
//     start: Point2d;
//     end: Point2d;
//     color?: { r: number; g: number; b: number; a: number };
//   }) {
//     this.start = options.start;
//     this.end = options.end;
//     this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
//   }

//   toPath(): Point2d[] {
//     return [this.start, this.end];
//   }
// }

// function createRectangle(options: {
//   center?: Point2d;
//   width?: number;
//   height?: number;
//   start?: Point2d;
//   end?: Point2d;
//   x0?: number;
//   y0?: number;
//   x1?: number;
//   y1?: number;
//   rotation?: number;
//   color?: { r: number; g: number; b: number; a: number };
// }) {
//   var start: Point2d;
//   var end: Point2d;
//   var width: number;
//   var height: number;
//   var center: Point2d;

//   if (
//     options.x0 !== undefined &&
//     options.y0 !== undefined &&
//     options.x1 !== undefined &&
//     options.y1 !== undefined
//   ) {
//     start = { x: options.x0, y: options.y0 };
//     end = { x: options.x1, y: options.y1 };
//     width = Math.abs(options.x1 - options.x0);
//     height = Math.abs(options.y1 - options.y0);
//     center = { x: (options.x0 + options.x1) / 2, y: (options.y0 + options.y1) / 2 };
//   } else if (options.start && options.end) {
//     start = options.start;
//     end = options.end;
//     width = Math.abs(options.end.x - options.start.x);
//     height = Math.abs(options.end.y - options.start.y);
//     center = {
//       x: (options.start.x + options.end.x) / 2,
//       y: (options.start.y + options.end.y) / 2,
//     };
//   } else if (options.start && options.width !== undefined && options.height !== undefined) {
//     start = options.start;
//     width = options.width;
//     height = options.height;
//     end = { x: options.start.x + options.width, y: options.start.y + options.height };
//     center = {
//       x: options.start.x + options.width / 2,
//       y: options.start.y + options.height / 2,
//     };
//   } else {
//     center = options.center!;
//     width = options.width!;
//     height = options.height!;
//     start = {
//       x: options.center!.x - options.width! / 2,
//       y: options.center!.y - options.height! / 2,
//     };
//     end = {
//       x: options.center!.x + options.width! / 2,
//       y: options.center!.y + options.height! / 2,
//     };
//   }

//   var rotation = options.rotation || 0;
//   var color = options.color || { r: 0, g: 0, b: 0, a: 255 };

//   return {
//     start: start,
//     end: end,
//     width: width,
//     height: height,
//     center: center,
//     rotation: rotation,
//     color: color,

//     getCorners: function (): Point2d[] {
//       var w2 = width / 2;
//       var h2 = height / 2;
//       var cosA = Math.cos(rotation);
//       var sinA = Math.sin(rotation);
//       var cx = center.x;
//       var cy = center.y;
//       var signs: [number, number][] = [
//         [1, 1],
//         [-1, 1],
//         [-1, -1],
//         [1, -1],
//       ];
//       var corners: Point2d[] = [];
//       for (var i = 0; i < signs.length; i++) {
//         var sx = signs[i][0];
//         var sy = signs[i][1];
//         var rx = sx * w2 * cosA - sy * h2 * sinA;
//         var ry = sx * w2 * sinA + sy * h2 * cosA;
//         corners.push({ x: cx + rx, y: cy + ry });
//       }
//       return corners;
//     },

//     toPath: function (): Point2d[] {
//       var c = this.getCorners();
//       return [c[0], c[1], c[2], c[3], c[0]];
//     },
//   };
// }

// class Shapes {
//   static Line = Line;
//   static Rectangle = createRectangle;
// }
