var Line = (function () {
    function Line(options) {
        this.start = options.start;
        this.end = options.end;
        this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
    }
    Line.prototype.toPath = function () {
        return [this.start, this.end];
    };
    return Line;
}());
var Rectangle = (function () {
    function Rectangle(options) {
        if (options.x0 !== undefined && options.y0 !== undefined && options.x1 !== undefined && options.y1 !== undefined) {
            this.start = { x: options.x0, y: options.y0 };
            this.end = { x: options.x1, y: options.y1 };
            this.width = Math.abs(options.x1 - options.x0);
            this.height = Math.abs(options.y1 - options.y0);
            this.center = { x: (options.x0 + options.x1) / 2, y: (options.y0 + options.y1) / 2 };
        }
        else if (options.start && options.end) {
            this.start = options.start;
            this.end = options.end;
            this.width = Math.abs(options.end.x - options.start.x);
            this.height = Math.abs(options.end.y - options.start.y);
            this.center = { x: (options.start.x + options.end.x) / 2, y: (options.start.y + options.end.y) / 2 };
        }
        else if (options.start && options.width && options.height) {
            this.start = options.start;
            this.end = { x: options.start.x + options.width, y: options.start.y + options.height };
            this.width = options.width;
            this.height = options.height;
            this.center = { x: options.start.x + options.width / 2, y: options.start.y + options.height / 2 };
        }
        else {
            this.center = options.center;
            this.width = options.width;
            this.height = options.height;
            this.start = { x: options.center.x - options.width / 2, y: options.center.y - options.height / 2 };
            this.end = { x: options.center.x + options.width / 2, y: options.center.y + options.height / 2 };
        }
        this.rotation = options.rotation || 0;
        this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
    }
    Rectangle.prototype.getCorners = function () {
        var w2 = this.width / 2;
        var h2 = this.height / 2;
        var angle = this.rotation;
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);
        var cx = this.center.x;
        var cy = this.center.y;
        var corners = [
            { x: cx + (w2 * cosA - h2 * sinA), y: cy + (w2 * sinA + h2 * cosA) },
            { x: cx + (-w2 * cosA - h2 * sinA), y: cy + (-w2 * sinA + h2 * cosA) },
            { x: cx + (-w2 * cosA + h2 * sinA), y: cy + (-w2 * sinA - h2 * cosA) },
            { x: cx + (w2 * cosA + h2 * sinA), y: cy + (w2 * sinA - h2 * cosA) }
        ];
        return corners;
    };
    Rectangle.prototype.toPath = function () {
        var c = this.getCorners();
        return [c[0], c[1], c[2], c[3], c[0]];
    };
    return Rectangle;
}());
var Shapes = (function () {
    function Shapes() {
    }
    Shapes.Line = Line;
    Shapes.Rectangle = Rectangle;
    return Shapes;
}());
