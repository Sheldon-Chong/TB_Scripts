include('global-test.js');
include('reactive-ui.js');

interface PaletteGradientStop extends RgbColorInput {
  t: number;
}

interface PaletteSwatchAppearance {
  name: string;
  type: HarmonyColorType;
  texture: boolean;
  rgba?: RgbColorInput;
  stops?: PaletteGradientStop[];
}

interface PaletteColorEdit {
  resolvePalette: () => PaletteInstance | undefined;
  colorId: string;
  repaint: (color: PaletteColorInstance) => void;
  savedName: string;
}

interface PaletteManagerSwatch {
  id: string;
  name: string;
  widget: QPushButton;
  edit(): void;
  refresh(color: PaletteColorInstance): boolean;
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
  duplicateSwatch(swatch: PaletteManagerSwatch): string;
  refresh(palette: PaletteInstance): boolean;
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
  const ScriptError = Error;
  const Menu = QMenu;
  const mainWindow = QApplication.activeWindow();
  const projectPath = $.scene.currentProjectPath();
  const versionName = $.scene.currentVersionName();
  // Use the current wrapper definitions even when the shared Core was initialized earlier.
  const paletteKit = createPaletteKit($);
  const paletteManager = paletteKit.Palettes;
  const colorTypes = paletteKit.HarmonyColorType;
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
  const styleSheet = `
    QDialog#scenePaletteManager { background: #414141; }
    QLineEdit#paletteSearch { background: #4e4e4e; color: white; border: 1px solid #676767; border-radius: 12px; padding: 9px 14px; font-size: 15px; }
    QLineEdit#paletteSearch:focus { border-color: #a5a5a5; }
    QScrollArea#paletteScroll { border: none; background: #414141; }
    QWidget#paletteList { background: #414141; }
    QLabel#paletteTitle, QLabel#paletteCount, QWidget#paletteSwatchGrid { background: transparent; }
    QLabel#paletteTitle { color: white; font-size: 19px; font-weight: bold; }
    QPushButton#paletteChevron { border: 1px solid transparent; border-radius: 5px; background: transparent; color: #e8e8e8; font-size: 16px; font-weight: bold; padding: 0; }
    QPushButton#paletteChevron:hover, QPushButton#paletteChevron:focus { border-color: #777; background: #555; }
    QPushButton#paletteChevron:disabled { color: #858585; }
    QLabel#paletteCount, QLabel#paletteEmpty, QLabel#paletteSelectionCount { color: #c6c6c6; font-size: 14px; }
    QToolTip { background-color: #292929; color: #f5f5f5; border: 1px solid #696969; padding: 5px; opacity: 255; }
    QPushButton#paletteAddColor { border: 1px dashed #8e8e8e; border-radius: 6px; background: transparent; color: #ddd; padding: 0; font-size: 17px; }
    QPushButton#paletteAddColor:hover, QPushButton#paletteAddColor:focus { border-color: #eee; background: #555; }
    QPushButton#paletteAction { border: 1px solid #777; border-radius: 5px; background: #555; color: #a8a8a8; }
    QScrollBar:vertical { background: #4e4e4e; width: 11px; border-radius: 5px; }
    QScrollBar::handle:vertical { background: #bbb; min-height: 28px; border-radius: 5px; }
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
    QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }
  `;

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
  let cards = palettes.map(createCard);
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
  const selectionSummary = createSignal('0 colors selected · 0 palettes selected');
  const selectionCount = <label objectName="paletteSelectionCount" text={selectionSummary} />;
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
      $.MessageLog.trace(`Palette Manager: ${error}`);
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
    selectionSummary.set(
      `${colorCount}${colorCount === 1 ? ' color' : ' colors'} selected · ${paletteIds.length}${paletteIds.length === 1 ? ' palette' : ' palettes'} selected`,
    );
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

    const first = $.Math.min(start, end);
    const last = $.Math.max(start, end);
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
    if (
      !snapshot.length ||
      !isCurrentScene() ||
      editSolidColor.isDragging() ||
      editGradientColor.isDragging()
    ) {
      return;
    }

    const sources: { card: PaletteManagerCard; swatch: PaletteManagerSwatch }[] = [];
    for (const swatch of snapshot) {
      const card = cards.filter((entry) => entry.swatches.indexOf(swatch) !== -1)[0];
      if (card) sources.push({ card, swatch });
    }
    if (!sources.length) return;

    const copies = withUndoGroup('Duplicate Palette Colors', function () {
      return sources.map(({ card, swatch }) => ({ card, id: card.duplicateSwatch(swatch) }));
    });

