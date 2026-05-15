

var tid = Tools.registerTool({
  name: "com.toonboom.regularPolygonTool",
  displayName: "Regular Polygon Tool",
  icon: "MyTool.png",
  toolType: "drawing",
  canBeOverridenBySelectOrTransformTool: false,
  options: {
    numSides: 6,
    createStar: false,
    ratio: 0.5
  },
  resourceFolder: "resources",
  preferenceName: function () {
    return this.name + ".settings";
  },
  defaultOptions: {
    numSides: 6,
    createStar: false,
    ratio: 0.5
  },
  loadFromPreferences: function () {
    try {
      var v = preferences.getString(this.preferenceName(), JSON.stringify(this.defaultOptions));
      this.options = JSON.parse(v);
    }
    catch (e) {
      this.options = this.defaultOptions;
    }
  },
  storeToPreferences: function () {
    preferences.setString(this.preferenceName(), JSON.stringify(this.options));
  },
  onRegister: function () {
    // This is called once when registering the tool
    // Here the developer can, for example, initialize the tool options
    // from the preferences 
    System.println("Registered tool : " + this.resourceFolder);
    this.loadFromPreferences();
  },
  onCreate: function (ctx) {
    // This is called once for each instance in a view
    // The context could be populated with instance data
  },
  onMouseDown: function (ctx) {
    MessageLog.trace("On mouse down");
    var settings = Tools.getToolSettings();
    if (!settings.currentDrawing)
      return false;

    ctx.origin = ctx.currentPoint;
    System.println("ctx: " + JSON.stringify(ctx));
    return true;
  },
  onMouseMove: function (ctx) {
    // Here, we build the current overlay based on the current mouse move
    // This overlay will be drawn by the system
    this.buildPolygon(ctx, ctx.currentPoint);
    return true;
  },
  onMouseUp: function (ctx) {
    MessageLog.trace("On mouse up");
    var settings = Tools.getToolSettings();
    var cid = PaletteManager.getCurrentColorId();

    // Here, we get a chance to capture the current overlay
    // data and build a new drawing layer painted using the
    // current selected color.
    DrawingTools.createLayers({
      label: "Regular polygon tool",
      drawing: settings.currentDrawing,
      art: 2,
      layers: [
        {
          contours: [
            {
              stroke: true,
              colorId: cid,
              polygon: true,
              path: ctx.overlay.paths[0].path
            }
          ]
        }
      ]
    });
    ctx.overlay = {};
    return true;
  },
  onResetTool: function (ctx) {
    // Make sure there are no left over
    // from the last tool usage 
    ctx.overlay = {};
  },
  loadPanel: function (dialog, responder) {
    // This method loads the ui file or creates it.
    // It must load the ui in the dialog passed in parameter. 
    var uiFile = this.resourceFolder + "/regularPolygonTool.ui";
    System.println("UIfilename:" + uiFile);
    try {
      var ui = UiLoader.load({ uiFile: uiFile, parent: dialog, folder: this.resourceFolder });

      this.ui = ui;

      ui.options.numSides.setValue(this.options.numSides);
      ui.options.numSides['valueChanged(int)'].connect(this, function (v) {
        this.options.numSides = v;
        this.storeToPreferences();
      });
      ui.options.createStar.setChecked(this.options.createStar);
      ui.options.createStar.toggled.connect(this, function (checked) {
        this.options.createStar = checked;
        ui.options.ratio.setEnabled(this.options.createStar);
        this.storeToPreferences();
      });
      ui.options.ratio.setEnabled(this.options.createStar);
      ui.options.ratio.setValue(Math.round(this.options.ratio * 1000));
      ui.options.ratio['valueChanged(int)'].connect(this, function (v) {
        this.options.ratio = v / 1000.0;
        this.storeToPreferences();
      });
    }
    catch (e) {
      System.println("Exception: " + e);
    }
  },
  refreshPanel: function (dialog, responder) {
    // In here, the panel could react to changes in the selection or other external sources
    System.println("Refresh panel");
  },
  buildPolygon: function (ctx, pt) {
    var dx = pt.x - ctx.origin.x;
    var dy = pt.y - ctx.origin.y;
    var l = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx);
    var poly = [];
    var numSides = this.options.numSides;
    var createStar = this.options.createStar;
    var r1 = 1;
    if (createStar) {
      r1 = this.options.ratio;
      numSides *= 2;
    }
    var d = Math.PI * 2 / numSides;
    for (var i = 0; i < numSides; i++) {
      var r = 1;
      if (i % 2)
        r = r1;
      poly.push({ x: ctx.origin.x + r * l * Math.cos(angle + i * d), y: ctx.origin.y + r * l * Math.sin(angle + i * d) });
    }
    poly.push(poly[0]);
    ctx.overlay = { paths: [{ path: poly, color: { r: 0, g: 0, b: 255, a: 255 } }] }
  }
});
Tools.setCurrentTool(tid);  // Or use "com.toonboom.regularPolygonTool"
