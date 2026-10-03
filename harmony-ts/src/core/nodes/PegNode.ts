function createPegNodeClass(Core: HarmonyCore) {
  var NodeLayer = Core.oBaseNode as BasedNodeConstructor;

  class PegNode extends NodeLayer {
    position: any;
    scale: any;
    rotation: any;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      super(displayOrder, index, nodePath, name);

      this.position = Core.LayerManager.is3DPath(this)
        ? Core.LayerManager.return3DPath(this)
        : new Core.oPosition3D(this.nodePath, 'POSITION');
      this.scale = new Core.oScale3D(this.nodePath);
      this.rotation = new Core.oRotation3D(this.nodePath);

      Core.MessageLog.trace('oPegNode created for ' + this.nodePath);
    }
  }

  return PegNode;
}
