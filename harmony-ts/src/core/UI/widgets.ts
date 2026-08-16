namespace Widgets {
  export function createComponent(def, parent) {
    // 1. Instantiate the widget/object
    var widget = new def.type(parent);

    // 2. Assign primitive properties (e.g., text, objectName, enabled)
    if (def.props) {
      for (var key in def.props) {
        widget[key] = def.props[key];
      }
    }

    // 3. Handle child hierarchies via Qt layouts
    if (def.children && def.children.length > 0) {
      var layout = def.layout ? new def.layout(widget) : new QVBoxLayout(widget);

      // 3a. Apply layout-level settings (margins / spacing) directly on the
      //     layout we just created — reading `widget.layout` back later does
      //     not expose these methods in Harmony.
      if (def.layoutProps) {
        if (def.layoutProps.contentsMargins) {
          var m = def.layoutProps.contentsMargins;
          layout.setContentsMargins(m[0], m[1], m[2], m[3]);
        }
        if (def.layoutProps.spacing !== undefined) {
          layout.spacing = def.layoutProps.spacing;
        }
      }

      for (var i = 0; i < def.children.length; i++) {
        var childDef = def.children[i];
        var childWidget = createComponent(childDef, widget);
        var stretch = childDef.stretch !== undefined ? childDef.stretch : 0;
        layout.addWidget(childWidget, stretch, 0);
      }
    }

    return widget;
  }

  export function findWidgetByName(parent: any, name: string): any {
    if (!parent || !parent.children) return null;
    const children = parent.children();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.objectName === name) return child;
      const found = findWidgetByName(child, name);
      if (found) return found;
    }
    return null;
  }
}
