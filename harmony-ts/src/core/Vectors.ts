/**
 * Vectors.ts — Vec2 and Vec3 math classes with flexible constructors.
 *
 * Constructors accept any of the following forms:
 *   - `new Vec2(5)`              → scalar: both components = 5
 *   - `new Vec2([1,2])`          → array
 *   - `new Vec2({x:1,y:2})`      → object literal
 *   - `new Vec2(otherVec)`       → clone another Vec2
 *   - `new Vec2(1, 2)`           → individual components
 *
 * All arithmetic/query methods accept any Vector2Input / VectorInput.
 */

namespace vectors {
  // Array = Array;

  type VectorInput = number | number[] | { x: number; y: number; z: number } | Vec3;

  /** Normalize any VectorInput into plain {x, y, z} numbers. */
  export function resolveVec3(input: VectorInput): { x: number; y: number; z: number } {
    if (typeof input === 'number') {
      return { x: input, y: input, z: input };
    }
    if (input instanceof Vec3) {
      return { x: input.x, y: input.y, z: input.z };
    }
    if (Array.isArray(input)) {
      return { x: input[0] ?? 0, y: input[1] ?? 0, z: input[2] ?? 0 };
    }
    // Object literal — all other types already excluded
    const obj = input as { x: number; y: number; z: number };
    return { x: obj.x, y: obj.y, z: obj.z };
  }

  export type Vector2Input = number | number[] | { x: number; y: number } | Vec2;

  /** Normalize any Vector2Input into plain {x, y} numbers. */
  export function resolveVec2(input: Vector2Input): { x: number; y: number } {
    if (typeof input === 'number') {
      return { x: input, y: input };
    }
    if (input instanceof Vec2) {
      return { x: input.x, y: input.y };
    }
    if (Array.isArray(input)) {
      return { x: input[0] ?? 0, y: input[1] ?? 0 };
    }
    const obj = input as { x: number; y: number };
    return { x: obj.x, y: obj.y };
  }

  export class Vec2 {
    x: number;
    y: number;

    constructor(input: Vector2Input, y?: number) {
      if (typeof input === 'number' && y !== undefined) {
        this.x = input;
        this.y = y;
      } else {
        const v = resolveVec2(input);
        this.x = v.x;
        this.y = v.y;
      }
    }

    toWidthHeight(): { width: number; height: number } {
      return {
        width: Math.abs(this.x),
        height: Math.abs(this.y),
      };
    }

    toArray(): [number, number] {
      return [this.x, this.y];
    }

    toObject(): { x: number; y: number } {
      return { x: this.x, y: this.y };
    }

    /** Convert to a Vec3 with the given z component (default 0). */
    toVec3(z: number = 0): Vec3 {
      return new Vec3(this.x, this.y, z);
    }

    // ---- arithmetic (all accept any Vector2Input) ----

    add(other: Vector2Input): Vec2 {
      const v = resolveVec2(other);
      return new Vec2(this.x + v.x, this.y + v.y);
    }

    subtract(other: Vector2Input): Vec2 {
      const v = resolveVec2(other);
      return new Vec2(this.x - v.x, this.y - v.y);
    }

    multiply(other: Vector2Input): Vec2 {
      const v = resolveVec2(other);
      return new Vec2(this.x * v.x, this.y * v.y);
    }

    divide(other: Vector2Input): Vec2 {
      const v = resolveVec2(other);
      return new Vec2(this.x / v.x, this.y / v.y);
    }

    scale(s: number): Vec2 {
      return new Vec2(this.x * s, this.y * s);
    }

    // ---- comparison / query ----

    equals(other: Vector2Input): boolean {
      const v = resolveVec2(other);
      return this.x === v.x && this.y === v.y;
    }

    /** Squared magnitude (length²) — cheaper than length() when comparing distances. */
    lengthSquared(): number {
      return this.x * this.x + this.y * this.y;
    }

    length(): number {
      return Math.sqrt(this.lengthSquared());
    }

    /** Return a new Vec2 with the same direction but length 1. */
    normalized(): Vec2 {
      const len = this.length();
      return len === 0 ? new Vec2(0) : this.scale(1 / len);
    }

    dot(other: Vector2Input): number {
      const v = resolveVec2(other);
      return this.x * v.x + this.y * v.y;
    }

    /** Squared distance to another position vector */
    distanceToSquared(other: Vector2Input): number {
      return this.subtract(other).lengthSquared();
    }

    /** Actual distance to another position vector */
    distanceTo(other: Vector2Input): number {
      return Math.sqrt(this.distanceToSquared(other));
    }

    toString(): string {
      return `Vec2(${this.x}, ${this.y})`;
    }

    lerp(target: Vector2Input, t: number): Vec2 {
      const v = resolveVec2(target);
      return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
    }
  }

  export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(input: VectorInput, y?: number, z?: number) {
      if (typeof input === 'number' && y !== undefined && z !== undefined) {
        this.x = input;
        this.y = y;
        this.z = z;
      } else {
        const v = resolveVec3(input);
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
      }
    }

    toArray(): [number, number, number] {
      return [this.x, this.y, this.z];
    }

