function createPathColumn3DClass(Core: any) {
  var BaseColumn = Core.oColumn;

  class PathColumn3D extends BaseColumn {
    constructor(name: string, parentLayer: any) {
      super(name, parentLayer);
    }

    getX(frameNumber: number): string {
      return Core.column.getEntry(this.name, 1, frameNumber);
    }

    getY(frameNumber: number): string {
      return Core.column.getEntry(this.name, 2, frameNumber);
    }

    getZ(frameNumber: number): string {
      return Core.column.getEntry(this.name, 3, frameNumber);
    }

    private parseDirectionalValue(entry: string, positive: string, negative: string): number {
      var value = Core.parseFloat(entry);

      return entry.indexOf(positive) !== -1 ? value : -value;
    }

    getXVal(frameNumber: number): number {
      return this.parseDirectionalValue(this.getX(frameNumber), 'E', 'W');
    }

    getYVal(frameNumber: number): number {
      return this.parseDirectionalValue(this.getY(frameNumber), 'N', 'S');
    }

    getZVal(frameNumber: number): number {
      return this.parseDirectionalValue(this.getZ(frameNumber), 'F', 'B');
    }

    setX(frameNumber: number, value: string | number): boolean {
      var formattedValue =
        typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' E' : ' W') : value;

      return Core.column.setEntry(this.name, 1, frameNumber, formattedValue);
    }

    setY(frameNumber: number, value: string | number): boolean {
      var formattedValue =
        typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' N' : ' S') : value;

      return Core.column.setEntry(this.name, 2, frameNumber, formattedValue);
    }

    setZ(frameNumber: number, value: string | number): boolean {
      var formattedValue =
        typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' F' : ' B') : value;

      return Core.column.setEntry(this.name, 3, frameNumber, formattedValue);
    }

    private resolveVec3(input: VectorInput): {
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

      if (input instanceof Core.Vec3) {
        return {
          x: input.x,
          y: input.y,
          z: input.z,
        };
      }

      if (Core.Array && Core.Array.isArray && Core.Array.isArray(input)) {
        return {
          x: input[0] !== undefined ? input[0] : 0,

          y: input[1] !== undefined ? input[1] : 0,

          z: input[2] !== undefined ? input[2] : 0,
        };
      }

      return {
        x: input.x,
        y: input.y,
        z: input.z,
      };
    }

    setPosition(
      frameNumber: number,
      position: VectorInput,
      tension: number = 0,
      continuity: number = 0,
      bias: number = 0,
    ): void {
      var v = this.resolveVec3(position);

      Core.func.addKeyFramePath3d(this.name, frameNumber, v.x, v.y, v.z, tension, continuity, bias);
    }

    isKeyFrame(frameNumber: number, subColumn: number = 1): boolean {
      return Core.column.isKeyFrame(this.name, subColumn, frameNumber);
    }

    isKeyFrameX(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 1, frameNumber);
    }

    isKeyFrameY(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 2, frameNumber);
    }

    isKeyFrameZ(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 3, frameNumber);
    }

    isKeyFrameVelocity(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 4, frameNumber);
    }

    isKeyFrameAny(frameNumber: number): boolean {
      return (
        this.isKeyFrameX(frameNumber) ||
        this.isKeyFrameY(frameNumber) ||
        this.isKeyFrameZ(frameNumber)
      );
    }

    isKeyFrameAll(frameNumber: number): boolean {
      return (
        this.isKeyFrameX(frameNumber) &&
        this.isKeyFrameY(frameNumber) &&
        this.isKeyFrameZ(frameNumber)
      );
    }

    toString(): string {
      return 'PathColumn3D<' + this.name + '>';
    }
  }

  return PathColumn3D;
}
