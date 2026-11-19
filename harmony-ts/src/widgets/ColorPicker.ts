interface ColorPickerValue {
  hex: string;
  r: number;
  g: number;
  b: number;
  opacity: number;
}

function openColorPickerDialog(
  onColorPick?: (value: ColorPickerValue) => void,
  onColorDrag?: (value: ColorPickerValue) => void,
  initial?: RgbColorInput,
  parent?: QWidget,
): void {
  const $ = getCore();
  const dialog = parent ? new $.QDialog(parent) : new $.QDialog();
  dialog.windowTitle = 'Color Picker';
  dialog.setFixedSize(244, 252);
  dialog.styleSheet =
    'QDialog { background: white; }' +
    'QLineEdit, QComboBox { background: white; color: #34383e; border: 1px solid #dedfe2;' +
    ' border-radius: 4px; padding-left: 5px; font-size: 13px; }' +
    'QComboBox QAbstractItemView { background: white; color: #34383e; }';

  const width = 220;
  const fieldHeight = 144;
  const trackHeight = 8;
  const Color = $.ColorUtils.ColorObj;
  let color = initial ? Color.fromRgb(initial.r, initial.g, initial.b) : Color.fromHex('#4F46E5');
  let hsv = color.toHsv();
  let opacity = initial && initial.a != null ? Math.round(initial.a * 100 / 255) : 100;

  const field = surface(dialog, 12, 12, width, fieldHeight);
  const shade = surface(field, 0, 0, width, fieldHeight);
  const fieldMarker = surface(field, 0, 0, 12, 12);
  const hueHitArea = surface(dialog, 12, 163, width, 23);
  const hueTrack = surface(hueHitArea, 0, 8, width, trackHeight);
  const hueMarker = surface(hueTrack, 0, 0, 8, 8);
  const alphaHitArea = surface(dialog, 12, 186, width, 24);
  const alphaTrack = surface(alphaHitArea, 0, 8, width, trackHeight);
  const alphaTint = surface(alphaTrack, 0, 0, width, trackHeight);
  const alphaMarker = surface(alphaTrack, 0, 0, 8, 8);
  const format = new QComboBox(dialog);
  const colorInput = new $.QLineEdit(dialog);
  const opacityInput = new $.QLineEdit(dialog);
  format.setGeometry(12, 216, 67, 28);
  colorInput.setGeometry(85, 216, 83, 28);
  opacityInput.setGeometry(174, 216, 58, 28);
  format.addItem('Hex');
  format.addItem('RGB');
  field.toolTip = 'Saturation and brightness';
  hueHitArea.toolTip = 'Hue';
  alphaHitArea.toolTip = 'Opacity';
  hueHitArea.styleSheet = 'background: white;';
  alphaHitArea.styleSheet = 'background: white;';
  colorInput.toolTip = 'Color value';
  opacityInput.toolTip = 'Opacity percentage';

  // Decorative layers leave mouse events on the surface underneath.
  for (const layer of [shade, fieldMarker, hueTrack, hueMarker, alphaTrack, alphaTint, alphaMarker]) {
    layer.setAttribute($.Qt.WA_TransparentForMouseEvents, true);
  }
  shade.styleSheet = 'border-radius: 4px; background: qlineargradient(' +
    'x1:0, y1:0, x2:0, y2:1, stop:0 rgba(0,0,0,0), stop:1 #000000);';
  hueTrack.styleSheet = 'border-radius: 4px; background: qlineargradient(' +
    'x1:0, y1:0, x2:1, y2:0, stop:0 #ff0000, stop:0.1667 #ffff00,' +
    ' stop:0.3333 #00ff00, stop:0.5 #00ffff, stop:0.6667 #0000ff,' +
    ' stop:0.8333 #ff00ff, stop:1 #ff0000);';
  alphaTrack.styleSheet = 'background: #f5f4f7; border-radius: 4px;';
  for (let x = 4; x < width - 4; x += 4) {
    const tile = surface(alphaTrack, x, x % 8 === 0 ? 0 : 4, 4, 4);
    tile.styleSheet = 'background: #dcd9e4;';
    tile.setAttribute($.Qt.WA_TransparentForMouseEvents, true);
  }
  alphaTint.raise();
  alphaMarker.raise();

  function surface(parent: QWidget, x: number, y: number, w: number, h: number): QLabel {
    const widget = new $.QLabel('', parent);
    widget.setGeometry(x, y, w, h);
    return widget;
  }

  function fraction(coordinate: number, size: number): number {
    return Math.max(0, Math.min(1, coordinate / (size - 1)));
  }

  function updateFields(): void {
    const rgb = color.toRgb();
    colorInput.text = format.currentIndex === 0 ? color.toHex() : [rgb.r, rgb.g, rgb.b].join(', ');
    opacityInput.text = opacity + '%';
  }

  function render(): void {
    const hex = color.toHex();
    const hue = Color.fromHsv(hsv.h, 100, 100).toHex();
    const rgb = color.toRgb();
    field.styleSheet = 'border-radius: 4px; background: qlineargradient(' +
      'x1:0, y1:0, x2:1, y2:0, stop:0 white, stop:1 ' + hue + ');';
    fieldMarker.styleSheet = 'border: 2px solid white; border-radius: 6px; background: ' + hex + ';';
    fieldMarker.move(Math.round(hsv.s / 100 * (width - 12)),
      Math.round((1 - hsv.v / 100) * (fieldHeight - 12)));
    hueMarker.styleSheet = 'border: 1px solid white; border-radius: 4px; background: ' + hue + ';';
    hueMarker.move(Math.round(hsv.h / 360 * (width - 8)), 0);
    alphaTint.styleSheet = 'border-radius: 4px; background: qlineargradient(' +
      'x1:0, y1:0, x2:1, y2:0, stop:0 rgba(' + [rgb.r, rgb.g, rgb.b, 0].join(',') +
      '), stop:1 ' + hex + ');';
    alphaMarker.styleSheet = 'border: 1px solid white; border-radius: 4px; background: ' + hex + ';';
    alphaMarker.move(Math.round(opacity / 100 * (width - 8)), 0);
    updateFields();
  }

  function notify(callback: (value: ColorPickerValue) => void): void {
    if (typeof callback !== 'function') return;
    const rgb = color.toRgb();
    callback({ hex: color.toHex(), r: rgb.r, g: rgb.g, b: rgb.b, opacity });
  }

  function bindDrag(widget: QWidget, update: (x: number, y: number) => void): void {
    let picking = false;
    let lastX: number;
    let lastY: number;

    function updatePosition(event): boolean {
      const x = event.x();
      const y = event.y();
      if (x === lastX && y === lastY) return false;
      lastX = x;
      lastY = y;
      update(x, y);
      return true;
    }

    widget.mousePressEvent = function (event) {
      if (event.button() !== $.Qt.LeftButton) return;
      picking = true;
      lastX = lastY = undefined;
      updatePosition(event);
    };
    widget.mouseMoveEvent = function (event) {
      if (picking && (event.buttons() & $.Qt.LeftButton) && updatePosition(event)) {
        notify(onColorDrag);
      }
    };
    widget.mouseReleaseEvent = function (event) {
      if (!picking || event.button() !== $.Qt.LeftButton) return;
      picking = false;
      updatePosition(event);
      notify(onColorPick);
    };
  }

  bindDrag(field, function (x, y) {
    hsv.s = 100 * fraction(x, width);
    hsv.v = 100 * (1 - fraction(y, fieldHeight));
    color = Color.fromHsv(hsv.h, hsv.s, hsv.v);
    render();
  });
  bindDrag(hueHitArea, function (x) {
    hsv.h = 360 * fraction(x, width);
    color = Color.fromHsv(hsv.h, hsv.s, hsv.v);
    render();
  });
  bindDrag(alphaHitArea, function (x) {
    opacity = Math.round(100 * fraction(x, width));
    render();
  });

  format.currentIndexChanged.connect(updateFields);
  colorInput.editingFinished.connect(function () {
    const value = colorInput.text.replace(/^\s+|\s+$/g, '');
    const rgb = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/.exec(value);
    const previousHex = color.toHex();
    if (format.currentIndex === 0 && /^#?[0-9a-f]{6}$/i.test(value)) {
      color = Color.fromHex(value);
    } else if (format.currentIndex === 1 && rgb && +rgb[1] <= 255 && +rgb[2] <= 255 && +rgb[3] <= 255) {
      color = Color.fromRgb(+rgb[1], +rgb[2], +rgb[3]);
    }
    const changed = color.toHex() !== previousHex;
    if (changed) {
      const next = color.toHsv();
      if (!next.s) next.h = hsv.h;
      hsv = next;
    }
    render();
    if (changed) notify(onColorPick);
  });
  opacityInput.editingFinished.connect(function () {
    const value = /^\s*(\d{1,3})\s*%?\s*$/.exec(opacityInput.text);
    const previousOpacity = opacity;
    if (value && +value[1] <= 100) opacity = +value[1];
    render();
    if (opacity !== previousOpacity) notify(onColorPick);
  });

  render();
  dialog.exec();
}
