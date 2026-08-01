include('core/Vectors.js');

class columnGroupingColor extends columnGrouping {
  r: oColumn;
  g: oColumn;
  b: oColumn;
  a: oColumn;

  constructor(rCol: oColumn, gCol: oColumn, bCol: oColumn, aCol: oColumn) {
    super();
    this.r = rCol;
    this.g = gCol;
    this.b = bCol;
    this.a = aCol;
    this.columns = [rCol, gCol, bCol, aCol];
  }

  /** Factory: create from a node by looking up the four COLOR.* columns. */
  static fromNode(node: oNodeLayer): columnGroupingColor {
    return new columnGroupingColor(
      node.getColumn('COLOR.RED'),
      node.getColumn('COLOR.GREEN'),
      node.getColumn('COLOR.BLUE'),
      node.getColumn('COLOR.ALPHA'),
    );
  }

  getColor(frameNumber: number): ColorObj {
    return new ColorObj({
      r: parseInt(this.r.getKeyframe(frameNumber), 10) || 0,
      g: parseInt(this.g.getKeyframe(frameNumber), 10) || 0,
      b: parseInt(this.b.getKeyframe(frameNumber), 10) || 0,
      a: parseInt(this.a.getKeyframe(frameNumber), 10) || 0,
    });
  }

  /** Set the colour.  Alpha is set only when explicitly provided — otherwise the alpha
   *  column is left untouched. */
  setColor(frameNumber: number, color: ColorInput): boolean {
    const c = ColorObj.fromColorInput(color);
    const rgba = c.toRgba();

    const rgbOk =
      this.r.setKeyFrame(frameNumber, rgba.r.toString()) &&
      this.g.setKeyFrame(frameNumber, rgba.g.toString()) &&
      this.b.setKeyFrame(frameNumber, rgba.b.toString());

    if (rgba.a !== null) {
      return rgbOk && this.a.setKeyFrame(frameNumber, rgba.a.toString());
    }
    return rgbOk;
  }

  /** Set the colour across a frame range using any ColorInput. */
  setColorRange(startFrame: number, endFrame: number, color: ColorInput): boolean {
    for (let f = startFrame; f <= endFrame; f++) {
      if (!(this.setColor as any)(f, color)) return false;
    }
    return true;
  }

  toString(): string {
    return `columnGroupingColor<R:${this.r.name}, G:${this.g.name}, B:${this.b.name}, A:${this.a.name}>`;
  }
}
