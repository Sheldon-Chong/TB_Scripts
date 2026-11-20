include('global-test.js');
include('reactive-ui.js');

interface DrawingTypeEditorAttributes {
  [name: string]: string;
}

interface DrawingTypeEditorEntry {
  attributes: DrawingTypeEditorAttributes;
  pendingIcon?: string;
}

function showDrawingTypesEditor(): void {
  const $ = getCore();
  const UI = createUIRuntime($);
  const qtGlobals = Function('return this;')();
  const drawingTypesFile = `${specialFolders.userConfig}/drawingTypes.d/drawingTypes.xml`;
  const configDirectory = drawingTypesEditorDirectory(drawingTypesFile);
  const windows = $.about.isWindowsArch();
  const plainText = $.Qt.PlainText;
  const styleSheet = `
    QDialog { background: #414141; }
    QLabel, QCheckBox { color: #e8e8e8; }
    QLineEdit, QTextEdit { background: #4e4e4e; color: white; border: 1px solid #676767; border-radius: 5px; padding: 5px 8px; }
    QLineEdit:focus, QTextEdit:focus { border-color: #a5a5a5; }
    QLineEdit#drawingTypesSearch { border-radius: 12px; padding: 9px 14px; font-size: 15px; }
    QPushButton { background: #555; color: #f4f4f4; border: 1px solid #777; border-radius: 5px; padding: 6px 10px; }
    QPushButton:hover, QPushButton:focus { background: #626262; border-color: #aaa; }
    QPushButton:disabled { background: #494949; color: #aaa; border-color: #595959; }
    QPushButton#drawingTypesSave:enabled { background: #626262; border-color: #aaa; font-weight: bold; }
    QPushButton#drawingTypesSave:hover { background: #777; }
    QTableWidget { border: 1px solid #606060; background: #3b3b3b; gridline-color: #525252; }
    QHeaderView::section { background: #494949; color: #f2f2f2; border: 0; border-bottom: 1px solid #676767; padding: 8px; font-weight: bold; }
    QTabWidget::pane { border: 1px solid #676767; }
    QTabBar::tab { background: #4e4e4e; color: #ddd; padding: 6px 14px; }
    QTabBar::tab:selected { background: #656565; color: white; }
    QScrollBar:vertical { background: #4e4e4e; width: 11px; border-radius: 5px; }
    QScrollBar::handle:vertical { background: #bbb; min-height: 28px; border-radius: 5px; }
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
    QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }
  `;

  const owner = $.QApplication.activeWindow();
  const dialog: QDialog = (
    <dialog
      parent={owner}
      windowTitle="Drawing Types"
      minimumWidth={580}
      minimumHeight={330}
      styleSheet={styleSheet}
    />
  ).value;
  const dirty = UI.createSignal(false);
  const status = UI.createSignal('');
  let savedXml: string | null;
  let rootAttributes: DrawingTypeEditorAttributes = Object.create(null);
  let entries: DrawingTypeEditorEntry[] = [];
  let reopenPath = '';

  try {
    savedXml = $.FileUtils.exists(drawingTypesFile) ? readFile(drawingTypesFile) : null;
    if (savedXml !== null) {
      const document = drawingTypesEditorParse(qtGlobals.QXmlStreamReader, savedXml);
      rootAttributes = document.attributes;
      entries = document.entries;
    }
  } catch (error) {
    message(owner, 'Could not open drawing types', String(error.message || error));
    dialog.deleteLater();
    return;
  }

  const search = (
    <lineEdit
      objectName="drawingTypesSearch"
      placeholderText="Search drawing types..."
      clearButtonEnabled={true}
      accessibleName="Search drawing types"
      onTextChanged={filterRows}
    />
  );
  const table = <tableWidget columnCount={3} showGrid={true} stretch={1} />;
  const grid: QTableWidget = table.value;
  grid.setHorizontalHeaderLabels(['Character name', 'Timeline color', 'Command icon']);
  grid.verticalHeader().hide();
  // QHeaderView::Stretch leaves the color and icon columns at their specified widths.
  grid.horizontalHeader().setSectionResizeMode(0, 1);
  grid.setColumnWidth(1, 142);
  grid.setColumnWidth(2, 212);

  const layout = (
    <column parent={dialog} spacing={12} alignment={0}>
      {search}
      {table}
      <row alignment={0}>
        <label text={status} textFormat={plainText} stretch={1} />
        <label text="Unsaved changes" visible={dirty} />
        <pushButton text="Import..." autoDefault={false} onClicked={openImport} />
        <pushButton
          objectName="drawingTypesSave"
          text="Save"
          autoDefault={false}
          enabled={dirty}
          onClicked={() => {
            if (save() && reopenPath) dialog.accept();
          }}
        />
      </row>
    </column>
  );
  layout.value.setContentsMargins(18, 18, 18, 18);
  dialog.closeEvent = function (event: { accept(): void; ignore(): void }): void {
    if (dirty.get()) {
      const choice = confirmClose();
      const shouldClose = choice === 2 || (choice === 1 && save());
      if (!shouldClose) {
        event.ignore();
        return;
      }
    }
    event.accept();
    dialog.reject();
  };
  // QDialog handles Escape as a rejection. Route it through the close event.
  const closeShortcut = new QShortcut(dialog);
  closeShortcut.key = new QKeySequence('Esc');
  closeShortcut.autoRepeat = false;
  closeShortcut.activated.connect(() => dialog.close());
  rebuildRows();
  dialog.resize(720, 450);
  dialog.exec();
  dialog.deleteLater();
  if (reopenPath && !$.scene.closeSceneAndOpenOffline(reopenPath)) {
    message(owner, 'Could not reopen project', reopenPath);
  }

  function readFile(path: string): string {
    const text = $.FileUtils.readFrom(path);
    if (text === null) throw new $.Error(`Could not read ${path}.`);
    return text;
  }

  function filterRows(): void {
    const query = search.value.text.trim().toLowerCase();
    let matches = 0;
    for (let index = 0; index < entries.length; index++) {
      const visible = entries[index].attributes.text.toLowerCase().indexOf(query) !== -1;
      grid.setRowHidden(index, !visible);
      if (visible) matches++;
    }
    const count = query
      ? `${matches} of ${entries.length} drawing types`
      : `${entries.length} drawing types`;
    status.set(count);
  }

  function rebuildRows(): void {
    grid.rowCount = 0;
    grid.rowCount = entries.length;
    entries.forEach(function (entry, index) {
      grid.setRowHeight(index, 40);
      grid.setCellWidget(
        index,
        0,
        (
          <lineEdit
            text={entry.attributes.text}
            accessibleName="Character name"
            onTextChanged={(value: string) => {
              entry.attributes.text = value;
              dirty.set(true);
            }}
            onEditingFinished={filterRows}
          />
        ).value,
      );
      grid.setCellWidget(index, 1, createColorCell(entry));
      grid.setCellWidget(index, 2, createIconCell(entry));
    });
    filterRows();
  }

  function createColorCell(entry: DrawingTypeEditorEntry): QWidget {
    const colorText = UI.createSignal(entry.attributes.timelineColor || 'Choose...');
    const swatch = (
      <pushButton
        text=""
        minimumWidth={30}
        maximumWidth={30}
        autoDefault={false}
        accessibleName="Choose timeline color"
        onClicked={pickColor}
      />
    );
    const cell = <qwidget />;
    const row = (
      <row parent={cell.value} spacing={6} alignment={0}>
        {swatch}
        <label text={colorText} textFormat={plainText} stretch={1} />
      </row>
    );
    row.value.setContentsMargins(5, 2, 3, 2);
    updateSwatch();
    return cell.value;

    function updateSwatch(): void {
      const color = drawingTypesEditorColor(entry.attributes.timelineColor);
      const components = color.match(/[0-9A-F]{2}/g).map((channel) => $.parseInt(channel, 16));
      swatch.value.styleSheet = `QPushButton { background: rgba(${components.join(',')}); padding: 0; }`;
      swatch.value.toolTip = entry.attributes.timelineColor || 'Choose timeline color';
      colorText.set(entry.attributes.timelineColor || 'Choose...');
    }

    function pickColor(): void {
      const current = drawingTypesEditorColor(entry.attributes.timelineColor);
      const Color = $.ColorUtils.ColorObj;
      const initial = Color.fromHex(current.slice(0, 7));
      initial.setAlpha($.parseInt(current.slice(7), 16));
      const chosen = $.Widgets.ColorPicker.pick(dialog, initial.toRgba());
      if (!chosen) return;
      const color = Color.fromRgba(chosen.r, chosen.g, chosen.b, chosen.a).toHex(true, true);
      if (color === current && entry.attributes.timelineColor) return;
      entry.attributes.timelineColor = color;
      dirty.set(true);
      updateSwatch();
      filterRows();
    }
  }

  function createIconCell(entry: DrawingTypeEditorEntry): QWidget {
    const button = (
      <pushButton autoDefault={false} accessibleName="Change command icon" onClicked={pickIcon} />
    );
    updateIcon();
    return button.value;

    function updateIcon(): void {
      const reference = entry.attributes.commandIcon || '';
      const file =
        entry.pendingIcon ||
        (reference &&
          (/^(?:[\/\\]|[a-z]:)/i.test(reference) ? reference : configDirectory + '/' + reference));
      button.value.text = reference
        ? reference.replace(/^.*[\/\\]/, '').replace(/&/g, '&&')
        : 'Choose SVG...';
      button.value.toolTip = file || 'Choose a command icon SVG';
      button.value.styleSheet = '';
      const exists = file && $.FileUtils.exists(file);
      try {
        if (typeof qtGlobals.QIcon === 'function') {
          button.value.icon = exists ? new qtGlobals.QIcon(file) : new qtGlobals.QIcon();
          if (typeof qtGlobals.QSize === 'function')
            button.value.iconSize = new qtGlobals.QSize(24, 24);
          if (!file || exists) return;
        }
      } catch (error) {
        $.MessageLog.trace(`Drawing Types: ${error}`);
      }
      if (!exists) {
        if (file) button.value.toolTip = `Icon file missing: ${file}`;
        return;
      }
      const escapedPath = file.replace(/\\/g, '/').replace(/"/g, '\\"');
      button.value.styleSheet = `QPushButton { qproperty-icon: url("${escapedPath}"); }`;
    }

    function pickIcon(): void {
      const path = pickFile('SVG images (*.svg)', 'Select Command Icon', dialog);
      if (!path) return;
      if (!/\.svg$/i.test(path) || !$.FileUtils.exists(path)) {
        message(dialog, 'Invalid command icon', 'Choose an existing SVG file.');
        return;
      }
      const name = path.replace(/^.*[\/\\]/, '');
      const localPath = configDirectory + '/' + name;
      const local =
        drawingTypesEditorPathKey(path, windows) === drawingTypesEditorPathKey(localPath, windows);
      if (local && !entry.pendingIcon && name === entry.attributes.commandIcon) return;
      entry.pendingIcon = local ? void 0 : path;
      entry.attributes.commandIcon = name;
      dirty.set(true);
      updateIcon();
      filterRows();
    }
  }

  function pickFile(filter: string, title: string, parent: QWidget): string {
    const fileDialog = $.FileDialog as typeof FileDialog & {
      getOpenFileName(filter: string, title: string, parent: QWidget): string;
    };
    return fileDialog.getOpenFileName(filter, title, parent) || '';
  }

  function openImport(): void {
    const popup = (
      <dialog
        parent={dialog}
        windowTitle="Import Drawing Types"
        minimumWidth={505}
        minimumHeight={270}
      />
    ).value;
    const filePath = UI.createSignal('');
    const input = (
      <textEdit acceptRichText={false} placeholderText="Paste <DrawingTypes> XML" stretch={1} />
    );
    const tabs = (
      <tabWidget stretch={1}>
        <qwidget tabTitle="XML file">
          <row alignment={0}>
            <lineEdit
              text={filePath}
              readOnly={true}
              placeholderText="Select a drawingTypes.xml file"
              stretch={1}
            />
            <pushButton
              text="Browse..."
              autoDefault={false}
              onClicked={() => {
                const path = pickFile('XML files (*.xml)', 'Select Drawing Types XML', popup);
                if (path) filePath.set(path);
              }}
            />
          </row>
        </qwidget>
        <qwidget tabTitle="Paste XML">{input}</qwidget>
      </tabWidget>
    );
    const layout = (
      <column parent={popup} alignment={0} spacing={12}>
        {tabs}
        <row alignment={0}>
          <qwidget stretch={1} />
          <pushButton text="Cancel" autoDefault={false} onClicked={() => popup.reject()} />
          <pushButton text="Import" autoDefault={false} onClicked={importEntries} />
        </row>
      </column>
    );
    layout.value.setContentsMargins(16, 16, 16, 16);
    popup.exec();
    popup.deleteLater();

    function importEntries(): void {
      try {
        const fromFile = tabs.value.currentIndex === 0;
        if (fromFile && !filePath.get()) throw new $.Error('Choose an XML file to import.');
        const xml = fromFile ? readFile(filePath.get()) : input.value.plainText;
        const incoming = drawingTypesEditorParse(qtGlobals.QXmlStreamReader, xml).entries;
        const merged = drawingTypesEditorMerge(entries, incoming, (name, details) =>
          resolveConflict(popup, name, details),
        );
        if (merged) {
          entries = merged;
          dirty.set(true);
          rebuildRows();
        }
        popup.accept();
      } catch (error) {
        message(popup, 'Could not import drawing types', String(error.message || error));
      }
    }
  }

  function resolveConflict(
    parent: QWidget,
    name: string,
    differences: string[],
  ): { override: boolean; applyToRest: boolean } | null {
    const popup = (
      <dialog parent={parent} windowTitle="Drawing Type Already Exists" minimumWidth={475} />
    ).value;
    const apply = <checkBox text="Apply this choice to the remaining conflicts" />;
    const changes = (
      <textEdit readOnly={true} plainText={differences.join('\n\n')} maximumHeight={145} />
    );
    const layout = (
      <column parent={popup} spacing={12} alignment={0}>
        <label
          text={`“${name}” already exists. Choose which version to keep.`}
          textFormat={plainText}
          wordWrap={true}
        />
        {changes}
        {apply}
        <row alignment={0}>
          <qwidget stretch={1} />
          <pushButton text="Keep Existing" autoDefault={false} onClicked={() => popup.done(2)} />
          <pushButton text="Override" autoDefault={false} onClicked={() => popup.accept()} />
        </row>
      </column>
    );
    layout.value.setContentsMargins(16, 16, 16, 16);
    const result = popup.exec();
    const choice = { override: result === 1, applyToRest: !!apply.value.checked };
    popup.deleteLater();
    return result === 0 ? null : choice;
  }

  function confirmClose(): number {
    const popup = (
      <dialog parent={dialog} windowTitle="Unsaved Drawing Types" minimumWidth={390} />
    ).value;
    const layout = (
      <column parent={popup} spacing={14} alignment={0}>
        <label text="Save changes to drawing types before closing?" wordWrap={true} />
        <row alignment={0}>
          <qwidget stretch={1} />
          <pushButton text="Save" autoDefault={false} onClicked={() => popup.accept()} />
          <pushButton text="Discard" autoDefault={false} onClicked={() => popup.done(2)} />
          <pushButton text="Cancel" onClicked={() => popup.reject()} />
        </row>
      </column>
    );
    layout.value.setContentsMargins(16, 16, 16, 16);
    const choice = popup.exec();
    popup.deleteLater();
    return choice;
  }

  function save(): boolean {
    if (!dirty.get()) return true;
    try {
      drawingTypesEditorIndex(entries);
      savedXml = drawingTypesEditorSave($, drawingTypesFile, savedXml, rootAttributes, entries);
    } catch (error) {
      message(dialog, 'Could not save drawing types', String(error.message || error));
      return false;
    }

    dirty.set(false);
    rebuildRows();
    const project = $.scene.currentProjectPath();
    const version = $.scene.currentVersionName();
    const path = project && version ? `${project}/${version}.xstage` : '';
    if (!path || !$.FileUtils.exists(path)) {
      message(dialog, 'Drawing types saved', 'Open the project again to reload the drawing types.');
      return true;
    }
    const sceneDirty = $.scene.isDirty();
    const restart = $.Utils.confirm(
      sceneDirty
        ? 'Drawing types saved. Save your current project changes and reopen it to reload the drawing types?'
        : 'Drawing types saved. Reopen the current project to reload them?',
      'Reopen Current Project',
      sceneDirty ? 'Save Scene and Reopen' : 'Reopen Project',
      'Later',
    );
    if (!restart) return true;
    if (sceneDirty && !$.scene.saveAll()) {
      message(
        dialog,
        'Could not save project',
        'Drawing types are saved. Save the scene before reopening it.',
      );
      return true;
    }
    reopenPath = path;
    return true;
  }

  function message(parent: QWidget, title: string, text: string): void {
    const popup = (
      <dialog parent={parent} windowTitle={title} minimumWidth={390} styleSheet={styleSheet} />
    ).value;
    const layout = (
      <column parent={popup} spacing={14} alignment={0}>
        <label text={text} textFormat={plainText} wordWrap={true} />
        <row alignment={0}>
          <qwidget stretch={1} />
          <pushButton text="OK" onClicked={() => popup.accept()} />
        </row>
      </column>
    );
    layout.value.setContentsMargins(16, 16, 16, 16);
    popup.exec();
    popup.deleteLater();
  }
}

function drawingTypesEditorDirectory(path: string): string {
  return path.replace(/[\/\\][^\/\\]+$/, '');
}

function drawingTypesEditorPathKey(path: string, windows: boolean): string {
  return windows ? path.replace(/\\/g, '/').toLowerCase() : path;
}

function drawingTypesEditorIsColor(value: string): boolean {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value || '');
}

