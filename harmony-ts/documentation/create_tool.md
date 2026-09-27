Tutorial: Creating a Tool
Creating a Tool

This tutorial explains how to create a tool for Harmony from scratch using javascript.
Definition

A tool has many characteristics that make it different from a regular function or action. First, it can capture mouse or tablet interactions from the user. Second, it can show its settings in the Tool Properties View. Last, it can display an overlay on top of the drawing or camera view.

So, when the script developers wonder if the function they want to create should be an action or a tool, they just have to ask themself:

    Does the function need a mouse or tablet input to work properly?
    Should the function display some sort of preview of what will be modified in the scene or drawing?
    Are there some settings that the function needs to take in argument to tailor its behaviour? 

If the answer to at least one of the first two of these questions is yes, then they should go for a tool creation. Otherwise, they can just create an action that, for example, pops up a dialog asking for some parameters and an apply button.
Two types of tool

There are two types of tool: Drawing Tools and Scene Planning tools. A tool created using scripting will add an entry in the Drawing->Drawing Tools or Animation->Tools menu depending on its type. Currently, there is no way to add the tool in the existing toolbar items. However, developers can create a custom toolbar that can trigger the activation of their tools or their custom actions.
Registering the tool

In order to create a tool, there is only one function call to do.

 //The argument to registerTool will be described later...
var toolId = Tools.registerTool( { ... } ); 

The Tools.registerTool function takes a javascript object as an argument. There is no better explanation than a concrete example to explain the various object parameters to the registerTool method. So, let's write a complete tool from scratch. Suppose we want to create a tool to automatically close gaps at end of pencil lines in a drawing. In order to start creating the tool, first create a folder named GapCloser in a package folder available to the script package manager. One of these folders is the folder named packages in the script folder of the user's preference. To easily locate this folder, one can use this function. It creates the packages folder if it does not exist and opens it using the native file dialog.

function openScriptPackages() {
  var userScriptFolder = specialFolders.userScripts;
  var packages = userScriptFolder + "/packages";
  var info = new QFileInfo(packages);
  if (!info.isDir())
  {
    var d = new QDir(userScriptFolder);
    d.mkdir("packages");
  }
  try {
    QDesktopServices.openUrl(new QUrl("file:///" + packages));
  } catch(e) {
    System.println("Error:" + e);
  }
}

Let's call our tool "Gap Closer". Create a folder named GapCloser in the packages folder. In that folder, create 2 files: configure.js and index.js. Also, create two folders: resources and icons.

The content of the configure.js for a tool should always be relatively the same. It just requires the index.js file and calls an exported function from it.

// configure.js file content
function configure(packageFolder, packageName)
{
  if (about.isPaintMode())
    return;
  require("./index.js").registerTool(packageFolder);
}
exports.configure = configure;

Now, let's write the index.js file step by step.

// Skeleton version of index.js to describe the arguments to Tools.registerTool()

function GapCloserToolName() {
  return "com.toonboom.GapCloserTool"; // Returns the tool unique name in reverse DNS notation.
}

