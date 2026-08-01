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

  type Vector2Input = number | number[] | { x: number; y: number } | Vec2;

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

    toArray(): [number, number] {
      return [this.x, this.y];
    }

    toObject(): { x: number; y: number } {
      return { x: this.x, y: this.y };
    }

    /** Convert to a Vec3 with the given z component (default 0). */
    toVec3(z: number = 0): Vec3 {
      return new G.Vec3(this.x, this.y, z);
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
        const v = G.Vectors.resolveVec3(input);
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
      const v = G.Vectors.resolveVec3(other);
      return new G.Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(other: VectorInput): Vec3 {
      const v = G.Vectors.resolveVec3(other);
      return new G.Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(other: VectorInput): Vec3 {
      const v = G.Vectors.resolveVec3(other);
      return new G.Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    divide(other: VectorInput): Vec3 {
      const v = G.Vectors.resolveVec3(other);
      return new G.Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }

    scale(s: number): Vec3 {
      return new G.Vec3(this.x * s, this.y * s, this.z * s);
    }

    // ---- comparison / query ----

    equals(other: VectorInput): boolean {
      const v = G.Vectors.resolveVec3(other);
      return this.x === v.x && this.y === v.y && this.z === v.z;
    }

    /** Squared magnitude (length²) — cheaper than length() when comparing distances. */
    lengthSquared(): number {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length(): number {
      return Math.sqrt(this.lengthSquared());
    }

    /** Return a new G.Vec3 with the same direction but length 1. */
    normalized(): Vec3 {
      const len = this.length();
      return len === 0 ? new G.Vec3(0) : this.scale(1 / len);
    }

    dot(other: VectorInput): number {
      const v = G.Vectors.resolveVec3(other);
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(other: VectorInput): Vec3 {
      const v = G.Vectors.resolveVec3(other);
      return new G.Vec3(
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