    // Show the new swatches only after the batch has committed.
    syncPaletteContents();
    const copiedCards: PaletteManagerCard[] = [];
    const copiedSwatches: PaletteManagerSwatch[] = [];
    for (const { card, id } of copies) {
      const copy = card.swatches.filter((swatch) => swatch.id === id)[0];
      if (!copy) continue;
      if (copiedCards.indexOf(card) === -1) copiedCards.push(card);
      copiedSwatches.push(copy);
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

  function filterPalettes(reveal?: PaletteManagerCard, contentChanged = false): void {
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

      if (queryChanged || contentChanged) card.setSearchExpanded(hasColorMatch);

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

  function forgetSwatch(entry: PaletteManagerSwatch): void {
    if (lastClick && lastClick.swatch === entry) lastClick = unset;
    if (pendingScroll === entry.widget) pendingScroll = unset;
    if (selectionAnchor && selectionAnchor.swatch === entry) selectionAnchor = unset;
    const index = selectedSwatches.indexOf(entry);
    if (index !== -1) selectedSwatches.splice(index, 1);
    if (selectedSwatch === entry) selectedSwatch = unset;
  }

  function syncPaletteContents(): void {
    const existing: { [id: string]: PaletteManagerCard } = {};
    for (const card of cards) existing[':' + card.id] = card;

    let searchChanged = false;
    const next = paletteManager.getAll(true).map((palette) => {
      const key = ':' + palette.id;
      const card = existing[key];
      if (!card || card.isTexturePalette !== palette.isTexturePalette) return createCard(palette);
      delete existing[key];
      if (card.refresh(palette)) searchChanged = true;
      return card;
    });
    const cardsChanged = cards.length !== next.length || next.some((card, i) => cards[i] !== card);
    for (const key in existing) {
      const card = existing[key];
      for (const swatch of card.swatches) forgetSwatch(swatch);
      if (selectedCard === card) selectedCard = unset;
      if (revealedCard === card) revealedCard = unset;
      listColumn.value.removeWidget(card.element.value);
      card.element.value.hide();
      card.element.value.deleteLater();
    }
    if (cardsChanged) {
      cards = next;
      selectedCards = selectedCards.filter((card) => cards.indexOf(card) !== -1);
      empty.value.text = cards.length
        ? 'No palettes or colors match your search.'
        : 'No palettes in this scene.';
    }
    if (cardsChanged || (searchChanged && lastSearchQuery)) filterPalettes(revealedCard, true);
    if (!selectedSwatch && !selectedSwatches.length) {
      const current = cards.filter(
        (card) => card.id === activePaletteId && !card.isTexturePalette,
      )[0];
      if (current && current.swatches.some((entry) => entry.id === activeColorId)) {
        syncActiveSwatch(true);
      }
    }
    if (
      cardsChanged ||
      previousSelectedCards.length !== selectedCards.length ||
      previousSelectedSwatches.length !== selectedSwatches.length
    ) {
      refreshSelectionState();
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
    let name = palette.name;
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
        toolTip={`Add a color to ${name}`}
        accessibleName={`Add a color to ${name}`}
        autoDefault={false}
        onClicked={() => runColorAction(addColor)}
      />
    ).value;
    addColorButton.setFixedSize(swatchSize, swatchSize);
    const title = (
      <label
        objectName="paletteTitle"
        textFormat={$.Qt.PlainText}
        text={name}
        wordWrap={true}
        stretch={1}
      />
    );
    const cardColumn = (
      <column parent={card.value} spacing={9} alignment={0}>
        <row spacing={6}>
          {chevron}
          {title}
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
      refresh: refreshCard,
    };
    let columns = 0;
    updateColorCount();
    layoutSwatches(12);
    grid.resizeEvent = function () {
      layoutSwatches(
        $.Math.max(1, $.Math.floor((grid.width + swatchGap) / (swatchSize + swatchGap))),
      );
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
      card.value.styleSheet = `QWidget#paletteCard { background: #4e4e4e; border: 1px solid ${border}; border-radius: 13px; }`;
    }

    function updateColorCount(): void {
      colorCount.value.text = swatches.length + (swatches.length === 1 ? ' color' : ' colors');
    }

    function layoutSwatches(nextColumns: number, countChanged = false): void {
      if (columns === nextColumns && !countChanged) return;
      columns = nextColumns;
      const step = swatchSize + swatchGap;
      const rows = $.Math.ceil((swatches.length + 1) / columns);
      grid.setFixedHeight(rows * step - swatchGap);
      for (let i = 0; i < swatches.length; i++) {
        swatches[i].widget.move((i % columns) * step, $.Math.floor(i / columns) * step);
      }
      addColorButton.move(
        (swatches.length % columns) * step,
        $.Math.floor(swatches.length / columns) * step,
      );
    }

    function resolvePalette(): PaletteInstance | undefined {
      return paletteManager.getById(paletteId) || unset;
    }

    function refreshCard(current: PaletteInstance): boolean {
      const currentName = current.name;
      let searchChanged = currentName !== name;
      if (searchChanged) {
        name = currentName;
        cardState.name = name.toLowerCase();
        title.value.text = name;
        addColorButton.toolTip = addColorButton.accessibleName = `Add a color to ${name}`;
        updateExpansion();
      }

      const existing: { [id: string]: PaletteManagerSwatch } = {};
      for (const entry of swatches) existing[':' + entry.id] = entry;
      const next: PaletteManagerSwatch[] = [];
      const added: PaletteManagerSwatch[] = [];
      for (const color of current.getColors()) {
        const key = ':' + color.id;
        let entry = existing[key];
        if (entry) {
          delete existing[key];
          if (entry.refresh(color)) searchChanged = true;
        } else {
          entry = createSwatch(color);
          added.push(entry);
          searchChanged = true;
        }
        next.push(entry);
      }
      for (const key in existing) {
        discardSwatch(existing[key]);
        searchChanged = true;
      }
      if (swatches.length !== next.length || next.some((entry, i) => swatches[i] !== entry)) {
        swatches.length = 0;
        for (const entry of next) swatches.push(entry);
        updateColorCount();
        layoutSwatches(columns, true);
        for (const entry of added) entry.widget.show();
      }
      return searchChanged;
    }

    function addColor(): void {
      const target = resolvePalette();
      if (!target) return;
      const color = changePalette(target, 'Add Palette Color', function () {
        const existingNames = target.getColors().map((entry) => entry.name);
        let colorName = 'New Color';
        for (let suffix = 2; existingNames.indexOf(colorName) !== -1; suffix++) {
          colorName = `New Color ${suffix}`;
        }
        const created: PaletteColorInstance = target.createSolidColor(colorName, {
          r: 128,
          g: 128,
          b: 128,
          a: 255,
        });
        if (!created || !created.id)
          throw new ScriptError(`Could not add a solid color to "${name}".`);
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
              `Could not delete "${entry.widget.accessibleName}" from "${name}".`,
            );
          }
          return true;
        })
      )
        return;

      swatches.splice(index, 1);
      discardSwatch(entry);
      if (!selectedSwatches.some((selected) => swatches.indexOf(selected) !== -1)) {
        selectedCards = selectedCards.filter((owner) => owner !== cardState);
        if (selectedCard === cardState) selectedCard = unset;
      }
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

    function discardSwatch(entry: PaletteManagerSwatch): void {
      forgetSwatch(entry);
      entry.widget.hide();
      entry.widget.deleteLater();
    }

    function duplicateSwatch(entry: PaletteManagerSwatch): string {
      const target = resolvePalette();
      const errorMessage = `Could not duplicate "${entry.widget.accessibleName}" from "${name}".`;
      const id = target && target.withLock(function () {
        const source = target.getColorById(entry.id);
        if (!source) throw new ScriptError(errorMessage);
        const baseName = `${source.name || 'Unnamed color'}_copy`;
        const existingNames = target.getColors().map((color) => color.name);
        let uniqueName = baseName;
        for (let suffix = 2; existingNames.indexOf(uniqueName) !== -1; suffix++) {
          uniqueName = `${baseName}_${suffix}`;
        }
        const created = target.duplicateColor(source);
        if (!created || !created.id) throw new ScriptError(errorMessage);
        created.name = uniqueName;
        return created.id;
      });
      if (!id) throw new ScriptError(errorMessage);
      return id;
    }

    function createSwatch(color: PaletteColorInstance): PaletteManagerSwatch {
      // Store plain data because undo can replace Harmony's native color object.
      let appearance = readSwatchAppearance(color);
      let fill = swatchFill(appearance);
      const swatch: QPushButton = (
        <pushButton
          parent={grid}
          objectName="paletteSwatch"
          text={appearance.texture ? 'Tex' : ''}
          accessibleName={appearance.name}
          autoDefault={false}
          toolTip={swatchTooltip(appearance, fill)}
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
        const menu = new Menu(dialog);
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
      let selected = false;
      let searchMatch = false;
      const entry: PaletteManagerSwatch = {
        id: colorId,
        name: appearance.name.toLowerCase(),
        widget: swatch,
        edit: function () {
          if (appearance.texture) return;
          if (isGradient(appearance.type)) {
            editGradientColor.open(resolvePalette, colorId, repaint);
          } else if (appearance.type === colorTypes.SOLID_COLOR) {
            editSolidColor.open(resolvePalette, colorId, repaint);
          }
        },
        refresh: refreshSwatch,
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

      function repaint(current: PaletteColorInstance): void {
        if (refreshSwatch(current) && lastSearchQuery) filterPalettes(revealedCard, true);
      }

      function refreshSwatch(current: PaletteColorInstance): boolean {
        const next = readSwatchAppearance(current);
        const nameChanged = next.name !== appearance.name;
        const colorChanged =
          next.type !== appearance.type ||
          next.texture !== appearance.texture ||
          !sameRgba(next.rgba, appearance.rgba) ||
          !sameStops(next.stops, appearance.stops);
        if (!nameChanged && !colorChanged) return false;
        appearance = next;
        entry.name = next.name.toLowerCase();
        if (nameChanged) swatch.accessibleName = next.name;
        if (colorChanged) {
          swatch.text = next.texture ? 'Tex' : '';
          const nextFill = swatchFill(next);
          if (nextFill !== fill) {
            fill = nextFill;
            paintSwatch();
          }
        }
        swatch.toolTip = swatchTooltip(next, fill);
        return nameChanged;
      }

      function activateSwatch(): void {
        if (closed) return;

        // Use native button activation so QtScript never overrides the swatch mouse events.
        const now = new Clock().getTime();
        const canEdit =
          !appearance.texture &&
          (appearance.type === colorTypes.SOLID_COLOR || isGradient(appearance.type));
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
        swatch.styleSheet = `QPushButton#paletteSwatch { border-radius: 6px; padding: 0; color: #c6c6c6; border: ${border}; background: ${fill}; }`;
      }
    }
  }

  function isGradient(type: HarmonyColorType): boolean {
    return type === colorTypes.LINEAR_GRADIENT || type === colorTypes.RADIAL_GRADIENT;
  }

  function sameRgba(left?: RgbColorInput, right?: RgbColorInput): boolean {
    return (
      left === right ||
      (!!left &&
        !!right &&
        left.r === right.r &&
        left.g === right.g &&
        left.b === right.b &&
        (left.a == null ? 255 : left.a) === (right.a == null ? 255 : right.a))
    );
  }

  function sameStops(left?: PaletteGradientStop[], right?: PaletteGradientStop[]): boolean {
    return (
      left === right ||
      (!!left &&
        !!right &&
        left.length === right.length &&
        left.every((stop, i) => stop.t === right[i].t && sameRgba(stop, right[i])))
    );
  }

  function readGradientStops(color: PaletteColorInstance): PaletteGradientStop[] {
    const source: PaletteGradientStop[] = color.colorData;
    if (!source) return [];
    return source
      .map((stop) => ({
        t: stop.t,
        r: stop.r,
        g: stop.g,
        b: stop.b,
        a: stop.a == null ? 255 : stop.a,
      }))
      .sort((a, b) => a.t - b.t);
  }

  function readSwatchAppearance(color: PaletteColorInstance): PaletteSwatchAppearance {
    const appearance: PaletteSwatchAppearance = {
      name: color.name || 'Unnamed color',
      type: color.colorType,
      texture: color.isTexture,
    };
    if (appearance.texture) return appearance;
    if (appearance.type === colorTypes.SOLID_COLOR) {
      const rgba: RgbColorInput = color.colorData;
      if (rgba) appearance.rgba = { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a };
    } else if (isGradient(appearance.type)) {
      appearance.stops = readGradientStops(color);
    }
    return appearance;
  }

  function swatchFill(color: PaletteSwatchAppearance): string {
    if (color.rgba) return swatchRgba(color.rgba);
    if (color.stops && color.stops.length) {
      const gradient =
        color.type === colorTypes.RADIAL_GRADIENT
          ? 'qradialgradient(cx:0.5, cy:0.5, radius:0.5, fx:0.5, fy:0.5'
          : 'qlineargradient(x1:0, y1:0, x2:0, y2:1';
      const entries = color.stops.map((stop) => `stop:${stop.t.toFixed(6)} ${swatchRgba(stop)}`);
      return `${gradient}, ${entries.join(', ')})`;
    }
    return '#444';
  }

  function swatchRgba(color: RgbColorInput): string {
    return `rgba(${[color.r, color.g, color.b, color.a == null ? 255 : color.a].join(',')})`;
  }

  function swatchTooltip(color: PaletteSwatchAppearance, fill: string): string {
    const name = color.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const title = `<b>${name}</b>`;
    if (color.texture) return `${title}<br>Texture`;

    let details: string;
    if (color.rgba) {
      const rgba = color.rgba;
      const hex = $.ColorUtils.rgbToHex(rgba.r, rgba.g, rgba.b).toUpperCase();
      const opacity = rgba.a == null ? 100 : $.Math.round((rgba.a * 100) / 255);
      details = `${hex} · ${opacity}% opacity`;
    } else if (isGradient(color.type)) {
      details = color.type === colorTypes.RADIAL_GRADIENT ? 'Radial gradient' : 'Linear gradient';
    } else {
      return title;
    }

    return (
      `<p style="margin-top:0; margin-bottom:4px;">${title}<br>${details}</p>` +
      `<table width="120" cellspacing="0" cellpadding="0" style="border:1px solid #696969;"><tr><td style="background-color:${fill};"></td></tr></table>`
    );
  }

  function changePalette<T>(palette: PaletteInstance, label: string, edit: () => T): T | null {
    return palette.withLock(() => withUndoGroup(label, edit));
  }

  function withUndoGroup<T>(label: string, edit: () => T): T {
    $.scene.beginUndoRedoAccum(label);
    try {
      const result = edit();
      $.scene.endUndoRedoAccum();
      return result;
    } catch (error) {
      $.scene.cancelUndoRedoAccum();
      throw error;
    }
  }

  function refreshEditorName(
    input: QLineEdit,
    edit: PaletteColorEdit,
    color: PaletteColorInstance,
  ): void {
    const name = color.name || '';
    if (name === edit.savedName) return;
    if (input.text === edit.savedName) input.text = name;
    edit.savedName = name;
  }

  function bindEditorHistory(editor: QDialog): void {
    bind('Ctrl+Z', false);
    bind('Ctrl+Y', true);
    bind('Ctrl+Shift+Z', true);

    function bind(key: string, redo: boolean): void {
      const shortcut = new QShortcut(editor);
      shortcut.key = new QKeySequence(key);
      shortcut.context = $.Qt.WindowShortcut;
      shortcut.autoRepeat = false;
      shortcut.activated.connect(function () {
        runColorAction(function () {
          if (
            !editor.visible ||
            !isCurrentScene() ||
            editSolidColor.isDragging() ||
            editGradientColor.isDragging()
          ) {
            return;
          }

          if (redo) $.scene.redo();
          else $.scene.undo();
          nextContentsRefresh = 0;
          editSolidColor.refresh();
          editGradientColor.refresh();
        });
      });
    }
  }

  function createPaletteColorEditor() {
    // Keep the picker and its QtScript callbacks alive for the lifetime of the panel.
    const editor = new $.QDialog(dialog);
    editor.objectName = 'paletteColorEditor';
    editor.windowTitle = 'Edit Palette Color';
    editor.modal = false;
    editor.styleSheet = `
      QDialog#paletteColorEditor { background: white; }
      QLineEdit#paletteColorName { background: white; color: #34383e; border: 1px solid #dedfe2; border-radius: 4px; padding-left: 5px; font-size: 13px; }
    `;
    const nameInput = new $.QLineEdit(editor);
    nameInput.objectName = 'paletteColorName';
    nameInput.accessibleName = 'Color name';
    nameInput.placeholderText = 'Color name';
    let active: PaletteColorEdit | undefined;
    let solidDragging = false;

    const picker = $.Widgets.ColorPicker.createWidget(editor, {
      focusAfterTextCommit: true,
      onColorDragStart: function () {
        if (solidDragging || !active) return;
        solidDragging = true;
        $.scene.beginUndoRedoAccum('Edit Palette Color');
      },
      onColorDrag: updateColor,
      onColorPick: updateColor,
      onColorDragEnd: finishDrag,
    });
    const nameAreaHeight = 44;
    nameInput.setGeometry(12, 12, picker.widget.width - 24, 28);
    picker.widget.move(0, nameAreaHeight);
    editor.setFixedSize(picker.widget.width, picker.widget.height + nameAreaHeight);
    nameInput.editingFinished.connect(commitName);
    bindEditorHistory(editor);
    editor.finished.connect(function () {
      try {
        finishDrag();
        commitName();
      } finally {
        active = unset;
      }
    });

    return { open, refresh, finishDrag, isDragging: () => solidDragging };

    function open(
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
      picker.widget.setFocus();
    }

    function finishDrag(): void {
      if (!solidDragging) return;
      solidDragging = false;
      $.scene.endUndoRedoAccum();
    }

    function refresh(): void {
      const edit = active;
      if (!edit || !editor.visible || solidDragging) return;
      const color = findColor(edit.resolvePalette(), edit.colorId);
      const value: RgbColorInput = color && color.colorData;
      if (!value) {
        active = unset;
        editor.close();
        return;
      }
      refreshEditorName(nameInput, edit, color);
      if (!sameRgba(picker.getColor(), value)) picker.setColor(value);
      edit.repaint(color);
    }

    function findColor(
      palette: PaletteInstance | undefined,
      colorId: string,
    ): PaletteColorInstance | undefined {
      const color: PaletteColorInstance = palette && palette.getColorById(colorId);
      return color && color.isSolid && !color.isTexture ? color : unset;
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
        $.MessageLog.trace(`Could not rename palette color ${edit.colorId}: ${error}`);
      }
      nameInput.text = edit.savedName;
      if (requested === edit.savedName && nameInput.focus) picker.widget.setFocus();
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
        const alpha = value.a;
        if (
          value.r === current.r &&
          value.g === current.g &&
          value.b === current.b &&
          alpha === currentAlpha
        )
          return;

        let updated: boolean;
        if (solidDragging) {
          currentColor.colorData = { r: value.r, g: value.g, b: value.b, a: alpha };
          updated = true;
        } else {
          updated = !!changePalette(palette, 'Edit Palette Color', function () {
            currentColor.colorData = { r: value.r, g: value.g, b: value.b, a: alpha };
            return true;
          });
        }
        if (updated) edit.repaint(currentColor);
      } catch (error) {
        $.MessageLog.trace(`Could not update palette color ${edit.colorId}: ${error}`);
      }
    }
  }