function registerGapCloserTool(packageFolder) {
  System.println("Registering GapCloserTool: " + __file__);
  System.println("Home folder: " + System.getenv("HOME"));

  Tools.registerTool({
    name: GapCloserToolName(), // A unique internal name for the tool. To avoid name clashing, a reverse DNS notation is recommended.
    displayName: "Gap Closer", // The translated name of the tool. This will be the item's name in the Drawing->Drawing Tools or Animation->Tools menu.
    icon: "gapCloser.svg", // The tool icon. Must be located in the icons folder.
    toolType: "drawing",  // can be either drawing or scenePlanning
    canBeOverridenBySelectOrTransformTool: false,
    options: {
    },
    resourceFolder: "resources",  // The folder that will contain the .ui files. After the call to registerTool, this folder will have been remapped to a global folder name so the script can use it to load the ui file.
    defaultOptions: {
    },
    onRegister: function () {
      // This is called once when registering the tool
      // Here the developer can, for example, initialize the tool options
      // from the preferences 
      System.println("Registered tool : " + this.resourceFolder);
    },
    onCreate: function (ctx) {
      // This is called once for each instance in a view
      // The context could be populated with instance data
    },
    onMouseDown: function (ctx) {
      // If the tool handled the mouse down and wants to receive mouse move and up events it must return true from this function.
      return true;
    },
    onMouseMove: function (ctx) {
      // Called on each mouse move.
      return true;
    },
    onMouseUp: function (ctx) {
      // Called on mouse up. In this function, the tool should perform the operations on the drawing or nodes from the scene.
      return true;
    },
    getOverlay : function(ctx) {
      // This method must return an object describing the current overlay
      // If the overlay can be created from mouse interaction, it is preferable to
      // set ctx.overlay = { .... } instead in the mouse move and not define this function at all.
      // Our close gap example needs to define the function because it can compute the
      // gaps from the current drawing and does not need mouse interaction.
    },
    onResetTool: function (ctx) {
      // This is called after the mouse up or when some context changes in the view.
      // On this call the tool can free resources. This function will NOT be called
      // between onMouseDown and onMouseUp.
    },
    loadPanel: function (dialog, responder) {
      // In this function we have to load the ui associated to the tool. This ui will be put
      // in the tool property window.
    },
    refreshPanel: function (dialog, responder) {
      // In here, the panel could react to changes in the selection or other external sources
    }
  });
}

exports.toolname = GapCloserToolName();
exports.registerTool = registerGapCloserTool;

After creating the two javascript file and saved them. Restarting the application should create the new tool. This tool does nothing yet but it can be activated.
Saving and restoring the tool state between runs

It is nice for a tool to remember the settings when the application is restarted or when a new project is loaded. In order to do so, one simply has to use the onRegister() method call to setup the options of the tool. Let's modify our close gap tool to implement this.

{
...
    options: {
      gapSize : 10,
      previewGaps : false
    },
    defaultOptions: {  // These are our default options. If the load fails, we will use these values
      gapSize : 10,
      previewGaps : false
    },
    preferenceName: function () {
      return this.name + ".settings";
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
      // Whenever something changes in the tool property, make sure to call this...
      preferences.setString(this.preferenceName(), JSON.stringify(this.options));
    },
    onRegister: function () {
      // This is called once when registering the tool
      // Here the developer can, for example, initialize the tool options
      // from the preferences 
      System.println("Registered tool : " + this.resourceFolder);
      this.loadFromPreferences();
    },
    ...
}

Adding a tool property panel

When our tool is activated, it does not display anything in the tool properties view. To populate it, we can either create all the widgets manually in the loadPanel method of the tool or use a ui file that be created using the Qt Designer application. The open source version of Qt can easily be installed for that purpose.

Here, we created a small dialog in designer that looks like this.

In order to show the ui file in the Tool Properties View, the loadPanel method needs to be implemented.

  // This only shows a part of the tool definition to show only the loadPanel method...
  {
  ...
   loadPanel : function(dialog, responder) {
      // In this function we have to load the ui associated to the tool. This ui will be put
      // in the tool property window.
      var uiFile = this.resourceFolder + "/gapCloser.ui"; // this.resourceFolder has been remapped by the system to a full path
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
   },
   closeGap : function() {
    // callback function called when the user clicks the closeGap button. 
    // The call to this function is made in the loadPanel method above.
   },
   getGaps : function(drawing, art, withOverlay) 
   {
    // Function that will actually compute the gaps in the drawing
   }
 ...
 }
 

Doing the real stuff

Now that we did all the plumbing to create the tool, made its ui and connected it, we must implement the function to actually find the gaps and close them. Let's start by writing the getGaps() method. In our case, a "gap" is a line that would be needed to join two unconnected extremities of a drawing. To do this, we first need to call Drawing.query.getStrokes() to get the list of all the strokes of all the layers of a drawing. Then, for each layers, it is easy to find out if a stroke is connected to another stroke. Determining if for all the layers requires that we build a map of the number of strokes connected to an extremity for all the layers. The initial body of our function will look like this.

