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
realityEditor.gui.spatial.worldOrigin = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];
realityEditor.gui.spatial.objects = realityEditor.objects;
realityEditor.gui.spatial.spatial = globalStates.spatial;
realityEditor.gui.spatial.screenLocation = {x:-1,y:-1};
realityEditor.gui.spatial.utilities = realityEditor.gui.ar.utilities;
realityEditor.gui.spatial.whereIsList = {};
realityEditor.gui.spatial.howFarIsList = {};
realityEditor.gui.spatial.whereWasList = {};
realityEditor.gui.spatial.velocityOfList = {};
realityEditor.gui.spatial.nodeList = {};
realityEditor.gui.spatial.historianOn = false;
realityEditor.gui.spatial.spatialOn = false;
realityEditor.gui.spatial.myp5 = null;
realityEditor.gui.spatial.draw = {};
realityEditor.gui.spatial.clearSpatialList = function (){
    realityEditor.gui.spatial.whereIsList = {};
    realityEditor.gui.spatial.howFarIsList = {};
    realityEditor.gui.spatial.whereWasList = {};
    realityEditor.gui.spatial.velocityOfList = {};
    realityEditor.gui.spatial.nodeList = {};
};
realityEditor.gui.spatial.lineAnimationList = {};

realityEditor.gui.spatial.checkState = function() {
    realityEditor.gui.spatial.historianOn = false;
    realityEditor.gui.spatial.spatialOn = false;

    for (let ip in globalStates.spatial.whereIs) {
        if (Object.keys(globalStates.spatial.whereIs[ip]).length > 0) {
            realityEditor.gui.spatial.spatialOn = true;
            break;
        }
    }

    if (!realityEditor.gui.spatial.spatialOn) {
        for (let ip in globalStates.spatial.howFarIs) {
            if (Object.keys(globalStates.spatial.howFarIs[ip]).length > 0) {
                realityEditor.gui.spatial.spatialOn = true;
                break;
            }
        }
    }

    for (let ip in globalStates.spatial.whereWas) {
        if (Object.keys(globalStates.spatial.whereWas[ip]).length > 0) {
            realityEditor.gui.spatial.spatialOn = true;
            realityEditor.gui.spatial.historianOn = true;
            break;
        }
    }

    if (!realityEditor.gui.spatial.spatialOn ||
        !realityEditor.gui.spatial.historianOn) {
        for (let ip in globalStates.spatial.velocityOf) {
            if (Object.keys(globalStates.spatial.velocityOf[ip]).length > 0) {
                realityEditor.gui.spatial.spatialOn = true;
                realityEditor.gui.spatial.historianOn = true;
                break;
            }
        }
    }

    if (realityEditor.gui.spatial.myp5 === null && realityEditor.gui.spatial.spatialOn) {
        realityEditor.gui.spatial.myp5 = new p5(realityEditor.gui.spatial.sketch.bind(realityEditor.gui.spatial), 'p5WebGL');
    }
};

// update the whereIsList, howFarIsList, whereWasList, and velocityOfList with modelView matrices of each selected thing
// also append the model matrices of each selected thing to the historian timeRecorder
realityEditor.gui.spatial.collectSpatialLists = function() {
    if (!realityEditor.gui.spatial.spatialOn) return;
    
    this.worldOrigin = realityEditor.sceneGraph.getViewMatrix();

    this.collectSpatialList(globalStates.spatial.whereIs, this.whereIsList);
    this.collectSpatialList(globalStates.spatial.howFarIs, this.howFarIsList);
    this.collectSpatialList(globalStates.spatial.whereWas, this.whereWasList);
    this.collectSpatialList(globalStates.spatial.velocityOf, this.velocityOfList);

    let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');

    // if the historian is on, store the matrix of each visible object at each timestep
    if (realityEditor.gui.spatial.historianOn) {
        Object.keys(realityEditor.gui.ar.draw.visibleObjects).forEach(function (objectKey) {
            this.timeRecorder.initSequence(objectKey, objectKey, '', '');
            
            let objMatrix = []; // remove viewMatrix from modelView matrix to get correct modelMatrix
            let objMVMatrix = realityEditor.sceneGraph.getModelViewMatrix(objectKey, true, true);
            this.utilities.multiplyMatrix(objMVMatrix, cameraNode.localMatrix, objMatrix);
            
            this.timeRecorder.addMatrix(objMatrix, objectKey);
            
            let thisObject = realityEditor.getObject(objectKey);
            if (thisObject) {
                Object.keys(thisObject.frames).forEach(function(frameKey) {
                    this.timeRecorder.initSequence(frameKey, objectKey, frameKey, '');

                    let frameMatrix = []; // remove viewMatrix from modelView matrix to get correct modelMatrix
                    let frameMVMatrix = realityEditor.sceneGraph.getModelViewMatrix(frameKey, true, true);
                    this.utilities.multiplyMatrix(frameMVMatrix, cameraNode.localMatrix, frameMatrix);

                    this.timeRecorder.addMatrix(frameMatrix, frameKey);

                }.bind(this));
            }
        }.bind(this));
    }
};