  function createPaletteGradientEditor() {
    const editor: QDialog = (
      <dialog
        parent={dialog}
        objectName="paletteGradientEditor"
        windowTitle="Edit Palette Gradient"
        modal={false}
        styleSheet={`QDialog#paletteGradientEditor { background: white; }
          QLineEdit#paletteGradientName { background: white; color: #34383e; border: 1px solid #dedfe2; border-radius: 4px; padding-left: 5px; font-size: 13px; }`}
      />
    ).value;

    const nameInputElement = (
      <lineEdit
        parent={editor}
        objectName="paletteGradientName"
        accessibleName="Gradient name"
        placeholderText="Gradient name"
        onEditingFinished={commitName}
      />
    );
    const nameInput = nameInputElement.value;
    nameInput.setFixedSize(220, 28);

    let active: PaletteColorEdit | undefined;
    let stops: PaletteGradientStop[] = [];
    let activeStop: PaletteGradientStop | undefined;
    let handleWidgets: QWidget[] = [];
    let dragging = false;
    let draggingStop: PaletteGradientStop | undefined;
    let draggingStopBeforeRelease: PaletteGradientStop | undefined;
    let gradientPickerDragging = false;
    const activeGradientStopIndex = createSignal(-1);
    const canAddGradientStop = createSignal(true);
    const canDeleteGradientStop = createSignal(false);

    const gradientPanelElement = <qwidget parent={editor} objectName="paletteGradientPanel" />;
    const gradientPanel = gradientPanelElement.value;
    gradientPanel.setFixedSize(220, 62);
    gradientPanel.setAttribute($.Qt.WA_StyledBackground, true);
    gradientPanel.styleSheet =
      'QWidget#paletteGradientPanel { background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; }';

    const track: QWidget = (<qwidget parent={gradientPanel} objectName="paletteGradientTrack" />)
      .value;
    track.setGeometry(10, 10, 200, 18);
    track.setAttribute($.Qt.WA_StyledBackground, true);
    if (typeof track.setMouseTracking === 'function') track.setMouseTracking(true);
    track.toolTip = 'Click near an existing handle to select it; click elsewhere to add a stop';
    const hoverLine = new $.QLabel('', track);
    hoverLine.setGeometry(0, 0, 2, 18);
    hoverLine.setAttribute($.Qt.WA_StyledBackground, true);
    hoverLine.setAttribute($.Qt.WA_TransparentForMouseEvents, true);
    hoverLine.styleSheet = 'QLabel { background: white; border: none; }';
    hoverLine.hide();
    let cursorHoverTimer: any;
    function getCursorPosition(): any {
      if ($.QCursor && typeof $.QCursor.pos === 'function') return $.QCursor.pos();
      if (typeof QApplication.cursor === 'function') {
        const cursor = QApplication.cursor();
        if (cursor && typeof cursor.pos === 'function') return cursor.pos();
      }
      return unset;
    }
    function updateHoverFromCursor(): void {
      if (closed || !editor.visible || dragging) return;
      const cursorPos = getCursorPosition();
      if (!cursorPos || typeof track.mapFromGlobal !== 'function') return;
      const local = track.mapFromGlobal(cursorPos);
      const x = typeof local.x === 'function' ? local.x() : local.x;
      const y = typeof local.y === 'function' ? local.y() : local.y;
      if (x < 0 || y < 0 || x > 200 || y > 18) {
        hoverLine.hide();
        return;
      }
      const clampedX = $.Math.max(0, $.Math.min(200, x));
      hoverLine.move(clampedX - 1, 0);
      hoverLine.show();
      hoverLine.raise();
    }
    cursorHoverTimer = new $.QTimer(editor);
    cursorHoverTimer.timeout.connect(updateHoverFromCursor);
    editor.finished.connect(function () {
      try {
        finishDrag();
        commitName();
      } finally {
        cursorHoverTimer.stop();
        hoverLine.hide();
        active = unset;
      }
    });

    const addStopButton = (
      <pushButton
        parent={gradientPanel}
        text="+"
        toolTip="Add gradient stop"
        accessibleName="Add gradient stop"
        autoDefault={false}
        enabled={canAddGradientStop}
        styleSheet={`QPushButton { border: 1px solid #d9d9d9; border-radius: 4px; background: #f5f5f5; color: #333; }
          QPushButton:hover { background: #e6e6e6; }
          QPushButton:pressed { background: #d9d9d9; }`}
        onClicked={() => {
          if (stops.length >= 32) return;
          const selected = activeStop;
          let t = selected ? selected.t : 0.5;
          if (selected && selected.t < 1) {
            t = $.Math.min(1, selected.t + 0.1);
          } else {
            t = stops.length
              ? $.Math.min(1, $.Math.max(0, (stops[stops.length - 1].t + 1) * 0.5))
              : 0.5;
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
              r: $.Math.round(before.r + (after.r - before.r) * ratio),
              g: $.Math.round(before.g + (after.g - before.g) * ratio),
              b: $.Math.round(before.b + (after.b - before.b) * ratio),
              a: $.Math.round(
                (before.a == null ? 255 : before.a) +
                  ((after.a == null ? 255 : after.a) - (before.a == null ? 255 : before.a)) * ratio,
              ),
            };
          } else if (before) {
            color = {
              r: before.r,
              g: before.g,
              b: before.b,
              a: before.a == null ? 255 : before.a,
            };
          } else if (after) {
            color = { r: after.r, g: after.g, b: after.b, a: after.a == null ? 255 : after.a };
          } else {
            color = { r: 128, g: 128, b: 128, a: 255 };
          }
          activeStop = { t, r: color.r, g: color.g, b: color.b, a: color.a };
          stops.push(activeStop);
          stops.sort((a, b) => a.t - b.t);
          commitStops('Add Gradient Stop');
        }}
      />
    ).value;
    addStopButton.setGeometry(10, 32, 28, 24);

