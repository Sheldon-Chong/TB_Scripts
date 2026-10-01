/**
 * Represents an 8-bit per channel Red, Green, Blue, Alpha color object in Toon Boom Harmony.
 */
declare class ColorRGBA {
  /** Red value [0, 255] */
  r: number;
  /** Green value [0, 255] */
  g: number;
  /** Blue value [0, 255] */
  b: number;
  /** Alpha value [0, 255] */
  a: number;

  /**
   * Creates a new default ColorRGBA (opaque white: 255, 255, 255, 255).
   */
  constructor();

  /**
   * Creates a new ColorRGBA with specified channel values.
   * @param r Red value [0, 255]
   * @param g Green value [0, 255]
   * @param b Blue value [0, 255]
   * @param a Alpha value [0, 255]
   */
  constructor(r: number, g: number, b: number, a: number);
}
