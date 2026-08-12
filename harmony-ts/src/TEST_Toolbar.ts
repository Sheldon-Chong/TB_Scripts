// ============================================================================
// TEST_Toolbar.ts — Isolated toolbar registration example
//
// Registers a toolbar with several actions, each printing a different message.
// No dependencies on any other project code.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Define actions — each prints a unique message via MessageLog.trace()
// ---------------------------------------------------------------------------

var actionHello: ActionDef = {
  id: 'com.toonboom.test.actionHello',
  text: 'Say Hello',
  icon: 'earth.png',
  isEnabled: true,
  onTrigger: function () {
    MessageLog.trace('Hello from the Test Toolbar! 👋');
  },
};

var actionGoodbye: ActionDef = {
  id: 'com.toonboom.test.actionGoodbye',
  text: 'Say Goodbye',
  icon: 'earth.png',
  isEnabled: true,
  onTrigger: function () {
    MessageLog.trace('Goodbye from the Test Toolbar! 👋');
  },
};

var actionStatus: ActionDef = {
  id: 'com.toonboom.test.actionStatus',
  text: 'Show Status',
  icon: 'earth.png',
  isEnabled: true,
  onTrigger: function () {
    MessageLog.trace('Status: All systems operational.');
  },
};

var actionCounter: ActionDef = {
  id: 'com.toonboom.test.actionCounter',
  text: 'Increment Counter',
  icon: 'earth.png',
  isEnabled: true,
  onTrigger: function () {
    // Use a persistent counter so each click prints a new number
    if (typeof this._counter === 'undefined') {
      this._counter = 0;
    }
    this._counter++;
    MessageLog.trace('Counter clicked! Current count: ' + this._counter);
  },
};

var actionDateTime: ActionDef = {
  id: 'com.toonboom.test.actionDateTime',
  text: 'Print Date/Time',
  icon: 'earth.png',
  isEnabled: true,
  onTrigger: function () {
    var now = new Date();
    MessageLog.trace('Current date/time: ' + now.toString());
  },
};

// ---------------------------------------------------------------------------
// 2. Register every action with ScriptManager
// ---------------------------------------------------------------------------

ScriptManager.addAction(actionHello);
ScriptManager.addAction(actionGoodbye);
ScriptManager.addAction(actionStatus);
ScriptManager.addAction(actionCounter);
ScriptManager.addAction(actionDateTime);

// ---------------------------------------------------------------------------
// 3. Build the toolbar and add buttons for each action
// ---------------------------------------------------------------------------

var testToolbar = new ScriptToolbarDef({
  id: 'com.toonboom.test.toolbar',
  text: 'Test Toolbar',
  customizable: false,
});

testToolbar.addButton({
  text: 'Hello',
  icon: 'earth.png',
  action: actionHello.id,
});

testToolbar.addButton({
  text: 'Goodbye',
  icon: 'earth.png',
  action: actionGoodbye.id,
});

testToolbar.addButton({
  text: 'Status',
  icon: 'earth.png',
  action: actionStatus.id,
});

testToolbar.addButton({
  text: 'Counter',
  icon: 'earth.png',
  action: actionCounter.id,
});

testToolbar.addButton({
  text: 'Date/Time',
  icon: 'earth.png',
  action: actionDateTime.id,
});

// ---------------------------------------------------------------------------
// 4. Register the toolbar in Harmony
// ---------------------------------------------------------------------------

ScriptManager.addToolbar(testToolbar);

MessageLog.trace('TEST_Toolbar: Toolbar and all actions registered successfully.');
