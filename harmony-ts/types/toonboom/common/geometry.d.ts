/** Point structure used in paths, masks, and calculations */
interface Point2D {
  x: number;
  y: number;
}

/** Bezier point representation */
interface BezierPoint extends Point2D {
  onCurve?: boolean;
  [key: string]: unknown;
}

/** Array of Bezier points representing a continuous path */
type BezierPath = BezierPoint[];

/** Array of Bezier points defining a closed contour mask */
type BezierContour = Point2D[];

declare class Point2d {
  x: number;
  y: number;
  constructor(x: number, y: number);
}

declare var Vector2d: {
  new (x: number, y: number): Point2d;
};

declare interface Point3d {
  x: number;
  y: number;
  z: number;
}
