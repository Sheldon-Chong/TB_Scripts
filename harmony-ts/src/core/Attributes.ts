/* ===================================================================
   Attributes.ts — Typed wrappers around Harmony's raw Attribute system.

   Each Harmony node exposes its properties through "Attributes" (which
   are Harmony's own internal wrapper around columns).  An Attribute has
   a type (INT, DOUBLE, BOOL, POSITION_3D, …) and typed getter/setter
   methods like intValue(), pos3dValue(), setValue(bool), etc.

   This module provides thin wrappers that bind a node path + keyword
   to a type-safe API, so node subclasses can declare their attributes
   inline and use them with IDE autocompletion.

   Usage in a node subclass:
   ┌─────────────────────────────────────────────────────────────────┐
   │ class oPegNode extends oNodeLayer {                             │
   │   position = new oPosition3D(this.nodePath);                     │
   │   scale    = new oScale3D(this.nodePath);                        │
   │   rotation = new oRotation3D(this.nodePath);                     │
   │                                                                  │
   │   // simple scalar attributes                                    │
   │   visible  = new oBoolAttr(this.nodePath, 'visible');            │
   │ }                                                                │
   │                                                                  │
   │ const peg = … as oPegNode;                                       │
   │ peg.position.set({ x: 100, y: 200, z: 0 }, 42);                  │
   │ peg.visible.set(true);                                           │
   └─────────────────────────────────────────────────────────────────┘
   =================================================================== */

/* -------------------------------------------------------------------
   Helpers (expects resolveVec3 & Vec3 from Vectors.ts via globals)
   ------------------------------------------------------------------- */

/* ===================================================================
   Type-name constants — matches Harmony's Attribute::typeName() values
   =================================================================== */

const AttributeType = {
  INT: 'INT',
  DOUBLE: 'DOUBLE',
  BOOL: 'BOOL',
  SCALE_3D: 'SCALE_3D',
  ALIAS: 'ALIAS',
  POSITION_3D: 'POSITION_3D',
  ROTATION_3D: 'ROTATION_3D',
  GENERIC_ENUM: 'GENERIC_ENUM',
  DRAWING: 'DRAWING',
} as const;

/* ===================================================================
   Base attribute wrapper
   =================================================================== */

/**
 * Typed binding to a single Harmony Attribute identified by node path
 * + keyword.  Subclasses override get/getAt/set/setAt to call the
 * correct type-specific Harmony method (intValue, boolValue, …).
 */
abstract class oAttr<T> {
  readonly nodePath: string;
  readonly keyword: string;

  constructor(nodePath: string, keyword: string) {
    this.nodePath = nodePath;
    this.keyword = keyword;
  }

  /** Raw Harmony Attribute at the current frame. */
  protected _attr(): Attribute {
    return node.getAttr(this.nodePath, frame.current(), this.keyword);
  }

  /** Raw Harmony Attribute at a specific frame. */
  protected _attrAt(f: number): Attribute {
    return node.getAttr(this.nodePath, f, this.keyword);
  }

  /** Like _attr() but throws a descriptive error when the attribute
   *  doesn't exist or returns null. */
  protected _requireAttr(): Attribute {
    const attr = this._attr();
    if (!attr) {
      throw new Error(
        "Attribute '" + this.keyword + "' not found on node '" + this.nodePath + "'.",
      );
    }
    return attr;
  }

  /** Like _attrAt() but throws a descriptive error when null. */
  protected _requireAttrAt(f: number): Attribute {
    const attr = this._attrAt(f);
    if (!attr) {
      throw new Error(
        "Attribute '" +
          this.keyword +
          "' not found on node '" +
          this.nodePath +
          "' at frame " +
          f +
          '.',
      );
    }
    return attr;
  }

  abstract get(): T;
  abstract getAt(frame: number): T;
  abstract set(value: T): void;
  abstract setAt(value: T, frame: number): void;
}

/* ===================================================================
   Scalar attribute wrappers
   =================================================================== */

/** INT attribute → number  (Harmony intValue / intValueAt) */
class oIntAttr extends oAttr<number> {
  get(): number {
    return this._requireAttr().intValue();
  }
  getAt(frame: number): number {
    return this._requireAttrAt(frame).intValue();
  }
  set(value: number): void {
    this._requireAttr().setValue(value);
  }
  setAt(value: number, frame: number): void {
    this._requireAttrAt(frame).setValueAt(value, frame);
  }
}

