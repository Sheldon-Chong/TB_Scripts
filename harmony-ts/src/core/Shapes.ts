function createShapes(Core: CoreRuntime) {
  /*
   * Capture this once.
   *
   * createCore() guarantees Vectors exists before
   * createShapes() executes.
   */
  var Vectors = Core.Vectors!;

  var Vec2 = Vectors.Vec2;

  class Line {
    start: InstanceType<typeof Vec2>;

    end: InstanceType<typeof Vec2>;

    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    };

    constructor(options: {
      start?: Vector2Input;
      end?: Vector2Input;

      color?: {
        r: number;
        g: number;
        b: number;
        a: number;
      };
    }) {
      this.start = new Vec2(options.start !== undefined ? options.start : 0);

      this.end = new Vec2(options.end !== undefined ? options.end : 0);

      this.color = options.color || {
        r: 0,
        g: 0,
        b: 0,
        a: 255,
      };
    }

    toPath(): InstanceType<typeof Vec2>[] {
      return [this.start, this.end];
    }

    toWidthHeight(): {
      width: number;
      height: number;
    } {
      return {
        width: Core.Math.abs(this.end.x - this.start.x),

        height: Core.Math.abs(this.end.y - this.start.y),
      };
    }
  }

  class Rectangle {
    start: InstanceType<typeof Vec2>;

    end: InstanceType<typeof Vec2>;

    width: number;
    height: number;

    center: InstanceType<typeof Vec2>;

    rotation: number;

    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    };

    constructor(options: {
      center?: Vector2Input;

      width?: number;
      height?: number;

      start?: Vector2Input;
      end?: Vector2Input;

      rotation?: number;

      color?: {
        r: number;
        g: number;
        b: number;
        a: number;
      };
    }) {
      if (options.start && options.end) {
        this.start = new Vec2(options.start);

        this.end = new Vec2(options.end);

        var diff = this.end.subtract(this.start);

        this.width = Core.Math.abs(diff.x);

        this.height = Core.Math.abs(diff.y);

        this.center = this.start.add(this.end).scale(0.5);
      } else if (options.start && options.width !== undefined && options.height !== undefined) {
        this.start = new Vec2(options.start);

        this.width = options.width;

        this.height = options.height;

        this.end = this.start.add(new Vec2(this.width, this.height));

        this.center = this.start.add(new Vec2(this.width / 2, this.height / 2));
      } else {
        this.center = new Vec2(options.center!);

        this.width = options.width!;

        this.height = options.height!;

        var half = new Vec2(this.width / 2, this.height / 2);

        this.start = this.center.subtract(half);

        this.end = this.center.add(half);
      }

      this.rotation = options.rotation || 0;

      this.color = options.color || {
        r: 0,
        g: 0,
        b: 0,
        a: 255,
      };
    }

    getCorners(): InstanceType<typeof Vec2>[] {
      var w2 = this.width / 2;

      var h2 = this.height / 2;

      var cosA = Core.Math.cos(this.rotation);

      var sinA = Core.Math.sin(this.rotation);

      var cx = this.center.x;

      var cy = this.center.y;

      var signs: [number, number][] = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ];

      var corners: InstanceType<typeof Vec2>[] = [];

      for (var i = 0; i < signs.length; i++) {
        var sx = signs[i][0];

        var sy = signs[i][1];

        var rx = sx * w2 * cosA - sy * h2 * sinA;

        var ry = sx * w2 * sinA + sy * h2 * cosA;

        corners.push(new Vec2(cx + rx, cy + ry));
      }

      return corners;
    }

    toPath(): InstanceType<typeof Vec2>[] {
      var c = this.getCorners();

      return [c[0], c[1], c[2], c[3], c[0]];
    }
  }

  return {
    Line: Line,

    Rectangle: Rectangle,
  };
}