    const deleteStopButton = (
      <pushButton
        parent={gradientPanel}
        text="-"
        toolTip="Delete selected gradient stop"
        accessibleName="Delete selected gradient stop"
        autoDefault={false}
        enabled={canDeleteGradientStop}
        styleSheet={`QPushButton { border: 1px solid #d9d9d9; border-radius: 4px; background: #f5f5f5; color: #333; }
          QPushButton:hover { background: #e6e6e6; }
          QPushButton:pressed { background: #d9d9d9; }`}
        onClicked={() => {
          deleteStop(activeStop);
        }}
      />
    ).value;

    deleteStopButton.setGeometry(42, 32, 28, 24);
    let picker: ColorPickerWidget;
    const pickerSlot = (
      <$.Widgets.ColorPicker.View
        parent={editor}
        ref={(widget) => {
          picker = widget;
        }}
        options={{
          focusAfterTextCommit: true,
          onColorDragStart: function () {
            if (gradientPickerDragging || !active) return;
            gradientPickerDragging = true;
            $.scene.beginUndoRedoAccum('Edit Palette Gradient');
          },
          onColorDrag: updateActiveStop,
          onColorPick: function (value) {
            updateActiveStop(value);
            if (!gradientPickerDragging) commitStops('Edit Palette Gradient');
          },
          onColorDragEnd: function () {
            finishDrag();
          },
        }}
      />
    );
    const gradientColumn = (
      <column parent={editor} spacing={8} alignment={4}>
        {nameInputElement}
        {pickerSlot}
        {gradientPanelElement}
      </column>
    );
    gradientColumn.value.setContentsMargins(0, 0, 0, 0);
    editor.setFixedSize(picker.widget.width, 408);
    bindEditorHistory(editor);
    track.mousePressEvent = function (event: any): void {
      if (draggingStop) return;
      if (event.button && event.button() !== $.Qt.LeftButton) return;
      picker.widget.setFocus();
      const x = event.x();
      const t = $.Math.max(0, $.Math.min(1, x / 200));
      let nearest: PaletteGradientStop | undefined;
      let nearestDistance = 101;
      for (const stop of stops) {
        const distance = $.Math.abs(stop.t - t) * 200;
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
            r: $.Math.round(before.r + (after.r - before.r) * ratio),
            g: $.Math.round(before.g + (after.g - before.g) * ratio),
            b: $.Math.round(before.b + (after.b - before.b) * ratio),
            a: $.Math.round(
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
      const x = event.x();
      const clampedX = $.Math.max(0, $.Math.min(200, x));
      hoverLine.move(clampedX - 1, 0);
      hoverLine.show();
      hoverLine.raise();
      if (!dragging || !draggingStop) return;
      draggingStop.t = $.Math.max(0, $.Math.min(1, x / 200));
      stops.sort((a, b) => a.t - b.t);
      writeGradientPreview();
      updateGradientVisuals();
    };

    track.leaveEvent = function (): void {
      if (!dragging) hoverLine.hide();
    };

    track.mouseReleaseEvent = function (event: any): void {
      if (!dragging) return;
      const releasedBelowTrack = typeof event.y === 'function' ? event.y() > 30 : false;
      finishDrag(releasedBelowTrack);
      render();
    };

    return { open, refresh, finishDrag, isDragging };

    function open(
      resolvePalette: () => PaletteInstance | undefined,
      colorId: string,
      repaint: (color: PaletteColorInstance) => void,
    ): void {
      if (editor.visible) {
        editor.raise();
        editor.activateWindow();
        return;
      }
      const gradient = findGradient(resolvePalette(), colorId);
      if (!gradient) return;

      stops = readGradientStops(gradient);
      if (!stops.length) return;
      const savedName = gradient.name || '';
      nameInput.text = savedName;
      active = { resolvePalette, colorId, repaint, savedName };
      selectStop(stops[0]);
      editor.show();
      picker.widget.setFocus();
      cursorHoverTimer.start(30);
    }

    function isDragging(): boolean {
      return dragging || gradientPickerDragging;
    }

    function finishDrag(deleteDraggedStop = false): void {
      if (!isDragging()) return;
      const stopToDelete = deleteDraggedStop && draggingStopBeforeRelease;
      const label = dragging ? 'Move Gradient Stop' : 'Edit Palette Gradient';
      if (dragging && typeof track.releaseMouse === 'function') track.releaseMouse();
      dragging = gradientPickerDragging = false;
      draggingStop = draggingStopBeforeRelease = unset;
      try {
        if (stopToDelete && stops.length > 2) deleteStop(stopToDelete, true);
        else commitStops(label, true);
      } finally {
        $.scene.endUndoRedoAccum();
      }
    }

    function refresh(): void {
      const edit = active;
      if (!edit || !editor.visible || isDragging()) return;
      const gradient = findGradient(edit.resolvePalette(), edit.colorId);
      const next = gradient && readGradientStops(gradient);
      if (!next || !next.length) {
        active = unset;
        editor.close();
        return;
      }
      refreshEditorName(nameInput, edit, gradient);
      if (!sameStops(next, stops)) {
        const selected = activeStop && findRestoredStop(next, activeStop);
        stops = next;
        const stop = selected || stops[0];
        selectStop(stop, !sameRgba(picker.getColor(), stop));
      }
      edit.repaint(gradient);
    }

    function findRestoredStop(
      next: PaletteGradientStop[],
      previous: PaletteGradientStop,
    ): PaletteGradientStop {
      const atSamePosition = next.filter((stop) => stop.t === previous.t);
      const exact = atSamePosition.filter((stop) => sameRgba(stop, previous))[0];
      if (exact || atSamePosition.length) return exact || atSamePosition[0];
      if (next.length === stops.length) {
        const sameColor = next.filter((stop) => sameRgba(stop, previous));
        return sameColor.length === 1 ? sameColor[0] : next[stops.indexOf(previous)];
      }
      return next.reduce((nearest, stop) =>
        $.Math.abs(stop.t - previous.t) < $.Math.abs(nearest.t - previous.t) ? stop : nearest,
      );
    }

    function selectStop(stop: PaletteGradientStop, refreshPicker = true): void {
      activeStop = stop;
      refreshGradientControls();
      if (refreshPicker) picker.setColor(stop);
      render();
    }

    function refreshGradientControls(): void {
      canAddGradientStop.set(stops.length < 32);
      canDeleteGradientStop.set(!!activeStop && stops.length > 2);
      activeGradientStopIndex.set(activeStop ? stops.indexOf(activeStop) : -1);
    }

    function updateActiveStop(value: ColorPickerValue): void {
      if (!activeStop) return;
      activeStop.r = value.r;
      activeStop.g = value.g;
      activeStop.b = value.b;
      activeStop.a = value.a;
      render();
      if (gradientPickerDragging) writeGradientPreview();
    }

    function writeGradientPreview(): void {
      const edit = active;
      if (!edit || closed) return;
      const gradient = findGradient(edit.resolvePalette(), edit.colorId);
      if (gradient) gradient.colorData = stops.slice();
    }

    function deleteStop(stop: PaletteGradientStop | undefined, undoAccumManaged = false): void {
      if (!stop || stops.length <= 2) return;
      const index = stops.indexOf(stop);
      if (index === -1) return;
      stops.splice(index, 1);
      activeStop = stops[$.Math.min(index, stops.length - 1)];
      if (activeStop)
        picker.setColor({
          r: activeStop.r,
          g: activeStop.g,
          b: activeStop.b,
          a: activeStop.a,
        });
      commitStops('Delete Gradient Stop', undoAccumManaged);
    }

    function commitStops(label: string, undoAccumManaged = false): void {
      const edit = active;
      if (!edit || closed) return;
      const palette = edit.resolvePalette();
      const gradient = findGradient(palette, edit.colorId);
      if (!gradient) return;
      if (undoAccumManaged) {
        gradient.colorData = stops.slice().sort((a, b) => a.t - b.t);
        edit.repaint(gradient);
      } else {
        const updated = changePalette(palette, label, function () {
          gradient.colorData = stops.slice().sort((a, b) => a.t - b.t);
          return true;
        });
        if (updated) edit.repaint(gradient);
      }
      refreshGradientControls();
      render();
    }

    function findGradient(
      palette: PaletteInstance | undefined,
      colorId: string,
    ): PaletteColorInstance | undefined {
      const color: PaletteColorInstance = palette && palette.getColorById(colorId);
      return color && !color.isTexture && isGradient(color.colorType) ? color : unset;
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
      if (requested === edit.savedName && nameInput.focus) picker.widget.setFocus();
    }

    function updateGradientVisuals(): void {
      const sorted = stops.slice().sort((a, b) => a.t - b.t);
      const entries = sorted.map(
        (stop) =>
          `stop:${stop.t.toFixed(6)} rgba(${[
            stop.r,
            stop.g,
            stop.b,
            stop.a == null ? 255 : stop.a,
          ].join(',')})`,
      );
      track.styleSheet = `QWidget { border: 1px solid #777; border-radius: 4px; background: qlineargradient(x1:0, y1:0, x2:1, y2:0, ${entries.join(', ')}); }`;
      for (const handle of handleWidgets) {
        const stop = (handle as any).__gradientStop as PaletteGradientStop | undefined;
        if (!stop) continue;
        handle.move($.Math.round(stop.t * 200) + 4, 28);
      }
    }

    function render(): void {
      const sorted = stops.slice().sort((a, b) => a.t - b.t);
      const entries = sorted.map(
        (stop) =>
          `stop:${stop.t.toFixed(6)} rgba(${[
            stop.r,
            stop.g,
            stop.b,
            stop.a == null ? 255 : stop.a,
          ].join(',')})`,
      );
      track.styleSheet = `QWidget { border: 1px solid #777; border-radius: 4px; background: qlineargradient(x1:0, y1:0, x2:1, y2:0, ${entries.join(', ')}); }`;

      for (let i = 0; i < sorted.length; i++) {
        const stop = sorted[i];
        let handle = handleWidgets[i];
        if (!handle) {
          handle = new $.QLabel('', gradientPanel);
          handle.setAttribute($.Qt.WA_StyledBackground, true);
          handleWidgets.push(handle);
        }
        handle.setGeometry($.Math.round(stop.t * 200) + 4, 28, 12, 12);
        (handle as any).__gradientStop = stop;
        handle.styleSheet = `QLabel { border: 2px solid ${stop === activeStop ? '#111' : '#777'}; border-radius: 6px; background: rgba(${[
          stop.r,
          stop.g,
          stop.b,
          stop.a == null ? 255 : stop.a,
        ].join(',')}); }`;
        handle.show();

        handle.mousePressEvent = function (event: any): void {
          if (event.button && event.button() !== $.Qt.LeftButton) return;
          picker.widget.setFocus();
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
  let nextContentsRefresh = 0;
  colorTimer.timeout.connect(function () {
    refreshActiveSwatch();
    if (closed) return;
    runColorAction(function () {
      editSolidColor.refresh();
      editGradientColor.refresh();
      const now = new Clock().getTime();
      if (
        now >= nextContentsRefresh &&
        !editSolidColor.isDragging() &&
        !editGradientColor.isDragging()
      ) {
        nextContentsRefresh = now + 1000;
        syncPaletteContents();
      }
    });
    const target = pendingScroll;
    pendingScroll = unset;
    if (!closed && target && target.visible) scroll.value.ensureWidgetVisible(target, 0, 18);
  });
  dialog.finished.connect(function () {
    closed = true;
    colorTimer.stop();
    editSolidColor.finishDrag();
    editGradientColor.finishDrag();
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
  nextContentsRefresh = new Clock().getTime() + 1000;
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
