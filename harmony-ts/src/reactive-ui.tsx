include('global-test.js');

type PropertyKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type QtProps<T> = {
  [K in PropertyKeys<T>]?: T[K] | UISignal<T[K]>;
};
/** Maps each Qt signal (`clicked: QSignal`) onto an `onClicked` handler prop. */
type QtSignalProps<T> = {
  [K in keyof T as T[K] extends QSignal ? `on${Capitalize<string & K>}` : never]?: (
    ...args: any[]
  ) => any;
};

interface UISignal<T> {
  get(): T;
  set(value: T): void;
  subscribe(callback: (value: T) => void): void;
}

interface UIRuntime {
  h(
    type: any,
    props: any,
    ...children: any[]
  ): JSX.Element;

  createSignal<T>(initialValue: T): UISignal<T>;
}

interface CommonProps {
  parent?: QWidget;
  stretch?: number;
  /** Caption used when this element is placed inside `<tabWidget>`. */
  tabTitle?: string;
  children?: JSX.Element | JSX.Element[];
}

type WidgetProps<T> = QtProps<T> & QtSignalProps<T> & CommonProps;

interface MenuAction {
  text: string;
  onClick?: () => void;
}

interface LayoutProps {
  parent?: QWidget;
  spacing?: number;
  children?: JSX.Element | JSX.Element[];
}

declare namespace JSX {
  interface Element {
    kind: 'widget' | 'layout';
    value: any;
    /** Raw props, kept so containers can inspect them (e.g. tab captions). */
    props?: any;
  }

  interface ElementChildrenAttribute {
    children: {};
  }

  interface IntrinsicElements {
    column: LayoutProps;
    row: LayoutProps;

    widget: {
      value: QWidget;
    };

    // ---- every QWidget declared in types/toonboom/qt/qt-widgets.d.ts ----
    qwidget: WidgetProps<QWidget>;
    dialog: WidgetProps<QDialog>;
    label: WidgetProps<QLabel>;
    lineEdit: WidgetProps<QLineEdit>;
    textEdit: WidgetProps<QTextEdit>;
    tableWidget: WidgetProps<QTableWidget>;
    slider: WidgetProps<QSlider>;
    spinBox: WidgetProps<QSpinBox>;
    groupBox: WidgetProps<QGroupBox>;
    pushButton: WidgetProps<QPushButton>;
    toolButton: WidgetProps<QToolButton>;
    menu: WidgetProps<QMenu> & {
      actions?: Array<string | MenuAction>;
    };
    listWidget: WidgetProps<QListWidget>;
    scrollArea: WidgetProps<QScrollArea>;
    checkBox: WidgetProps<QCheckBox>;
    tabWidget: WidgetProps<QTabWidget>;
    progressBar: WidgetProps<QProgressBar>;

    button: QtProps<QPushButton> & {
      color?: string;
      onClick?: () => void;
    };
  }
}

/**
 * The JSX factory (`UI.h`) plus the reactive primitives that power it.
 *
 * `UI` is the global configured via `jsxFactory` in tsconfig.json, so every
 * `.tsx` file's JSX compiles to `UI.h(...)`. `createSignal` is exposed both as
 * a standalone global and as `UI.createSignal`.
 */