// helper function to populate the correct list (e.g. whereIsList) with the ID and modelView matrix pairs of each
// object or tool selected for each server IP that has some active spatial questions
realityEditor.gui.spatial.collectSpatialList = function(selectionList, resultsList) {
    for (let ip in selectionList) {
        for (let key in selectionList[ip]) {
            // try to get the ModelView matrix of this entity
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(key);
            if (sceneNode) {
                resultsList[key] = {
                    'key': key,
                    'matrix': realityEditor.sceneGraph.getModelViewMatrix(key, true, true)
                };
            }
        }
    }
};

realityEditor.gui.spatial.myFont = null;
realityEditor.gui.spatial.canvasThis = null;
realityEditor.gui.spatial.saveOldMatrix = null;

let _canvasTexture = null;

realityEditor.gui.spatial.sketch = function(p) {
    p.preload = function() {
        this.myFont = p.loadFont('thirdPartyCode/fonts/roboto.ttf');
    }.bind(this);

    p.setup = function() {
        p.setAttributes('antialias', true);
        this.canvasThis = p.createCanvas(globalStates.height,globalStates.width, p.WEBGL);
        this.canvasThis.id('p5jsCanvas');
        let gl = document.getElementById('p5jsCanvas').getContext('webgl');
        gl.disable(gl.DEPTH_TEST);
        _canvasTexture = p.createGraphics(globalStates.height, globalStates.width,null, globalCanvas.canvas);

        //  p.frameRate(5);
    }.bind(this);

    p.draw = function() {
        p.clear();

        // copy normal ball connection context

        p.push();
        this.canvasThis.uPMatrix.set(globalStates.realProjectionMatrix);
        // console.log(p.frameRate());


        this.canvasThis.uMVMatrix.set([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1]);

        /*
          p.push();
      
          p.translate(globalStates.height/2,-globalStates.width/2,-544);
         // if(globalStates.deviceOrientationRight) {
          p.rotateY(Math.PI);
      //}
      // canvasTexture.background(100);
          p.image(canvasTexture, 0, 0);
          p.pop();
          */
        /*  for(let key in this.nodeList) {
              this.draw.nodesP5(this.nodeList[key],p);
          }*/

        for(let key in this.whereIsList) {
            this.draw.whereIsP5(this.whereIsList[key],p);
        }

        for(let key in this.howFarIsList) {
            this.draw.howFarIsP5(this.howFarIsList[key],p);
        }

        for(let key in this.velocityOfList) {
            this.draw.velocityOfP5(this.velocityOfList[key],p);
        }

        this.canvasThis.uMVMatrix.apply(this.worldOrigin);

        //  p.translate( this.worldOrigin[12], this.worldOrigin[13], this.worldOrigin[14]);
        /*
                p.fill('rgba(0,255,255, 1)');
                p.stroke('rgba(0,255,255, 1)');
                p.circle(0,0,20);
                p.sphere(5);*/


        for(let key in this.whereWasList) {
            this.draw.whereWasP5(this.whereWasList[key],p);
        }

        p.pop();

        if(!realityEditor.gui.spatial.spatialOn){
            p.remove();
            console.log("removed p5js")
            realityEditor.gui.spatial.myp5 = null;
        }
      
    }.bind(this);
};

// creating the p5 canvas somehow sets display:none on the globalCanvas
// for now, fix it by repeatedly setting it back to un-hidden a few times
for (let time = 100; time < 5000; time *= 2) {
    setTimeout(function() {
        globalCanvas.canvas.style.display = ''; // unhide the canvas getting auto-hidden by p5
    }, time);
}

