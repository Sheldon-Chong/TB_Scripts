include(specialFolders.userScripts + '/core/UI/Components.js');

namespace WidgetKit {
  export interface Constructor<T> {
    new (...args: any[]): T;
  }

  export interface ComponentCall {
    name: string;
    args: any[];
  }

  export interface ComponentDefBase<T = any> {
    type: Constructor<T>;
    ctorArgs?: any[];
    props?: Partial<T>;
    calls?: ComponentCall[];
    setup?: (widget: T) => void;
    layout?: any;
    layoutProps?: {
      contentsMargins?: number[];
      spacing?: number;
    };
    stretch?: number;
    children?: Array<ComponentDefBase | QWidget>;
  }

  export interface ComponentDef<T = any> extends ComponentDefBase<T> {
    create(parent?: any): T;
  }

  export function defineComponent<T>(def: ComponentDefBase<T>): ComponentDef<T> {
    const component = def as ComponentDef<T>;
    component.create = (p?: any) => createComponent(def, p);
    return component;
  }

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

  export function constructWidget<T>(type: Constructor<T>, args: any[]): T {
    switch (args.length) {
      case 0:
        return new type();
      case 1:
        return new type(args[0]);
      case 2:
        return new type(args[0], args[1]);
      case 3:
        return new type(args[0], args[1], args[2]);
      default:
        return new type(args[0], args[1], args[2], args[3]);
    }
  }

  export function createComponent<T>(def: ComponentDefBase<T>, parent?: any): T {
    // 1. Instantiate the widget/object
    let widget: any;
    if (def.ctorArgs && def.ctorArgs.length > 0) {
      widget = constructWidget(def.type, def.ctorArgs);
    } else if (parent) {
      widget = new def.type(parent);
    } else {
      widget = new def.type();
    }

    // 2. Assign primitive properties (e.g., text, objectName, enabled)
    if (def.props) {
      for (var key in def.props) {
        widget[key] = def.props[key];
      }
    }

    // 2a. Apply dynamic Qt properties (e.g., setProperty('class', 'value'))
    if ((def as any).customProps) {
      var customProps = (def as any).customProps;
      for (var propKey in customProps) {
        widget.setProperty(propKey, customProps[propKey]);
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
        var child = def.children[i];
        if (child && typeof (child as any).type === 'function') {
          var childDef = child as ComponentDefBase;
          var childWidget = createComponent(childDef, widget);
          var stretch = childDef.stretch !== undefined ? childDef.stretch : 0;
          layout.addWidget(childWidget, stretch, 0);
        } else {
          layout.addWidget(child as any, 0, 0);
        }
      }
    }

    if (def.setup) {
      def.setup(widget);
    }

    return widget as T;
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

  export type MenuActionDef = [name: string, onTrigger: (...args: any[]) => any];
  export type MenuSection = MenuActionDef[];

  /**
   * Builds a QMenu from a list of sections. Each section is a list of
   * [label, callback] pairs; a separator is inserted between sections.
   */
  export function optionsMenu(parent?: any, sections?: MenuSection[]): any {
    const menu = parent ? new QMenu(parent) : new QMenu();
    menu.styleSheet =
      'QMenu { background-color: #2d2d2d; color: #ffffff; border: 1px solid #555555; } ' +
      'QMenu::item { padding: 4px 16px; font-size: 12pt; } ' +
      'QMenu::item:selected { background-color: #4a6b8a; }';

    const list = sections || [];
    for (let s = 0; s < list.length; s++) {
      if (s > 0) {
        menu.addSeparator();
      }
      const section = list[s];
      for (let i = 0; i < section.length; i++) {
        const pair = section[i];
        const action = menu.addAction(pair[0]);
        action.triggered.connect(pair[1]);
      }
    }
    return menu;
  }
}
