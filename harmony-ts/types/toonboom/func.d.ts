declare var func: {
  /**
   * Add a keyframe to a 3D path column.
   * @param columnName  The name of the 3D path column.
   * @param frame       The frame number.
   * @param x           X coordinate.
   * @param y           Y coordinate.
   * @param z           Z coordinate.
   * @param tension     Spline tension.
   * @param continuity  Spline continuity.
   * @param bias        Spline bias.
   */
  addKeyFramePath3d(
    columnName: string,
    frame: number,
    x: number,
    y: number,
    z: number,
    tension: number,
    continuity: number,
    bias: number,
  ): void;
};