{
...
getGaps : function(drawing, art, withOverlay) 
{
  var ret = {
    art : art,
    modificationCounter : false,
    gapSize : this.options.gapSize,
    toSplitAt : {},
    gapList : [],
    overlay : { paths: []}
  };
  
  if (!drawing) return ret;
  
  // needed for the calls to Drawing API.
  var drawingSpec = {
    drawing: drawing, art: art
  };
  
  // Store the modification flag of the drawing. When we compute the gaps in the getOverlay, 
  // we can use this value to check if the drawing was not modified we can return the cached value
  // to optimize the speed since this computation can be quite expensive 
  ret.modificationCounter = Drawing.getModificationCounter(drawingSpec); 
  
  // Retrieve the strokes of the drawing
  var strokes = Drawing.query.getStrokes(drawingSpec);

  var extremities = {};
  for(var i = 0 ; i < strokes.layers.length ; ++i)
  {
    var layer = strokes.layers[i];
    
    // Each returned layer contains a list of joints which are the extremities of the strokes
    for(var j=0 ; j < layer.joints.length ; ++j)
    {
      var joint = layer.joints[j];
      // build a "key" to store the extremity information in a map.
      var key = joint.x + ":" + joint.y;
      if (!extremities[key]) // If we never saw this point before
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
        // Create a container to describe this extremity
        extremities[key] = { 
            layerIndex : i, 
            strokeIndex : joint.strokes[0].strokeIndex, 
            count: joint.strokes.length, 
            x: joint.x, y : joint.y, 
            distance : dMax, 
            onCurve: true 
         };
      }
      else
      {
        // This was already seen, accumulate the number of extremities connected to it
        extremities[key].count += joint.strokes.length;
      }
    }
  }
  // Now, iterate over the inner vertices of the strokes to
  // Count the one that make a T intersection with a stroke of another layer
  for(var i = 0 ; i < strokes.layers.length ; ++i)
  {
    var layer = strokes.layers[i];
    for(var j=0 ; j < layer.strokes.length ; ++j)
    {
      var stroke = layer.strokes[j];
      for(var k=1 ; k < stroke.path.length - 1 ; ++k)
      {
        var pt = stroke.path[k];
        if (!pt.onCurve) continue; // Only consider onCurve vertices
        var key = pt.x + ":" + pt.y;
        if (extremities.hasOwnProperty(key))
          extremities[key].count++;
      }
    }
  }
  
  
  // Now, the extremities map contains a list of all the extremities and for each of them, count represents the number of extremities connected
  var toConnect = [];
  for(var i in extremities)
  {
    // Retrieve the "single" connected extremities
    if (extremities.hasOwnProperty(i) && extremities[i].count == 1)
    {
      toConnect.push(extremities[i]);
    }
  } 
  
  // Now, toConnect is an array containing all the extremities we want to connect...
  
  // let's define a function to compute the distance between 2 extremities
  var computeDistance = function(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx*dx+dy*dy);
  }
  
  // For each of the toConnect extremities
  for(var i =0 ; i < toConnect.length ; ++i)
  {
    var minIndex = -1;
    var dMin = -1;
    if (toConnect[i].connected) continue; // already connected earlier
    
    // Try to find the closest
    for(var j=0 ; j < toConnect.length ; ++j)
    {
      if (j == i) continue; // skip self
      var d = computeDistance(toConnect[i], toConnect[j]);
      if (d < toConnect[i].distance + toConnect[i].distance + ret.gapSize / 4.0  && (minIndex == -1 || d < dMin))
      {
        minIndex = j;
        dMin = d;
      }
    }
    
    // If found, add it to the gapList
    if (minIndex != -1)
    {
      toConnect[i].connected = true;
      toConnect[minIndex].connected = true;
      ret.gapList.push({ from : toConnect[i], to: toConnect[minIndex]});
    }
    else
    {
       // No connectable extremity was found... look for a T intersection...
       // This case is a bit more complex to implement and is out of the scope of
       // this example. The user can download the full example containing the
       // T intersection code at the end of the tutorial.
    }
  }
  
  if (withOverlay)
  {
    // If an overlay is required, build it.
    ret.overlay = {
      paths: []
    }
    for(var i=0 ; i < ret.gapList.length ; ++i)
    {
      ret.overlay.paths.push({ path: [ret.gapList[i].from, ret.gapList[i].to], color: { r: 255, g: 0, b: 255, a: 255} });
    }
  }
  
  
  return ret;
}
...
}
 

