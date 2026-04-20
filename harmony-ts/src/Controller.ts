// Capture Controller reference for use in callbacks
var myController;

function setNode(nodePath: string) {
  for (var node of selection.selectedNodes()) {
    selection.removeNodeFromSelection(node);
  }

  selection.addNodeToSelection(nodePath);
}

// Callback functions for each button
function onRedButtonPressed(value) {
  MessageLog.trace("Red button pressed! Value: " + value);
  setNode("Top/Draw_2");
}

function onGreenButtonPressed(value) {
  MessageLog.trace("Green button pressed! Value: " + value);
  setNode("Top/Draw_3");
}

function onBlueButtonPressed(value) {
  MessageLog.trace("Blue button pressed! Value: " + value);
  setNode("Top/Draw_4");
}

Controller.onShowControl = function() {
  myController = Controller;
  Controller.controls = [];
  
  // Red button (top)
  var redButton = new ButtonWidget({
    data: "RedButton",
    position: new Point2d(0, 0),
    screen_space: false,
    on_color: new ColorRGBA(255, 0, 0, 255),
    off_color: new ColorRGBA(100, 0, 0, 128),
    outer_color: new ColorRGBA(0, 0, 0, 255),
    toggle: false,
    size: 1.0,
    label: "Red",
    label_color: new ColorRGBA(255, 255, 255, 255),
    label_bg_color: new ColorRGBA(0, 0, 0, 128),
    label_font: "Arial",
    label_size: 10.0,
    label_justify: "Center",
    label_screenspace: false
  });
  redButton.valueChanged.connect(onRedButtonPressed);
  Controller.controls.push(redButton);
  
  // Green button (middle)
  var greenButton = new ButtonWidget({
    data: "GreenButton",
    position: new Point2d(0, -3),
    screen_space: false,
    on_color: new ColorRGBA(0, 255, 0, 255),
    off_color: new ColorRGBA(0, 100, 0, 128),
    outer_color: new ColorRGBA(0, 0, 0, 255),
    toggle: false,
    size: 1.0,
    label: "Green",
    label_color: new ColorRGBA(255, 255, 255, 255),
    label_bg_color: new ColorRGBA(0, 0, 0, 128),
    label_font: "Arial",
    label_size: 10.0,
    label_justify: "Center",
    label_pos: new Point2d(0, -3),
    label_screenspace: false
  });
  greenButton.valueChanged.connect(onGreenButtonPressed);
  Controller.controls.push(greenButton);
  
  // Blue button (bottom)
  var blueButton = new ButtonWidget({
    data: "BlueButton",
    position: new Point2d(0, -6),
    screen_space: false,
    on_color: new ColorRGBA(0, 0, 255, 255),
    off_color: new ColorRGBA(0, 0, 100, 128),
    outer_color: new ColorRGBA(0, 0, 0, 255),
    toggle: false,
    size: 1.0,
    label: "Blue",
    label_color: new ColorRGBA(255, 255, 255, 255),
    label_bg_color: new ColorRGBA(0, 0, 0, 128),
    label_font: "Arial",
    label_size: 10.0,
    label_justify: "Center",
    label_pos: new Point2d(0, -6),
    label_screenspace: false
  });
  blueButton.valueChanged.connect(onBlueButtonPressed);
  Controller.controls.push(blueButton);
}