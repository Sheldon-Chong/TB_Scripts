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

  export interface BuildTreeOptions {
    /** Widget type used for plain-object nodes that need a container. Defaults to QWidget. */
    containerType?: Constructor<any>;
    /** Layout type used for each generated container. Defaults to QVBoxLayout. */
    layoutType?: Constructor<QLayout>;
    /** Default stretch applied to child widgets added to a layout. Defaults to 0. */
    stretch?: number;
    /** Layout settings applied to every generated container layout. */
    layoutProps?: {
      contentsMargins?: number[];
      spacing?: number;
    };
    /** Default widget properties applied to every generated container. */
    props?: { [key: string]: any };
  }

  /**
   * Builds a nested widget structure into real parent/child relationships.
   *
   * Each value in the tree can be one of:
   *  - a widget instance (e.g. `new G.Widgets.Button({ ... })`) — added to the
   *    nearest container's layout;
   *  - a WidgetKit component definition (has `.type` and `.create`) — instantiated
   *    and added the same way;
   *  - a plain object — turned into a new container widget whose own entries are
   *    recursively added as its children.
   *
   * A plain object may also carry reserved keys that configure its container
   * instead of naming a child:
   *  - `layout`: a layout constructor (e.g. `QHBoxLayout`) for that container;
   *  - `layoutProps`: `{ contentsMargins?: number[], spacing?: number }`;
   *  - `container`: a widget constructor for that container (default `QWidget`);
   *  - `props`: `{ [key: string]: any }` — widget properties (e.g. `styleSheet`)
   *    assigned to that container after it is created;
   *  - `spacer`: a number — inserts a stretchable spacer into that container's
   *    layout at that position (e.g. between two buttons).
   *
   * Leaf widget instances are shared: the exact objects you put in the tree are
   * the ones laid out, so `tree.body.ok` still points at the real widget after
   * the build for wiring signals / intellisense.
   *
   * Returns the root widget. If `parent` is provided it is used as the root
   * container (getting a fresh layout) instead of creating one.
   *
   * @example
   *   const tree = {
   *     header: new G.Widgets.Label({ text: 'Title' }),
   *     body: {
   *       name: new G.Widgets.LineEdit({ placeholderText: 'Name' }),
   *       ok: new G.Widgets.Button({ text: 'OK' }),
   *     },
   *   };
   *   const ui = WidgetKit.buildTree(tree);
   *   tree.body.ok.clicked.connect(() => MessageLog.trace('clicked'));
   *   ui.show();
   */
  export function buildTree(tree: any, parent?: QWidget, options?: BuildTreeOptions): any {
    var opts = options || {};
    var defaults = {
      containerType: opts.containerType || QWidget,
      layoutType: opts.layoutType || QVBoxLayout,
      layoutProps: opts.layoutProps,
      props: opts.props,
      stretch: opts.stretch !== undefined ? opts.stretch : 0,
    };

    function isComponentDef(v: any): boolean {
      return !!v && typeof v.create === 'function' && typeof v.type === 'function';
    }

    function isWidget(v: any): boolean {
      return !!v && typeof v.children === 'function';
    }

    function applyLayoutProps(layout: any, layoutProps: any): void {
      if (!layout || !layoutProps) return;
      if (layoutProps.contentsMargins) {
        var m = layoutProps.contentsMargins;
        layout.setContentsMargins(m[0], m[1], m[2], m[3]);
      }
      if (layoutProps.spacing !== undefined) {
        layout.spacing = layoutProps.spacing;
      }
    }

    // Assigns plain widget properties (e.g. styleSheet) onto a container.
    function applyProps(widget: any, props: any): void {
      if (!widget || !props) return;
      for (var key in props) {
        if (Object.prototype.hasOwnProperty.call(props, key)) {
          widget[key] = props[key];
        }
      }
    }

    // Reads per-node overrides, falling back to inherited values.
    function resolveConfig(node: any, inherited: any): any {
      var cfg: any = {
        containerType: inherited.containerType,
        layoutType: inherited.layoutType,
        layoutProps: inherited.layoutProps,
        props: inherited.props,
        stretch: inherited.stretch,
      };
      if (node && typeof node === 'object') {
        if (typeof node.container === 'function') cfg.containerType = node.container;
        if (typeof node.layout === 'function') cfg.layoutType = node.layout;
        if (node.layoutProps && typeof node.layoutProps === 'object') {
          cfg.layoutProps = node.layoutProps;
        }
        if (node.props && typeof node.props === 'object') {
          cfg.props = node.props;
        }
      }
      return cfg;
    }

    // Handles a single key in a plain-object node: reserved keys configure the
    // container; everything else is built as a child.
    function processEntry(
      container: QWidget,
      layout: any,
      key: string,
      value: any,
      cfg: any,
    ): void {
      if (key === 'container' || key === 'layout') {
        if (typeof value === 'function') return;
      } else if (key === 'layoutProps') {
        if (value && typeof value === 'object' && !isWidget(value) && !isComponentDef(value)) {
          return;
        }
      } else if (key === 'props') {
        if (value && typeof value === 'object' && !isWidget(value) && !isComponentDef(value)) {
          return;
        }
      } else if (key === 'spacer') {
        if (typeof value === 'number') {
          if (layout && typeof layout.addStretch === 'function') {
            layout.addStretch(value);
          }
          return;
        }
      }
      buildInto(container, layout, value, cfg);
    }

    // Adds a single tree node into an existing container widget + layout.
    function buildInto(container: QWidget, layout: any, node: any, inherited: any): any {
      if (isComponentDef(node)) {
        var def = node as ComponentDefBase;
        var widget = createComponent(def, container);
        if (layout) {
          var stretch = def.stretch !== undefined ? def.stretch : inherited.stretch;
          layout.addWidget(widget, stretch, 0);
        }
        return widget;
      }

      if (isWidget(node)) {
        if (layout) {
          layout.addWidget(node, inherited.stretch, 0);
        }
        return node;
      }

      if (node && typeof node === 'object') {
        var cfg = resolveConfig(node, inherited);
        var childContainer: any = constructWidget(cfg.containerType, [container]);
        applyProps(childContainer, cfg.props);
        var childLayout: any = cfg.layoutType ? new cfg.layoutType(childContainer) : null;
        applyLayoutProps(childLayout, cfg.layoutProps);

        for (var key in node) {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            processEntry(childContainer, childLayout, key, node[key], cfg);
          }
        }

        if (layout) {
          layout.addWidget(childContainer, inherited.stretch, 0);
        }
        return childContainer;
      }

      return null;
    }

    // Root is a single widget or component definition.
    if (isComponentDef(tree) || isWidget(tree)) {
      if (parent) {
        var rootLayout: any = defaults.layoutType ? new defaults.layoutType(parent) : null;
        applyLayoutProps(rootLayout, defaults.layoutProps);
        return buildInto(parent, rootLayout, tree, defaults);
      }
      if (isComponentDef(tree)) {
        return createComponent(tree as ComponentDefBase);
      }
      return tree;
    }

    // Root is a plain object (the common case).
    if (tree && typeof tree === 'object') {
      var rootCfg = resolveConfig(tree, defaults);
      var root: any = parent || constructWidget(rootCfg.containerType, []);
      applyProps(root, rootCfg.props);
      var rootLayout: any = rootCfg.layoutType ? new rootCfg.layoutType(root) : null;
      applyLayoutProps(rootLayout, rootCfg.layoutProps);

      for (var key in tree) {
        if (Object.prototype.hasOwnProperty.call(tree, key)) {
          processEntry(root, rootLayout, key, tree[key], rootCfg);
        }
      }
      return root;
    }

    return parent || null;
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

  export function uiBtn(options: StyledButtonOptions) {
    var label = options.label;
    var onClick = options.onClick;
    var width = options.width !== undefined ? options.width : 100;
    var height = options.height !== undefined ? options.height : 30;
    var color = options.color !== undefined ? options.color : '#4CAF50';

    var button = new QPushButton(label);
    button.setFixedSize(width, height);
    button.setStyleSheet(
      'QPushButton {' +
        'background-color: ' +
        color +
        ';' +
        'color: white;' +
        'border: none;' +
        'border-radius: 4px;' +
        'padding: 6px 12px;' +
        'font-size: 14px;' +
        '}' +
        'QPushButton:hover {' +
        'background-color: ' +
        getHoverColor(color) +
        '}',
    );
    button['clicked()'].connect(onClick);
    return button;
  }
}
