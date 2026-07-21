function test() {
    MessageLog.trace("test");
}
function test2() {
    MessageLog.trace("test");
}
function test3() {
    MessageLog.trace("test");
}
function test11() { }
function testPolygon() {
    var tid = Tools.registerTool({
        name: "com.toonboom.regularPolygonTool",
        displayName: "Regular Polygon Tool",
        icon: "MyTool.png",
        toolType: "drawing",
        canBeOverridenBySelectOrTransformTool: true,
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
        getOverlay: function (ctx) {
            var center = this.previewCenter || { x: 500, y: 500 };
            var radius = this.previewRadius || 100;
            var previewCtx = { origin: center };
            this.buildPolygon(previewCtx, { x: center.x + radius, y: center.y });
            return previewCtx.overlay;
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
            System.println("Registered tool : " + this.resourceFolder);
            this.loadFromPreferences();
        },
        onCreate: function (ctx) {
            this.previewCenter = { x: 500, y: 500 };
            this.previewRadius = 100;
            ctx.overlay = this.getOverlay(ctx);
        },
        onMouseDown: function (ctx) {
            MessageLog.trace("On mouse down");
            var settings = Tools.getToolSettings();
            if (!settings.currentDrawing)
                return false;
            ctx.origin = ctx.currentPoint;
            this.buildPolygon(ctx, ctx.currentPoint);
            this.lastPreviewOverlay = ctx.overlay;
            System.println("ctx: " + JSON.stringify(ctx));
            return true;
        },
        onMouseMove: function (ctx) {
            this.buildPolygon(ctx, ctx.currentPoint);
            this.lastPreviewOverlay = ctx.overlay;
            return true;
        },
        onMouseUp: function (ctx) {
            MessageLog.trace("On mouse up");
            var settings = Tools.getToolSettings();
            var cid = PaletteManager.getCurrentColorId();
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
            this.lastPreviewOverlay = ctx.overlay;
            MessageLog.trace("Created polygon layer");
            return true;
        },
        onResetTool: function (ctx) {
            if (this.lastPreviewOverlay) {
                ctx.overlay = this.lastPreviewOverlay;
            }
            else {
                ctx.overlay = {};
            }
        },
        loadPanel: function (dialog, responder) {
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
            this.previewCenter = { x: 500, y: 500 };
            this.previewRadius = 150;
            responder.settingsChanged();
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
            ctx.overlay = { paths: [{ path: poly, color: { r: 0, g: 0, b: 255, a: 255 } }] };
        }
    });
    Tools.setCurrentTool(tid);
}
var _toolbarRegistry = _toolbarRegistry || {};
function finalizeToolbars() {
    for (var toolbarId in _toolbarRegistry) {
        if (!_toolbarRegistry[toolbarId]._isRegistered) {
            MessageLog.trace("Finalizing toolbar: " + toolbarId);
            ScriptManager.addToolbar(_toolbarRegistry[toolbarId]);
            _toolbarRegistry[toolbarId]._isRegistered = true;
        }
    }
}
function registerAction(options) {
    var globals = _;
    var action = {
        id: "com.toonboom." + options.name.replace(/\s+/g, '').toLowerCase(),
        text: options.name,
        icon: options.icon,
        _: _,
        isEnabled: true,
        onTrigger: function () {
            options.callback(globals);
        }
    };
    ScriptManager.addAction(action);
    if (options.shortcut) {
        var shortcut = {
            id: action.id + ".shortcut",
            responder: "ScriptManagerResponder",
            slot: "onTriggerScriptAction(QString)",
            itemParameter: action.id,
            text: options.name,
            value: options.shortcut
        };
        ScriptManager.addShortcut(shortcut);
    }
    var category = options.category || "main";
    var toolbarId = "com.toonboom.toolbar." + category.replace(/\s+/g, '').toLowerCase();
    if (!_toolbarRegistry[toolbarId]) {
        MessageLog.trace("Creating new toolbar: " + toolbarId);
        var toolbar = new ScriptToolbarDef({
            id: toolbarId,
            text: category.charAt(0).toUpperCase() + category.slice(1) + " Toolbar",
            customizable: false
        });
        _toolbarRegistry[toolbarId] = toolbar;
    }
    MessageLog.trace("Adding button: " + options.name + " to toolbar: " + toolbarId);
    _toolbarRegistry[toolbarId].addButton({
        text: options.name,
        icon: options.icon,
        action: action.id
    });
    MessageLog.trace("Button added successfully. Call finalizeToolbars() to register.");
}
function main7() {
    var toggleCoordinatesAction = {
        id: "com.toonboom.toggleMouseCoordinateDisplay",
        text: "Test",
        icon: "earth.png",
        isEnabled: true,
        onTrigger: function () {
            MessageLog.trace("Toggling Mouse Coordinates Display Settings");
        }
    };
    var toolbar = new ScriptToolbarDef({
        id: "com.toonboom.mouseCoordinateToolbar",
        text: "Mouse Coordinate Toolbar",
        customizable: false
    });
    toolbar.addButton({
        text: "Custom Slot Buttonsss",
        icon: "earth.png",
        action: "test  in Toolbar.js"
    });
    toolbar.addButton({
        text: "2fff",
        icon: "earth.png",
        action: "test2  in Toolbar.js",
    });
    toolbar.addButton({
        text: "2fff",
        icon: "C:\\Users\\emers\\Downloads\\eyes.png",
        action: "test3  in Toolbar.js",
    });
    toolbar.addButton({
        text: "2fffa",
        icon: "C:\\Users\\emers\\Downloads\\eyes.png",
        action: "test3  in Toolbar.js",
    });
    ScriptManager.addToolbar(toolbar);
}