/** DOUBLE attribute → number  (Harmony doubleValue / doubleValueAt) */
class oDoubleAttr extends oAttr<number> {
  get(): number {
    return this._requireAttr().doubleValue();
  }
  getAt(frame: number): number {
    return this._requireAttrAt(frame).doubleValue();
  }
  set(value: number): void {
    this._requireAttr().setValue(value);
  }
  setAt(value: number, frame: number): void {
    this._requireAttrAt(frame).setValueAt(value, frame);
  }
}

/** BOOL attribute → boolean  (Harmony boolValue / boolValueAt) */
class oBoolAttr extends oAttr<boolean> {
  get(): boolean {
    return this._requireAttr().boolValue();
  }
  getAt(frame: number): boolean {
    return this._requireAttrAt(frame).boolValue();
  }
  set(value: boolean): void {
    this._requireAttr().setValue(value);
  }
  setAt(value: boolean, frame: number): void {
    this._requireAttrAt(frame).setValueAt(value, frame);
  }
}

/** Text-based attribute (ALIAS, DRAWING, or GENERIC_ENUM without enum
 *  helpers).  Calls Harmony textValue / textValueAt / setValue(String). */
class oTextAttr extends oAttr<string> {
  get(): string {
    return this._requireAttr().textValue();
  }
  getAt(frame: number): string {
    return this._requireAttrAt(frame).textValue();
  }
  set(value: string): void {
    this._requireAttr().setValue(value);
  }
  setAt(value: string, frame: number): void {
    this._requireAttrAt(frame).setValueAt(value, frame);
  }
}

/** GENERIC_ENUM attribute — text-based with possibleTextValues() support. */
class oEnumAttr extends oTextAttr {
  /** Return the list of valid enum entries for this attribute. */
  possibleValues(): string[] {
    return this._requireAttr().possibleTextValues();
  }
}

/** DRAWING attribute — text-based (exposure name).  May be upgraded
 *  later to return an objDrawing instance. */
class oDrawingAttr extends oTextAttr {}

/** ALIAS attribute — text-based string alias. */
class oAliasAttr extends oTextAttr {}

/* ===================================================================
   3-D composite attribute (POSITION_3D / SCALE_3D / ROTATION_3D)
   =================================================================== */

/**
 * Base for any 3-D attribute whose sub-attributes are .x, .y, .z.
 *
 * At construction time the parent attribute is fetched via
 * `node.getAttr(nodePath, frame.current(), keyword)` and its
 * `getSubAttributes()` are used to discover the actual per-axis
 * full keywords (Harmony keywords are NOT standardised).
 *
 * Per-axis access delegates to `oDoubleAttr` children; convenience
 * `get()` uses the parent's `pos3dValue()` for reliability.
 */
class oAttr3D {
  /** Per-axis attribute wrappers.  GET works (reads via doubleValue);
   *  SET is NOT reliable on sub-attributes — use oAttr3D.set() or
   *  setX()/setY()/setZ() instead. */
  readonly x: oDoubleAttr;
  readonly y: oDoubleAttr;
  readonly z: oDoubleAttr;

  private _nodePath: string;
  private _keyword: string;

