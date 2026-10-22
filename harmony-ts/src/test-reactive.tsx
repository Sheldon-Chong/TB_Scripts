include('global-test.js');

type PropertyKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type QtProps<T> = Partial<Pick<T, PropertyKeys<T>>>;

interface LayoutProps {
  parent?: QWidget;
  spacing?: number;
  children?: JSX.Element | JSX.Element[];
}

declare namespace JSX {
  interface Element {
    kind: 'widget' | 'layout';
    value: any;
  }

  interface ElementChildrenAttribute {
    children: {};
  }

  interface IntrinsicElements {
    column: LayoutProps;
    row: LayoutProps;

    label: QtProps<QLabel>;

    button: QtProps<QPushButton> & {
      color?: string;
      onClick?: () => void;
    };

    widget: {
      value: QWidget;
    };
  }
}

function applyProps<T extends QWidget>(widget: T, props: QtProps<T>): void {
  for (var key in props) {
    if (!props.hasOwnProperty(key)) continue;

    (widget as any)[key] = (props as any)[key];
  }
}

function showNestedDialog(): void {
  const $ = getCore();
  $.log('start');

  // Reactive state
  function createSignal<T>(initialValue: T) {
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

  // JSX factory
  var UI = {
    h: function (type: any, props: any, ...children: any[]): any {
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

        for (var i = 0; i < children.length; i++) {
          var child = children[i];

          if (!child) continue;

          if (child.kind === 'layout') {
            layout.addLayout(child.value, 0);
          } else if (child.kind === 'widget') {
            layout.addWidget(child.value, 0, $.Qt.AlignmentFlag.AlignLeft);
          }
        }

        return {
          kind: 'layout',
          value: layout,
        };
      }

      // Label
      if (type === 'label') {
        return {
          kind: 'widget',
          value: new $.QLabel(props.text),
        };
      }

      // Button
      if (type === 'button') {
        return {
          kind: 'widget',
          value: $.Utils.styledButton({
            color: props.color || '#555555',
            label: props.text,
            onClick: props.onClick,
          }),
        };
      }

      // Existing Qt widget
      if (type === 'widget') {
        return {
          kind: 'widget',
          value: props.value,
        };
      }

      throw new Error('Unknown UI element: ' + type);
    },
  };

  // State
  var count = createSignal(0);

  var countLabel = new $.QLabel('');

  count.subscribe(function (n) {
    countLabel.text = 'Count: ' + n;
  });

  // Reusable component
  function CounterControls(): any {
    return (
      <row spacing={8}>
        <widget value={countLabel} />

        <button
          text="Increment"
          color="#4CAF50"
          onClick={function () {
            count.set(count.get() + 1);
          }}
        />
      </row>
    );
  }

  // Nested UI
  var dialog = new $.QDialog();

  dialog.windowTitle = 'Nested Components';
  dialog.minimumWidth = 340;

  var tree = (
    <column parent={dialog} spacing={12}>
      <label text="Reactive JSX UI" />

      <CounterControls />

      <row>
        <button
          text="Reset"
          onClick={function () {
            count.set(0);
          }}
        />
      </row>
    </column>
  );

  dialog.exec();
}

function testLayout(): void {
  var $ = getCore();

  var dialog = new $.QDialog();
  dialog.windowTitle = 'Layout Test';
  dialog.minimumWidth = 340;

  var layout = new $.QVBoxLayout(dialog);

  var label = new $.QLabel('Can you see me?');

  layout.addWidget(label, 0, $.Qt.AlignmentFlag.AlignLeft);

  dialog.exec();
}