realityEditor.gui.spatial.draw.nodesP5 = function (object,p) {
    p.push();
    realityEditor.gui.spatial.canvasThis.uMVMatrix.apply(object.matrix);
//p.translate(m[12], m[13], m[14]*0.97);
    //   p.background(100);
    p.erase();
    p.fill('rgba(255,255,255, 1)');
    p.stroke('rgba(0,255,255, 1)');
    p.circle(0,0,250);
    p.noErase();
    p.blendMode(p.ADD);
    // p.sphere(50);

    p.translate(0, -400, 0);

    p.textFont(realityEditor.gui.spatial.myFont);
    p.textSize(250);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(object.object.data.value, 0, 0);
    p.pop();
};

realityEditor.gui.spatial.draw.whereWasP5 = function (workObject,p){
    p.noStroke();
    if(!(workObject.key in realityEditor.gui.spatial.timeRecorder.sequences)) return;
    let sequence = realityEditor.gui.spatial.timeRecorder.sequences[workObject.key].sequence;

    if(sequence.length>2){
        for (let i = 1; i < sequence.length; i++) {
            // p.vertex(sequence[i].m[0], sequence[i].m[1],sequence[i].m[2]);
            // realityEditor.gui.spatial.draw.drawLineP5(p, null, sequence[i-1].m,sequence[i].m,2, 2,[0,255,255, 1],[0,255,255, 1], "solid", 2, null);
            realityEditor.gui.spatial.draw.drawLineP5(p, workObject, sequence[i-1].m,sequence[i].m ,2, 2,[0,255,255, 1],[0,255,255, 1], "solid", -0.1, null);

        }
        /*  p.endShape();
          p.pop();*/
    }
};

realityEditor.gui.spatial.draw.lastLocation = {};

realityEditor.gui.spatial.draw.velocityOfP5 = function (workObject,p) {
    if (!(workObject.key in realityEditor.gui.spatial.timeRecorder.sequences)) return;

    let thisSequence = realityEditor.gui.spatial.timeRecorder.sequences[workObject.key];

    let m1 = workObject.matrix;
    p.fill("rgba(0,255,255, 1)");
    p.noStroke();
    p.push();
    p.translate(workObject.matrix[12], workObject.matrix[13],workObject.matrix[14]);
    p.sphere(5);
    p.pop();
    // erase background
    p.push();
    p.translate(
        m1[12],
        m1[13]-25,
        m1[14]);
    if(!globalStates.deviceOrientationRight) {
        p.rotateX(Math.PI);
    } else {
        p.rotateY(Math.PI);
    }

    p.textFont(realityEditor.gui.spatial.myFont);
    p.textSize(15);
    p.textAlign(p.CENTER, p.CENTER);

    p.text(parseInt(thisSequence.speed*10)/10 + ' m/s', 0, 0);
    p.pop();


    let m4 = realityEditor.gui.spatial.timeRecorder.copyArray(workObject.matrix);

    m4[12] -= thisSequence.speedVector[0];
    m4[13] -= thisSequence.speedVector[1];
    m4[14] -= thisSequence.speedVector[2];

    realityEditor.gui.spatial.draw.drawLineP5(p, workObject, workObject.matrix, m4, 4, 2, [255, 255, 0, 1], [255, 255, 0, 1], "solid", 0, null);
};

realityEditor.gui.spatial.draw.whereIsP5 = function (workObject,p) {
    let matrix = workObject.matrix;

    p.push();

    p.stroke('rgba(0,255,255, 0.8)');
    p.noStroke();
    p.fill('rgba(0,255,255, 0.8)');

    p.beginShape();

    p.vertex(-5,10, -20);
    p.vertex(-5,matrix[13], matrix[14]);
    p.vertex(0,matrix[13]-5, matrix[14]);
    p.vertex(+5,matrix[13], matrix[14]);
    p.vertex(+5,10, -20);
    p.endShape();

    p.stroke('rgba(0,255,255, 0.8)');
    p.strokeWeight(0.0);
    p.fill('rgba(0,255,255, 0.8)');
    p.beginShape();
    p.vertex(-5, matrix[13], matrix[14]);
    p.vertex(0, matrix[13]-5, matrix[14]);
    p.vertex(5, matrix[13], matrix[14]);
    p.vertex(0, matrix[13]+5, matrix[14]);
    p.endShape();


    p.fill('rgba(0,255,255, 0.8)');
    p.beginShape();
    p.vertex(0, matrix[13]+5, matrix[14]);
    p.vertex(matrix[12], matrix[13]+2, matrix[14]);
    p.vertex(matrix[12], matrix[13]-2, matrix[14]);
    p.vertex(0, matrix[13]-5, matrix[14]);
    p.endShape();

    p.translate(matrix[12], matrix[13], matrix[14]);
    p.fill('rgba(0,255,255, 1)');
    p.sphere(5);
    p.pop();
};

