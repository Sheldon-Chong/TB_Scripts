namespace Widgets {
  export function showToast(labelText: string, duration: number, anchorWindow?: any): void {
    var toast = new QWidget();
    toast.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);

    var styleSheet =
      'QWidget { background-color: rgba(30,30,30,0.85); color: #00ccff; ' +
      'border-radius: 8px; padding: 8px 14px; ' +
      'font-family: Arial; font-size: 11pt; font-weight: bold; }';
    toast.setStyleSheet(styleSheet);

    var layout = new QHBoxLayout(toast);
    layout.addWidget(new QLabel(labelText), 0, 0);

    toast.setAttribute(Qt.WA_DeleteOnClose);

    var win = anchorWindow || QApplication.activeWindow();
    if (win && win.geometry) {
      var geom = win.geometry;
      toast.move(geom.x() + 10, geom.y() + 10);
    }

    toast.show();

    var timer = new QTimer();
    timer.singleShot = true;
    timer.timeout.connect(function () {
      toast.close();
    });
    timer.start(duration || 1500);
  }

  export function createComponent(def, parent) {
    // 1. Instantiate the widget/object
    var widget = new def.type(parent);

    // 2. Assign primitive properties (e.g., text, objectName, enabled)
    if (def.props) {
      for (var key in def.props) {
        widget[key] = def.props[key];
      }
    }

    // 2b. Apply method calls (e.g. setSizePolicy) that can't be expressed
    //     as plain property assignments.
    if (def.calls) {
      for (var c = 0; c < def.calls.length; c++) {
        var call = def.calls[c];
        try {
          widget[call.name].apply(widget, call.args);
        } catch (e) {
          MessageLog.trace('[Widgets] call failed: ' + call.name + ' - ' + e.message);
        }
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
