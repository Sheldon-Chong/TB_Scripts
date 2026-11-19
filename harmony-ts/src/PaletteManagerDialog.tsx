include('global-test.js');
include('reactive-ui.js');
include('widgets/ColorPicker.js');

interface PaletteGradientStop extends RgbColorInput {
  t: number;
}

var paletteManagerDialog: QDialog | undefined;

function showPaletteManager(): void {
  if (paletteManagerDialog) {
    paletteManagerDialog.raise();
    paletteManagerDialog.activateWindow();
    return;
  }

  const $ = getCore();
  const mainWindow = QApplication.activeWindow();
  const projectPath = $.scene.currentProjectPath();
  const versionName = $.scene.currentVersionName();
  // Use the current wrapper definitions even when the shared Core was initialized earlier.
  const paletteManager = createPaletteKit($).Palettes;
  const palettes = paletteManager.getAll(true);
  const swatchHighlights: Record<string, Record<string, () => void>> = Object.create(null);
  let activePaletteId: string | undefined;
  let activeColorId: string | undefined;
  const swatchSize = 24;
  const swatchGap = 6;
  let clearSelection: (() => void) | undefined;
  const styleSheet =
    'QDialog#scenePaletteManager { background: #414141; }' +
    'QLineEdit#paletteSearch { background: #4e4e4e; color: white; border: 1px solid #676767;' +
    ' border-radius: 12px; padding: 9px 14px; font-size: 15px; }' +
    'QLineEdit#paletteSearch:focus { border-color: #a5a5a5; }' +
    'QScrollArea#paletteScroll { border: none; background: #414141; }' +
    'QWidget#paletteList { background: #414141; }' +
    'QLabel#paletteTitle { color: white; font-size: 19px; font-weight: bold; }' +
    'QLabel#paletteCount, QLabel#paletteEmpty { color: #c6c6c6; font-size: 14px; }' +
    'QToolTip { background-color: #292929; color: #f5f5f5; border: 1px solid #696969;' +
    ' padding: 5px; opacity: 255; }' +
    'QPushButton#paletteAction { border: 1px solid #777; border-radius: 5px;' +
    ' background: #555; color: #a8a8a8; }' +
    'QScrollBar:vertical { background: #4e4e4e; width: 11px; border-radius: 5px; }' +
    'QScrollBar::handle:vertical { background: #bbb; min-height: 28px; border-radius: 5px; }' +
    'QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }' +
    'QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }';

  const dialog: QDialog = (
    <dialog
      parent={mainWindow}
      objectName="scenePaletteManager"
      windowTitle="Palette Manager"
      minimumWidth={370}
      minimumHeight={280}
      styleSheet={styleSheet}
    />
  ).value;
  const search = (
    <lineEdit
      objectName="paletteSearch"
      placeholderText="Search palettes..."
      accessibleName="Search palettes"
      clearButtonEnabled={true}
      onTextChanged={filterPalettes}
    />
  );
  const list = <qwidget objectName="paletteList" />;
  const empty = (
    <label
      objectName="paletteEmpty"
      text={palettes.length ? 'No palettes match your search.' : 'No palettes in this scene.'}
      alignment={$.Qt.AlignmentFlag.AlignCenter}
      minimumHeight={64}
    />
  );
  const cards = palettes.map(createCard);
  const listColumn = (
    <column parent={list.value} spacing={14} alignment={0}>
      {[empty].concat(cards.map((card) => card.element))}
    </column>
  );
  listColumn.value.setContentsMargins(0, 0, 9, 0);
  listColumn.value.addStretch(1);
  list.value.setAttribute($.Qt.WA_StyledBackground, true);

  const scroll = (
    <scrollArea
      objectName="paletteScroll"
      widgetResizable={true}
      horizontalScrollBarPolicy={$.Qt.ScrollBarAlwaysOff}
      verticalScrollBarPolicy={$.Qt.ScrollBarAlwaysOn}
      stretch={1}
    >
      {list}
    </scrollArea>
  );
  const dialogColumn = (
    <column parent={dialog} spacing={14} alignment={0}>
      {search}
      {scroll}
    </column>
  );
  dialogColumn.value.setContentsMargins(18, 18, 18, 18);

  function syncActiveSwatch(force = false): void {
    if ($.scene.currentProjectPath() !== projectPath || $.scene.currentVersionName() !== versionName) {
      dialog.close();
      return;
    }

    const paletteId = $.PaletteManager.getCurrentPaletteId();
    const colorId = $.PaletteManager.getCurrentColorId();
    if (!force && paletteId === activePaletteId && colorId === activeColorId) return;
    activePaletteId = paletteId;
    activeColorId = colorId;

    const paletteHighlights = swatchHighlights[paletteId];
    const highlight = paletteHighlights && paletteHighlights[colorId];
    if (highlight) {
      highlight();
    } else if (clearSelection) {
      clearSelection();
      clearSelection = undefined;
    }
  }

  function filterPalettes(): void {
    const query = search.value.text.trim().toLowerCase();
    let matches = 0;
    for (const card of cards) {
      const visible = card.name.indexOf(query) !== -1;
      card.element.value.visible = visible;
      if (visible) matches++;
    }
    empty.value.visible = matches === 0;
    if (typeof scroll.value.verticalScrollBar === 'function') {
      scroll.value.verticalScrollBar().value = 0;
    }
  }

  function ActionPlaceholder(): JSX.Element {
    return (
      <pushButton
        objectName="paletteAction"
        text="·"
        toolTip="Palette action placeholder"
        minimumWidth={24}
        maximumWidth={24}
        minimumHeight={24}
        maximumHeight={24}
        enabled={false}
      />
    );
  }

  function createCard(palette: PaletteInstance): { name: string; element: JSX.Element } {
    const name = palette.name;
    const paletteId = palette.id;
    const isPencilTexturePalette = palette.isTexturePalette;
    const highlights: Record<string, () => void> = Object.create(null);
    if (!isPencilTexturePalette) swatchHighlights[paletteId] = highlights;
    const colors: PaletteColorInstance[] = palette.getColors();
    const card = <qwidget objectName="paletteCard" />;
    card.value.setAttribute($.Qt.WA_StyledBackground, true);
    paintCard(false);

    const swatchGrid = <qwidget />;
    const grid: QWidget = swatchGrid.value;
    const cardColumn = (
      <column parent={card.value} spacing={9} alignment={0}>
        <row spacing={6}>
          <label
            objectName="paletteTitle"
            textFormat={$.Qt.PlainText}
            text={name}
            wordWrap={true}
            stretch={1}
          />
          <label
            objectName="paletteCount"
            text={colors.length + (colors.length === 1 ? ' color' : ' colors')}
          />
          <ActionPlaceholder />
          <ActionPlaceholder />
          <ActionPlaceholder />
          <ActionPlaceholder />
        </row>
        {swatchGrid}
      </column>
    );
    cardColumn.value.setContentsMargins(15, 12, 15, 15);
    const swatches = colors.map(createSwatch);
    let columns = 0;
    layoutSwatches(12);
    grid.resizeEvent = function () {
      layoutSwatches(Math.max(1, Math.floor((grid.width + swatchGap) / (swatchSize + swatchGap))));
    };
    return { name: name.toLowerCase(), element: card };

    function paintCard(selected: boolean): void {
      const border = selected ? '#eee' : '#676767';
      card.value.styleSheet =
        'QWidget#paletteCard { background: #4e4e4e; border: 1px solid ' +
        border +
        '; border-radius: 13px; }';
    }

    function layoutSwatches(nextColumns: number): void {
      if (columns === nextColumns) return;
      columns = nextColumns;
      const step = swatchSize + swatchGap;
      const rows = Math.ceil(swatches.length / columns);
      grid.setFixedHeight(Math.max(0, rows * step - swatchGap));
      for (let i = 0; i < swatches.length; i++) {
        swatches[i].move((i % columns) * step, Math.floor(i / columns) * step);
      }
    }

    function createSwatch(color: PaletteColorInstance): QLabel {
      const swatch: QLabel = (
        <label
          parent={grid}
          objectName="paletteSwatch"
          text={color.isTexture ? 'Tex' : ''}
          alignment={$.Qt.AlignmentFlag.AlignCenter}
          toolTip={swatchTooltip(color)}
        />
      ).value;
      swatch.setFixedSize(swatchSize, swatchSize);
      const colorId = color.id;
      // The native color wrapper can expire after the modeless dialog opens.
      let fill = swatchFill(color);
      let selected = false;
      if (!isPencilTexturePalette) highlights[colorId] = highlightSwatch;
      paintSwatch();
      swatch.mousePressEvent = function (event) {
        if (event.button() !== $.Qt.LeftButton) return;
        if (isPencilTexturePalette) {
          highlightSwatch();
          return;
        }
        paletteManager.selectPaletteAndColor(paletteId, colorId);
        syncActiveSwatch(true);
      };
      swatch.mouseDoubleClickEvent = function (event) {
        if (event.button() !== $.Qt.LeftButton) return;
        const editPalette = paletteManager.getAll(true).filter((entry) => entry.id === paletteId)[0];
        if (!editPalette) return;
        const editColor: PaletteColorInstance = editPalette.getColorById(colorId);
        if (!editColor || editColor.isTexture) return;
        if (editColor.isLinearGradient || editColor.isRadialGradient) {
          $.MessageLog.trace('WIP: Gradient editing for "' + editColor.name + '".');
        } else if (editColor.isSolid) {
          editSolidColor(editPalette, editColor, function () {
            swatch.toolTip = swatchTooltip(editColor);
            fill = swatchFill(editColor);
            paintSwatch();
          });
        }
      };
      return swatch;

      function highlightSwatch(): void {
        if (selected) return;
        if (clearSelection) clearSelection();
        selected = true;
        paintCard(true);
        paintSwatch();
        clearSelection = function () {
          selected = false;
          paintCard(false);
          paintSwatch();
        };
      }

      function paintSwatch(): void {
        const border = selected ? '2px solid white' : '1px solid rgba(0,0,0,32)';
        swatch.styleSheet =
          'QLabel#paletteSwatch { border-radius: 6px; color: #c6c6c6; border: ' +
          border +
          '; background: ' +
          fill +
          '; }';
      }
    }
  }

  function swatchTooltip(color: PaletteColorInstance): string {
    const name = (color.name || 'Unnamed color')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const title = '<b>' + name + '</b>';
    if (color.isTexture) return title + '<br>Texture';

    let details: string;
    if (color.isSolid) {
      const rgba: RgbColorInput = color.colorData;
      if (!rgba) return title;
      const hex = $.ColorUtils.rgbToHex(rgba.r, rgba.g, rgba.b).toUpperCase();
      const opacity = rgba.a == null ? 100 : Math.round((rgba.a * 100) / 255);
      details = hex + ' · ' + opacity + '% opacity';
    } else if (color.isLinearGradient || color.isRadialGradient) {
      details = color.isRadialGradient ? 'Radial gradient' : 'Linear gradient';
    } else {
      return title;
    }

    return (
      '<p style="margin-top:0; margin-bottom:4px;">' +
      title + '<br>' + details + '</p>' +
      '<table width="120" cellspacing="0" cellpadding="0" style="border:1px solid #696969;">' +
      '<tr><td style="background-color:' + swatchFill(color) + ';"></td></tr></table>'
    );
  }

  function editSolidColor(
    palette: PaletteInstance,
    color: PaletteColorInstance,
    repaint: () => void,
  ): void {
    const initial: RgbColorInput = color.colorData;
    if (!initial) return;

    openColorPickerDialog(
      function (value) {
        const current: RgbColorInput = color.colorData;
        const currentAlpha = current.a == null ? 255 : current.a;
        const alpha =
          value.opacity === Math.round((currentAlpha * 100) / 255)
            ? currentAlpha
            : Math.round((value.opacity * 255) / 100);
        if (
          value.r === current.r &&
          value.g === current.g &&
          value.b === current.b &&
          alpha === currentAlpha
        ) {
          return;
        }

        try {
          const updated = palette.withLock(function () {
            $.scene.beginUndoRedoAccum('Edit Palette Color');
            try {
              color.colorData = { r: value.r, g: value.g, b: value.b, a: alpha };
            } catch (error) {
              $.scene.cancelUndoRedoAccum();
              throw error;
            }
            $.scene.endUndoRedoAccum();
            return true;
          });
          if (updated) repaint();
        } catch (error) {
          $.MessageLog.trace(
            'Could not update "' + color.name + '" in "' + palette.name + '": ' + error,
          );
        }
      },
      undefined,
      initial,
      dialog,
    );
  }

  function refreshActiveSwatch(): void {
    syncActiveSwatch();
  }

  const colorSignals = connectPaletteColorSignals(mainWindow, refreshActiveSwatch);
  // Poll while open for changes that bypass the Colour view or after it is rebuilt.
  const colorTimer = new $.QTimer(dialog);
  colorTimer.timeout.connect(refreshActiveSwatch);
  function disconnectColorSignals(): void {
    if (paletteManagerDialog === dialog) paletteManagerDialog = undefined;
    while (colorSignals.length) {
      const signal = colorSignals.pop();
      try {
        signal.disconnect(refreshActiveSwatch);
      } catch (error) {
        // Harmony may already have destroyed the Colour view and its connections.
      }
    }
  }
  dialog.finished.connect(function () {
    colorTimer.stop();
    disconnectColorSignals();
  });
  dialog.destroyed.connect(disconnectColorSignals);
  dialog.setAttribute($.Qt.WA_DeleteOnClose, true);

  filterPalettes();
  syncActiveSwatch();
  dialog.resize(704, 520);
  paletteManagerDialog = dialog;
  dialog.show();
  search.value.setFocus();
  colorTimer.start(150);
}

