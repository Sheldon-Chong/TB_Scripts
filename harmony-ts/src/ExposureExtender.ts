include("Layers.js");
include(specialFolders.userScripts + "/utils/utils.js");

function collectInitialExposures() {
	var rows = [];

	var nodes = selection.selectedNodes();
	var selectedStartFrame = selection.startFrame();
	var selectedEndFrame = selectedStartFrame + selection.numberOfFrames() - 1;

	for (var currentNode of nodes) {
		var row = [];
		var layer = LayerManager.getNodeLayer(currentNode);
		var drawingCol = layer.getColumn("DRAWING.ELEMENT");
		if (!drawingCol) {
			MessageLog.trace("No DRAWING.ELEMENT column found in node: " + currentNode);
			continue;
		}

		for (var frame = selectedStartFrame; frame <= selectedEndFrame; frame++) {
			var drawingValue = drawingCol.getKeyframe(frame);
			row.push(drawingValue);
		}
		rows.push({
			column: drawingCol,
			frames: row,
			node: currentNode
		});
	}
	stringify(rows);

	return rows;
}


function getTimelineMarkersPresentAtFrame(frame: number) {
	var markers = TimelineMarker.getAllMarkers();

	return markers.filter(function (marker) {
		return frame >= marker.frame && frame < marker.frame + Math.max(marker.length, 1);
	});
}

function deleteAllMarkers() {
	var markers = TimelineMarker.getAllMarkers();

	for (var marker of markers) {
		TimelineMarker.deleteMarker(marker);
	}
}

include("Toolbar.js");


include(specialFolders.userScripts + "/utils/test.js");

function extendExposures() {
	const MARGIN = 3;

	var rows = collectInitialExposures();

	var nodes = selection.selectedNodes();
	var selectedStartFrame = selection.startFrame();
	var selectedEndFrame = selectedStartFrame + selection.numberOfFrames() - 1;
	scene.beginUndoRedoAccum("Create Drawing example");

	const extensionLength = 32;

	const BOUNDARY_COLOR = "#9caddb";


	var markers = TimelineMarker.getAllMarkers();


	var skipExtensionFrames: number[] = [];
	markers.forEach(currentMarker => {
		if (currentMarker.color === "#1e90ff") {
			skipExtensionFrames.push(currentMarker.frame);
		}
	});

	stringify(skipExtensionFrames);

	function isMarkerPresentAtFrame(frame: number) {
		var markers = getTimelineMarkersPresentAtFrame(frame);
		markers = markers.filter(function (marker) {
			return marker.color === "#1e90ff";
		});
		return markers.length > 0;
	}

	var extendedIndex = 0;
	var endingFrame = 0;

	try {

		rows.forEach(function (row) {
			var drawingCol = row.column;

			var layer = LayerManager.getNodeLayer(row.node);
			// var currElement = element.getNameById(layer.getElementId());
			var folder = element.completeFolder(layer.getElementId());
			var folderName = element.folder(layer.getElementId());

			var frames = row.frames;

			extendedIndex = 0;

			var isInSkipMode = false;
			var skipModeIndex = 0;

			var start = 0;
			var end = 0;

			row.frames.forEach((element, index) => {
				if (isMarkerPresentAtFrame(index + 1)) {
					if (!isInSkipMode) {
						skipModeIndex = 0;  // Start at 0 so first frame is at start + 0
						start = selectedStartFrame + (extendedIndex * extensionLength);  // Calculate start position once
						isInSkipMode = true;
					}
					drawingCol.setKeyFrame(start + skipModeIndex, frames[index]);
					skipModeIndex++;
					return;  // Skip the extension logic entirely
				}
				else {
					// once exiting skip mode, advance extended index to account for skipped frames
					if (isInSkipMode) {
						extendedIndex++;  // Only advance by 1 - we consumed one "slot"
						isInSkipMode = false;
					}
				}

				start = selectedStartFrame + (extendedIndex * extensionLength);
				end = start + extensionLength - 1;

				var exposureStart = start + MARGIN;
				var exposureEnd = end - MARGIN;

				if (!frames[index]) {
					drawingCol.setKeyframeRange(start, end, "");
					return;
				}

				// Set the main exposure range
				drawingCol.setKeyframeRange(exposureStart, exposureEnd, frames[index]);

				// Now fill the before and after gaps with unique copies
				const originalDrawing = frames[index];
				function createMarginCopy(copyName, frameNum) {
					copyFile(
						`${folder}/${folderName}-${originalDrawing}.tvg`,
						`${folder}/${folderName}-${copyName}.tvg`);
					drawingCol.setKeyFrame(frameNum, copyName);
				}

				// Before margin
				for (var b = 0; b < MARGIN; b++)
					createMarginCopy(`${originalDrawing}_before_${index}_${b}`, start + b);

				// After margin
				for (var a = 0; a < MARGIN; a++)
					createMarginCopy(`${originalDrawing}_after_${index}_${a}`, exposureEnd + 1 + a);
				extendedIndex++;  // Only increment when we actually created an extended exposure

				endingFrame = end;
			});
		});
	}
	catch (e) {
		MessageLog.trace("Error during exposure extension: " + e.toString());
	}

	MessageLog.trace("ending frame: " + endingFrame);
	MessageLog.trace("extended index: " + extendedIndex);
	var copyStartFrame = endingFrame + 2;
	rows.forEach(function (row) {
		var drawingCol = row.column;
		var frames = row.frames;
		for (var i = 0; i < frames.length; i++) {
			drawingCol.setKeyFrame(copyStartFrame + i, frames[i]);
		}
	});


	deleteAllMarkers();

	rows[0].frames.forEach(function (elem, index) {
		try {
			var start = (index * extensionLength) + 1;

			TimelineMarker.createMarker({
				frame: start,
				length: 0,
				color: BOUNDARY_COLOR,
				name: "Boundary",
				notes: "extended exposures"
			});
		}
		catch (e) {
			MessageLog.trace("Failed to create marker: " + e.toString());
		}
	});
	scene.endUndoRedoAccum();

	return;
}

function frameTraverse() {
	function jumpToBoundary(direction: 'next' | 'previous') {
		const markers = TimelineMarker.getAllMarkers().filter(m => m.name === "Boundary");
		const current = frame.current();
		const filtered = markers.filter(m => direction === 'next' ? m.frame > current : m.frame < current);
		if (filtered.length === 0) {
			MessageLog.trace(`No Boundary markers found ${direction} current frame`);
			return;
		}
		const target = filtered.sort((a, b) => direction === 'next' ? a.frame - b.frame : b.frame - a.frame)[0];
		MessageLog.trace(`${direction.charAt(0).toUpperCase() + direction.slice(1)} Boundary marker at frame: ${target.frame}`);
		frame.setCurrent(target.frame);
	}

	registerAction({
		name: "nextBoundary",
		icon: "earth.png",
		shortcut: "Ctrl+Alt+1",
		callback: () => jumpToBoundary('next')
	});

	registerAction({
		name: "previousBoundary",
		icon: "earth.png",
		shortcut: "Ctrl+Alt+2",
		callback: () => jumpToBoundary('previous')
	});
}
