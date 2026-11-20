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

interface PaletteJson {
  version: 1;
  id: string;
  name: string;
  type: 'color' | 'texture';
  colors: { id: string; name: string; type: string; data: unknown }[];
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
  hex(): string;
  edit(): void;
  refresh(color: PaletteColorInstance): boolean;
  setSelected(selected: boolean): void;
  setSearchMatch(matched: boolean): void;
}

interface PaletteSwatchGesture {
  swatch: PaletteManagerSwatch;
  x: number;
  y: number;
  modifiers: { shift: boolean; ctrl: boolean };
  dragging: boolean;
  cancel(): void;
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
  const RenameInput = Input;
  const TempFile = TemporaryFile;
  const app = QApplication;
  const qtGlobals = Function('return this;')().__proto__;
  const Icon = qtGlobals.QIcon;
  const Size = qtGlobals.QSize;
  const iconFolder = specialFolders.userScripts + '/script-icons/ui/';
  const iconSize = new Size(16, 16);
  function loadPaletteIcon(name: string): any {
    const icon = new Icon(iconFolder + name + '.svg');
    return icon.pixmap(iconSize, Icon.Normal, Icon.Off).isNull()
      ? new Icon(iconFolder + 'raster/' + name + '.png')
      : icon;
  }
  const icons = {
    search: loadPaletteIcon('search'),
    expand: loadPaletteIcon('chevron-right'),
    collapse: loadPaletteIcon('chevron-left'),
    pin: loadPaletteIcon('pin'),
    download: loadPaletteIcon('download'),
    remove: loadPaletteIcon('trash'),
    duplicate: loadPaletteIcon('copy'),
  };
  const mainWindow = QApplication.activeWindow();
  const projectPath = $.scene.currentProjectPath();
  const paletteFolder = projectPath.replace(/[\\/]+$/, '') + '/palette-library';
  const versionName = $.scene.currentVersionName();
  const pinKey = 'TB_PALETTE_MANAGER_PINS:' + projectPath + '/' + versionName;
  let pinnedIds: string[] = [];
  try {
    const savedPins = $.JSON.parse($.preferences.getString(pinKey, '[]'));
    if ($.Array.isArray(savedPins)) pinnedIds = savedPins.filter((id) => typeof id === 'string');
  } catch (error) {
    $.MessageLog.trace('Palette Manager could not read pinned palettes: ' + error);
  }
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
  let swatchGesture: PaletteSwatchGesture | undefined;
  const Clock = Date;
  const clickInterval =
    typeof app.doubleClickInterval === 'function' ? app.doubleClickInterval() : app.doubleClickInterval;
  const doubleClickInterval =
    typeof clickInterval === 'number' && clickInterval > 0 ? clickInterval : 400;
  const platformDragDistance =
    typeof app.startDragDistance === 'function' ? app.startDragDistance() : app.startDragDistance;
  const dragDistance =
    typeof platformDragDistance === 'number' && platformDragDistance > 0 ? platformDragDistance : 10;
  let closed = false;
  const styleSheet = `
    QDialog#scenePaletteManager { background: #414141; }
    QWidget#paletteSearchBox { background: #4e4e4e; border: 1px solid #676767; border-radius: 12px; }
    QLabel#paletteSearchIcon { background: transparent; }
    QLineEdit#paletteSearch { background: transparent; color: white; border: none; padding: 0; font-size: 15px; }
    QPushButton#paletteToolbarButton { background: #4e4e4e; color: #eee; border: none; outline: none; border-radius: 9px; font-size: 20px; }
    QPushButton#paletteToolbarButton:hover, QPushButton#paletteToolbarButton:focus { background: #656565; }
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
    QPushButton#paletteAction { border: none; outline: none; border-radius: 5px; background: #555; color: #a8a8a8; }
    QPushButton#paletteAction:hover, QPushButton#paletteAction:focus { background: #656565; }
    QPushButton#paletteAction:checked { background: #52677b; }
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
  const searchBox = <qwidget objectName="paletteSearchBox" minimumHeight={42} stretch={1} />;
  searchBox.value.setAttribute($.Qt.WA_StyledBackground, true);
  const searchIcon = <label objectName="paletteSearchIcon" />;
  searchIcon.value.pixmap = icons.search.pixmap(iconSize, Icon.Normal, Icon.Off);
  searchIcon.value.setFixedSize(16, 16);
  const search = (
    <lineEdit
      objectName="paletteSearch"
      placeholderText="Search palettes and colors..."
      accessibleName="Search palettes and colors"
      clearButtonEnabled={true}
      stretch={1}
      onTextChanged={updateSearch}
    />
  );
  const searchLayout = (
    <row parent={searchBox.value} spacing={9} alignment={$.Qt.AlignmentFlag.AlignVCenter}>
      {searchIcon}
      {search}
    </row>
  );
  searchLayout.value.setContentsMargins(12, 0, 10, 0);
  const addPaletteButton = (
    <pushButton
      objectName="paletteToolbarButton"
      text="+"
      autoDefault={false}
      toolTip="Add palette"
      accessibleName="Add palette"
      onClicked={() => runColorAction(addPalette, true)}
    />
  );
  const paletteMenuButton = (
    <pushButton
      objectName="paletteToolbarButton"
      text="⋯"
      autoDefault={false}
      toolTip="Palette options"
      accessibleName="Palette options"
      onClicked={() => runColorAction(openPaletteMenu, true)}
    />
  );
  addPaletteButton.value.setFixedSize(42, 42);
  paletteMenuButton.value.setFixedSize(42, 42);
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
      <row spacing={8} alignment={$.Qt.AlignmentFlag.AlignVCenter}>
        {searchBox}
        {addPaletteButton}
        {paletteMenuButton}
      </row>
      {scroll}
      {selectionCount}
    </column>
  );
  dialogColumn.value.setContentsMargins(18, 18, 18, 18);

  function runColorAction(action: () => void, reportError = false): void {
    if (closed) return;
    try {
      action();
    } catch (error) {
      if (reportError) showPaletteProblem(String(error));
      $.MessageLog.trace(`Palette Manager: ${error}`);
    }
  }

  function showPaletteProblem(message: string): void {
    $.Utils.confirm(message, 'Palette Manager', 'OK', '');
  }

  function executePaletteMenu(menu: QMenu, position?: any): QAction {
    try {
      return position ? menu.exec(position) : menu.exec();
    } finally {
      menu.deleteLater();
    }
  }

  function openPaletteMenu(): void {
    const menu = new Menu(dialog);
    const plt = menu.addAction('Download all palettes (.plt)');
    const json = menu.addAction('Download all palettes (JSON)');
    const folder = menu.addAction('Open palette folder');
    const load = menu.addAction('Import palettes…');
    plt.enabled = json.enabled = cards.length > 0;
    const button = paletteMenuButton.value;
    const Point = qtGlobals.QPoint;
    const position = Point ? button.mapToGlobal(new Point(0, button.height)) : unset;
    const action = executePaletteMenu(menu, position);
    if (action === plt) downloadAllPalettes('.plt');
    if (action === json) downloadAllPalettes('.json');
    if (action === folder && isCurrentScene()) {
      ensurePaletteDirectory(paletteFolder);
      if (!$.Utils.openInFileExplorertoast(paletteFolder)) {
        throw new ScriptError('Could not open "' + paletteFolder + '" in File Explorer.');
      }
    }
    if (action === load) importPalettes();
  }

  function ensurePaletteDirectory(path: string): void {
    if (!new $.QDir().mkpath(path)) throw new ScriptError('Could not open or create "' + path + '".');
  }

  function safePaletteName(name: string): string {
    const cleaned = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '');
    return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(cleaned)
      ? '_' + cleaned
      : cleaned || 'New Palette';
  }

  function paletteStem(directory: string, name: string): string {
    return directory.replace(/[\\/]+$/, '') + '/' + name;
  }

  function pathTaken(stem: string, extension: '.plt' | '.json'): boolean {
    return new $.QFile(stem + extension).exists() ||
      (extension === '.plt' && (
        new $.QDir(stem + '_textures').exists() || new $.QFile(stem + '_textures').exists()
      ));
  }

  function nextPaletteName(directory: string, name: string, extension: '.plt' | '.json', sceneNames: string[] = []): string {
    const base = safePaletteName(name);
    let candidate = base;
    for (let suffix = 2; sceneNames.indexOf(candidate.toLowerCase()) !== -1 ||
      pathTaken(paletteStem(directory, candidate), extension); suffix++) {
      candidate = base + '_' + suffix;
    }
    return candidate;
  }

  function scenePaletteNames(): string[] {
    return paletteManager.getAll(true).map((palette) => palette.name.toLowerCase());
  }

  function withScenePaletteList<T>(label: string, edit: (list: PaletteList) => T): T {
    const list = $.PaletteObjectManager.getScenePaletteList();
    if (!list.getLock()) throw new ScriptError('Could not lock the scene palette list.');
    try {
      return withUndoGroup(label, () => edit(list));
    } finally {
      list.releaseLock();
    }
  }

  function newScenePalette(list: PaletteList, name: string): PaletteInstance {
    const location = $.PaletteObjectManager.Constants.Location.SCENE;
    const native = list.createPaletteAtLocation(location, -1, name);
    const palette = native && new paletteKit.Palette(native);
    if (!palette || !palette.isValid || !palette.id) {
      throw new ScriptError('Could not create "' + name + '" in the scene palette library.');
    }
    return palette;
  }

  function addPalette(): void {
    if (!isCurrentScene() || editSolidColor.isDragging() || editGradientColor.isDragging()) return;
    ensurePaletteDirectory(paletteFolder);
    const id = withScenePaletteList('Add Palette', (list) => {
      const name = nextPaletteName(paletteFolder, 'New Palette', '.plt', scenePaletteNames());
      return newScenePalette(list, name).id;
    });
    revealNewPalette(id);
  }

  function revealNewPalette(id: string): void {
    syncPaletteContents();
    const card = cards.filter((entry) => entry.id === id)[0];
    if (!card) return;
    if (lastSearchQuery) filterPalettes(card);
    setSelection(card);
    pendingScroll = card.element.value;
  }

  function writePaletteJson(palette: PaletteInstance, path: string): void {
    const data: PaletteJson = {
      version: 1,
      id: palette.id,
      name: palette.name,
      type: palette.isTexturePalette ? 'texture' : 'color',
      colors: palette.getColors().map(serializeColor),
    };
    const file = new $.PermanentFile(path);
    file.setTextCodec('UTF-8');
    if (!file.open(2)) throw new ScriptError('Could not write "' + path + '".');
    let saved: boolean;
    try {
      file.write($.JSON.stringify(data, null, 2) + '\n');
    } finally {
      saved = file.close();
    }
    if (saved === false) throw new ScriptError('Could not close "' + path + '" after writing.');
  }

  // Harmony keeps the bitmap files beside the PLT in a matching _textures directory.
  function copyNativePalette(sourcePath: string, destStem: string): () => void {
    const sourceStem = sourcePath.slice(0, -4);
    const copies: string[] = [];
    const sourceTextures = new $.QDir(sourceStem + '_textures');
    const destTextures = destStem + '_textures';
    let createdTextureDir = false;
    function copy(source: string, dest: string): void {
      if (!$.Utils.copyFile(source, dest)) throw new ScriptError('Could not copy "' + source + '".');
      copies.push(dest);
    }
    function rollback(): void {
      for (const path of copies) new $.PermanentFile(path).remove();
      if (createdTextureDir) new $.QDir().rmdir(destTextures);
    }
    try {
      if (sourceTextures.exists()) {
        // mkdir fails if another file operation has already claimed this directory.
        if (!new $.QDir().mkdir(destTextures)) {
          throw new ScriptError('Could not create "' + destTextures + '".');
        }
        createdTextureDir = true;
        for (const file of sourceTextures.entryList(['*'], $.QDir.Files, $.QDir.Name)) {
          copy(sourceStem + '_textures/' + file, destTextures + '/' + file);
        }
      }
      copy(sourcePath, destStem + '.plt');
    } catch (error) {
      rollback();
      throw error;
    }
    return rollback;
  }

  function downloadAllPalettes(extension: '.plt' | '.json'): void {
    if (!isCurrentScene()) return;
    const title = extension === '.plt' ? 'Download All Palettes (.plt)' : 'Download All Palettes (JSON)';
    const directory = $.FileDialog.getExistingDirectory(projectPath, title, dialog);
    if (!directory || closed || !isCurrentScene()) return;
    if (extension === '.plt' && $.scene.isDirty()) {
      if (!$.Utils.confirm('Save the scene to include the latest palette changes in the PLT export?',
        title, 'Save and Export', 'Cancel') || closed || !isCurrentScene()) return;
      if (!$.scene.saveAll()) {
        showPaletteProblem('Harmony could not save the scene.');
        return;
      }
    }
    const failures: string[] = [];
    for (const palette of paletteManager.getAll(true)) {
      const name = nextPaletteName(directory, palette.name, extension);
      const destination = paletteStem(directory, name);
      try {
        if (extension === '.plt') {
          copyNativePalette(paletteStem(palette.path, palette.name) + '.plt', destination);
        } else {
          writePaletteJson(palette, destination + extension);
        }
      } catch (error) {
        failures.push(palette.name + ' — ' + error);
      }
    }
    if (failures.length) showPaletteProblem('Could not export some palettes.\n\n' + failures.join('\n'));
  }

  function importPalettes(): void {
    if (!isCurrentScene() || editSolidColor.isDragging() || editGradientColor.isDragging()) return;
    const paths = $.FileDialog.getOpenFileNames(projectPath, 'Palette files (*.json *.plt)', 'Import Palettes', dialog);
    if (!paths || !paths.length || closed || !isCurrentScene()) return;
    ensurePaletteDirectory(paletteFolder);
    const failures: string[] = [];
    let lastId = '';
    for (const path of paths) {
      try {
        if (/\.plt$/i.test(path)) lastId = importNativePalette(path);
        else if (/\.json$/i.test(path)) lastId = importPaletteJson(path);
        else throw new ScriptError('Select a JSON or PLT palette file.');
      } catch (error) {
        failures.push(path.split(/[\\/]/).pop() + ' — ' + error);
      }
    }
    if (lastId) revealNewPalette(lastId);
    else syncPaletteContents();
    if (failures.length) showPaletteProblem('Could not import some palettes.\n\n' + failures.join('\n'));
  }

  function importNativePalette(path: string): string {
    const sourceStem = path.slice(0, -4);
    const basename = sourceStem.split(/[\\/]/).pop() || 'New Palette';
    let rollback = () => {};
    try {
      return withScenePaletteList('Import PLT Palette', (list) => {
        const name = nextPaletteName(paletteFolder, basename, '.plt', scenePaletteNames());
        const destination = paletteStem(paletteFolder, name);
        rollback = copyNativePalette(path, destination);
        const native = list.addPalette(destination + '.plt');
        const palette = native && new paletteKit.Palette(native);
        if (!palette || !palette.isValid || !palette.id) throw new ScriptError('Harmony could not load this PLT file.');
        return palette.id;
      });
    } catch (error) {
      rollback();
      throw error;
    }
  }

  function importPaletteJson(path: string): string {
    const file = new $.PermanentFile(path);
    file.setTextCodec('UTF-8');
    if (!file.open(1)) throw new ScriptError('Could not read this JSON file.');
    let contents: string;
    try {
      contents = file.read();
    } finally {
      file.close();
    }
    const data = $.JSON.parse(contents.replace(/^\uFEFF/, ''));
    if (!data || data.version !== 1 || typeof data.name !== 'string' ||
      (data.type !== 'color' && data.type !== 'texture') || !$.Array.isArray(data.colors)) {
      throw new ScriptError('Expected a version 1 Palette Manager JSON file.');
    }
    for (const color of data.colors) validateJsonColor(color);

    return withScenePaletteList('Import JSON Palette', (list) => {
      const name = nextPaletteName(paletteFolder, data.name, '.plt', scenePaletteNames());
      const palette = newScenePalette(list, name);
      const imported = palette.withLock(function () {
        clearDefaultColors(palette);
        if (data.type === 'texture') palette.setToTexturePalette();
        for (const color of data.colors) {
          const value = color.data;
          let created: PaletteColorInstance | null;
          if (color.type === 'solid') created = palette.createSolidColor(color.name, value);
          else if (color.type === 'linear-gradient') created = palette.createLinearGradient(color.name, value);
          else if (color.type === 'radial-gradient') created = palette.createRadialGradient(color.name, value);
          else created = importJsonTexture(palette, color.name, value);
          if (!created || !created.id) throw new ScriptError('Could not import "' + color.name + '".');
        }
        return palette.id;
      });
      if (!imported) throw new ScriptError('Could not edit "' + name + '".');
      return imported;
    });
  }

  function clearDefaultColors(palette: PaletteInstance): void {
    for (const color of palette.getColors()) {
      if (!palette.removeColor(color.id)) {
        throw new ScriptError('Could not clear the default colors in "' + palette.name + '".');
      }
    }
  }

  function validateJsonColor(color: any): void {
    function isIntegerInRange(value: any, max: number): boolean {
      return typeof value === 'number' && value >= 0 && value <= max && $.Math.floor(value) === value;
    }
    function isRgba(value: any): boolean {
      return !!value && isIntegerInRange(value.r, 255) && isIntegerInRange(value.g, 255) &&
        isIntegerInRange(value.b, 255) && isIntegerInRange(value.a, 255);
    }
    if (!color || typeof color.name !== 'string') throw new ScriptError('Invalid palette color.');
    const data = color.data;
    let valid = false;
    if (color.type === 'solid') valid = isRgba(data);
    if (color.type === 'linear-gradient' || color.type === 'radial-gradient') {
      valid = $.Array.isArray(data) && data.length > 0 && data.every(
        (stop) => isRgba(stop) && typeof stop.t === 'number' && stop.t >= 0 && stop.t <= 1,
      );
    }
    if (color.type === 'texture') {
      valid = !!data && typeof data.tiled === 'boolean' &&
        isIntegerInRange(data.width, 0x7fffffff) && isIntegerInRange(data.height, 0x7fffffff) &&
        data.width > 0 && data.height > 0 && $.Array.isArray(data.argb32) &&
        data.argb32.length === data.width * data.height &&
        data.argb32.every((pixel) => isIntegerInRange(pixel, 0xffffffff));
    }
    if (!valid) throw new ScriptError('Invalid data for "' + color.name + '".');
  }

  function importJsonTexture(
    palette: PaletteInstance, name: string, data: { width: number; height: number; argb32: number[]; tiled: boolean },
  ): PaletteColorInstance | null {
    const Image = qtGlobals.QImage;
    const format = Image.Format_ARGB32 == null ? Image.Format.Format_ARGB32 : Image.Format_ARGB32;
    const bitmap = new Image(data.width, data.height, format);
    if (bitmap.isNull()) throw new ScriptError('Could not allocate the texture "' + name + '".');
    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) bitmap.setPixel(x, y, data.argb32[y * data.width + x]);
    }
    const file = new TempFile('png');
    try {
      if (!bitmap.save(file.path(), 'PNG')) throw new ScriptError('Could not write the texture "' + name + '".');
      return palette.createTexture(name, file.path(), data.tiled);
    } finally {
      file.remove();
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

  function selectedSwatchHexes(): string[] {
    const hexes: string[] = [];
    for (const swatch of selectedSwatches) {
      const hex = swatch.hex();
      if (hex) hexes.push(hex);
    }
    return hexes;
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

    const matches = paletteMatches.concat(colorMatches);
    empty.value.visible = !matches.length && !revealedCard;
    if (revealedCard) matches.push(revealedCard);
    const results = matches.filter((card) => pinnedIds.indexOf(card.id) !== -1)
      .concat(matches.filter((card) => pinnedIds.indexOf(card.id) === -1));
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

  function paletteAction(icon: any, label: string, action: () => void, checked?: boolean): JSX.Element {
    const button = (
      <pushButton
        objectName="paletteAction"
        toolTip={label}
        accessibleName={label}
        autoDefault={false}
        onClicked={() => runColorAction(action)}
      />
    );
    button.value.setFixedSize(24, 24);
    button.value.icon = icon;
    button.value.iconSize = iconSize;
    if (checked != null) {
      button.value.checkable = true;
      button.value.checked = checked;
    }
    return button;
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
    let insertionMarker: QLabel | undefined;
    let expanded = true;
    let expandedForSearch = false;
    const chevron = (
      <pushButton objectName="paletteChevron" autoDefault={false} onClicked={toggleExpanded} />
    );
    chevron.value.setFixedSize(24, 24);
    chevron.value.iconSize = iconSize;
    const pin = paletteAction(icons.pin, 'Pin palette', togglePin, pinnedIds.indexOf(paletteId) !== -1);
    updatePinLabel();
    const download = paletteAction(icons.download, 'Download palette as JSON', downloadPalette);
    const remove = paletteAction(icons.remove, 'Delete palette', deletePalette);
    const duplicate = paletteAction(icons.duplicate, 'Duplicate palette', duplicatePalette);
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
        toolTip="Double-click to rename palette"
        wordWrap={true}
        stretch={1}
      />
    );
    title.value.mouseDoubleClickEvent = function (event: any): void {
      if (event.button() !== $.Qt.LeftButton) return;
      event.accept();
      runColorAction(renamePalette, true);
    };
    const cardColumn = (
      <column parent={card.value} spacing={9} alignment={0}>
        <row spacing={6}>
          {chevron}
          {title}
          {colorCount}
          {pin}
          {download}
          {remove}
          {duplicate}
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
      chevron.value.icon = showSwatches ? icons.collapse : icons.expand;
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

    function renamePalette(): void {
      if (!isCurrentScene()) return;
      const entered = RenameInput.getText('Palette name', name, 'Rename Palette', dialog);
      if (typeof entered !== 'string' || !entered.trim() || closed || !isCurrentScene()) return;
      const target = resolvePalette();
      const nextName = entered.trim();
      if (!target || nextName === target.name) return;
      if (safePaletteName(nextName) !== nextName) {
        showPaletteProblem('Enter a valid palette file name.');
        return;
      }
      const duplicates = paletteManager.getAll(true).some(
        (palette) => palette.id !== paletteId && palette.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (duplicates || (nextName.toLowerCase() !== target.name.toLowerCase() &&
        pathTaken(paletteStem(target.path, nextName), '.plt'))) {
        showPaletteProblem('A palette named "' + nextName + '" already exists.');
        return;
      }
      const renamed = withScenePaletteList('Rename Palette', function () {
        return target.withLock(function () {
          target.name = nextName;
          return target.name === nextName;
        });
      });
      if (!renamed) showPaletteProblem('Harmony could not rename "' + name + '".');
      syncPaletteContents();
    }

    function updatePinLabel(): void {
      const pinned = pinnedIds.indexOf(paletteId) !== -1;
      const label = pinned ? 'Unpin palette' : 'Pin palette';
      pin.value.checked = pinned;
      pin.value.toolTip = pin.value.accessibleName = label;
    }

    function togglePin(): void {
      const index = pinnedIds.indexOf(paletteId);
      if (index === -1) pinnedIds.push(paletteId);
      else pinnedIds.splice(index, 1);
      updatePinLabel();
      filterPalettes(revealedCard);
      $.preferences.setString(pinKey, $.JSON.stringify(pinnedIds));
    }

    function downloadPalette(): void {
      const target = resolvePalette();
      if (!target || !isCurrentScene()) return;
      let path = $.FileDialog.getSaveFileName('JSON files (*.json)', `Download "${name}"`, dialog);
      if (!path || closed || !isCurrentScene()) return;
      if (!/\.json$/i.test(path)) {
        path += '.json';
        if (new $.QFile(path).exists() &&
          !$.Utils.confirm(`Replace the existing file "${path}"?`, 'Replace JSON File', 'Replace', 'Cancel')) return;
      }
      const current = resolvePalette();
      if (!current || closed || !isCurrentScene()) return;
      writePaletteJson(current, path);
    }

    function deletePalette(): void {
      if (!isCurrentScene() || !resolvePalette()) return;
      const confirmed = $.Utils.confirm(
        `Delete "${name}"? Harmony will remove the palette from the scene and delete its file on the next save. Drawings that use this palette may lose their colors.`,
        'Delete Palette',
        'Delete',
        'Cancel',
      );
      if (!confirmed || closed || !isCurrentScene() || !resolvePalette()) return;
      withUndoGroup('Delete Palette', function () {
        if (!$.PaletteObjectManager.removePaletteReferencesAndDeleteOnDisk(paletteId)) {
          throw new ScriptError(`Could not delete the palette "${name}".`);
        }
      });
      syncPaletteContents();
      syncActiveSwatch();
    }

    function duplicatePalette(): void {
      if (!isCurrentScene() || editSolidColor.isDragging() || editGradientColor.isDragging()) return;
      const source = resolvePalette();
      if (!source) return;
      ensurePaletteDirectory(paletteFolder);
      withScenePaletteList('Duplicate Palette', (list) => {
        const existingNames = scenePaletteNames();
        const base = safePaletteName(source.name);
        let copyName = base + '_copy';
        for (let suffix = 2; existingNames.indexOf(copyName.toLowerCase()) !== -1 ||
          pathTaken(paletteStem(paletteFolder, copyName), '.plt'); suffix++) {
          copyName = base + '_' + suffix + '_copy';
        }
        const copy = newScenePalette(list, copyName);
        const copied = copy.withLock(function () {
          clearDefaultColors(copy);
          if (source.isTexturePalette) copy.setToTexturePalette();
          for (const color of source.getColors()) {
            const result = copy.duplicateColor(color);
            if (!result || !result.id || result.id === color.id) {
              throw new ScriptError(`Could not copy "${color.name}" into "${copyName}".`);
            }
            if (result.name !== color.name) result.name = color.name;
          }
          return true;
        });
        if (!copied) throw new ScriptError(`Could not edit "${copyName}".`);
      });
      syncPaletteContents();
    }

    function dropSlot(
      event: any,
      entry: PaletteManagerSwatch,
    ): { index: number; x: number; y: number } | undefined {
      const step = swatchSize + swatchGap;
      const origin = swatches.indexOf(entry);
      if (origin === -1 || !grid.visible) return unset;
      let x = event.x() + (origin % columns) * step;
      let y = event.y() + $.Math.floor(origin / columns) * step;
      if (typeof event.globalPos === 'function' && typeof grid.mapFromGlobal === 'function') {
        const global = event.globalPos();
        const local = grid.mapFromGlobal(global);
        x = typeof local.x === 'function' ? local.x() : local.x;
        y = typeof local.y === 'function' ? local.y() : local.y;
        if (typeof scroll.value.viewport === 'function') {
          const viewport = scroll.value.viewport();
          const point = viewport.mapFromGlobal(global);
          const viewX = typeof point.x === 'function' ? point.x() : point.x;
          const viewY = typeof point.y === 'function' ? point.y() : point.y;
          if (viewX < 0 || viewY < 0 || viewX >= viewport.width || viewY >= viewport.height) {
            return unset;
          }
        }
      }
      if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return unset;

      const row = $.Math.floor(y / step);
      const column = $.Math.floor(x / step);
      const start = row * columns;
      const end = $.Math.min(start + columns, swatches.length);
      const after = x - column * step >= swatchSize / 2;
      const index = $.Math.min(start + column + (after ? 1 : 0), end);
      const markerX =
        index === end && index > start
          ? (index - start - 1) * step + swatchSize + 1
          : $.Math.max(0, (index - start) * step - 3);
      return { index, x: markerX, y: row * step };
    }

    function showInsertionMarker(slot?: { x: number; y: number }): void {
      if (!slot) {
        if (insertionMarker) insertionMarker.hide();
        return;
      }
      if (!insertionMarker) {
        insertionMarker = new $.QLabel('', grid);
        insertionMarker.setAttribute($.Qt.WA_TransparentForMouseEvents, true);
        insertionMarker.setFixedSize(3, swatchSize);
        insertionMarker.styleSheet = 'background: #8fc5ff; border-radius: 1px;';
      }
      insertionMarker.move(slot.x, slot.y);
      insertionMarker.show();
      insertionMarker.raise();
    }

    function reorderSwatches(entry: PaletteManagerSwatch, slot: number): void {
      if (!isCurrentScene()) return;
      const fromSelection = selectedSwatches.indexOf(entry) !== -1;
      const moving = fromSelection
        ? swatches.filter((swatch) => selectedSwatches.indexOf(swatch) !== -1)
        : [entry];
      // Keep the insertion point attached to a color that will stay in the palette.
      const anchor = swatches.slice(slot).filter((swatch) => moving.indexOf(swatch) === -1)[0];
      const target = resolvePalette();
      if (!target) return;
      const order = target.getColors().map((color) => color.id);
      const movingIds = moving.map((swatch) => swatch.id);
      if (movingIds.some((id) => order.indexOf(id) === -1)) return;
      const remaining = order.filter((id) => movingIds.indexOf(id) === -1);
      const destination = anchor ? remaining.indexOf(anchor.id) : remaining.length;
      if (destination === -1) return;
      const reordered = remaining.slice(0, destination).concat(movingIds, remaining.slice(destination));
      if (order.every((id, i) => id === reordered[i])) return;

      const moved = changePalette(target, 'Reorder Palette Colors', function () {
        for (const id of movingIds) {
          const from = order.indexOf(id);
          const before = anchor ? order.indexOf(anchor.id) : -1;
          if (before === -1 ? from === order.length - 1 : from + 1 === before) continue;
          if (!target.moveColor(from, before)) {
            throw new ScriptError(`Could not reorder colors in "${name}".`);
          }
          order.splice(from, 1);
          order.splice(before === -1 ? order.length : before - (from < before ? 1 : 0), 0, id);
        }
        return true;
      });
      if (!moved) return;
      const current = resolvePalette();
      if (!current) return;
      if (refreshCard(current) && lastSearchQuery) filterPalettes(revealedCard, true);

      if (!fromSelection) {
        selectedSwatches = selectedSwatches.filter((swatch) => swatches.indexOf(swatch) === -1);
        selectedSwatches.push(entry);
      }
      if (selectedCards.indexOf(cardState) === -1) selectedCards.push(cardState);
      selectedCard = cardState;
      selectedSwatch = entry;
      selectionAnchor = { card: cardState, swatch: entry };
      refreshSelectionState();
      if (!isTexturePalette) {
        activePaletteId = paletteId;
        activeColorId = entry.id;
        paletteManager.selectPaletteAndColor(paletteId, entry.id);
      }
      entry.widget.setFocus();
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
        if (closed) return;
        if (swatchGesture) swatchGesture.cancel();
        if (typeof event.button === 'function' && event.button() === $.Qt.RightButton) {
          if (selectedSwatches.indexOf(entry) === -1) setSelection(cardState, entry);
          showSwatchContextMenu(swatch, event);
          if (typeof event.accept === 'function') event.accept();
          return;
        }
        if (typeof event.button === 'function' && event.button() !== $.Qt.LeftButton) return;
        swatchGesture = {
          swatch: entry,
          x: event.x(),
          y: event.y(),
          modifiers: getMouseModifiers(event),
          dragging: false,
          cancel: function () {
            swatchGesture = unset;
            showInsertionMarker();
          },
        };
        if (typeof event.accept === 'function') event.accept();
      };

      swatch.mouseMoveEvent = function (event: any): void {
        const gesture = swatchGesture;
        if (!gesture || gesture.swatch !== entry) return;
        if (!gesture.dragging) {
          const distance = $.Math.abs(event.x() - gesture.x) + $.Math.abs(event.y() - gesture.y);
          if (distance < dragDistance) return;
          gesture.dragging = true;
          lastClick = unset;
          swatch.setFocus();
        }
        showInsertionMarker(dropSlot(event, entry));
        if (typeof event.accept === 'function') event.accept();
      };

      swatch.mouseReleaseEvent = function (event: any): void {
        const gesture = swatchGesture;
        if (!gesture || gesture.swatch !== entry || event.button() !== $.Qt.LeftButton) return;
        gesture.cancel();
        if (gesture.dragging) {
          const slot = dropSlot(event, entry);
          if (slot) runColorAction(() => reorderSwatches(entry, slot.index));
        } else if (
          event.x() >= 0 && event.x() < swatchSize &&
          event.y() >= 0 && event.y() < swatchSize
        ) {
          if (gesture.modifiers.ctrl) {
            lastClick = unset;
            ctrlClick(cardState, entry);
          } else if (gesture.modifiers.shift) {
            lastClick = unset;
            shiftClick(cardState, entry);
          } else {
            activateSwatch();
          }
        }
        if (typeof event.accept === 'function') event.accept();
      };
      function showSwatchContextMenu(widget: QWidget, event: any): void {
        const menu = new Menu(dialog);
        const hexes = selectedSwatchHexes();
        const copyHex = menu.addAction('Copy hex');
        copyHex.enabled = hexes.length > 0;
        const duplicateAction = menu.addAction('Duplicate');
        const deleteAction = menu.addAction('Delete');

        let globalPos: any;
        if (typeof event.globalPos === 'function') {
          globalPos = event.globalPos();
        } else if (typeof event.pos === 'function' && typeof widget.mapToGlobal === 'function') {
          globalPos = widget.mapToGlobal(event.pos());
        }
        const selectedAction = executePaletteMenu(menu, globalPos);
        if (selectedAction === copyHex && hexes.length) {
          runColorAction(() => $.Utils.setClipboardText(hexes.join('\n') + '\n'));
        } else if (selectedAction === duplicateAction) {
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
        hex: function () {
          const rgba = appearance.rgba;
          return rgba ? $.ColorUtils.rgbToHex(rgba.r, rgba.g, rgba.b).toUpperCase() : '';
        },
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

        // Double-click detection runs only after releasing a stationary click.
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

  function serializeColor(color: PaletteColorInstance): {
    id: string;
    name: string;
    type: string;
    data: unknown;
  } {
    const id = color.id;
    const name = color.name;
    if (color.isTexture) {
      const texture = color.getNative();
      const bitmap = texture.bitmap;
      const width = bitmap && bitmap.width();
      const height = bitmap && bitmap.height();
      if (!width || !height) throw new ScriptError(`Could not read the texture "${name}".`);
      const pixels: number[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) pixels.push(bitmap.pixel(x, y) >>> 0);
      }
      return { id, name, type: 'texture', data: { tiled: texture.tiled, width, height, argb32: pixels } };
    }

    const appearance = readSwatchAppearance(color);
    if (appearance.type === colorTypes.SOLID_COLOR && appearance.rgba) {
      const { r, g, b, a } = appearance.rgba;
      return { id, name, type: 'solid', data: { r, g, b, a: a == null ? 255 : a } };
    }
    if (appearance.stops) {
      const type = appearance.type === colorTypes.RADIAL_GRADIENT ? 'radial-gradient' : 'linear-gradient';
      return { id, name, type, data: appearance.stops };
    }
    throw new ScriptError(`Could not export the color "${name}".`);
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
    } else if (typeof app.keyboardModifiers === 'function') {
      modifiers = app.keyboardModifiers();
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
    if (swatchGesture) {
      const buttons = typeof app.mouseButtons === 'function' ? app.mouseButtons() : app.mouseButtons;
      if (typeof buttons !== 'number' || (buttons & $.Qt.LeftButton) !== 0) return;
      swatchGesture.cancel();
    }
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
    if (swatchGesture) swatchGesture.cancel();
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
