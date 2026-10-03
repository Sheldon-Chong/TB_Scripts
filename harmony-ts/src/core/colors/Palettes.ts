enum PaletteLocation {
  SCENE = 0,
  ELEMENT = 1,
  JOB = 2,
  ENVIRONMENT = 3,
}

enum HarmonyColorType {
  SOLID_COLOR = 0,
  LINEAR_GRADIENT = 1,
  RADIAL_GRADIENT = 2,
}

function createPaletteKit(Core: CoreRuntime) {
  var ColorUtils = Core.ColorUtils!;
  var ColorObjClass = ColorUtils.ColorObj;
  var PaletteLocationEnum = PaletteLocation;
  var HarmonyColorTypeEnum = HarmonyColorType;

  function colorInputToNative(input: RawColorInput): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    var color = ColorObjClass.fromColorInput(input);
    var rgba = color.toRgba();

    return {
      r: rgba.r,
      g: rgba.g,
      b: rgba.b,
      a: rgba.a !== null ? rgba.a : 255,
    };
  }

  function isColorInput(value: any): boolean {
    if (typeof value === 'string' || value instanceof ColorObjClass) {
      return true;
    }

    if (typeof value === 'object' && value !== null && !Core.Array.isArray(value)) {
      return (
        ('h' in value && 's' in value && 'v' in value) ||
        ('r' in value && 'g' in value && 'b' in value)
      );
    }

    return false;
  }

  var PaletteColorClass = createPaletteColorClass(
    Core,
    HarmonyColorTypeEnum,
    colorInputToNative,
    isColorInput,
  );
  var PaletteClass = createPaletteClass(Core, PaletteColorClass);
  var GlobalPaletteManagerClass = createGlobalPaletteManagerClass(Core, PaletteClass);
  var Palettes = createPalettesSingleton(GlobalPaletteManagerClass);

  return {
    PaletteLocation: PaletteLocationEnum,
    HarmonyColorType: HarmonyColorTypeEnum,
    PaletteColor: PaletteColorClass,
    Palette: PaletteClass,
    GlobalPaletteManager: GlobalPaletteManagerClass,
    Palettes: Palettes,
    colorInputToNative: colorInputToNative,
    isColorInput: isColorInput,
  };
}
