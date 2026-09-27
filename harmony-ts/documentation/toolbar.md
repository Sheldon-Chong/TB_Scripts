Tutorial: Creating a Toolbar
Creating a Toolbar

This tutorial explains how to create a toolbar for Harmony using javascript.
Creating the actions

Toolbars contain buttons that are attached to actions and action validators. In order to add buttons to a toolbar, one must first define actions.

There are three types of action that can be defined via the scripting interface.

    State toggle action;
    Command action;
    Tool activating action.

State toggle action are action that flip a boolean switch. It cam be used to control a behavior of a tool or to toggle a preference. Command actions are actions that perform a command on the data of the scene and that will create undoable commands. Tool activating actions are a special case of state toggle action that will activate a tool. The tool can be a predefined Harmony tool or a scripted tool as described in the Tool Creation tutorial.

Here is a small example of the creation of a toggle type action.


  // Define script actions with scripted validators
  var demoAction1 = {
    id: "com.toonboom.demoAction1",
    text: "Demo action1",
    icon: "demo-action-1.png",
    checkable: true,
    isEnabled: true,
    isChecked : true, // If the action is checkable, you have to define the isChecked member
    onTrigger: function () {
      // manage the isChecked state
      // Here, we just do a toggle on activate
      this.isChecked = !this.isChecked;
      MessageLog.trace("Triggered action 1: " + this.isChecked);
    }
  };
  ScriptManager.addAction(demoAction1);
 

Creating the toolbar

To be used, an action can be inserted in either a toolbar or a menu.
This example adds the action above in a toolbar named Demo Toolbar

//Create Toolbar
var demoToolbar = new ScriptToolbarDef({
id: "com.toonboom.DemoToolbar",  // A unique identifier. Use of reverse DNS is recommended.
text: "Demo Toolbar",            // The name of the toolbar
customizable: false              // If true, the toolbar is customizable.
});

// This adds the button to the toolbar
demoToolbar.addButton({
text: demoAction1.text,
icon: demoAction1.icon,
checkable: demoAction1.checkable,
action: demoAction1.id
});

ScriptManager.addToolbar(demoToolbar); // This will add the toolbar to the toolbar system

Concrete example

Let's suppose we want to create a toolbar to have a quick access to our favorite tools and functions. Let's assume we like to toggle the preference to show particles as dots in the camera view and we want to be able to toggle the coordinate units that are displayed in the bottom of the drawing view when we are editing a drawing. This preference comes in quite handy when exploring strokes in a drawing because it gives access to the [-2500, 2500] vector drawing coordinates insteadof the field units. Let's also add buttons for the transform tool, the select tool, the rotate tool and the brush tool.
First, we define the actions.


