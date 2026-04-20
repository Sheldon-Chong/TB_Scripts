class CameraView {
  static showCurrentDrawingOnTop(b: Boolean) {
    const currentBool = preferences.getBool("DRAWING_SHOW_CURRENT_DRAWING_ON_TOP", false);
    if (currentBool !== b) {
      Action.perform("onActionShowCurrentDrawingOnTop()");
    }
  }
}