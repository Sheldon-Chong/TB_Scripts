include('global-test.js');
include('reactive-ui.js');

interface PaletteGradientStop extends RgbColorInput {
  t: number;
}

interface PaletteManagerSwatch {
  id: string;
  name: string;
  widget: QPushButton;
  edit(): void;
  setSelected(selected: boolean): void;
  setSearchMatch(matched: boolean): void;
}

interface PaletteManagerCard {
  id: string;
  name: string;
  isTexturePalette: boolean;
  element: JSX.Element;
  swatches: PaletteManagerSwatch[];
  expand(): void;
  setSearchExpanded(expanded: boolean): void;
  setSelected(selected: boolean): void;
  removeSwatch(swatch: PaletteManagerSwatch): void;
  duplicateSwatch(swatch: PaletteManagerSwatch): PaletteManagerSwatch | undefined;
}

function showPaletteManager(): void {
  const windows: QWidget[] = QApplication.topLevelWidgets();
  for (const window of windows) {
    if (window.objectName === 'scenePaletteManager' && window.visible) {
      window.raise();
      window.activateWindow();
      return;
    }
  }

  const $ = getCore();
  const UI = createUIRuntime($);
  include(specialFolders.userScripts + '/widgets/ColorPicker.js');
  const picker: ColorPickerComponents = Function('return this;')().__proto__.__TBColorPicker;
  if (!picker || typeof picker.createWidget !== 'function')
    throw new Error('Could not load widgets/ColorPicker.js from the user scripts folder.');
  const createPicker = picker.createWidget;
  const math = Math;
  const ScriptError = Error;
  const pickerRuntime = { core: $, ComboBox: QComboBox, math };
  const mainWindow = QApplication.activeWindow();
  const projectPath = $.scene.currentProjectPath();
  const versionName = $.scene.currentVersionName();
  // Use the current wrapper definitions even when the shared Core was initialized earlier.
  const paletteManager = createPaletteKit($).Palettes;
  const palettes = paletteManager.getAll(true);
  let activePaletteId: string | undefined;
  let activeColorId: string | undefined;
  const swatchSize = 24;
  const swatchGap = 6;
  // QtScript can lose the global binding for undefined after another script launch.
  const unset = void 0;
  let selectedCard: PaletteManagerCard | undefined;
  let selectedSwatch: PaletteManagerSwatch | undefined;
  let selectedCards: PaletteManagerCard[] = [];
  let selectedSwatches: PaletteManagerSwatch[] = [];
  let previousSelectedCards: PaletteManagerCard[] = [];
  let previousSelectedSwatches: PaletteManagerSwatch[] = [];
  let selectionAnchor:
    | {
        card: PaletteManagerCard;
        swatch: PaletteManagerSwatch;
      }
    | undefined;
  let revealedCard: PaletteManagerCard | undefined;
  let lastSearchQuery = '';
  let pendingScroll: QWidget | undefined;
  let lastClick: { swatch: PaletteManagerSwatch; time: number } | undefined;
  const Clock = Date;
  const clickInterval =
    typeof QApplication.doubleClickInterval === 'function'
      ? QApplication.doubleClickInterval()
      : QApplication.doubleClickInterval;
  const doubleClickInterval =
    typeof clickInterval === 'number' && clickInterval > 0 ? clickInterval : 400;
  let closed = false;
  const styleSheet =
    'QDialog#scenePaletteManager { background: #414141; }' +
    'QLineEdit#paletteSearch { background: #4e4e4e; color: white; border: 1px solid #676767;' +
    ' border-radius: 12px; padding: 9px 14px; font-size: 15px; }' +
    'QLineEdit#paletteSearch:focus { border-color: #a5a5a5; }' +
    'QScrollArea#paletteScroll { border: none; background: #414141; }' +
    'QWidget#paletteList { background: #414141; }' +
    'QLabel#paletteTitle, QLabel#paletteCount, QWidget#paletteSwatchGrid { background: transparent; }' +
    'QLabel#paletteTitle { color: white; font-size: 19px; font-weight: bold; }' +
    'QPushButton#paletteChevron { border: 1px solid transparent; border-radius: 5px;' +
    ' background: transparent; color: #e8e8e8; font-size: 16px; font-weight: bold; padding: 0; }' +
    'QPushButton#paletteChevron:hover, QPushButton#paletteChevron:focus { border-color: #777; background: #555; }' +
    'QPushButton#paletteChevron:disabled { color: #858585; }' +
    'QLabel#paletteCount, QLabel#paletteEmpty, QLabel#paletteSelectionCount { color: #c6c6c6; font-size: 14px; }' +
    'QToolTip { background-color: #292929; color: #f5f5f5; border: 1px solid #696969;' +
    ' padding: 5px; opacity: 255; }' +
    'QPushButton#paletteAddColor { border: 1px dashed #8e8e8e; border-radius: 6px;' +
    ' background: transparent; color: #ddd; padding: 0; font-size: 17px; }' +
    'QPushButton#paletteAddColor:hover, QPushButton#paletteAddColor:focus { border-color: #eee; background: #555; }' +
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
      placeholderText="Search palettes and colors..."
      accessibleName="Search palettes and colors"
      clearButtonEnabled={true}
      onTextChanged={updateSearch}
    />
  );
  const list = <qwidget objectName="paletteList" />;
  const empty = (
    <label
      objectName="paletteEmpty"
      text={
        palettes.length ? 'No palettes or colors match your search.' : 'No palettes in this scene.'
      }
      alignment={$.Qt.AlignmentFlag.AlignCenter}
      minimumHeight={64}
    />
  );
  const cards = palettes.map(createCard);
  const listColumn = (
    <column parent={list.value} spacing={14} alignment={0}>
      {empty}
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
  const selectionCount = (
    <label objectName="paletteSelectionCount" text="0 colors selected · 0 palettes selected" />
  );
  const dialogColumn = (
    <column parent={dialog} spacing={14} alignment={0}>
      {search}
      {scroll}
      {selectionCount}
    </column>
  );
  dialogColumn.value.setContentsMargins(18, 18, 18, 18);

  function runColorAction(action: () => void): void {
    if (closed) return;
    try {
      action();
    } catch (error) {
      $.MessageLog.trace('Palette Manager: ' + error);
    }
  }

  function isCurrentScene(): boolean {
    return (
      $.scene.currentProjectPath() === projectPath && $.scene.currentVersionName() === versionName
    );
  }

  function syncActiveSwatch(force = false): void {
    if (closed) return;
    if (!isCurrentScene()) {
      dialog.close();
      return;
    }

    const paletteId = $.PaletteManager.getCurrentPaletteId();
    const colorId = $.PaletteManager.getCurrentColorId();
    const changed = paletteId !== activePaletteId || colorId !== activeColorId;
    if (!force && !changed) return;
    activePaletteId = paletteId;
    activeColorId = colorId;

    const card = cards.filter((entry) => entry.id === paletteId && !entry.isTexturePalette)[0];
    const swatch = card && card.swatches.filter((entry) => entry.id === colorId)[0];
    if (selectedSwatches.length > 1) {
      selectedCard = card;
      selectedSwatch = swatch;
      refreshSelectionState();
    } else {
      setSelection(card, swatch);
    }
    if (!changed) return;

    if (swatch) card.expand();

    // The next poll scrolls after the card has been laid out.
    pendingScroll = swatch && swatch.widget;
    const reveal = swatch ? card : unset;
    if ((revealedCard && revealedCard !== reveal) || (reveal && !reveal.element.value.visible)) {
      filterPalettes(reveal);
    }
  }

  function setSelection(card?: PaletteManagerCard, swatch?: PaletteManagerSwatch): void {
    if (
      selectedCard === card &&
      selectedSwatch === swatch &&
      selectedCards.length === (card ? 1 : 0) &&
      selectedSwatches.length === (swatch ? 1 : 0)
    ) {
      return;
    }
    selectedCard = card;
    selectedSwatch = swatch;
    selectedCards = card ? [card] : [];
    selectedSwatches = swatch ? [swatch] : [];
    selectionAnchor = card && swatch ? { card, swatch } : unset;
    refreshSelectionState();
  }

  function refreshSelectionState(): void {
    for (const card of cards) {
      const selected = selectedCards.indexOf(card) !== -1;
      if ((previousSelectedCards.indexOf(card) !== -1) !== selected) card.setSelected(selected);
    }
    for (const card of cards) {
      for (const swatch of card.swatches) {
        const selected = selectedSwatches.indexOf(swatch) !== -1;
        if ((previousSelectedSwatches.indexOf(swatch) !== -1) !== selected)
          swatch.setSelected(selected);
      }
    }
    previousSelectedCards = selectedCards.slice();
    previousSelectedSwatches = selectedSwatches.slice();

    const colorCount = selectedSwatches.length;
    const paletteIds: PaletteManagerCard[] = [];
    for (const card of selectedCards) {
      if (paletteIds.indexOf(card) === -1) paletteIds.push(card);
    }
    for (const swatch of selectedSwatches) {
      const owner = cards.filter((card) => card.swatches.indexOf(swatch) !== -1)[0];
      if (owner && paletteIds.indexOf(owner) === -1) paletteIds.push(owner);
    }
    selectionCount.value.text =
      colorCount +
      (colorCount === 1 ? ' color' : ' colors') +
      ' selected · ' +
      paletteIds.length +
      (paletteIds.length === 1 ? ' palette' : ' palettes') +
      ' selected';
  }

  function ctrlClick(card: PaletteManagerCard, swatch: PaletteManagerSwatch): void {
    const index = selectedSwatches.indexOf(swatch);
    if (index === -1) {
      selectedCards.push(card);
      selectedSwatches.push(swatch);
    } else {
      selectedSwatches.splice(index, 1);
      if (
        !selectedSwatches.some(
          (entry) => cards.filter((owner) => owner.swatches.indexOf(entry) !== -1)[0] === card,
        )
      ) {
        const cardIndex = selectedCards.indexOf(card);
        if (cardIndex !== -1) selectedCards.splice(cardIndex, 1);
      }
    }
    selectedCard = card;
    selectedSwatch = swatch;
    selectionAnchor = { card, swatch };
    refreshSelectionState();
    if (typeof search.value.clearFocus === 'function') search.value.clearFocus();
    swatch.widget.setFocus();
    if (!card.isTexturePalette) {
      activePaletteId = card.id;
      activeColorId = swatch.id;
      paletteManager.selectPaletteAndColor(card.id, swatch.id);
    }
  }

  function shiftClick(card: PaletteManagerCard, swatch: PaletteManagerSwatch): void {
    if (!selectionAnchor || selectionAnchor.card !== card) {
      setSelection(card, swatch);
      return;
    }

    const swatches = card.swatches;
    const start = swatches.indexOf(selectionAnchor.swatch);
    const end = swatches.indexOf(swatch);
    if (start === -1 || end === -1) {
      setSelection(card, swatch);
      return;
    }

    const first = math.min(start, end);
    const last = math.max(start, end);
    selectedCards = [card];
    selectedSwatches = swatches.slice(first, last + 1);
    selectedCard = card;
    selectedSwatch = swatch;
    refreshSelectionState();
    if (typeof search.value.clearFocus === 'function') search.value.clearFocus();
    swatch.widget.setFocus();
    if (!card.isTexturePalette) {
      activePaletteId = card.id;
      activeColorId = swatch.id;
      paletteManager.selectPaletteAndColor(card.id, swatch.id);
    }
  }

  function deleteSelectedSwatches(): void {
    const snapshot = selectedSwatches.slice();
    if (!snapshot.length && selectedSwatch && selectedSwatch.widget.visible) {
      snapshot.push(selectedSwatch);
    }
    if (!snapshot.length) return;
    if (!isCurrentScene()) return;
    for (const swatch of snapshot) {
      const card = cards.filter((entry) => entry.swatches.indexOf(swatch) !== -1)[0];
      if (card && swatch.widget.visible) card.removeSwatch(swatch);
    }
  }

  function duplicateSelectedSwatches(): void {
    const snapshot = selectedSwatches.slice();
    if (!snapshot.length && selectedSwatch && selectedSwatch.widget.visible) {
      snapshot.push(selectedSwatch);
    }
    if (!snapshot.length || !isCurrentScene()) return;

    const copiedCards: PaletteManagerCard[] = [];
    const copiedSwatches: PaletteManagerSwatch[] = [];
    for (const swatch of snapshot) {
      const card = cards.filter((entry) => entry.swatches.indexOf(swatch) !== -1)[0];
      if (!card) continue;
      const copy = card.duplicateSwatch(swatch);
      if (copy) {
        copiedCards.push(card);
        copiedSwatches.push(copy);
      }
    }

    if (copiedSwatches.length) {
      selectedCards = copiedCards;
      selectedSwatches = copiedSwatches;
      selectedCard = copiedCards[0];
      selectedSwatch = copiedSwatches[0];
      selectionAnchor = { card: copiedCards[0], swatch: copiedSwatches[0] };
      refreshSelectionState();
      copiedSwatches[0].widget.setFocus();
    }
  }

  function updateSearch(): void {
    pendingScroll = unset;
    filterPalettes();
    scroll.value.verticalScrollBar().value = 0;
  }

  function filterPalettes(reveal?: PaletteManagerCard): void {
    const query = search.value.text.trim().toLowerCase();
    const queryChanged = query !== lastSearchQuery;
    lastSearchQuery = query;
    const paletteMatches: PaletteManagerCard[] = [];
    const colorMatches: PaletteManagerCard[] = [];
    revealedCard = unset;

    for (const card of cards) {
      let hasColorMatch = false;
      for (const swatch of card.swatches) {
        const matched = !!query && swatch.name.indexOf(query) !== -1;
        swatch.setSearchMatch(matched);
        if (matched) hasColorMatch = true;
      }

      if (queryChanged) card.setSearchExpanded(hasColorMatch);

      if (card.name.indexOf(query) !== -1) {
        paletteMatches.push(card);
      } else if (hasColorMatch) {
        colorMatches.push(card);
      } else if (card === reveal) {
        revealedCard = card;
      } else {
        card.element.value.hide();
      }
      listColumn.value.removeWidget(card.element.value);
    }

    const results = paletteMatches.concat(colorMatches);
    empty.value.visible = results.length === 0;
    if (revealedCard) results.push(revealedCard);
    for (let i = 0; i < results.length; i++) {
      const widget = results[i].element.value;
      listColumn.value.insertWidget(i + 1, widget, 0, 0);
      widget.show();
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

  function createCard(palette: PaletteInstance): PaletteManagerCard {
    const name = palette.name;
    const paletteId = palette.id;
    const isTexturePalette = palette.isTexturePalette;
    const colors: PaletteColorInstance[] = palette.getColors();
    const card = <qwidget parent={list.value} objectName="paletteCard" />;
    card.value.setAttribute($.Qt.WA_StyledBackground, true);
    paintCard(false);

    const swatchGrid = <qwidget objectName="paletteSwatchGrid" />;
    const grid: QWidget = swatchGrid.value;
    let expanded = true;
    let expandedForSearch = false;
    const chevron = (
      <pushButton objectName="paletteChevron" autoDefault={false} onClicked={toggleExpanded} />
    );
    chevron.value.setFixedSize(24, 24);
    const colorCount = <label objectName="paletteCount" />;
    const addColorButton: QPushButton = (
      <pushButton
        parent={grid}
        objectName="paletteAddColor"
        text="+"
        toolTip={'Add a color to ' + name}
        accessibleName={'Add a color to ' + name}
        autoDefault={false}
        onClicked={() => runColorAction(addColor)}
      />
    ).value;
    addColorButton.setFixedSize(swatchSize, swatchSize);
    const cardColumn = (
      <column parent={card.value} spacing={9} alignment={0}>
        <row spacing={6}>
          {chevron}
          <label
            objectName="paletteTitle"
            textFormat={$.Qt.PlainText}
            text={name}
            wordWrap={true}
            stretch={1}
          />
          {colorCount}
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
    const cardState: PaletteManagerCard = {
      id: paletteId,
      name: name.toLowerCase(),
      isTexturePalette,
      element: card,
      swatches,
      expand: function () {
        if (expanded || expandedForSearch) return;
        expanded = true;
        updateExpansion();
      },
      setSearchExpanded: function (value) {
        if (expandedForSearch === value) return;
        expandedForSearch = value;
        updateExpansion();
      },
      setSelected: paintCard,
      removeSwatch,
      duplicateSwatch,
    };
    let columns = 0;
    updateColorCount();
    layoutSwatches(12);
    grid.resizeEvent = function () {
      layoutSwatches(math.max(1, math.floor((grid.width + swatchGap) / (swatchSize + swatchGap))));
    };
    updateExpansion();
    return cardState;

    function toggleExpanded(): void {
      expanded = !(expanded || expandedForSearch);
      expandedForSearch = false;
      updateExpansion();
    }

    function updateExpansion(): void {
      const showSwatches = expanded || expandedForSearch;
      grid.visible = showSwatches;
      chevron.value.text = showSwatches ? '<' : '>';
      const action = (showSwatches ? 'Collapse ' : 'Expand ') + name;
      chevron.value.toolTip = action;
      chevron.value.accessibleName = action;
    }

    function paintCard(selected: boolean): void {
      const border = selected ? '#eee' : '#676767';
      card.value.styleSheet =
        'QWidget#paletteCard { background: #4e4e4e; border: 1px solid ' +
        border +
        '; border-radius: 13px; }';
    }

    function updateColorCount(): void {
      colorCount.value.text = swatches.length + (swatches.length === 1 ? ' color' : ' colors');
    }

    function layoutSwatches(nextColumns: number, countChanged = false): void {
      if (columns === nextColumns && !countChanged) return;
      columns = nextColumns;
      const step = swatchSize + swatchGap;
      const rows = math.ceil((swatches.length + 1) / columns);
      grid.setFixedHeight(rows * step - swatchGap);
      for (let i = 0; i < swatches.length; i++) {
        swatches[i].widget.move((i % columns) * step, math.floor(i / columns) * step);
      }
      addColorButton.move(
        (swatches.length % columns) * step,
        math.floor(swatches.length / columns) * step,
      );
    }

    function resolvePalette(): PaletteInstance | undefined {
      return paletteManager.getAll(true).filter((entry) => entry.id === paletteId)[0];
    }

    function addColor(): void {
      const target = resolvePalette();
      if (!target) return;
      const color = changePalette(target, 'Add Palette Color', function () {
        const existingNames = target.getColors().map((entry) => entry.name);
        let colorName = 'New Color';
        for (let suffix = 2; existingNames.indexOf(colorName) !== -1; suffix++) {
          colorName = 'New Color ' + suffix;
        }
        const created: PaletteColorInstance = target.createSolidColor(colorName, {
          r: 128,
          g: 128,
          b: 128,
          a: 255,
        });
        if (!created || !created.id)
          throw new ScriptError('Could not add a solid color to "' + name + '".');
        return created;
      });
      if (!color) return;

      const entry = createSwatch(color);
      swatches.push(entry);
      entry.widget.show();
      updateColorCount();
      layoutSwatches(columns, true);
      if (lastSearchQuery) filterPalettes(revealedCard);
      if (!isTexturePalette) {
        paletteManager.selectPaletteAndColor(paletteId, entry.id);
        activePaletteId = paletteId;
        activeColorId = entry.id;
      }
      setSelection(cardState, entry);
      if (typeof search.value.clearFocus === 'function') search.value.clearFocus();
      entry.widget.setFocus();
    }

    function removeSwatch(entry: PaletteManagerSwatch): void {
      const index = swatches.indexOf(entry);
      const target = resolvePalette();
      if (index === -1 || !target) return;
      if (
        !changePalette(target, 'Delete Palette Color', function () {
          if (!target.removeColor(entry.id)) {
            throw new ScriptError(
              'Could not delete "' + entry.widget.accessibleName + '" from "' + name + '".',
            );
          }
          return true;
        })
      )
        return;

      if (lastClick && lastClick.swatch === entry) lastClick = unset;
      if (pendingScroll === entry.widget) pendingScroll = unset;
      const swatchIndex = selectedSwatches.indexOf(entry);
      if (swatchIndex !== -1) selectedSwatches.splice(swatchIndex, 1);
      if (
        !selectedSwatches.some(
          (selected) =>
            cards.filter((owner) => owner.swatches.indexOf(selected) !== -1)[0] === cardState,
        )
      ) {
        const cardIndex = selectedCards.indexOf(cardState);
        if (cardIndex !== -1) selectedCards.splice(cardIndex, 1);
      }
      if (selectedSwatch === entry) selectedSwatch = unset;
      if (selectedCard === cardState && !selectedSwatches.length) selectedCard = unset;
      swatches.splice(index, 1);
      entry.widget.hide();
      entry.widget.deleteLater();
      updateColorCount();
      layoutSwatches(columns, true);
      refreshSelectionState();
      if (lastSearchQuery) filterPalettes();
      if (!isTexturePalette) {
        activePaletteId = paletteId;
        activeColorId = $.PaletteManager.getCurrentColorId();
      }
      scroll.value.setFocus();
    }

    function duplicateSwatch(entry: PaletteManagerSwatch): PaletteManagerSwatch | undefined {
      const target = resolvePalette();
      if (!target) return unset;

      const source = target.getColors().filter((color) => color.id === entry.id)[0];
      if (!source) return unset;

      const duplicate = changePalette(target, 'Duplicate Palette Color', function () {
        const created = target.duplicateColor(source);
        if (!created || !created.id)
          throw new ScriptError(
            'Could not duplicate "' + entry.widget.accessibleName + '" from "' + name + '".',
          );
        return created;
      });
      if (!duplicate) return unset;

      const baseName = (source.name || 'Unnamed color') + '_copy';
      const existingNames: string[] = [];
      const colors = target.getColors();
      for (const color of colors) {
        if (color.name) existingNames.push(color.name);
      }
      let uniqueName = baseName;
      for (let suffix = 2; existingNames.indexOf(uniqueName) !== -1; suffix++) {
        uniqueName = baseName + '_' + suffix;
      }
      duplicate.name = uniqueName;

      const copiedEntry = createSwatch(duplicate);
      swatches.push(copiedEntry);
      copiedEntry.widget.show();
      updateColorCount();
      layoutSwatches(columns, true);
      if (lastSearchQuery) filterPalettes(revealedCard);
      return copiedEntry;
    }

    function createSwatch(color: PaletteColorInstance): PaletteManagerSwatch {
      const name = color.name || 'Unnamed color';
      const swatch: QPushButton = (
        <pushButton
          parent={grid}
          objectName="paletteSwatch"
          text={color.isTexture ? 'Tex' : ''}
          accessibleName={name}
          autoDefault={false}
          toolTip={swatchTooltip(color)}
        />
      ).value;
      swatch.setFixedSize(swatchSize, swatchSize);
      swatch.mousePressEvent = function (event: any): void {
        if (typeof event.button === 'function' && event.button() === $.Qt.RightButton) {
          if (selectedSwatches.indexOf(entry) === -1) setSelection(cardState, entry);
          showSwatchContextMenu(swatch, event);
          if (typeof event.accept === 'function') event.accept();
          return;
        }
        if (typeof event.button === 'function' && event.button() !== $.Qt.LeftButton) return;

        const modifiers = getMouseModifiers(event);
        if (modifiers.ctrl) {
          ctrlClick(cardState, entry);
        } else if (modifiers.shift) {
          shiftClick(cardState, entry);
        } else {
          activateSwatch();
        }
        if (typeof event.accept === 'function') event.accept();
      };
      function showSwatchContextMenu(widget: QWidget, event: any): void {
        const menu = new QMenu(dialog);
        const duplicateAction = menu.addAction('Duplicate');
        const deleteAction = menu.addAction('Delete');

        let globalPos: any;
        if (typeof event.globalPos === 'function') {
          globalPos = event.globalPos();
        } else if (typeof event.pos === 'function' && typeof widget.mapToGlobal === 'function') {
          globalPos = widget.mapToGlobal(event.pos());
        }
        const selectedAction = globalPos ? menu.exec(globalPos) : menu.exec();
        if (selectedAction === duplicateAction) {
          runColorAction(duplicateSelectedSwatches);
        } else if (selectedAction === deleteAction) {
          runColorAction(deleteSelectedSwatches);
        }
      }
      const colorId = color.id;
      const canEdit =
        (color.isSolid || color.isLinearGradient || color.isRadialGradient) && !color.isTexture;
      // The native color wrapper can expire after the modeless dialog opens.
      let fill = swatchFill(color);
      let selected = false;
      let searchMatch = false;
      const entry: PaletteManagerSwatch = {
        id: colorId,
        name: name.toLowerCase(),
        widget: swatch,
        edit: function () {
          if (color.isLinearGradient || color.isRadialGradient) {
            editGradientColor(resolvePalette, colorId, function (updatedColor) {
              const updatedName = updatedColor.name || 'Unnamed color';
              entry.name = updatedName.toLowerCase();
              swatch.accessibleName = updatedName;
              swatch.toolTip = swatchTooltip(updatedColor);
              fill = swatchFill(updatedColor);
              paintSwatch();
              if (lastSearchQuery) filterPalettes(revealedCard);
            });
            return;
          }
          editSolidColor(resolvePalette, colorId, function (updatedColor) {
            const updatedName = updatedColor.name || 'Unnamed color';
            const searchName = updatedName.toLowerCase();
            const nameChanged = entry.name !== searchName;
            entry.name = searchName;
            swatch.accessibleName = updatedName;
            swatch.toolTip = swatchTooltip(updatedColor);
            fill = swatchFill(updatedColor);
            paintSwatch();
            if (nameChanged && lastSearchQuery) filterPalettes(revealedCard);
          });
        },
        setSelected: function (value) {
          selected = value;
          paintSwatch();
        },
        setSearchMatch: function (matched) {
          if (searchMatch === matched) return;
          searchMatch = matched;
          paintSwatch();
        },
      };
      paintSwatch();
      return entry;

      function activateSwatch(): void {
        if (closed) return;

        // Use native button activation so QtScript never overrides the swatch mouse events.
        const now = new Clock().getTime();
        const elapsed = lastClick ? now - lastClick.time : 0;
        if (
          canEdit &&
          lastClick &&
          lastClick.swatch === entry &&
          elapsed >= 0 &&
          elapsed <= doubleClickInterval
        ) {
          lastClick = unset;
          runColorAction(entry.edit);
          return;
        }
        lastClick = canEdit ? { swatch: entry, time: now } : unset;

        if (isTexturePalette) {
          setSelection(cardState, entry);
        } else {
          activePaletteId = paletteId;
          activeColorId = colorId;
          paletteManager.selectPaletteAndColor(paletteId, colorId);
          setSelection(cardState, entry);
        }
        if (typeof search.value.clearFocus === 'function') search.value.clearFocus();
        swatch.setFocus();
      }

      function paintSwatch(): void {
        const border = searchMatch
          ? selected
            ? '2px solid #fff2bd'
            : '2px solid #ffd16a'
          : selected
            ? '2px solid white'
            : '1px solid rgba(0,0,0,32)';
        swatch.styleSheet =
          'QPushButton#paletteSwatch { border-radius: 6px; padding: 0; color: #c6c6c6; border: ' +
          border +
          '; background: ' +
          fill +
          '; }';
      }
    }
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
      const opacity = rgba.a == null ? 100 : math.round((rgba.a * 100) / 255);
      details = hex + ' · ' + opacity + '% opacity';
    } else if (color.isLinearGradient || color.isRadialGradient) {
      details = color.isRadialGradient ? 'Radial gradient' : 'Linear gradient';
    } else {
      return title;
    }

    return (
      '<p style="margin-top:0; margin-bottom:4px;">' +
      title +
      '<br>' +
      details +
      '</p>' +
      '<table width="120" cellspacing="0" cellpadding="0" style="border:1px solid #696969;">' +
      '<tr><td style="background-color:' +
      swatchFill(color) +
      ';"></td></tr></table>'
    );
  }

  function changePalette<T>(palette: PaletteInstance, label: string, edit: () => T): T | null {
    return palette.withLock(function () {
      $.scene.beginUndoRedoAccum(label);
      try {
        const result = edit();
        $.scene.endUndoRedoAccum();
        return result;
      } catch (error) {
        $.scene.cancelUndoRedoAccum();
        throw error;
      }
    });
  }

  function createPaletteColorEditor() {
    // Keep the picker and its QtScript callbacks alive for the lifetime of the panel.
    const editor = new $.QDialog(dialog);
    editor.objectName = 'paletteColorEditor';
    editor.windowTitle = 'Edit Palette Color';
    editor.modal = false;
    editor.styleSheet =
      'QDialog#paletteColorEditor { background: white; }' +
      'QLineEdit#paletteColorName { background: white; color: #34383e; border: 1px solid #dedfe2;' +
      ' border-radius: 4px; padding-left: 5px; font-size: 13px; }';
    const nameInput = new $.QLineEdit(editor);
    nameInput.objectName = 'paletteColorName';
    nameInput.accessibleName = 'Color name';
    nameInput.placeholderText = 'Color name';
    let active:
      | {
          resolvePalette: () => PaletteInstance | undefined;
          colorId: string;
          repaint: (color: PaletteColorInstance) => void;
          savedName: string;
        }
      | undefined;

    const picker = createPicker(editor, pickerRuntime, { onColorPick: updateColor });
    const nameAreaHeight = 44;
    nameInput.setGeometry(12, 12, picker.widget.width - 24, 28);
    picker.widget.move(0, nameAreaHeight);
    editor.setFixedSize(picker.widget.width, picker.widget.height + nameAreaHeight);
    nameInput.editingFinished.connect(commitName);
    editor.finished.connect(function () {
      try {
        commitName();
      } finally {
        active = unset;
      }
    });

    return function (
      resolvePalette: () => PaletteInstance | undefined,
      colorId: string,
      repaint: (color: PaletteColorInstance) => void,
    ): void {
      if (editor.visible) {
        editor.raise();
        editor.activateWindow();
        return;
      }
      const color = findColor(resolvePalette(), colorId);
      const initial: RgbColorInput = color && color.colorData;
      if (!initial) return;

      const savedName = color.name || '';
      nameInput.text = savedName;
      picker.setColor(initial);
      active = { resolvePalette, colorId, repaint, savedName };
      editor.show();
    };

    function findColor(
      palette: PaletteInstance | undefined,
      colorId: string,
    ): PaletteColorInstance | undefined {
      return (
        palette &&
        palette
          .getColors()
          .filter((color) => color.id === colorId && color.isSolid && !color.isTexture)[0]
      );
    }

    function commitName(): void {
      const edit = active;
      if (!edit || closed || !isCurrentScene()) return;
      const requested = nameInput.text.trim();
      if (!requested || requested === edit.savedName) {
        nameInput.text = edit.savedName;
        return;
      }
      try {
        const palette = edit.resolvePalette();
        const current = findColor(palette, edit.colorId);
        if (current) {
          const renamed =
            current.name === requested ||
            changePalette(palette, 'Rename Palette Color', function () {
              current.name = requested;
              return true;
            });
          edit.savedName = current.name || '';
          if (renamed) edit.repaint(current);
        }
      } catch (error) {
        $.MessageLog.trace('Could not rename palette color ' + edit.colorId + ': ' + error);
      }
      nameInput.text = edit.savedName;
    }

    function updateColor(value: ColorPickerValue): void {
      const edit = active;
      if (!edit || closed) return;
      try {
        // Native wrappers are only used within the callback that fetched them.
        const palette = edit.resolvePalette();
        const currentColor = findColor(palette, edit.colorId);
        const current: RgbColorInput = currentColor && currentColor.colorData;
        if (!current) return;

        const currentAlpha = current.a == null ? 255 : current.a;
        const alpha =
          value.opacity === math.round((currentAlpha * 100) / 255)
            ? currentAlpha
            : math.round((value.opacity * 255) / 100);
        if (
          value.r === current.r &&
          value.g === current.g &&
          value.b === current.b &&
          alpha === currentAlpha
        )
          return;

        const updated = changePalette(palette, 'Edit Palette Color', function () {
          currentColor.colorData = { r: value.r, g: value.g, b: value.b, a: alpha };
          return true;
        });
        if (updated) edit.repaint(currentColor);
      } catch (error) {
        $.MessageLog.trace('Could not update palette color ' + edit.colorId + ': ' + error);
      }
    }
  }

  function createPaletteGradientEditor() {
    const editor = new $.QDialog(dialog);
    editor.objectName = 'paletteGradientEditor';
    editor.windowTitle = 'Edit Palette Gradient';
    editor.modal = false;
    editor.styleSheet =
      'QDialog#paletteGradientEditor { background: white; }' +
      'QLineEdit#paletteGradientName { background: white; color: #34383e; border: 1px solid #dedfe2;' +
      ' border-radius: 4px; padding-left: 5px; font-size: 13px; }';

    const nameInput = new $.QLineEdit(editor);
    nameInput.objectName = 'paletteGradientName';
    nameInput.accessibleName = 'Gradient name';
    nameInput.placeholderText = 'Gradient name';
    nameInput.setGeometry(12, 12, 220, 28);

    let active:
      | {
          resolvePalette: () => PaletteInstance | undefined;
          colorId: string;
          repaint: (color: PaletteColorInstance) => void;
          savedName: string;
        }
      | undefined;
    let currentColor: PaletteColorInstance | undefined;
    let stops: PaletteGradientStop[] = [];
    let activeStop: PaletteGradientStop | undefined;
    let handleWidgets: QWidget[] = [];
    let dragging = false;
    let draggingStop: PaletteGradientStop | undefined;
    let draggingStopBeforeRelease: PaletteGradientStop | undefined;

    const gradientPanel = new $.QWidget(editor);
    gradientPanel.setGeometry(12, 320, 220, 62);
    gradientPanel.objectName = 'paletteGradientPanel';
    gradientPanel.setAttribute($.Qt.WA_StyledBackground, true);
    gradientPanel.styleSheet =
      'QWidget#paletteGradientPanel { background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; }';

    const track = new $.QWidget(gradientPanel);
    track.setGeometry(10, 10, 200, 18);
    track.setAttribute($.Qt.WA_StyledBackground, true);
    track.toolTip = 'Click near an existing handle to select it; click elsewhere to add a stop';

    const addStopButton = new $.QPushButton('+', gradientPanel);
    addStopButton.setGeometry(10, 32, 28, 24);
    addStopButton.autoDefault = false;
    addStopButton.toolTip = 'Add gradient stop';
    addStopButton.accessibleName = 'Add gradient stop';

    const deleteStopButton = new $.QPushButton('-', gradientPanel);
    deleteStopButton.setGeometry(42, 32, 28, 24);
    deleteStopButton.autoDefault = false;
    deleteStopButton.toolTip = 'Delete selected gradient stop';
    deleteStopButton.accessibleName = 'Delete selected gradient stop';

    const picker = createPicker(editor, pickerRuntime, {
      onColorDrag: updateActiveStop,
      onColorPick: function (value) {
        updateActiveStop(value);
        commitStops('Edit Palette Gradient');
      },
    });
    picker.widget.move(0, 44);
    editor.setFixedSize(244, 408);

    nameInput.editingFinished.connect(commitName);
    editor.finished.connect(function () {
      try {
        commitName();
      } finally {
        active = unset;
        currentColor = unset;
      }
    });

    track.mousePressEvent = function (event: any): void {
      if (draggingStop) return;
      if (event.button && event.button() !== $.Qt.LeftButton) return;
      $.log('press');
      const x = event.x();
      const t = math.max(0, math.min(1, x / 200));
      let nearest: PaletteGradientStop | undefined;
      let nearestDistance = 101;
      for (const stop of stops) {
        const distance = math.abs(stop.t - t) * 200;
        if (distance < nearestDistance) {
          nearest = stop;
          nearestDistance = distance;
        }
      }
      if (nearest && nearestDistance <= 12) {
        selectStop(nearest);
      } else {
        const before = stops
          .filter((stop) => stop.t <= t)
          .slice()
          .sort((a, b) => b.t - a.t)[0];
        const after = stops
          .filter((stop) => stop.t >= t)
          .slice()
          .sort((a, b) => a.t - b.t)[0];
        let color: RgbColorInput;
        if (before && after && before !== after) {
          const span = after.t - before.t;
          const ratio = span ? (t - before.t) / span : 0;
          color = {
            r: math.round(before.r + (after.r - before.r) * ratio),
            g: math.round(before.g + (after.g - before.g) * ratio),
            b: math.round(before.b + (after.b - before.b) * ratio),
            a: math.round(
              (before.a == null ? 255 : before.a) +
                ((after.a == null ? 255 : after.a) - (before.a == null ? 255 : before.a)) * ratio,
            ),
          };
        } else if (before) {
          color = { r: before.r, g: before.g, b: before.b, a: before.a == null ? 255 : before.a };
        } else if (after) {
          color = { r: after.r, g: after.g, b: after.b, a: after.a == null ? 255 : after.a };
        } else {
          color = { r: 0, g: 0, b: 0, a: 255 };
        }
        activeStop = { t, r: color.r, g: color.g, b: color.b, a: color.a };
        stops.push(activeStop);
        stops.sort((a, b) => a.t - b.t);
        commitStops('Add Gradient Stop');
      }
    };

    track.mouseMoveEvent = function (event: any): void {
      if (!dragging || !draggingStop) return;
      const x = event.x();
      draggingStop.t = math.max(0, math.min(1, x / 200));
      stops.sort((a, b) => a.t - b.t);
      if (currentColor) currentColor.colorData = stops.slice();
      updateGradientVisuals();
    };

    track.mouseReleaseEvent = function (event: any): void {
      if (!dragging) return;
      $.log('release');
      $.scene.endUndoRedoAccum();
      const releasedBelowTrack = typeof event.y === 'function' ? event.y() > 30 : false;
      const stopToDelete = draggingStopBeforeRelease;
      dragging = false;
      draggingStop = unset;
      draggingStopBeforeRelease = unset;
      if (typeof track.releaseMouse === 'function') track.releaseMouse();
      if (releasedBelowTrack && stopToDelete) {
        deleteStop(stopToDelete);
      } else {
        commitStops('Move Gradient Stop');
      }
      render();
    };

    addStopButton.clicked.connect(function () {
      if (stops.length >= 32) return;
      const selected = activeStop;
      let t = selected ? selected.t : 0.5;
      if (selected && selected.t < 1) {
        t = math.min(1, selected.t + 0.1);
      } else {
        t = stops.length ? math.min(1, math.max(0, (stops[stops.length - 1].t + 1) * 0.5)) : 0.5;
      }
      const before = stops
        .filter((stop) => stop.t <= t)
        .slice()
        .sort((a, b) => b.t - a.t)[0];
      const after = stops
        .filter((stop) => stop.t >= t)
        .slice()
        .sort((a, b) => a.t - b.t)[0];
      let color: RgbColorInput;
      if (before && after && before !== after) {
        const ratio = after.t === before.t ? 0 : (t - before.t) / (after.t - before.t);
        color = {
          r: math.round(before.r + (after.r - before.r) * ratio),
          g: math.round(before.g + (after.g - before.g) * ratio),
          b: math.round(before.b + (after.b - before.b) * ratio),
          a: math.round(
            (before.a == null ? 255 : before.a) +
              ((after.a == null ? 255 : after.a) - (before.a == null ? 255 : before.a)) * ratio,
          ),
        };
      } else if (before) {
        color = { r: before.r, g: before.g, b: before.b, a: before.a == null ? 255 : before.a };
      } else if (after) {
        color = { r: after.r, g: after.g, b: after.b, a: after.a == null ? 255 : after.a };
      } else {
        color = { r: 128, g: 128, b: 128, a: 255 };
      }
      activeStop = { t, r: color.r, g: color.g, b: color.b, a: color.a };
      stops.push(activeStop);
      stops.sort((a, b) => a.t - b.t);
      commitStops('Add Gradient Stop');
    });

    deleteStopButton.clicked.connect(function () {
      deleteStop(activeStop);
    });

    return function (
      resolvePalette: () => PaletteInstance | undefined,
      colorId: string,
      repaint: (color: PaletteColorInstance) => void,
    ): void {
      if (editor.visible) {
        editor.raise();
        editor.activateWindow();
        return;
      }
      const palette = resolvePalette();
      const gradient =
        palette &&
        palette
          .getColors()
          .filter(
            (color) => color.id === colorId && (color.isLinearGradient || color.isRadialGradient),
          )[0];
      if (!gradient) return;

      const sourceStops: PaletteGradientStop[] = gradient.colorData;
      if (!sourceStops || !sourceStops.length) return;
      stops = sourceStops
        .slice()
        .map((stop) => ({
          t: stop.t,
          r: stop.r,
          g: stop.g,
          b: stop.b,
          a: stop.a == null ? 255 : stop.a,
        }))
        .sort((a, b) => a.t - b.t);
      activeStop = stops[0];
      currentColor = gradient;
      nameInput.text = gradient.name || '';
      active = { resolvePalette, colorId, repaint, savedName: gradient.name || '' };
      selectStop(activeStop);
      render();
      editor.show();
    };

    function selectStop(stop: PaletteGradientStop): void {
      activeStop = stop;
      picker.setColor({ r: stop.r, g: stop.g, b: stop.b, a: stop.a });
      render();
    }

    function updateActiveStop(value: ColorPickerValue): void {
      if (!activeStop) return;
      activeStop.r = value.r;
      activeStop.g = value.g;
      activeStop.b = value.b;
      activeStop.a = math.round((value.opacity * 255) / 100);
      render();
      if (currentColor) currentColor.colorData = stops.slice();
    }

    function deleteStop(stop: PaletteGradientStop | undefined): void {
      if (!stop || stops.length <= 2) return;
      const index = stops.indexOf(stop);
      if (index === -1) return;
      stops.splice(index, 1);
      activeStop = stops[math.min(index, stops.length - 1)];
      if (activeStop)
        picker.setColor({
          r: activeStop.r,
          g: activeStop.g,
          b: activeStop.b,
          a: activeStop.a,
        });
      commitStops('Delete Gradient Stop');
    }

    function commitStops(label: string): void {
      const edit = active;
      if (!edit || closed) return;
      const palette = edit.resolvePalette();
      const gradient = findGradient(palette, edit.colorId);
      if (!gradient) return;
      const updated = changePalette(palette, label, function () {
        gradient.colorData = stops.slice().sort((a, b) => a.t - b.t);
        return true;
      });
      if (updated) edit.repaint(gradient);
      render();
    }

    function findGradient(
      palette: PaletteInstance | undefined,
      colorId: string,
    ): PaletteColorInstance | undefined {
      return (
        palette &&
        palette
          .getColors()
          .filter(
            (color) => color.id === colorId && (color.isLinearGradient || color.isRadialGradient),
          )[0]
      );
    }

    function commitName(): void {
      const edit = active;
      if (!edit || closed || !isCurrentScene()) return;
      const requested = nameInput.text.trim();
      if (!requested || requested === edit.savedName) {
        nameInput.text = edit.savedName;
        return;
      }
      const palette = edit.resolvePalette();
      const gradient = findGradient(palette, edit.colorId);
      if (gradient) {
        changePalette(palette, 'Rename Palette Gradient', function () {
          gradient.name = requested;
          return true;
        });
        edit.savedName = gradient.name || '';
        edit.repaint(gradient);
      }
      nameInput.text = edit.savedName;
    }

    function updateGradientVisuals(): void {
      const sorted = stops.slice().sort((a, b) => a.t - b.t);
      const entries = sorted.map(
        (stop) =>
          'stop:' +
          stop.t.toFixed(6) +
          ' ' +
          'rgba(' +
          [stop.r, stop.g, stop.b, stop.a == null ? 255 : stop.a].join(',') +
          ')',
      );
      track.styleSheet =
        'QWidget { border: 1px solid #777; border-radius: 4px;' +
        ' background: qlineargradient(x1:0, y1:0, x2:1, y2:0, ' +
        entries.join(', ') +
        '); }';
      for (const handle of handleWidgets) {
        const stop = (handle as any).__gradientStop as PaletteGradientStop | undefined;
        if (!stop) continue;
        handle.move(math.round(stop.t * 200) + 4, 28);
      }
    }

    function render(): void {
      const sorted = stops.slice().sort((a, b) => a.t - b.t);
      const entries = sorted.map(
        (stop) =>
          'stop:' +
          stop.t.toFixed(6) +
          ' ' +
          'rgba(' +
          [stop.r, stop.g, stop.b, stop.a == null ? 255 : stop.a].join(',') +
          ')',
      );
      track.styleSheet =
        'QWidget { border: 1px solid #777; border-radius: 4px;' +
        ' background: qlineargradient(x1:0, y1:0, x2:1, y2:0, ' +
        entries.join(', ') +
        '); }';

      for (let i = 0; i < sorted.length; i++) {
        const stop = sorted[i];
        let handle = handleWidgets[i];
        if (!handle) {
          handle = new $.QLabel('', gradientPanel);
          handle.setAttribute($.Qt.WA_StyledBackground, true);
          handleWidgets.push(handle);
        }
        handle.setGeometry(math.round(stop.t * 200) + 4, 28, 12, 12);
        (handle as any).__gradientStop = stop;
        handle.styleSheet =
          'QLabel { border: 2px solid ' +
          (stop === activeStop ? '#111' : '#777') +
          '; border-radius: 6px; background: ' +
          'rgba(' +
          [stop.r, stop.g, stop.b, stop.a == null ? 255 : stop.a].join(',') +
          '); }';
        handle.show();

        handle.mousePressEvent = function (event: any): void {
          if (event.button && event.button() !== $.Qt.LeftButton) return;
          $.scene.beginUndoRedoAccum('Move Gradient Stop');
          $.log('press');
          dragging = true;
          draggingStop = stop;
          draggingStopBeforeRelease = stop;
          selectStop(stop);
          if (typeof track.grabMouse === 'function') track.grabMouse();
        };
      }
      for (let i = sorted.length; i < handleWidgets.length; i++) {
        handleWidgets[i].hide();
      }
    }
  }

  function refreshActiveSwatch(): void {
    syncActiveSwatch();
  }

  function getMouseModifiers(event: any): { shift: boolean; ctrl: boolean } {
    let modifiers = 0;
    if (typeof event.modifiers === 'function') {
      modifiers = event.modifiers();
    } else if (typeof QApplication.keyboardModifiers === 'function') {
      modifiers = QApplication.keyboardModifiers();
    }
    return {
      shift: (modifiers & 0x02000000) !== 0,
      ctrl: (modifiers & 0x04000000) !== 0,
    };
  }

  const editSolidColor = createPaletteColorEditor();
  const editGradientColor = createPaletteGradientEditor();
  const findShortcut = new QShortcut(dialog);
  findShortcut.key = new QKeySequence('Ctrl+F');
  findShortcut.context = $.Qt.WindowShortcut;
  findShortcut.autoRepeat = false;
  findShortcut.activated.connect(function () {
    if (closed) return;
    search.value.setFocus();
    if (typeof search.value.selectAll === 'function') search.value.selectAll();
  });
  const duplicateShortcut = new QShortcut(dialog);
  duplicateShortcut.key = new QKeySequence('Ctrl+D');
  duplicateShortcut.context = $.Qt.WindowShortcut;
  duplicateShortcut.autoRepeat = false;
  duplicateShortcut.activated.connect(function () {
    runColorAction(duplicateSelectedSwatches);
  });
  // Poll while open for changes that bypass the Colour view or after it is rebuilt.
  const colorTimer = new $.QTimer(dialog);
  colorTimer.timeout.connect(function () {
    refreshActiveSwatch();
    const target = pendingScroll;
    pendingScroll = unset;
    if (!closed && target && target.visible) scroll.value.ensureWidgetVisible(target, 0, 18);
  });
  dialog.finished.connect(function () {
    closed = true;
    colorTimer.stop();
    pendingScroll = unset;
    lastClick = unset;
  });
  dialog.destroyed.connect(function () {
    closed = true;
  });
  dialog.setAttribute($.Qt.WA_DeleteOnClose, true);

  filterPalettes();
  dialog.resize(704, 520);
  dialog.show();
  syncActiveSwatch();
  search.value.setFocus();
  colorTimer.start(1000);
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