function drawingTypesEditorColor(value: string): string {
  if (!drawingTypesEditorIsColor(value)) return '#FFFFFFFF';
  return (value.length === 7 ? value + 'FF' : value).toUpperCase();
}

function drawingTypesEditorParse(
  Reader: any,
  xml: string,
): {
  attributes: DrawingTypeEditorAttributes;
  entries: DrawingTypeEditorEntry[];
} {
  const reader = new Reader(xml);
  const entries: DrawingTypeEditorEntry[] = [];
  let attributes: DrawingTypeEditorAttributes = null;
  let depth = 0;
  while (!reader.atEnd()) {
    const token = reader.readNext();
    if (token === Reader.StartElement) {
      depth++;
      const tag = reader.name().toString();
      if (
        (depth === 1 && tag !== 'DrawingTypes') ||
        (depth === 2 && tag !== 'DrawingType') ||
        depth > 2
      ) {
        throw new Error('Expected a <DrawingTypes> root containing <DrawingType> entries.');
      }
      const fields: DrawingTypeEditorAttributes = Object.create(null);
      const xmlAttributes = reader.attributes();
      for (let index = 0; index < xmlAttributes.length(); index++) {
        const attribute = xmlAttributes.at(index);
        fields[attribute.name().toString()] = attribute.value().toString();
      }
      if (depth === 1) {
        attributes = fields;
      } else {
        if (!fields.text || !fields.text.trim())
          throw new Error('Each drawing type needs a character name.');
        entries.push({ attributes: fields });
      }
    } else if (token === Reader.EndElement) {
      depth--;
    } else if (token === Reader.DTD || (token === Reader.Characters && !reader.isWhitespace())) {
      throw new Error('The XML should contain only drawing types and their attributes.');
    }
  }
  if (reader.hasError()) throw new Error('Invalid XML: ' + reader.errorString());
  if (!attributes) throw new Error('Expected a <DrawingTypes> XML document.');
  return { attributes, entries };
}