  /**
   * @param nodePath  Full Harmony node path (e.g. "Top/Peg1")
   * @param keyword   Harmony attribute keyword (e.g. "POSITION", "SCALE", "ROTATION")
   */
  constructor(nodePath: string, keyword: string) {
    this._nodePath = nodePath;
    this._keyword = keyword;

    // Discover sub-attribute full keywords from the parent so that
    // per-axis oDoubleAttr wrappers can resolve via node.getAttr().
    // (Reading works; setting via sub-attributes does NOT — Harmony
    //  requires modifying the Point3d and calling setValueAt on the
    //  parent.  See set() / setX() / setY() / setZ() below.)
    //
    // Layout varies by attribute type — match by short keyword, not index:
    //   POSITION: [SEPARATE,  X,  Y,  Z, 3DPATH]
    //   SCALE:    [SEPARATE,  IN_FIELDS,  XY,  X,  Y,  Z]
    const parent = node.getAttr(nodePath, frame.current(), keyword);

    var xKey = '';
    var yKey = '';
    var zKey = '';

    if (parent && parent.hasSubAttributes()) {
      MessageLog.trace("\nFound parent attribute '" + keyword + "' on node '" + nodePath + "'.");
      var subs = parent.getSubAttributes();
      for (var i = 0; i < subs.length; i++) {
        MessageLog.trace(
          '  sub[' +
            i +
            '] keyword=' +
            subs[i].keyword() +
            ' fullKeyword=' +
            subs[i].fullKeyword() +
            ' type=' +
            subs[i].typeName(),
        );
        var kw = subs[i].keyword();
        if (kw === 'X') xKey = subs[i].fullKeyword();
        else if (kw === 'Y') yKey = subs[i].fullKeyword();
        else if (kw === 'Z') zKey = subs[i].fullKeyword();
      }
    }

    this.x = new oDoubleAttr(nodePath, xKey);
    this.y = new oDoubleAttr(nodePath, yKey);
    this.z = new oDoubleAttr(nodePath, zKey);
    MessageLog.trace(
      `oAttr3D '${keyword}' on node '${nodePath}' → x='${xKey}', y='${yKey}', z='${zKey}'`,
    );
  }

  // ── helpers ──────────────────────────────────────────────

  /** Fetch the parent attribute at a given frame, or throw. */
  private _parentAt(f: number): Attribute {
    const parent = node.getAttr(this._nodePath, f, this._keyword);
    if (!parent) {
      throw new Error(
        "Attribute '" +
          this._keyword +
          "' not found on node '" +
          this._nodePath +
          "' at frame " +
          f +
          '.',
      );
    }
    return parent;
  }

  /**
   * Get the sub-attribute wrapper for the given axis at the given frame.
   * Reads via doubleValue() on the sub-attribute — this works for ALL
   * 3-D types (POSITION_3D, SCALE_3D, ROTATION_3D), unlike pos3dValue()
   * which only works for POSITION_3D.
   */
  private _readAxis(axis: 'x' | 'y' | 'z', f: number): number {
    const wrapper = this[axis]; // this.x, this.y, or this.z
    return wrapper.getAt(f);
  }

  /**
   * Set one axis by writing doubleValue to the sub-attribute.
   * Works for all 3-D types — does NOT rely on pos3dValue()/setValueAt(Point3d)
   * which is POSITION_3D-specific.
   */
  private _setAxis(axis: 'x' | 'y' | 'z', value: number, f: number): void {
    const wrapper = this[axis]; // this.x, this.y, or this.z
    wrapper.setAt(value, f);
  }

  // ── Vec3 convenience ────────────────────────────────────

  /** Return a Vec3 at the current frame. */
  get(): Vec3;
  /** Return a Vec3 at the given frame. */
  get(atFrame: number): Vec3;
  get(atFrame?: number): Vec3 {
    const f = atFrame !== undefined ? atFrame : frame.current();
    const x = this._readAxis('x', f);
    const y = this._readAxis('y', f);
    const z = this._readAxis('z', f);
    return new G.Vec3(x, y, z);
  }

  /** Set all three axes at the current frame. */
  set(value: VectorInput): void;
  /** Set all three axes at the given frame. */
  set(value: VectorInput, atFrame: number): void;
  set(value: VectorInput, atFrame?: number): void {
    const v = G.Vectors.resolveVec3(value);
    const f = atFrame !== undefined ? atFrame : frame.current();
    this._setAxis('x', v.x, f);
    this._setAxis('y', v.y, f);
    this._setAxis('z', v.z, f);
  }

  /**
   * Set the global (default) value without creating or touching any
   * keyframes or columns.  Unlike set(), this does NOT take a frame
   * argument — it calls setValue(QObject) on the parent Attribute,
   * which persists as the non-animated default across the whole scene.
   */
  setGlobal(value: VectorInput): void {
    const v = G.Vectors.resolveVec3(value);
    const parent = node.getAttr(this._nodePath, frame.current(), this._keyword);
    if (!parent) {
      throw new Error(
        "Attribute '" + this._keyword + "' not found on node '" + this._nodePath + "'.",
      );
    }
    // Set each axis individually via setValue(double) on the DOUBLE
    // sub-attributes.  setValue(QObject) on the parent 3-D attribute
    // is not supported; the sub-attribute path is the correct way to
    // set the global (non-keyframed) default.
    const subs = parent.getSubAttributes();
    for (var i = 0; i < subs.length; i++) {
      var kw = subs[i].keyword();
      if (kw === 'x') subs[i].setValue(v.x);
      else if (kw === 'y') subs[i].setValue(v.y);
      else if (kw === 'z') subs[i].setValue(v.z);
    }
  }

