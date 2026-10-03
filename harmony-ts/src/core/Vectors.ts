type Vec2Like = {
  x: number;
  y: number;
};

type Vec3Like = {
  x: number;
  y: number;
  z: number;
};

type Vector2Input = number | number[] | Vec2Like;

type VectorInput = number | number[] | Vec3Like;

/*
 * Optional compatibility layer if your existing code
 * already uses:
 *
 * vectors.Vector2Input
 * vectors.VectorInput
 *
 * This is type-only and does not provide the runtime
 * vectors object.
 */
declare namespace vectors {
  type Vector2Input = number | number[] | Vec2Like;

  type VectorInput = number | number[] | Vec3Like;
}

function createVectors(Core: CoreRuntime) {
  /*
   * These are declared first so the resolver functions
   * can use instanceof against the exact constructors
   * returned by this factory.
   */

  class Vec2 {
    x: number;
    y: number;

    constructor(input: Vector2Input, y?: number) {
      if (typeof input === 'number' && y !== undefined) {
        this.x = input;
        this.y = y;
      } else {
        var v = resolveVec2(input);

        this.x = v.x;
        this.y = v.y;
      }
    }

    toWidthHeight(): {
      width: number;
      height: number;
    } {
      return {
        width: Core.Math.abs(this.x),

        height: Core.Math.abs(this.y),
      };
    }

    toArray(): [number, number] {
      return [this.x, this.y];
    }

    toObject(): {
      x: number;
      y: number;
    } {
      return {
        x: this.x,
        y: this.y,
      };
    }

    toVec3(z: number = 0): Vec3 {
      return new Vec3(this.x, this.y, z);
    }

    add(other: Vector2Input): Vec2 {
      var v = resolveVec2(other);

      return new Vec2(this.x + v.x, this.y + v.y);
    }

    subtract(other: Vector2Input): Vec2 {
      var v = resolveVec2(other);

      return new Vec2(this.x - v.x, this.y - v.y);
    }

    multiply(other: Vector2Input): Vec2 {
      var v = resolveVec2(other);

      return new Vec2(this.x * v.x, this.y * v.y);
    }

    divide(other: Vector2Input): Vec2 {
      var v = resolveVec2(other);

      return new Vec2(this.x / v.x, this.y / v.y);
    }

    scale(s: number): Vec2 {
      return new Vec2(this.x * s, this.y * s);
    }

    equals(other: Vector2Input): boolean {
      var v = resolveVec2(other);

      return this.x === v.x && this.y === v.y;
    }

    lengthSquared(): number {
      return this.x * this.x + this.y * this.y;
    }

    length(): number {
      return Core.Math.sqrt(this.lengthSquared());
    }

    normalized(): Vec2 {
      var len = this.length();

      return len === 0 ? new Vec2(0) : this.scale(1 / len);
    }

    dot(other: Vector2Input): number {
      var v = resolveVec2(other);

      return this.x * v.x + this.y * v.y;
    }

    distanceToSquared(other: Vector2Input): number {
      return this.subtract(other).lengthSquared();
    }

    distanceTo(other: Vector2Input): number {
      return Core.Math.sqrt(this.distanceToSquared(other));
    }

    toString(): string {
      return 'Vec2(' + this.x + ', ' + this.y + ')';
    }

    lerp(target: Vector2Input, t: number): Vec2 {
      var v = resolveVec2(target);

      return new Vec2(
        this.x + (v.x - this.x) * t,

        this.y + (v.y - this.y) * t,
      );
    }
  }

  class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(input: VectorInput, y?: number, z?: number) {
      if (typeof input === 'number' && y !== undefined && z !== undefined) {
        this.x = input;
        this.y = y;
        this.z = z;
      } else {
        var v = resolveVec3(input);

        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
      }
    }

    toArray(): [number, number, number] {
      return [this.x, this.y, this.z];
    }

    toObject(): {
      x: number;
      y: number;
      z: number;
    } {
      return {
        x: this.x,
        y: this.y,
        z: this.z,
      };
    }

    add(other: VectorInput): Vec3 {
      var v = resolveVec3(other);

      return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(other: VectorInput): Vec3 {
      var v = resolveVec3(other);

      return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(other: VectorInput): Vec3 {
      var v = resolveVec3(other);

      return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    divide(other: VectorInput): Vec3 {
      var v = resolveVec3(other);

      return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }

    scale(s: number): Vec3 {
      return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    equals(other: VectorInput): boolean {
      var v = resolveVec3(other);

      return this.x === v.x && this.y === v.y && this.z === v.z;
    }

    lengthSquared(): number {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length(): number {
      return Core.Math.sqrt(this.lengthSquared());
    }

    normalized(): Vec3 {
      var len = this.length();

      return len === 0 ? new Vec3(0) : this.scale(1 / len);
    }

    dot(other: VectorInput): number {
      var v = resolveVec3(other);

      return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(other: VectorInput): Vec3 {
      var v = resolveVec3(other);

      return new Vec3(
        this.y * v.z - this.z * v.y,

        this.z * v.x - this.x * v.z,

        this.x * v.y - this.y * v.x,
      );
    }

    distanceToSquared(other: VectorInput): number {
      return this.subtract(other).lengthSquared();
    }

    distanceTo(other: VectorInput): number {
      return Core.Math.sqrt(this.distanceToSquared(other));
    }

    toString(): string {
      return 'Vec3(' + this.x + ', ' + this.y + ', ' + this.z + ')';
    }
  }

  function resolveVec3(input: VectorInput): {
    x: number;
    y: number;
    z: number;
  } {
    if (typeof input === 'number') {
      return {
        x: input,
        y: input,
        z: input,
      };
    }

    if (input instanceof Vec3) {
      return {
        x: input.x,
        y: input.y,
        z: input.z,
      };
    }

    if (Core.Array.isArray(input)) {
      return {
        x: input[0] !== undefined ? input[0] : 0,

        y: input[1] !== undefined ? input[1] : 0,

        z: input[2] !== undefined ? input[2] : 0,
      };
    }

    var obj = input as Vec3Like;

    return {
      x: obj.x,
      y: obj.y,
      z: obj.z,
    };
  }

  function resolveVec2(input: Vector2Input): {
    x: number;
    y: number;
  } {
    if (typeof input === 'number') {
      return {
        x: input,
        y: input,
      };
    }

    if (input instanceof Vec2) {
      return {
        x: input.x,
        y: input.y,
      };
    }

    if (Core.Array.isArray(input)) {
      return {
        x: input[0] !== undefined ? input[0] : 0,

        y: input[1] !== undefined ? input[1] : 0,
      };
    }

    var obj = input as Vec2Like;

    return {
      x: obj.x,
      y: obj.y,
    };
  }

  return {
    Vec2: Vec2,

    Vec3: Vec3,

    resolveVec2: resolveVec2,

    resolveVec3: resolveVec3,
  };
}
