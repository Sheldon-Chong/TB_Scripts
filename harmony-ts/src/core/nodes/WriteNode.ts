function createWriteNodeClass(Core: CoreRuntime) {
  var NodeLayer = Core.oBaseNode as ReturnType<typeof createBaseNodeClass>;

  class WriteNode extends NodeLayer {
    exportToMovie: EnumAttribute;
    drawingName: TextAttribute;
    moviePath: TextAttribute;
    MovieFormat: TextAttribute;
    MovieAudioSettings: TextAttribute;
    MovieVideoSettings: TextAttribute;
    MovieVideoAndAudioSettings: TextAttribute;

    leadingZeros: IntAttribute;
    start: IntAttribute;
    drawingType: TextAttribute;

    scriptMovie: BoolAttribute;
    movieGenerationScript: TextAttribute;
    colourSpace: TextAttribute;

    compositePartitioning: EnumAttribute;
    zPartitionRange: DoubleAttribute;
    cleanupPartitionFolders: BoolAttribute;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      super(displayOrder, index, nodePath, name);

      /*
       * Discover real attribute keywords.
       * Display names are not necessarily keywords.
       */
      var entries: {
        name: string;
        type: string;
        keyword: string;
      }[] = [];

      function collectAttributes(attributes: Attribute[]): void {
        for (var i = 0; i < attributes.length; i++) {
          var attr = attributes[i];

          entries.push({
            name: attr.name(),
            type: attr.typeName(),
            keyword: attr.fullKeyword(),
          });

          if (attr.hasSubAttributes()) {
            collectAttributes(attr.getSubAttributes());
          }
        }
      }

      collectAttributes(Core.node.getAttrList(nodePath, Core.frame.current(), ''));

      function keyword(displayName: string, typeName: string): string {
        var result: string | null = null;

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];

          if (entry.name === displayName && entry.type === typeName) {
            if (result !== null && result !== entry.keyword) {
              throw new Error(
                '[WriteNode] Ambiguous attribute: ' + displayName + ' (' + typeName + ')',
              );
            }

            result = entry.keyword;
          }
        }

        if (result === null) {
          Core.MessageLog.trace(
            '[WriteNode] FAILED to find "' +
              displayName +
              '" with type "' +
              typeName +
              '" on ' +
              nodePath,
          );

          Core.MessageLog.trace('[WriteNode] Available attributes on ' + nodePath + ':');

          for (var j = 0; j < entries.length; j++) {
            var candidate = entries[j];

            Core.MessageLog.trace(
              '[WriteNode ATTR] name="' +
                candidate.name +
                '" | type="' +
                candidate.type +
                '" | keyword="' +
                candidate.keyword +
                '"',
            );
          }

          throw new Error(
            '[WriteNode] Attribute not found: ' +
              displayName +
              ' (' +
              typeName +
              ') on ' +
              nodePath,
          );
        }

        return result;
      }

      /*
       * Integer attributes
       */
      this.leadingZeros = new Core.oIntAttr!(nodePath, keyword('Leading zeros', 'INT'));

      this.start = new Core.oIntAttr!(nodePath, keyword('Start', 'INT'));

      /*
       * String attributes
       */
      this.drawingType = new Core.oTextAttr!(nodePath, keyword('Drawing type', 'STRING'));

      this.movieGenerationScript = new Core.oTextAttr!(
        nodePath,
        keyword('Movie Generation Script', 'STRING'),
      );

      this.colourSpace = new Core.oTextAttr!(nodePath, keyword('Colour Space', 'STRING'));

      /*
       * Boolean attributes
       */
      this.scriptMovie = new Core.oBoolAttr!(nodePath, keyword('Script Movie', 'BOOL'));

      this.cleanupPartitionFolders = new Core.oBoolAttr!(
        nodePath,
        keyword('Clean up partition folders', 'BOOL'),
      );

      /*
       * Enum attribute
       */
      this.compositePartitioning = new Core.oEnumAttr!(
        nodePath,
        keyword('Composite Partitioning', 'GENERIC_ENUM'),
      );

      /*
       * Floating-point attribute
       */
      this.zPartitionRange = new Core.oDoubleAttr!(
        nodePath,
        keyword('Z Partition Range', 'DOUBLE'),
      );

      this.exportToMovie = new Core.oEnumAttr!(nodePath, 'EXPORT_TO_MOVIE');

      this.drawingName = new Core.oTextAttr!(nodePath, 'DRAWING_NAME');

      this.moviePath = new Core.oTextAttr!(nodePath, 'MOVIE_PATH');

      this.MovieFormat = new Core.oTextAttr!(nodePath, 'MOVIE_FORMAT');

      this.MovieAudioSettings = new Core.oTextAttr!(nodePath, 'MOVIE_AUDIO');

      this.MovieVideoSettings = new Core.oTextAttr!(nodePath, 'MOVIE_VIDEO');

      this.MovieVideoAndAudioSettings = new Core.oTextAttr!(nodePath, 'MOVIE_VIDEOAUDIO');

      //   exportToMovie: EnumAttribute;
      // drawingName: TextAttribute;
      // moviePath: TextAttribute;
      // MovieFormat: TextAttribute;
      // MovieAudioSettings: TextAttribute;
      // MovieVideoSettings: TextAttribute;
      // MovieVideoAndAudioSettings: TextAttribute;
    }

    /*
     * ENABLE is a special Harmony attribute type.
     * Use the inherited BaseNode enable methods.
     */
    get enabling(): boolean {
      return this.isEnabled();
    }

    set enabling(value: boolean) {
      this.setEnabled(value);
    }
  }

  return WriteNode;
}

type WriteNodeInstance = InstanceType<ReturnType<typeof createWriteNodeClass>>;
