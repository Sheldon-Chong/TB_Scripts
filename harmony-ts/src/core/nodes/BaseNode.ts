type BaseNodeInstance = {
  displayOrder: number;
  index: number;
  nodePath: string;
  name: string;
};

type BasedNodeConstructor = new (
  displayOrder: number,
  index: number,
  nodePath: string,
  name: string,
) => BaseNodeInstance;

function createBaseNodeClass(Core: HarmonyCore) {
  class BaseNode {
    displayOrder: number;
    index: number;
    nodePath: string;
    name: string;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      this.displayOrder = displayOrder;
      this.index = index;
      this.nodePath = nodePath;
      this.name = name;
    }

    toString(): string {
      return 'BaseNode<' + this.nodePath + '>';
    }

    setEnabled(enabled: boolean): void {
      Core.node.setEnable(this.nodePath, enabled);
    }

    isEnabled(): boolean {
      return Core.node.getEnable(this.nodePath);
    }

    getAttributeNames(): string[] {
      return Core.node.getAllAttrNames(this.nodePath);
    }

    getAllAttributes(): Attribute[] {
      var attributeNames = this.getAttributeKeywords();
      var attributes: Attribute[] = [];

      for (var i = 0; i < attributeNames.length; i++) {
        attributes.push(Core.node.getAttr(this.nodePath, Core.frame.current(), attributeNames[i]));
      }

      return attributes;
    }

    getAttributeKeywords(): string[] {
      return Core.node.getAllAttrKeywords(this.nodePath);
    }

    getColumn(attrName: 'offset.attr3dpath', linkType?: string, createColumn?: boolean): CoreInstance<'oColumn'>;
    getColumn(attrName: 'position.attr3dpath', linkType?: string, createColumn?: boolean): CoreInstance<'oColumn'>;
    getColumn(attrName: 'DRAWING.ELEMENT', linkType?: string, createColumn?: boolean): CoreInstance<'oDrawingElementColumn'>;
    getColumn(attrName: string, linkType?: string, createColumn?: boolean): any;

    getColumn(attrName: string, linkType?: string, createColumn: boolean = true): any {
      if (attrName.indexOf('|') !== -1) {
        var lastSlashIndex = attrName.lastIndexOf('|');
        var path = attrName.substring(0, lastSlashIndex);
        var targetNode = Core.LayerManager.getNodeLayer(this.nodePath + path);

        if (targetNode === null) {
          throw new Error('Node not found for path: ' + this.nodePath + path);
        }

        return targetNode.getColumn(attrName.substring(lastSlashIndex + 1), linkType);
      }

      var col = Core.node.linkedColumn(this.nodePath, attrName);

      if (!col) {
        if (!createColumn) {
          throw new Error(
            "Column not found for attribute '" + attrName + "' on node '" + this.nodePath + "'.",
          );
        }

        var colName = Core.column.generateAnonymousName();
        Core.column.add(colName, linkType !== undefined ? linkType : 'BEZIER');
        var result = Core.node.linkAttr(this.nodePath, attrName, colName);

        if (!result) {
          Core.MessageLog.trace(
            "Failed to link new column '" + colName + "' to attribute '" + attrName + "'.",
          );
        }

        if (attrName === 'DRAWING.ELEMENT') {
          return new Core.oDrawingElementColumn(colName, this);
        }

        return new Core.oColumn(colName, this);
      }

      if (attrName === 'offset.attr3dpath' || attrName === 'position.attr3dpath') {
        return new Core.oPathColumn3D(col, this);
      }

      if (attrName === 'DRAWING.ELEMENT') {
        return new Core.oDrawingElementColumn(col, this);
      }

      return new Core.oColumn(col, this);
    }

    getType(): string {
      return Core.node.type(this.nodePath);
    }

    getLocked(): boolean {
      return Core.node.getLocked(this.nodePath);
    }

    setLocked(locked: boolean): void {
      Core.node.setLocked(this.nodePath, locked);
    }

    getChildren(): any[] {
      var childPaths = Core.node.subNodes(this.nodePath);

      if (!childPaths) {
        return [];
      }

      return childPaths
        .map(function (childPath: string) {
          return Core.LayerManager.getNodeLayer(childPath);
        })
        .filter(function (layer: any) {
          return layer !== null;
        });
    }

    getChild(name: string): any {
      if (name.indexOf('/') !== -1) {
        return Core.LayerManager.getNodeLayer(this.nodePath + '/' + name);
      }

      var childPath = Core.node.subNodeByName(this.nodePath, name);
      return childPath ? Core.LayerManager.getNodeLayer(childPath) : null;
    }

    getChildrenRecursive(): any[] {
      var result: any[] = [];
      var children = this.getChildren();

      for (var i = 0; i < children.length; i++) {
        result.push(children[i]);
        var descendants = children[i].getChildrenRecursive();

        for (var j = 0; j < descendants.length; j++) {
          result.push(descendants[j]);
        }
      }

      return result;
    }

    getParent(): any {
      var parentPath = Core.node.parentNode(this.nodePath);

      if (parentPath === Core.node.root()) {
        return null;
      }

      return Core.LayerManager.getNodeLayer(parentPath);
    }

    isGroup(): boolean {
      return Core.node.isGroup(this.nodePath);
    }
  }

  return BaseNode;
}
