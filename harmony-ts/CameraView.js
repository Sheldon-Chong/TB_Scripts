var CameraView = (function () {
    function CameraView() {
    }
    CameraView.showCurrentDrawingOnTop = function (b) {
        var currentBool = preferences.getBool("DRAWING_SHOW_CURRENT_DRAWING_ON_TOP", false);
        if (currentBool !== b) {
            Action.perform("onActionShowCurrentDrawingOnTop()");
        }
    };
    return CameraView;
}());