function createUIRuntime(core?: HarmonyCore): UIRuntime {
  function uiError(message: string): Error {
    var ErrorConstructor = core ? core.Error : Error;
    return new ErrorConstructor(message);
  }

  /** JSX tag -> Qt class name (types/toonboom/qt/qt-widgets.d.ts). */
  var WIDGET_TAGS: { [tag: string]: string } = {
    qwidget: 'QWidget',
    dialog: 'QDialog',
    label: 'QLabel',
    lineEdit: 'QLineEdit',
    textEdit: 'QTextEdit',
    tableWidget: 'QTableWidget',
    slider: 'QSlider',
    spinBox: 'QSpinBox',
    groupBox: 'QGroupBox',
    pushButton: 'QPushButton',
    toolButton: 'QToolButton',
    menu: 'QMenu',
    listWidget: 'QListWidget',
    scrollArea: 'QScrollArea',
    checkBox: 'QCheckBox',
    tabWidget: 'QTabWidget',
    progressBar: 'QProgressBar',
  };

  /** Props consumed by the factory itself, never assigned to the widget. */
  var RESERVED_PROPS: { [key: string]: boolean } = {
    stretch: true,
    parent: true,
    children: true,
    color: true,
    actions: true,
    tabTitle: true,
  };

  var qtClassCache: { [className: string]: any } = {};

  function resolveQtClass($: any, className: string): any {
    if (qtClassCache.hasOwnProperty(className)) return qtClassCache[className];

    var ctor = $[className];
    if (typeof ctor === 'function') {
      qtClassCache[className] = ctor;
      return ctor;
    }

    // Qt classes outside Core are available through Harmony's script globals.
    var globalScope = Function('return this;')();
    var scopes = [globalScope, globalScope.__proto__];
    ctor = null;

    for (var i = 0; i < scopes.length && !ctor; i++) {
      var scope = scopes[i];

      if (scope && typeof scope[className] === 'function') {
        ctor = scope[className];
      }
    }

    qtClassCache[className] = ctor;

    return ctor;
  }

  function connectSignal(widget: any, signalName: string, handler: Function): void {
    var signal = widget[signalName] || widget[signalName + '()'];

    if (!signal || typeof signal.connect !== 'function') {
      throw uiError('[UI] No signal "' + signalName + '" available on this widget');
    }

    signal.connect(handler);
  }

  function addMenuActions(widget: any, actions: Array<string | MenuAction>): void {
    for (var i = 0; i < actions.length; i++) {
      var action = actions[i];

      if (typeof action === 'string') {
        widget.addAction(action);
        continue;
      }

      var added = widget.addAction(action.text);

      if (action.onClick && added && added.triggered) {
        added.triggered.connect(action.onClick);
      }
    }
  }

  function applyWidgetProps(widget: any, props: any): void {
    for (var key in props) {
      if (!props.hasOwnProperty(key) || RESERVED_PROPS[key]) continue;

      var value = props[key];

      if (value === undefined) continue;

      if (value && typeof value.subscribe === 'function') {
        (function (property: string, signal: any) {
          signal.subscribe(function (newValue: any) {
            widget[property] = newValue;
          });
        })(key, value);

        continue;
      }

      // onClick -> clicked, onValueChanged -> valueChanged, onEditingFinished -> ...
      var isHandler =
        typeof value === 'function' &&
        key.length > 2 &&
        key.charAt(0) === 'o' &&
        key.charAt(1) === 'n';

      if (isHandler) {
        connectSignal(widget, key.charAt(2).toLowerCase() + key.substring(3), value);
        continue;
      }

      widget[key] = value;
    }

    if (props.actions && typeof widget.addAction === 'function') {
      addMenuActions(widget, props.actions);
    }
  }

  function isElement(node: any): boolean {
    return !!node && (node.kind === 'widget' || node.kind === 'layout');
  }

  function toElements(nodes: any[]): any[] {
    var elements: any[] = [];

    for (var i = 0; i < nodes.length; i++) {
      if (isElement(nodes[i])) elements.push(nodes[i]);
    }

    return elements;
  }

  function addToLayout(layout: any, elements: any[], alignment: number): void {
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].kind === 'layout') {
        layout.addLayout(elements[i].value, 0);
      } else {
        var stretch = elements[i].props && elements[i].props.stretch || 0;
        layout.addWidget(elements[i].value, stretch, stretch ? 0 : alignment);
      }
    }
  }

  function wrapInColumn($: any, elements: any[]): QWidget {
    var wrapper = new $.QWidget();
    var layout = new $.QVBoxLayout(wrapper);

    addToLayout(layout, elements, 0);

    return wrapper;
  }

  function tabTitle(element: any, index: number): string {
    var props = element.props || {};

    return props.tabTitle || props.title || props.text || props.windowTitle || 'Tab ' + (index + 1);
  }

  function attachChildren($: any, widget: any, tag: string, nodes: any[]): void {
    var elements = toElements(nodes);

    if (elements.length === 0) return;

    // QScrollArea hosts exactly one widget.
    if (tag === 'scrollArea' && typeof widget.setWidget === 'function') {
      var single = elements.length === 1 && elements[0].kind === 'widget';

      widget.setWidget(single ? elements[0].value : wrapInColumn($, elements));

      return;
    }

    // QTabWidget turns each child into one tab.
    if (tag === 'tabWidget' && typeof widget.addTab === 'function') {
      for (var i = 0; i < elements.length; i++) {
        var content =
          elements[i].kind === 'widget' ? elements[i].value : wrapInColumn($, [elements[i]]);

        widget.addTab(content, tabTitle(elements[i], i));
      }

      return;
    }

    // Everything else stacks its children inside a vertical layout.
    var layout = widget.layout;

    if (!layout) {
      layout = new $.QVBoxLayout(widget);
      widget.layout = layout;
    }

    addToLayout(layout, elements, 0);
  }

  /** Creates a reactive value: read via `.get()`, write via `.set()`, observe via `.subscribe()`. */
  function createSignal<T>(initialValue: T): UISignal<T> {
    var value = initialValue;
    var subscribers: Array<(value: T) => void> = [];

    return {
      get: function (): T {
        return value;
      },

      set: function (newValue: T): void {
        if (value === newValue) return;

        value = newValue;

        for (var i = 0; i < subscribers.length; i++) {
          subscribers[i](value);
        }
      },

      subscribe: function (callback: (value: T) => void): void {
        subscribers.push(callback);
        callback(value);
      },
    };
  }

  return {
    h: function (type: any, props: any, ...children: any[]): any {
      var $ = core || getCore();

      props = props || {};

      // Custom function components
      if (typeof type === 'function') {
        props.children = children;
        return type(props);
      }

      // Layout components
      if (type === 'column' || type === 'row') {
        var layout: QVBoxLayout | QHBoxLayout;

        if (type === 'column') {
          layout = props.parent ? new $.QVBoxLayout(props.parent) : new $.QVBoxLayout();
        } else {
          layout = props.parent ? new $.QHBoxLayout(props.parent) : new $.QHBoxLayout();
        }

        layout.spacing = props.spacing === undefined ? 8 : props.spacing;

        addToLayout(layout, toElements(children), $.Qt.AlignmentFlag.AlignLeft);

        return { kind: 'layout', value: layout, props: props };
      }

      // Styled push button (kept so existing scenes keep their look)
      if (type === 'button') {
        return {
          kind: 'widget',
          value: $.Utils.styledButton({
            color: props.color || '#555555',
            label: props.text,
            onClick: props.onClick,
          }),
          props: props,
        };
      }

      // Existing Qt widget passed by reference
      if (type === 'widget') {
        return { kind: 'widget', value: props.value, props: props };
      }

      // Any QWidget declared in qt-widgets.d.ts
      var className = WIDGET_TAGS[type];

      if (className) {
        var QtClass = resolveQtClass($, className);

        if (!QtClass) {
          throw uiError('Qt class "' + className + '" is not available for <' + type + '>');
        }

        var widget = props.parent ? new QtClass(props.parent) : new QtClass();

        applyWidgetProps(widget, props);
        attachChildren($, widget, type, children);

        return { kind: 'widget', value: widget, props: props };
      }

      throw uiError('Unknown UI element: ' + type);
    },

    createSignal: createSignal,
  };
}

var UI = createUIRuntime();
var createSignal = UI.createSignal;

// Expose the framework on the shared Harmony global scope so `UI` and
// `createSignal` are reachable from any script, even without an explicit
// `include('reactive-ui.js')`.
(function () {
  var g = Function('return this;')();
  var shared = g.__proto__ || g;

  shared.UI = UI;
  shared.createSignal = createSignal;
})();
