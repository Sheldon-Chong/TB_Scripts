function createPaletteColorClass(
  Core: CoreRuntime,
  HarmonyColorTypeEnum: typeof HarmonyColorType,
  colorInputToNative: (input: RawColorInput) => { r: number; g: number; b: number; a: number },
  isColorInput: (value: any) => boolean,
) {
  class PaletteColor {
    private _native: any;
    private _parent: any;

    constructor(nativeColor: any, parent: any) {
      this._native = nativeColor;
      this._parent = parent;
    }

    get parent(): any {
      return this._parent;
    }

    get palette(): any {
      return this._parent;
    }

    get id(): string {
      return this._native.id;
    }

    get name(): string {
      return this._native.name;
    }

    set name(value: string) {
      this._native.setName(value);
    }

    get colorType(): HarmonyColorType {
      return this._native.colorType;
    }

    setColorType(type: HarmonyColorType | string): void {
      this._native.setColorType(type);
    }

    get isSolid(): boolean {
      return this.colorType === HarmonyColorTypeEnum.SOLID_COLOR;
    }

    get isLinearGradient(): boolean {
      return this.colorType === HarmonyColorTypeEnum.LINEAR_GRADIENT;
    }

    get isRadialGradient(): boolean {
      return this.colorType === HarmonyColorTypeEnum.RADIAL_GRADIENT;
    }

    get colorData(): any {
      return this._native.colorData;
    }

    set colorData(value: RawColorInput | any) {
      if (isColorInput(value)) {
        this._native.setColorData(colorInputToNative(value));
      } else {
        this._native.setColorData(value);
      }
    }

    get isTexture(): boolean {
      return this._native.isTexture ? this._native.isTexture() : false;
    }

    get isValid(): boolean {
      return true;
    }

    getNative(): any {
      return this._native;
    }

    toString(): string {
      return 'PaletteColor("' + this.name + '", id=' + this.id + ', type=' + this.colorType + ')';
    }
  }

  return PaletteColor;
}
