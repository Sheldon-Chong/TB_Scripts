
function GapCloserToolName() {
  return "com.toonboom.GapCloserTool";
}

var computeDistance = function(a, b)
{
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx*dx+dy*dy)
}

function registerGapCloserTool(packageFolder) {

  System.println("Registering GapCloserTool: " + __file__);
  System.println("Home folder: " + System.getenv("HOME"));

  Tools.registerTool({
    name: GapCloserToolName(),
    displayName: "Gap Closer",
    icon: "gapCloser.svg",
    toolType: "drawing",
    canBeOverridenBySelectOrTransformTool: false,
    options: {
      gapSize : 10,
      previewGaps : false
    },
    currentGaps : {
      modificationCounter : false,
      gapList : [],
      overlay : { paths: []}
    },
    resourceFolder: "resources",
    preferenceName: function () {
      return this.name + ".settings";
    },
    defaultOptions: {
      gapSize : 10,
      previewGaps : true
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
      return true;
    },
    onMouseMove: function (ctx) {
      return true;
    },
    onMouseUp: function (ctx) {
      if (ctx.points && ctx.points.length)
      {
        this.closeGaps(ctx.points) ;
        ctx.points = null;
      }
      return true;
    },
    getOverlay : function(ctx) {
      if (this.options.previewGaps)
      {
        var settings = Tools.getToolSettings();
        if (!settings.currentDrawing)
          return null; 

        var currentModif = Drawing.getModificationCounter({ drawing : settings.currentDrawing});
        if (!this.currentGaps || this.currentGaps.modificationCounter != currentModif || this.currentGaps.art != settings.activeArt || 
            this.options.gapSize != this.currentGaps.gapSize )
        {
          this.currentGaps = this.getGaps(settings.currentDrawing, settings.activeArt, true);
        }
        if (this.currentMousePoints && this.currentMousePoints.length)
        {
          if (!this.currentGaps.overlay.paths.length || this.currentGaps.overlay.paths[this.currentGaps.overlay.paths.length-1].isGap)
            this.currentGaps.overlay.paths.push({ path: this.currentMousePoints, color: { r: 0, g: 0, b: 255, a: 255} });
          else  
            this.currentGaps.overlay.paths[this.currentGaps.overlay.paths.length-1].path = this.currentMousePoints;
        }
      }
      else
      {
        this.currentGaps = null;
      } 
      var overlay = { paths : [] };
      for(var i=0 ; this.currentGaps && i<this.currentGaps.overlay.paths.length ; ++i)
      {
        overlay.paths.push(this.currentGaps.overlay.paths[i]);
      }
      if (ctx.points)
      {
        overlay.paths.push({ path : ctx.points, color: { r: 0, g: 0, b: 255, a: 255} });
      }
      return overlay;  
    },
    getGaps : function(drawing, art, withOverlay) 
    {
      try {
      var ret = {
        art : art,
        modificationCounter : false,
        gapSize : this.options.gapSize,
        toSplitAt : {},
        gapList : [],
        overlay : { paths: []}
      }
      if (!drawing) return ret;
      var config = {
        drawing: drawing, art: art
      };
      ret.modificationCounter = Drawing.getModificationCounter(config);
      var strokes = Drawing.query.getStrokes(config);

      var getClosestPoint = function(pt) {
        var r = false;
        var dMax = pt.distance + ret.gapSize; // 
        for(var i = 0 ; i < strokes.layers.length ; ++i)
        {
          var layer = strokes.layers[i];
          for(var j=0 ; j<layer.strokes.length ; ++j)
          {
            if (i == pt.layerIndex && j == pt.strokeIndex) continue; 
            var currentDMax = dMax;
            if (layer.strokes[j].thickness)
            {
              currentDMax += layer.strokes[j].thickness.maxThickness;
            }

            var closest = Drawing.geometry.getClosestPoint({ path : layer.strokes[j].path, points : [ pt]});
            if (closest && closest.length == 1 && closest[0].closestPoint && closest[0].closestPoint.distance <= currentDMax)
            {
              r = closest[0].closestPoint;
              r.layerIndex = i;
              r.strokeIndex = j;
              dMax = closest[0].closestPoint.distance;
            }
          }
        }
        return r;
      }

      var extremities = {};
      for(var i = 0 ; i < strokes.layers.length ; ++i)
      {
        var layer = strokes.layers[i];
        for(var j=0 ; j<layer.joints.length ; ++j)
        {
          var joint = layer.joints[j];
          var key = joint.x + ":" + joint.y;
          if (!extremities[key])
          {
            var dMax = ret.gapSize;
            if (joint.strokes.length == 1)
            {
              var stroke = layer.strokes[joint.strokes[0].strokeIndex];
              if (stroke.thickness)
              {
                dMax = stroke.thickness.maxThickness;
              }
            }
            extremities[key] = { layerIndex : i, strokeIndex : joint.strokes[0].strokeIndex, count: joint.strokes.length, x: joint.x, y : joint.y, distance : dMax, onCurve: true };
          }
          else
          {
            extremities[key].count += joint.strokes.length;
          }
        }
      }
      for(var i = 0 ; i < strokes.layers.length ; ++i)
      {
        var layer = strokes.layers[i];
        for(var j=0 ; j<layer.strokes.length ; ++j)
        {
          var stroke = layer.strokes[j];
          for(var k=1 ; k < stroke.path.length - 1 ; ++k)
          {
            var pt = stroke.path[k];
            if (!pt.onCurve) continue;
            var key = pt.x + ":" + pt.y;
            if (extremities.hasOwnProperty(key))
            extremities[key].count++;
          }
        }
      }

      var toConnect = [];
      for(var i in extremities)
      {
        if (extremities.hasOwnProperty(i) && extremities[i].count == 1)
        {
          toConnect.push(extremities[i]);
        }
      } 
      
      for(var i =0 ; i<toConnect.length ; ++i)
      {
        var minIndex = -1;
        var dMin = -1;
        if (toConnect[i].connected) continue;
        for(var j=0 ; j<toConnect.length ; ++j)
        {
          if (j == i) continue;
          var d = computeDistance(toConnect[i], toConnect[j]);
          if (d < toConnect[i].distance + toConnect[i].distance + ret.gapSize / 4.0  && (minIndex == -1 || d < dMin))
          {
            minIndex = j;
            dMin = d;
          }
        }
        if (minIndex != -1)
        {
          toConnect[i].connected = true;
          toConnect[minIndex].connected = true;
          ret.gapList.push({ from : toConnect[i], to: toConnect[minIndex]});
        }
        else
        {
          var closest = getClosestPoint(toConnect[i]);
          if (closest)
          {
            ret.gapList.push({ from : toConnect[i], to: closest, isTIntersection : true });
            if (closest.t != Math.floor(closest.t))
            {
              var key = closest.layerIndex + ":" + closest.strokeIndex;
              if (!ret.toSplitAt[key])
              {
                ret.toSplitAt[key] = {
                  layer : closest.layerIndex,
                  strokeIndex : closest.strokeIndex,
                  insertPoints : [ closest.t ]
                };
              }
              else
              {
                if (ret.toSplitAt[key].insertPoints.indexOf(closest.t) == -1)
                {
                  ret.toSplitAt[key].insertPoints.push(closest.t);
                  ret.toSplitAt[key].insertPoints = ret.toSplitAt[key].insertPoints.sort();
                }
              }
            }
            toConnect[i].connected = true;
          }
        }
      }
      } catch(e) 
      {
        System.println("Exception in getGaps: " + e);
      }
      if (withOverlay)
      {
        ret.overlay = {
          paths: []
        }
        for(var i=0 ; i<ret.gapList.length ; ++i)
        {
          ret.overlay.paths.push({ isGap : true, path: [ret.gapList[i].from, ret.gapList[i].to], color: { r: 255, g: 0, b: 255, a: 255} });
        }
      }
      return ret;
    },
    closeGaps : function(usingPath) {
      var settings = Tools.getToolSettings();
      if (!settings.currentDrawing)
        return;

      var gaps = this.getGaps(settings.currentDrawing, settings.activeArt, false);
      if (!gaps.gapList.length) return;

      var command = {
        label : "Close Gaps",
        art: settings.activeArt,
        drawing: settings.currentDrawing,
        layers : [
          {
            under: false,
            strokes : [
              
            ]
          }
        ]
      }
      function snapGap(strokes, gap)
      {
        if (!gap.isTIntersection || !strokes) return;
        for(var i = 0 ; i < strokes.layers.length ; ++i)
        {
          var layer = strokes.layers[i];
          for(var j=0 ; j<layer.strokes.length ; ++j)
          {
            for(var k=0 ; k < layer.strokes[j].path.length ; ++k )
            {
              var d = computeDistance(gap.to, layer.strokes[j].path[k]);
              if (d < 1)
              {
                gap.to = layer.strokes[j].path[k];
                return;
              }
            }
          }
        }
  
      }

      scene.beginUndoRedoAccum(command.label);
      var splitCommand = {
        label : command.label,
        art: settings.activeArt,
        drawing: settings.currentDrawing,
        strokes : []
      };
      for(var i in gaps.toSplitAt)
      {
        if (!gaps.toSplitAt.hasOwnProperty(i)) continue;
        splitCommand.strokes.push(gaps.toSplitAt[i]);
      }
      var newDrawingStrokes = null;
      if (splitCommand.strokes.length)
      {
        DrawingTools.modifyStrokes(splitCommand);
        newDrawingStrokes = Drawing.query.getStrokes({drawing : splitCommand.drawing, art : splitCommand.art});
      }
      var middle = [];
      for(var i =0 ; i< gaps.gapList.length ; ++i)
      {
        var g = gaps.gapList[i];
        middle.push({x : 0.5*(g.from.x + g.to.x), y : 0.5*(g.from.y + g.to.y)});
      }
      var isContaining = null;
      if (usingPath && usingPath.length > 2)
      {
        for(var i=0 ; i< usingPath.length ; ++i)
          usingPath[i].onCurve = true;

        usingPath.push(usingPath[0]);
        isContaining = Drawing.geometry.pathIsContaining({path : usingPath, points : middle});
      }

      for(var i =0 ; i< gaps.gapList.length ; ++i)
      {
        var gap = gaps.gapList[i];
        if (isContaining && !isContaining[i])
        {
          continue;
        }
        snapGap(newDrawingStrokes, gap);
        command.layers[0].strokes.push({
          stroke : true, polygon: true, path : [gap.from, gap.to]
        }); 
      }
      if (command.layers[0].strokes.length == 0)
      {
        scene.cancelUndoRedoAccum(); // avoid having an empty undo operation...
        return;
      }
      DrawingTools.createLayers(command);
      scene.endUndoRedoAccum();
    },
    onResetTool: function (ctx) {
    },
    loadPanel: function (dialog, responder) {
      // In this function we have to load the ui associated to the tool. This ui will be put
      // in the tool property window.
      var uiFile = this.resourceFolder + "/gapCloser.ui";
      try {
        var ui = UiLoader.load({ uiFile: uiFile, parent: dialog, folder: this.resourceFolder });

        this.ui = ui;
        ui.gapSize.value = this.options.gapSize;
        ui.gapSize.valueChanged.connect(this, function(value) {
          this.options.gapSize = value;
          this.storeToPreferences();   
          responder.settingsChanged(); // This will trigger a refresh of the drawing view
        });
        ui.previewGaps.checked = this.options.previewGaps;
        ui.previewGaps.clicked.connect(this, function(checked) {
          this.options.previewGaps = checked;       
          this.storeToPreferences();   
          responder.settingsChanged();
        });
        ui.closeGaps.enabled = true;
        ui.closeGaps.clicked.connect(this, function() {
          try
          {
            this.closeGaps();
            this.currentGaps = this.getGaps(null, 2, true);
            this.refreshPanel(dialog, responder);
          } catch (e)
          {
            System.println("Exception:  "  + e);
          }
        });
        ui.show();
      } 
      catch (e) {
        System.println("Exception: " + e);
      }
      //System.println("Loaded panel");

    },
    refreshPanel: function (dialog, responder) {
      // In here, the panel could react to changes in the selection or other external sources
      var settings = Tools.getToolSettings();
      if (!settings.currentDrawing)
      {
        this.ui.closeGaps.enabled = false;
        this.currentGaps = null;
      }
      else
      { 
        this.ui.closeGaps.enabled = true;
      }
    }
  });
  Tools.setCurrentTool(GapCloserToolName());
}

exports.toolname = GapCloserToolName();
exports.registerTool = registerGapCloserTool;

function registerTool() {

}