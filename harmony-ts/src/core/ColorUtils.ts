function hsvToRgb(h, s, v) {
  s = s / 100;
  v = v / 100;
  var c = v * s;
  var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  var m = v - c;
  var r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsv(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h,
    s,
    v = max;
  var d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = h * 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

/* ====================== COLOR INPUT TYPES ====================== */

/** A colour expressed as any of the common forms:
 *  - hex string:        `"#FF8040"`
 *  - RGB(A) object:     `{ r: 255, g: 128, b: 64 }`  or  `{ r: 255, g: 128, b: 64, a: 255 }`
 *  - HSV(A) object:     `{ h: 30, s: 75, v: 100 }`   or  `{ h: 30, s: 75, v: 100, a: 128 }`
 *  - ColorObj instance: `new ColorObj("#FF8040")`
 *
 * Alpha is optional / nullable.  When `a` is `null` or absent, the alpha column is
 * left untouched during `setColor`.
 */
type ColorInput =
  | string
  | { r: number; g: number; b: number; a?: number | null }
  | { h: number; s: number; v: number; a?: number | null }
  | ColorObj;

class ColorObj {
  private _r: number;
  private _g: number;
  private _b: number;
  private _a: number | null;

  constructor(
    input:
      | string
      | { r: number; g: number; b: number; a?: number | null }
      | { h: number; s: number; v: number; a?: number | null },
  ) {
    this._r = 0;
    this._g = 0;
    this._b = 0;
    this._a = null;

    if (typeof input === 'string') {
      // Parse hex string
      this._parseHex(input);
    } else if (typeof input === 'object') {
      if ('h' in input && 's' in input && 'v' in input) {
        // HSV input
        const rgb = hsvToRgb(input.h, input.s, input.v);
        this._r = rgb.r;
        this._g = rgb.g;
        this._b = rgb.b;
        this._a = ('a' in input ? input.a : null) ?? null;
      } else if ('r' in input && 'g' in input && 'b' in input) {
        // RGB input
        this._r = input.r;
        this._g = input.g;
        this._b = input.b;
        this._a = ('a' in input ? input.a : null) ?? null;
      } else {
        throw new Error('Invalid color input object. Must contain either {h,s,v} or {r,g,b}');
      }
    } else {
      throw new Error(
        'Invalid color input. Must be a hex string or an object with RGB or HSV values',
      );
    }
  }

  private _parseHex(hexString: string): void {
    // Remove # if present
    const hex = hexString.replace(/^#/, '');

    // Validate hex string
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      throw new Error('Invalid hex color format. Expected format: #RRGGBB or RRGGBB');
    }

    this._r = parseInt(hex.substring(0, 2), 16);
    this._g = parseInt(hex.substring(2, 4), 16);
    this._b = parseInt(hex.substring(4, 6), 16);
  }

  getRed(): number {
    return this._r;
  }
  getGreen(): number {
    return this._g;
  }
  getBlue(): number {
    return this._b;
  }
  getAlpha(): number | null {
    return this._a;
  }
  hasAlpha(): boolean {
    return this._a !== null;
  }

  setRed(value: number): void {
    this._r = value;
  }
  setGreen(value: number): void {
    this._g = value;
  }
  setBlue(value: number): void {
    this._b = value;
  }
  setAlpha(value: number | null): void {
    this._a = value;
  }

  toRgb(): { r: number; g: number; b: number } {
    return {
      r: this._r,
      g: this._g,
      b: this._b,
    };
  }

  /** Returns RGBA; alpha is null when unset. */
  toRgba(): { r: number; g: number; b: number; a: number | null } {
    return {
      r: this._r,
      g: this._g,
      b: this._b,
      a: this._a,
    };
  }

  toHsv(): { h: number; s: number; v: number } {
    return rgbToHsv(this._r, this._g, this._b);
  }

  /**
   * Hex representation.
   * @param withHash  Include leading `#`. Default true.
   * @param withAlpha Append 2-digit alpha hex. Default false.
   */
  toHex(withHash: boolean = true, withAlpha: boolean = false): string {
    const r = ('0' + this._r.toString(16)).slice(-2);
    const g = ('0' + this._g.toString(16)).slice(-2);
    const b = ('0' + this._b.toString(16)).slice(-2);

    let hex = (r + g + b).toUpperCase();
    if (withAlpha && this._a !== null) {
      const a = ('0' + this._a.toString(16)).slice(-2);
      hex += a.toUpperCase();
    }
    return withHash ? '#' + hex : hex;
  }

  static fromRgb(r: number, g: number, b: number): ColorObj {
    return new ColorObj({ r, g, b });
  }

  static fromRgba(r: number, g: number, b: number, a: number | null): ColorObj {
    return new ColorObj({ r, g, b, a });
  }

  /**
   * Create ColorUtil from HSV values
   * @param h - Hue (0-359)
   * @param s - Saturation (0-100)
   * @param v - Value (0-100)
   * @returns ColorUtil instance
   */
  static fromHsv(h: number, s: number, v: number): ColorObj {
    return new ColorObj({ h, s, v });
  }

  static fromHex(hex: string): ColorObj {
    return new ColorObj(hex);
  }

  /** Normalises any ColorInput into a ColorObj instance.
   *  - String          → treated as hex
   *  - ColorObj        → returned as-is (without cloning)
   *  - {h,s,v,a?}      → converted HSV→RGB
   *  - {r,g,b,a?}      → passed through directly  */
  static fromColorInput(input: ColorInput, alpha: number | null = null): ColorObj {
    if (input instanceof ColorObj) return input;
    const colorObj = new ColorObj(input as any);
    if (alpha !== null) {
      colorObj.setAlpha(alpha);
    }

    return colorObj;
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) {
    return null;
  }
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

const ColorUtils = {
  hsvToRgb,
  rgbToHsv,
  ColorObj,
};
