/*
* Created by Valentin on 04/23/20.
*
* Copyright (c) 2020 PTC Inc
* 
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.spatial");

realityEditor.gui.spatial.objects = realityEditor.objects;
realityEditor.gui.spatial.spatial = globalStates.spatial;
realityEditor.gui.spatial.screenLocation = {x:-1,y:-1};
realityEditor.gui.spatial.utilities = realityEditor.gui.ar.utilities;
realityEditor.gui.spatial.draw = {};

realityEditor.gui.spatial.whereIs = function(matrix, objectID, toolID, _nodeID) {

    if (objectID in globalStates.spatial.whereIs) {
        this.draw.whereIs(matrix);
    }

    if (toolID in this.spatial.whereIs) {
        if (this.objects[objectID].frames[toolID]) {
            let thisTool = this.objects[objectID].frames[toolID];
            let m3 = [
                thisTool.ar.scale, 0, 0, 0,
                0, thisTool.ar.scale, 0, 0,
                0, 0, thisTool.ar.scale, 0,
                thisTool.ar.x,  thisTool.ar.y, 0, 1
            ];
            let m0 = [];
            let m1 = [];
            
            if (thisTool.ar.matrix.length < 13) {
                this.utilities.multiplyMatrix(m3, matrix, m0);
            } else {
                this.utilities.multiplyMatrix(thisTool.ar.matrix, matrix, m1);
                this.utilities.multiplyMatrix(m3, m1, m0);
            }
            this.draw.whereIs(m0);
        }
    }
};

realityEditor.gui.spatial.draw.whereIs = function (matrix) {

    let screenLocation = {
        x: matrix[12]/matrix[15] + (globalStates.height / 2),
        y: matrix[13]/matrix[15] + (globalStates.width / 2)
    };

    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext('2d');

    // animates position and opacity to ease out towards the next step
    //let destinationStartX = getArrowStartX(computeCurrentStepNumber());
    let startX = globalStates.height/2-30;
    let startY = globalStates.width;

    // starting path of the arrow from the start square to the end square and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, screenLocation.y);
    ctx.lineTo(screenLocation.x, screenLocation.y);
    ctx.strokeStyle = 'rgb(0,255,255)';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(globalStates.height/2+50-30, globalStates.width);
    ctx.lineTo(globalStates.height/2-30,globalStates.width-25);
    ctx.lineTo(globalStates.height/2-50-30, globalStates.width);
    ctx.closePath();
    ctx.fillStyle = "#00ffff";
    ctx.fill();

    globalCanvas.hasContent = true;
};