Now that the gaps are found, we need to implement the method closeGaps() in order to make it work.

{
...
  closeGaps : function() {
    var settings = Tools.getToolSettings();
    if (!settings.currentDrawing)
      return;

    var gaps = this.getGaps(settings.currentDrawing, settings.activeArt, false);
    if (!gaps.gapList.length) return;

    // The gap insertion command
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
    scene.beginUndoRedoAccum(command.label);
    // For all the gaps, insert a stroke
    for(var i =0 ; i< gaps.gapList.length ; ++i)
    {
      var gap = gaps.gapList[i];
      command.layers[0].strokes.push({
        stroke : true, polygon: true, path : [gap.from, gap.to]
      });
    }
    DrawingTools.createLayers(command);
    scene.endUndoRedoAccum();
  },
    ...
}

Showing the overlay

Now that we are able to detect where to insert gap strokes and perform the operation, we can show a preview of what will be created when the user presses Create Gaps by implementing the getOverlay method.

{
...
  getOverlay : function(ctx) {
    if (!this.options.previewGaps)
      return null;

    var settings = Tools.getToolSettings();
    if (!settings.currentDrawing)
      return null; 

    // The getGaps method we created is expensive and should not be called
    // at each refresh of the view.
    // To avoid recomputing the gaps when the drawing did not change, we 
    // can use the drawing modification counter.
    var currentModif = Drawing.getModificationCounter({ drawing : settings.currentDrawing});
    if (!this.currentGaps ||
        this.currentGaps.modificationCounter != currentModif || 
        this.currentGaps.art != settings.activeArt || 
        this.options.gapSize != this.currentGaps.gapSize )
    {
      // recompute the gaps if they have never been computed or if the drawing is modified or if the current art changed 
      // or if the gapSize settings changed...
      
      // The last argument is to generate the overlay
      this.currentGaps = this.getGaps(settings.currentDrawing, settings.activeArt, true); 
    }
    
    // return the overlay definition
    return this.currentGaps.overlay;  
  },
 ...
 }

Adding mouse interactivity

Now that we can show an overlay and perform the operation to close gaps on a drawing, it would ne nice if the user could perform the operation on a range of the drawing that he or she determines using the mouse. In fact, we are close to being able to do this. Let's take a look at the mouse handling methods we have implemented.

{
...
  onMouseDown: function (ctx) {
    // If the tool handled the mouse down and wants to receive mouse move and up events it must return true from this function.
    return true;
  },
  onMouseMove: function (ctx) {
    // Called on each mouse move. The ctx variable contains the list of all the accumulated input points from the onMouseDown until now.
    return true;
  },
  onMouseUp: function (ctx) {
    // Called on mouse up. In this function, the tool should perform the operations on the drawing or nodes from the scene.
    // When this method is called, ctx contains all the mouse point that were captured.
    return true;
  },
...
}

The mouse points that were captured during the mouse down/move/up can be used and passed to the closeGap method and also be used to compute the overlay. Let's modify the onMouseUp, getOverlay and closeGap methods.

{
...
  onMouseUp: function (ctx) {
    if (ctx.points && ctx.points.length)
    {
      this.closeGaps(ctx.points) ;
      ctx.points = null; // This will make sure the overlay will not contain the last used points after the operation has been done
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
    // Construct a new overlay containing the preview gaps and the ctx.points array.
    var overlay = { paths : [] };
    for(var i=0 ; this.currentGaps && i 2)
    {
      // convert the path to a bezier path by setting the points all onCurve
      for(var i=0 ; i< usingPath.length ; ++i)
        usingPath[i].onCurve = true;

      usingPath.push(usingPath[0]);
      // isContaining will be an array of boolean values
      isContaining = Drawing.geometry.pathIsContaining({path : usingPath, points : middle});
    }
    
    for(var i =0 ; i< gaps.gapList.length ; ++i)
    {
      var gap = gaps.gapList[i];
      // check if the gap should be added
      if (isContaining && !isContaining[i])
      {
        continue;
      }
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
...
}