function drawingTypesEditorIndex(entries: DrawingTypeEditorEntry[]): { [name: string]: number } {
  const index: { [name: string]: number } = Object.create(null);
  entries.forEach((entry, position) => {
    const name = entry.attributes.text;
    if (!name.trim()) throw new Error('Each drawing type needs a character name.');
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(name)) {
      throw new Error('Character names must contain valid XML text.');
    }
    if (name in index)
      throw new Error(`Use one entry per character name. “${name}” appears more than once.`);
    index[name] = position;
  });
  return index;
}

function drawingTypesEditorMerge(
  entries: DrawingTypeEditorEntry[],
  incoming: DrawingTypeEditorEntry[],
  confirm: (
    name: string,
    differences: string[],
  ) => { override: boolean; applyToRest: boolean } | null,
): DrawingTypeEditorEntry[] | null {
  const index = drawingTypesEditorIndex(entries);
  const merged = entries.slice();
  let choice: { override: boolean; applyToRest: boolean };
  let changed = false;
  for (const candidate of incoming) {
    const name = candidate.attributes.text;
    if (!(name in index)) {
      index[name] = merged.length;
      merged.push(candidate);
      changed = true;
      continue;
    }
    const current = merged[index[name]];
    const fields = Object.keys(current.attributes);
    for (const field of Object.keys(candidate.attributes)) {
      if (!(field in current.attributes)) fields.push(field);
    }
    const differences = fields
      .filter((field) => {
        const before = current.attributes[field];
        const after = candidate.attributes[field];
        if (field === 'commandIcon' && current.pendingIcon) return true;
        if (before === after) return false;
        return (
          field !== 'timelineColor' ||
          !drawingTypesEditorIsColor(before) ||
          !drawingTypesEditorIsColor(after) ||
          drawingTypesEditorColor(before) !== drawingTypesEditorColor(after)
        );
      })
      .map((field) => {
        const before =
          field === 'commandIcon' && current.pendingIcon
            ? current.pendingIcon
            : current.attributes[field];
        return `${field}\nExisting: ${before == null ? '(unset)' : before}\nIncoming: ${candidate.attributes[field] == null ? '(unset)' : candidate.attributes[field]}`;
      });
    if (!differences.length) continue;
    if (!choice || !choice.applyToRest) choice = confirm(name, differences);
    if (!choice) return null;
    if (choice.override) {
      merged[index[name]] = candidate;
      changed = true;
    }
  }
  return changed ? merged : null;
}

