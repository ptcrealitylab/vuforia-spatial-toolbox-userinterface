/*
* Created by Valentin on 04/23/20.
*
* Copyright (c) 2020 PTC Inc
* 
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.spatial.timeRecorder");

realityEditor.gui.spatial.timeRecorder.sequences = {};
realityEditor.gui.spatial.timeRecorder.recordingTime = 1800000; // multiplied by 10 on 4-18-21
realityEditor.gui.spatial.timeRecorder.recordingSteps = 1000; // multiplied by 10 on 4-18-21
realityEditor.gui.spatial.timeRecorder.sensitivity = 30.0;
realityEditor.gui.spatial.timeRecorder.TimeSequence = function (_objectID, _toolID, _nodeID) {
    this.objectID = '';
    this.toolID = '';
    this.nodeID = '';
    this.sequence = [];
    
    this.lastLocation = null;
    this.lastSavedLocation = null;
    this.distanceVector = 0;
    this.speedVector = [0,0,0];
    this.timeVector = 0;
    this.speed = 0;
    this.lastLocationDelay = [0,0,0];
};

realityEditor.gui.spatial.timeRecorder.TimeSequenceItem = function (time, location) {
    this.t = time;
    this.m = location;
};

realityEditor.gui.spatial.timeRecorder.initSequence = function (id, objectID, toolID, nodeID){
    if(!(id in this.sequences)){
        this.sequences[id] = new this.TimeSequence(objectID, toolID, nodeID);
    }
    this.currentTime = Date.now();
    this.cleanUpSequence(id)
};

realityEditor.gui.spatial.timeRecorder.cleanUpSequence = function (id) {
    if(!this.sequences[id].sequence.length) return;
    if (this.sequences[id].sequence[0].t < (this.currentTime - this.recordingTime) || this.sequences[id].sequence.length> this.recordingSteps) {
        this.sequences[id].sequence.shift();
    }
};

realityEditor.gui.spatial.timeRecorder.addMatrix = function (m, id) {
    if(!this.sequences[id].lastLocation) {
        this.sequences[id].lastLocation = new this.TimeSequenceItem(this.currentTime, this.location(m));
    }
    if(!this.sequences[id].lastSavedLocation) {
        this.sequences[id].lastSavedLocation = new this.TimeSequenceItem(this.currentTime, this.location(m));
    }
    
    
    this.sequences[id].distanceVector = Math.sqrt(Math.pow(m[12]-this.sequences[id].lastLocation.m[0], 2) + Math.pow(m[13]-this.sequences[id].lastLocation.m[1], 2) + Math.pow(m[14]-this.sequences[id].lastLocation.m[2], 2));
    this.sequences[id].timeVector = this.currentTime - this.sequences[id].lastLocation.t;

    this.sequences[id].lastLocation.t = this.currentTime;
    this.sequences[id].lastLocation.m = this.location(m);

    this.sequences[id].speedVector = [
        this.sequences[id].lastLocation.m[0]- this.sequences[id].lastLocationDelay[0],
        this.sequences[id].lastLocationDelay[1] - this.sequences[id].lastLocation.m[1],
        this.sequences[id].lastLocationDelay[2] - this.sequences[id].lastLocation.m[2]
    ];
    
    setTimeout(function(){
        realityEditor.gui.spatial.timeRecorder.sequences[id].lastLocationDelay = realityEditor.gui.spatial.timeRecorder.location(m);
    }, 100);
    
    this.sequences[id].speed =  (this.sequences[id].distanceVector/100)/(this.sequences[id].timeVector/1000);

    
    if(Math.abs(m[12]-this.sequences[id].lastSavedLocation.m[0]) > this.sensitivity ||
        Math.abs(m[13]-this.sequences[id].lastSavedLocation.m[1]) > this.sensitivity || 
        Math.abs(m[14]-this.sequences[id].lastSavedLocation.m[2]) > this.sensitivity){
        
        this.sequences[id].sequence.push(new this.TimeSequenceItem(this.currentTime,  this.location(m)));
        this.sequences[id].lastSavedLocation.t = this.currentTime;
        this.sequences[id].lastSavedLocation.m =  this.location(m);
    }
};

realityEditor.gui.spatial.timeRecorder.location = function (m) {
    return [m[12], m[13], m[14]];
};

realityEditor.gui.spatial.timeRecorder.getSpeed = function (id) {
    return this.sequences[id].speed;
};

realityEditor.gui.spatial.timeRecorder.copyArray = function (array) {
    let returnItem = [];
    for (let i = 0; i < array.length; i++) {
        returnItem.push(array[i]);
    }
    return returnItem;
};

realityEditor.gui.spatial.timeRecorder.lastLocation = function (sequence) {
    this.storage = sequence.length - 1;
    if (this.storage >= 0)
        return sequence[this.storage];
    else return this.identity;
};
realityEditor.gui.spatial.timeRecorder.sequenceUp = function (number, sequence) {
    this.storage = sequence.length - (1 + number);
    if (this.storage >= 0)
        return sequence[this.storage];
    else return this.identity;
};
realityEditor.gui.spatial.timeRecorder.storage = null;
realityEditor.gui.spatial.timeRecorder.currentTime = Date.now();
realityEditor.gui.spatial.timeRecorder.identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];
