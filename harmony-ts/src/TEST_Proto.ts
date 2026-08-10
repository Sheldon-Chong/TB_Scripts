function setProto() {
  this.__proto__.test = 'aaa';
}

function testProto() {
  // MessageLog.trace('testProto: ' + this.__proto__.registeredTools);
  // MessageLog.trace('testProto: ' + this.__proto__.registeredActions);
  MessageLog.trace('testProto: ' + PermanentFile);
  this.__proto__.PermanentFile = PermanentFile;
}