function connectPaletteColorSignals(mainWindow: QWidget, refresh: () => void): QSignal[] {
  const signals: QSignal[] = [];
  const queue = [mainWindow];
  for (let i = 0; i < queue.length; i++) {
    const widget = queue[i];
    if (!widget) continue;

    const activeColorChanged = widget.ActiveColorChanged;
    if (widget.visible && activeColorChanged && typeof activeColorChanged.connect === 'function') {
      // Clicks and PaletteManager setters can notify through different signals.
      const candidates = [activeColorChanged, widget.itemSelectionChanged];
      for (const signal of candidates) {
        if (!signal || typeof signal.connect !== 'function') continue;
        try {
          signal.connect(refresh);
          signals.push(signal);
        } catch (error) {
          // The timer also supports builds that do not expose this connection.
        }
      }
    }
    if (typeof widget.children === 'function') {
      const children = widget.children();
      for (let j = 0; j < children.length; j++) queue.push(children[j]);
    }
  }
  return signals;
}

function swatchFill(color: PaletteColorInstance): string {
  if (color.isTexture) return '#444';
  if (color.isSolid && color.colorData) return swatchRgba(color.colorData);
  if (color.isLinearGradient || color.isRadialGradient) {
    const stops: PaletteGradientStop[] = color.colorData;
    if (stops && stops.length) {
      const gradient = color.isRadialGradient
        ? 'qradialgradient(cx:0.5, cy:0.5, radius:0.5, fx:0.5, fy:0.5'
        : 'qlineargradient(x1:0, y1:0, x2:0, y2:1';
      const entries = stops
        .slice()
        .sort((a, b) => a.t - b.t)
        .map(function (stop) {
          return 'stop:' + stop.t.toFixed(6) + ' ' + swatchRgba(stop);
        });
      return gradient + ', ' + entries.join(', ') + ')';
    }
  }
  return '#444';
}

function swatchRgba(color: RgbColorInput): string {
  return 'rgba(' + [color.r, color.g, color.b, color.a == null ? 255 : color.a].join(',') + ')';
}