    toObject(): { x: number; y: number; z: number } {
      return { x: this.x, y: this.y, z: this.z };
    }

    // ---- arithmetic (all accept any VectorInput) ----

    add(other: VectorInput): Vec3 {
      const v = resolveVec3(other);
      return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(other: VectorInput): Vec3 {
      const v = resolveVec3(other);
      return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(other: VectorInput): Vec3 {
      const v = resolveVec3(other);
      return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    divide(other: VectorInput): Vec3 {
      const v = resolveVec3(other);
      return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }

    scale(s: number): Vec3 {
      return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    // ---- comparison / query ----

    equals(other: VectorInput): boolean {
      const v = resolveVec3(other);
      return this.x === v.x && this.y === v.y && this.z === v.z;
    }

    /** Squared magnitude (length²) — cheaper than length() when comparing distances. */
    lengthSquared(): number {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length(): number {
      return Math.sqrt(this.lengthSquared());
    }

    /** Return a new Vec3 with the same direction but length 1. */
    normalized(): Vec3 {
      const len = this.length();
      return len === 0 ? new Vec3(0) : this.scale(1 / len);
    }

    dot(other: VectorInput): number {
      const v = resolveVec3(other);
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(other: VectorInput): Vec3 {
      const v = resolveVec3(other);
      return new Vec3(
        this.y * v.z - this.z * v.y,
        this.z * v.x - this.x * v.z,
        this.x * v.y - this.y * v.x,
      );
    }

    /** Squared distance to another position vector */
    distanceToSquared(other: VectorInput): number {
      return this.subtract(other).lengthSquared();
    }

    /** Actual distance to another position vector */
    distanceTo(other: VectorInput): number {
      return Math.sqrt(this.distanceToSquared(other));
    }

    toString(): string {
      return `Vec3(${this.x}, ${this.y}, ${this.z})`;
    }
  }
}

namespace Shapes {
  export class Line {
    start: vectors.Vec2;
    end: vectors.Vec2;
    color: { r: number; g: number; b: number; a: number };

    constructor(options: {
      start?: vectors.Vector2Input;
      end?: vectors.Vector2Input;
      color?: { r: number; g: number; b: number; a: number };
    }) {
      this.start = new vectors.Vec2(options.start !== undefined ? options.start : 0);
      this.end = new vectors.Vec2(options.end !== undefined ? options.end : 0);
      this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
    }

    toPath(): vectors.Vec2[] {
      return [this.start, this.end];
    }

    toWidthHeight(): { width: number; height: number } {
      return {
        width: Math.abs(this.end.x - this.start.x),
        height: Math.abs(this.end.y - this.start.y),
      };
    }
  }

  Math = Math;

  export class Rectangle {
    start: vectors.Vec2;
    end: vectors.Vec2;
    width: number;
    height: number;
    center: vectors.Vec2;
    rotation: number;
    color: { r: number; g: number; b: number; a: number };

    constructor(options: {
      center?: vectors.Vector2Input;
      width?: number;
      height?: number;
      start?: vectors.Vector2Input;
      end?: vectors.Vector2Input;
      rotation?: number;
      color?: { r: number; g: number; b: number; a: number };
    }) {
      if (options.start && options.end) {
        this.start = new vectors.Vec2(options.start);
        this.end = new vectors.Vec2(options.end);
        var diff = this.end.subtract(this.start);
        this.width = Math.abs(diff.x);
        this.height = Math.abs(diff.y);
        this.center = this.start.add(this.end).scale(0.5);
      } else if (options.start && options.width !== undefined && options.height !== undefined) {
        this.start = new vectors.Vec2(options.start);
        this.width = options.width;
        this.height = options.height;
        this.end = this.start.add(new vectors.Vec2(this.width, this.height));
        this.center = this.start.add(new vectors.Vec2(this.width / 2, this.height / 2));
      } else {
        this.center = new vectors.Vec2(options.center!);
        this.width = options.width!;
        this.height = options.height!;
        var half = new vectors.Vec2(this.width! / 2, this.height! / 2);
        this.start = this.center.subtract(half);
        this.end = this.center.add(half);
      }

      this.rotation = options.rotation || 0;
      this.color = options.color || { r: 0, g: 0, b: 0, a: 255 };
    }

    getCorners(): vectors.Vec2[] {
      var w2 = this.width / 2;
      var h2 = this.height / 2;
      var cosA = Math.cos(this.rotation);
      var sinA = Math.sin(this.rotation);
      var cx = this.center.x;
      var cy = this.center.y;
      var signs: [number, number][] = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ];
      var corners: vectors.Vec2[] = [];
      for (var i = 0; i < signs.length; i++) {
        var sx = signs[i][0];
        var sy = signs[i][1];
        var rx = sx * w2 * cosA - sy * h2 * sinA;
        var ry = sx * w2 * sinA + sy * h2 * cosA;
        corners.push(new vectors.Vec2(cx + rx, cy + ry));
      }
      return corners;
    }

    toPath(): vectors.Vec2[] {
      var c = this.getCorners();
      return [c[0], c[1], c[2], c[3], c[0]];
    }
  }
}