  // ── per-axis setters (use parent Point3d path) ──────────

  setX(value: number, atFrame?: number): void {
    try {
      this._setAxis('x', value, atFrame !== undefined ? atFrame : frame.current());
    } catch (e) {
      MessageLog.trace(
        "Error setting '" + this._keyword + "' X axis on node '" + this._nodePath + "': " + e,
      );
    }
  }
  setY(value: number, atFrame?: number): void {
    this._setAxis('y', value, atFrame !== undefined ? atFrame : frame.current());
  }
  setZ(value: number, atFrame?: number): void {
    this._setAxis('z', value, atFrame !== undefined ? atFrame : frame.current());
  }
}

/* ---- concrete 3-D attribute types ---- */

/**
 * POSITION_3D attribute.
 *
 * Default keyword: `"POSITION"` (standard peg/group node).
 * Pass a custom keyword for non-standard nodes, e.g.:
 *   pivot = new oPosition3D(this.nodePath, 'PIVOT');
 */
class oPosition3D extends oAttr3D {
  constructor(nodePath: string, keyword: string = 'POSITION') {
    super(nodePath, keyword);
  }
}

/**
 * SCALE_3D attribute.
 *
 * Default keyword: `"SCALE"`.
 */
class oScale3D extends oAttr3D {
  constructor(nodePath: string, keyword: string = 'SCALE') {
    super(nodePath, keyword);
  }
}

/**
 * ROTATION_3D attribute (Euler angles).
 *
 * Default keyword: `"ROTATION"`.
 */
class oRotation3D extends oAttr3D {
  constructor(nodePath: string, keyword: string = 'ROTATION') {
    super(nodePath, keyword);
  }
}

/* ===================================================================
   Factory helpers for oNodeLayer subclasses
   =================================================================== */

/**
 * Mixin-style helpers that can be used inside an oNodeLayer subclass
 * constructor to concisely declare attributes.
 *
 *   class oPegNode extends oNodeLayer {
 *     position = Attrs.position3D(this);
 *     scale    = Attrs.scale3D(this);
 *   }
 */
const Attrs = {
  /** Shorthand: `Attrs.int(node, 'opacity')` */
  int(node: oNodeLayer, keyword: string): oIntAttr {
    return new oIntAttr(node.nodePath, keyword);
  },
  /** Shorthand: `Attrs.double(node, 'opacity')` */
  double(node: oNodeLayer, keyword: string): oDoubleAttr {
    return new oDoubleAttr(node.nodePath, keyword);
  },
  /** Shorthand: `Attrs.bool(node, 'visible')` */
  bool(node: oNodeLayer, keyword: string): oBoolAttr {
    return new oBoolAttr(node.nodePath, keyword);
  },
  /** Shorthand: `Attrs.text(node, 'alias')` */
  text(node: oNodeLayer, keyword: string): oTextAttr {
    return new oTextAttr(node.nodePath, keyword);
  },
  /** Shorthand: `Attrs.enum_(node, 'blendMode')` */
  enum_(node: oNodeLayer, keyword: string): oEnumAttr {
    return new oEnumAttr(node.nodePath, keyword);
  },

  /** Shorthand: `Attrs.position3D(node)` or `Attrs.position3D(node, 'PIVOT')` */
  position3D(node: oNodeLayer, keyword?: string): oPosition3D {
    return new oPosition3D(node.nodePath, keyword);
  },
  /** Shorthand: `Attrs.scale3D(node)` or `Attrs.scale3D(node, 'MY_SCALE')` */
  scale3D(node: oNodeLayer, keyword?: string): oScale3D {
    return new oScale3D(node.nodePath, keyword);
  },
  /** Shorthand: `Attrs.rotation3D(node)` or `Attrs.rotation3D(node, 'MY_ROT')` */
  rotation3D(node: oNodeLayer, keyword?: string): oRotation3D {
    return new oRotation3D(node.nodePath, keyword);
  },
};