function drawingTypesEditorSerialize(
  attributes: DrawingTypeEditorAttributes,
  entries: DrawingTypeEditorEntry[],
): string {
  function format(fields: DrawingTypeEditorAttributes): string {
    return Object.keys(fields)
      .map((field) => {
        const value = fields[field]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/\t/g, '&#9;')
          .replace(/\n/g, '&#10;')
          .replace(/\r/g, '&#13;');
        return ` ${field}="${value}"`;
      })
      .join('');
  }
  const rows = entries.map((entry) => `  <DrawingType${format(entry.attributes)} />`);
  return [`<DrawingTypes${format(attributes)}>`].concat(rows, '</DrawingTypes>', '').join('\n');
}

function drawingTypesEditorSave(
  $: HarmonyCore,
  path: string,
  original: string | null,
  root: DrawingTypeEditorAttributes,
  entries: DrawingTypeEditorEntry[],
): string {
  const directory = drawingTypesEditorDirectory(path);
  const files = $.FileUtils;
  const target = new $.PermanentFile(path);
  if (!new $.QDir().mkpath(directory)) throw new $.Error(`Could not open or create ${directory}.`);
  const suffix = files.getUniqueFileName(directory, '.drawingTypes-pending', '.xml');
  const stagePath = directory + '/' + suffix;
  const stage = new $.PermanentFile(stagePath);
  const backupPath =
    directory + '/' + files.getUniqueFileName(directory, '.drawingTypes-backup', '.xml');
  const backup = new $.PermanentFile(backupPath);
  const copied: string[] = [];
  const iconNames: { [source: string]: string } = Object.create(null);
  let backedUp = false;
  let committed = false;

  try {
    const savedEntries = entries.map((entry) => {
      const source = entry.pendingIcon;
      if (!source) return entry;
      let icon = iconNames[source];
      if (!icon) {
        icon = source.replace(/^.*[\/\\]/, '');
        if (!files.exists(source)) throw new $.Error(`Icon file missing: ${source}`);
        const stem = icon.slice(0, -4);
        let counter = 2;
        while (files.exists(directory + '/' + icon)) icon = `${stem}-${counter++}.svg`;
        const destination = directory + '/' + icon;
        if (!files.copyTo(source, destination)) throw new $.Error(`Could not copy ${source}.`);
        copied.push(destination);
        iconNames[source] = icon;
      }
      const attributes: DrawingTypeEditorAttributes = Object.create(null);
      for (const field of Object.keys(entry.attributes))
        attributes[field] = entry.attributes[field];
      attributes.commandIcon = icon;
      return { attributes };
    });
    const xml = drawingTypesEditorSerialize(root, savedEntries);
    stage.setTextCodec('UTF-8');
    if (!stage.open(2)) throw new $.Error(`Could not write ${stagePath}.`);
    try {
      stage.write(xml);
    } finally {
      stage.close();
    }
    if (files.readFrom(stagePath) !== xml) throw new $.Error(`Could not verify ${stagePath}.`);

    const exists = target.exists();
    if ((original !== null) !== exists || (exists && files.readFrom(path) !== original)) {
      throw new $.Error(
        'drawingTypes.xml changed on disk. Reopen the editor to load the latest version.',
      );
    }
    if (exists) {
      if (!target.move(backup)) throw new $.Error('Could not back up drawingTypes.xml.');
      backedUp = true;
    }
    if (!stage.move(new $.PermanentFile(path)))
      throw new $.Error('Could not replace drawingTypes.xml.');
    committed = true;
    if (backedUp) backup.remove();
    savedEntries.forEach((entry, index) => {
      entries[index] = entry;
    });
    return xml;
  } finally {
    if (!committed) {
      new $.PermanentFile(stagePath).remove();
      for (const destination of copied) new $.PermanentFile(destination).remove();
      if (backedUp && !backup.move(new $.PermanentFile(path))) {
        throw new $.Error(`Could not restore drawingTypes.xml. The original is at ${backupPath}.`);
      }
    }
  }
}