let _angle = 0;
realityEditor.gui.spatial.draw.howFarIsP5 = function (obj,p) {
    let m1 = obj.matrix;
    let _worldAngle = Math.atan2(m1[13], m1[12]);
    let color;
    color = [0,255,255, 0.8];

    p.noStroke();

    p.fill('rgba(0,255,255, 1)');
    p.push();
    p.translate(obj.matrix[12], obj.matrix[13],obj.matrix[14]);
    p.sphere(5);
    p.pop();
    p.fill(color);
    for (let key in realityEditor.gui.spatial.howFarIsList) {
        if (key !== obj.key) {
            let m2 = realityEditor.gui.spatial.howFarIsList[key].matrix;

            if (m1[12]>m2[12]) {

                realityEditor.gui.spatial.draw.drawLineP5(p, obj, m1,m2,2, 2,[0,255,255, 1],[0,255,255, 1], "solid", 15, "line");

                // erase background
                p.push();
                p.translate(
                    (m1[12]+m2[12])/2,
                    (m1[13]+m2[13])/2,
                    (m1[14]+m2[14])/2 );
                p.translate(0,0,19.9);
                p.fill("rgba("+color+")");
                p.erase();
                p.rect(-20, -10, 40, 20, 5);
                p.noErase();
                p.blendMode(p.ADD);

                // distance Number
                p.translate(0,0,0.1);
                if(!globalStates.deviceOrientationRight) {
                    p.rotateX(Math.PI);
                } else {
                    p.rotateY(Math.PI);
                }
                p.fill("rgba("+color+")");
                let distance = Math.sqrt(Math.pow(m1[12]-m2[12], 2) + Math.pow(m1[13]-m2[13], 2) + Math.pow(m1[14]-m2[14], 2));
                p.textFont(realityEditor.gui.spatial.myFont);
                p.textSize(15);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(parseInt(distance)/10, 0, 0);

                p.pop();
            }
        }
    }
};

realityEditor.gui.spatial.draw.mL = {
    x : 12,
    y : 13,
    z : 14,
    x2 : 12,
    y2 : 13,
    z2 : 14
};

realityEditor.gui.spatial.draw.drawLineP5 = function (p, obj, m1,m2,startWidth, endWidth, startColor, endColor, lineType, endSpacer, endpointType) {
    let that = realityEditor.gui.spatial.draw.mL;

    that.x = 12;
    that.y = 13;
    that.z = 14;

    that.x2 = 12;
    that.y2 = 13;
    that.z2 = 14;


    if(m1.length < 5){
        that.x = 0;
        that.y = 1;
        that.z = 2;
    }

    if(m2.length < 5){
        that.x2 = 0;
        that.y2 = 1;
        that.z2 = 2;
    }
    // init math
    that.distance = Math.sqrt(Math.pow(m1[that.x]-m2[that.x2], 2) + Math.pow(m1[that.y]-m2[that.y2], 2) + Math.pow(m1[that.z]-m2[that.z2], 2));
    that.angle = Math.atan2(m1[that.y]-m2[that.y2], m1[that.x]-m2[that.x2]);
    that.angleZ = Math.asin((m1[that.z] - m2[that.z2])/that.distance);
    that.h = that.angle + (Math.PI/2);
    that.hZ = that.angleZ + (Math.PI/2);
    that.h2 = ((Math.PI/2) - that.angle);
    that.h2Z = ((Math.PI/2) - that.angle);
    that.rX = startWidth * Math.cos(that.h);
    that.rY = startWidth * Math.sin(that.h);
    that.rZ = startWidth * Math.sin(that.hZ);
    that.endX = endWidth * Math.cos(that.h);
    that.endY = endWidth * Math.sin(that.h);
    that.endZ = endWidth * Math.sin(that.hZ);
    that.sY = endSpacer * Math.cos(that.h2);
    that.sX = endSpacer * Math.sin(that.h2);
    that.sZ = endSpacer * Math.tan(that.h2Z);

    // endpoint 
    if(endpointType === "line") {
        that.wDist = 7;
        p.push();
        p.fill("rgba("+startColor+")");
        p.translate(m1[that.x], m1[that.y], m1[that.z]);
        p.rotateZ(that.h);
        p.beginShape();
        endSpacer = endSpacer - 2;
        p.vertex(-that.wDist, endSpacer + startWidth, 0);
        p.vertex(-that.wDist, endSpacer - startWidth, 0);
        p.vertex(+that.wDist, endSpacer - startWidth, 0);
        p.vertex(+that.wDist, endSpacer + startWidth, 0);
        p.endShape();
        p.pop();

        p.push();
        p.fill("rgba("+startColor+")");
        p.translate(m2[that.x2], m2[that.y2], m2[that.z2]);
        p.rotateZ(that.h);
        p.rotateZ(Math.PI);
        p.beginShape();
        endSpacer = endSpacer + 2;
        p.vertex(-that.wDist, endSpacer + startWidth, 0);
        p.vertex(-that.wDist, endSpacer - startWidth, 0);
        p.vertex(+that.wDist, endSpacer - startWidth, 0);
        p.vertex(+that.wDist, endSpacer + startWidth, 0);
        p.endShape();
        p.pop();
    }
    // solid line
    if (lineType === "solid") {
        p.push();
        p.fill("rgba("+startColor+")");
        p.beginShape();
        p.vertex(m1[that.x]+that.rX-that.sX, m1[that.y]+that.rY-that.sY, m1[that.z]);
        p.vertex(m1[that.x]-that.rX-that.sX, m1[that.y]-that.rY-that.sY, m1[that.z]);
        p.vertex(m2[that.x2]-that.endX+that.sX, m2[that.y2]-that.endY+that.sY, m2[that.z2]);
        p.vertex(m2[that.x2]+that.endX+that.sX, m2[that.y2]+that.endY+that.sY, m2[that.z2]);
        p.endShape();
        p.pop();

    } else if(lineType === "balls"){
        realityEditor.gui.spatial.drawLine(p, obj, m1, m2, startWidth, endWidth, startColor, endColor, null, 1, 1);
    }
};