function createFavoriteToolbar() {

  // Action to toggle the coordinate units in the bottom of the camera/drawing view
  var toggleCoordinatesAction = {
    id: "com.toonboom.toggleMouseCoordinateDisplay",
    text: "Toggle Mouse Coordinates Display Settings",
    icon: "earth.png",
    checkable: true,
    isEnabled: true,
    isChecked: preferences.getBool("DRAWING_VIEW_SHOW_RAW_MOUSE_COORDINATES", false), // initial state
    onPreferenceChanged: function () {
      // If the preference is changed from elsewhere, this will react and update the current state of the action
      this.isChecked = preferences.getBool("DRAWING_VIEW_SHOW_RAW_MOUSE_COORDINATES", false);
    },
    onTrigger: function () {
      // This is called when the user presses the button
      this.isChecked = !this.isChecked;
      preferences.setBool("DRAWING_VIEW_SHOW_RAW_MOUSE_COORDINATES", this.isChecked);
    }
  };
  ScriptManager.addAction(toggleCoordinatesAction);

  // Toggler to show particles as dots. Please not that 
  // the views must be refreshed when this preference changes
  var toggleShowParticlesAsDotAction = {
    id: "com.toonboom.ParticleShowParticlesAsDotsInOpenGL",
    text: "Toggle Show Particles as Dots",
    icon: "dots.png",
    checkable: true,
    isEnabled: true,
    isChecked: preferences.getBool("ParticleShowParticlesAsDotsInOpenGL", false),
    onPreferenceChanged: function () {
      this.isChecked = preferences.getBool("ParticleShowParticlesAsDotsInOpenGL", false);
    },
    onTrigger: function () {
      this.isChecked = !this.isChecked;
      preferences.setBool("ParticleShowParticlesAsDotsInOpenGL", this.isChecked);
      // here we call refresh views because we want to see the result immediately and not wait the next time the
      // windows are invalidated
      view.refreshViews();
    }
  };
  ScriptManager.addAction(toggleShowParticlesAsDotAction);

  // The actions associated to the tool switching do not need to
  // use the ScriptManager.addAction method. There are built in actions
  // that can be triggered for them.
  
  // Now, create the toolbar and add the buttons
  
    var favoriteToolbar = new ScriptToolbarDef({
      id: "com.toonboom.favoriteToolbar",
      text: "Favorites",
      customizable: true
    });

    favoriteToolbar.addButton({
      text: toggleCoordinatesAction.text,
      icon: toggleCoordinatesAction.icon,
      checkable: toggleCoordinatesAction.checkable,
      action: toggleCoordinatesAction.id
    });

    favoriteToolbar.addButton({
      text: toggleShowParticlesAsDotAction.text,
      icon: toggleShowParticlesAsDotAction.icon,
      checkable: toggleShowParticlesAsDotAction.checkable,
      action: toggleShowParticlesAsDotAction.id
    });
     
     favoriteToolbar.addButton({
        text: "Transform Tool",
        icon: "cameratoolbar/transformtool.svg", // This icon is part of the Harmony resources, we can use it
        checkable: true,
        responder: "scriptResponder",
        slot: "onActionActivateToolByName(QString)",
        itemParameter: "Transform"
    });

    favoriteToolbar.addButton({
        text: "Select Tool",
        icon: "drawingtool/select.svg",
        checkable: true,
        responder: "scriptResponder",
        slot: "onActionActivateToolByName(QString)",
        itemParameter: "Select"
    });

     favoriteToolbar.addButton({
        text: "Rotate Tool",
        icon: "cameratoolbar/rotatetool.svg",
        checkable: true,
        responder: "scriptResponder",
        slot: "onActionActivateToolByName(QString)",
        itemParameter: "Rotate"
    });

     favoriteToolbar.addButton({
        text: "Brush Tool",
        icon: "drawingtool/brush.svg",
        checkable: true,
        responder: "scriptResponder",
        slot: "onActionActivateToolByName(QString)",
        itemParameter: "Brush"
    });
    
    // Add the toolbar to the toolbar system   
    ScriptManager.addToolbar(favoriteToolbar); 
         
}
 

Now that we created the function to create the toolbar, this function must be called at startup time. Let's call it from a package. Create a folder named FavoriteToolbar in the preference script folder. The code above must be put in a file named configure.js inside that newly created folder. Now, we must export the function that will be called by the package manager at startup time.


  function configure(packageFolder, packageName) {
     MessageLog.trace("Creating Favorite Toolbar");
     createFavoriteToolbar();
  }
  
  exports.configure = configure;

Now, the new icons that we declared in the creation of the 2 toggle actions must be created and put in the icons folder of the package FavoriteToolbar. You can download this example package here: FavoriteToolbar.zip. The toolbar looks like this.

In this example, we could have created a button to activate the tool created in the tool creation example from the tutorial Toool Creation Tutorial by providing the id of the tool as itemParameter like the example below.


     favoriteToolbar.addButton({
        text: "Gap Closer",
        icon: "drawingtool/closegap.svg",
        checkable: true,
        responder: "scriptResponder",
        slot: "onActionActivateToolByName(QString)",
        itemParameter: "com.toonboom.GapCloserTool"
    });

