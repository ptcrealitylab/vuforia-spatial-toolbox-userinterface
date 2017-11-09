createNameSpace('realityEditor.device.speechPerformer');

///////// ROUTES //////////

realityEditor.device.speechPerformer.createLink = function(locationA, locationB) {
    
    if (!locationA.objectKey || !locationB.objectKey) {
        console.log("Can't create link - provide two valid objects!");
        return;
    }
    
    var nodeA = locationA.nodeKey || this.getNodeOnObject(locationA.objectKey, false); // guess a node if only the object was specified
    var nodeB = locationB.nodeKey || this.getNodeOnObject(locationB.objectKey, false);

    if (!nodeA || !nodeB) {
        console.log("Can't create link - the objects you chose don't both have nodes!");
        return;
    }

    if (objects[locationA.objectKey].nodes[nodeA].type === 'logic' || objects[locationB.objectKey].nodes[nodeB].type === 'logic') {
        console.log("!!! can't handle logic nodes yet with speech !!!"); // TODO: make it work with logic nodes too
        return;
    }

    var linkObject = {
        logicA: false,
        logicB: false,
        logicSelector: 4, // doesn't matter right now
        nodeA: nodeA,
        nodeB: nodeB,
        objectA: locationA.objectKey,
        objectB: locationB.objectKey
    };

    realityEditor.network.postLinkToServer(linkObject, objects);
    // this.drawLink(linkObject);
    
};

realityEditor.device.speechPerformer.deleteLink = function(locationA, locationB) {
    
};

realityEditor.device.speechPerformer.createLock = function(location) {
    
};

realityEditor.device.speechPerformer.deleteLock = function(location) {
    
};

realityEditor.device.speechPerformer.setValue = function(location, value) {
    
};

// realityEditor.device.speechPerformer.deleteNode = function(location) {
//    
// };



///////// HELPERS //////////

realityEditor.device.speechPerformer.createSpeechLink = function(objectA, nodeA, objectB, nodeB) {

    if (objects[objectA].nodes[nodeA].type === 'logic' || objects[objectA].nodes[nodeA].type === 'logic') {
        console.log("!!! can't handle logic nodes yet with speech !!!"); // TODO: make it work with logic nodes too
        return;
    }

    var linkObject = {
        logicA: false,
        logicB: false,
        logicSelector: 4, // doesn't matter right now
        nodeA: nodeA,
        nodeB: nodeB,
        objectA: objectA,
        objectB: objectB
    };

    realityEditor.network.postLinkToServer(linkObject, objects);
    // this.draw(linkObject, "connected");
    // realityEditor.gui.instantConnect.draw(linkObject, "connected");
    this.drawLink(linkObject);
};


realityEditor.device.speechPerformer.drawLink = function(link) {
    var canvas = document.getElementById('testCanvas');
    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ffff';
    ctx.fillStyle = "#666666";
    ctx.beginPath();

    ctx.lineTo(568, 0);
    ctx.lineTo(568, 320);
    ctx.lineTo(0, 320);
    ctx.lineTo(0, 0);

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#777777";
    ctx.beginPath();
    ctx.moveTo(506, 1);
    ctx.lineTo(506, 320);
    ctx.lineTo(200, 320);
    ctx.lineTo(200, 1);
    ctx.lineTo(506, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    var thisY = 93 + 50;
    var thisWidth = 140;
    var thisX = (320 / 2) - (thisWidth / 2) + 45;

    var my_gradient = ctx.createLinearGradient(58 + thisY, 0, 0 + thisY, 0);
    my_gradient.addColorStop(0, "#777777");
    my_gradient.addColorStop(1, "#00ff00");
    ctx.fillStyle = my_gradient;

    ctx.beginPath();
    ctx.moveTo(58 + thisY, 0 + thisX);
    ctx.lineTo(28 + thisY, 0 + thisX);
    ctx.lineTo(0 + thisY, (thisWidth / 2) + thisX);
    ctx.lineTo(28 + thisY, thisWidth + thisX);
    ctx.lineTo(58 + thisY, thisWidth + thisX);

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#666666";
    ctx.beginPath();
    ctx.moveTo(200, 1);
    ctx.lineTo(400, 1);
    ctx.lineTo(400, 90);
    ctx.lineTo(200, 90);

    ctx.closePath();
    ctx.stroke();

};

realityEditor.device.speechPerformer.getNodeOnObject = function(objectKey, chooseRandom) {

    var nodeList = Object.keys(objects[objectKey].nodes);
    if (nodeList.length === 0) return null;
    
    var index = chooseRandom ? Math.floor(Math.random()*nodeList.length) : 0;
    var node = nodeList[index];
    return node;

};