realityEditor.gui.spatial.dL = {
    step:realityEditor.gui.spatial.lineAnimationList, spacer:null,lineVectorLength:null, angle:null, angleZ:null, vX:null, vY:null, vZ:null, stepLength:null,counter:null
};

realityEditor.gui.spatial.drawLine = function(p, obj, m1, m2, startWeight, endWeight, startColor, endColor, speed, _startAplha, _endAlpha) {
    let that = realityEditor.gui.spatial;
    startWeight = 20;
    that.spacer = 5;
    if (!speed) speed = 0.5;

    that.lineVectorLength = Math.sqrt(Math.pow(m1[12]-m2[12], 2) + Math.pow(m1[13]-m2[13], 2) + Math.pow(m1[14]-m2[14], 2));
    that.angle = Math.atan2((m1[13] - m2[13]), (m1[12] - m2[12]));
    that.angleZ = Math.asin((m1[14] - m2[14])/that.lineVectorLength);
    that.vX =  Math.cos(that.angle) * (startWeight + that.spacer)*-1;
    that.vY =  Math.sin(that.angle) * (startWeight + that.spacer)*-1;
    that.vZ =  Math.tan(that.angleZ) * (startWeight + that.spacer)*-1;
    that.stepLength = Math.sqrt(Math.pow(that.vX, 2) + Math.pow(that.vY, 2) + Math.pow(that.vZ, 2));
    that.counter = that.lineVectorLength / that.stepLength-1;

    if (!realityEditor.gui.spatial.lineAnimationList[obj.key]) realityEditor.gui.spatial.lineAnimationList[obj.key] = 0;
    if (realityEditor.gui.spatial.lineAnimationList[obj.key] >= startWeight + that.spacer)  realityEditor.gui.spatial.lineAnimationList[obj.key] = 0;

    p.push();
    p.fill("rgba("+startColor+")");
    p.translate(m1[12], m1[13], m1[14]);
    p.translate( -Math.cos(that.angle) * realityEditor.gui.spatial.lineAnimationList[obj.key], -Math.sin(that.angle) * realityEditor.gui.spatial.lineAnimationList[obj.key], -Math.tan(that.angleZ) * realityEditor.gui.spatial.lineAnimationList[obj.key]);
    p.circle(0, 0, startWeight);

    for (let i = 0; i < that.counter; i++) {
        p.translate(that.vX, that.vY, that.vZ);
        p.circle(0, 0, startWeight);
        // p.sphere(startWeight/2);
    }
    p.pop();
    realityEditor.gui.spatial.lineAnimationList[obj.key] += (timeCorrection.delta)+speed;
};
