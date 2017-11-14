/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Ben Reynolds on 11/10/17.
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Logic Node Memory Bar
 *
 * Allows user creation and selection of Logic Node memories.
 */

createNameSpace("realityEditor.gui.memory.nodeMemories");

realityEditor.gui.memory.nodeMemories.states = {
    memories: []
};

realityEditor.gui.memory.nodeMemories.initMemoryBar = function() {

    this.states.memories = JSON.parse(window.localStorage.getItem('realityEditor.memory.nodeMemories.states.memories') || '[]');

    var memoryBar = document.querySelector('.nodeMemoryBar');
    for (var i = 0; i < 5; i++) {
        var memoryContainer = document.createElement('div');
        memoryContainer.classList.add('memoryContainer');
        memoryContainer.setAttribute('touch-action', 'none');
        memoryContainer.style.position = 'relative';
        memoryBar.appendChild(memoryContainer);

        // var container = new MemoryContainer(memoryContainer);
        // barContainers.push(container);
    }
    
    this.renderMemories();
};

// logic node object should contain:
    // logic blocks, logic links, name, thumbnail
realityEditor.gui.memory.nodeMemories.addMemory = function(logicNodeObject) {
    
    if (this.states.memories.length < 5) {

        var simpleLogic = this.realityEditor.gui.crafting.utilities.convertLogicToServerFormat(logicNodeObject);
        this.states.memories.push(simpleLogic);
        
    }
    
    this.renderMemories();
    this.saveNodeMemories();
    // window.localStorage.setItem('realityEditor.memory.nodeMemories.states.memories', JSON.stringify(this.states.memories));

};

realityEditor.gui.memory.nodeMemories.addMemoryAtIndex = function(logicNodeObject, index) {
    
    var previousIndex = this.getIndexOfLogic(logicNodeObject);
    if (previousIndex != index) {
        this.states.memories[previousIndex] = null;
    }
    
    if (index >= 0 && index < 5) {
        var simpleLogic = this.realityEditor.gui.crafting.utilities.convertLogicToServerFormat(logicNodeObject);
        simpleLogic.uuid = realityEditor.device.utilities.uuidTime();
        this.states.memories[index] = simpleLogic;
    }
    
    this.renderMemories();
    this.saveNodeMemories();
    // window.localStorage.setItem('realityEditor.memory.nodeMemories.states.memories', JSON.stringify(this.states.memories));
};

realityEditor.gui.memory.nodeMemories.saveNodeMemories = function() {
    
    // TODO: shouldn't need to do this each time if i correctly do it when the node gets added to the memory
    this.states.memories.forEach(function(logicNode) {
        if (logicNode) {
            if (logicNode.hasOwnProperty('links')) {
                for (var linkKey in logicNode.links) {
                    if (!logicNode.links.hasOwnProperty(linkKey)) continue;
                    if (!!logicNode.links[linkKey].route) {
                        console.log("eliminating routes");
                        logicNode.links[linkKey] = realityEditor.gui.crafting.utilities.convertBlockLinkToServerFormat(logicNode.links[linkKey]);
                    }
                }
            }
        }
    });
    
    window.localStorage.setItem('realityEditor.memory.nodeMemories.states.memories', JSON.stringify(this.states.memories));
};

realityEditor.gui.memory.nodeMemories.renderMemories = function() {
    
    var memoryBar = document.querySelector('.nodeMemoryBar');
    this.states.memories.forEach( function(logicNodeObject, i) {
        
        // reset contents
        var memoryContainer = memoryBar.children[i];
        memoryContainer.innerHTML = '';
        memoryContainer.style.backgroundImage = '';
        memoryContainer.onclick = '';

        // stop if there isn't anything to render
        if (!logicNodeObject) return;

        // display contents
        memoryContainer.style.backgroundImage = 'url(/svg/logicNode.svg)';
        
        var nameText = document.createElement('div');
        nameText.style.position = 'absolute';
        nameText.style.top = '33px';
        nameText.style.width = '100%';
        nameText.style.textAlign = 'center';
        nameText.innerHTML = logicNodeObject.name;
        memoryContainer.appendChild(nameText);
        
        realityEditor.gui.memory.nodeMemories.addClickListener(memoryContainer, logicNodeObject);
    });
    
};

realityEditor.gui.memory.nodeMemories.createLogicNodeFromPocket = function(logicNodeObject) {
    console.log("drop logic onto object", logicNodeObject);

    // var logicKey = logicNodeObject.uuid;
    var logicKey = realityEditor.device.utilities.uuidTime();

    var addedLogic = new Logic();

    // var keysToSkip = ['uuid', 'begin', 'data', 'lastEditor', 'visible', 'visibleEditing', 'x', 'y', 'temp'];
    // for (var key in logicNodeObject) {
    //     if (!logicNodeObject.hasOwnProperty(key)) continue;
    //     if (keysToSkip.indexOf(key) > -1) continue;
    //     addedLogic[key] = logicNodeObject[key];
    // }

    var keysToCopyOver = ['blocks', 'iconImage', 'lastSetting', 'lastSettingBlock', 'links', 'lockPassword', 'lockType', 'name', 'nameInput', 'nameOutput'];
    keysToCopyOver.forEach( function(key) {
        addedLogic[key] = logicNodeObject[key];
    });

    addedLogic.uuid = logicKey;
    // addedLogic.x = -300 + Math.random() * 600;
    // addedLogic.y = -300 + Math.random() * 600;

    console.log(addedLogic);

    var closestObjectAndNode = realityEditor.device.speechProcessor.getClosestObjectNodePair();
    if (closestObjectAndNode) {
        var closestObjectKey = closestObjectAndNode.objectKey;
        var closestObject = objects[closestObjectKey];

        // make sure that logic nodes only stick to 2.0 server version
        if(realityEditor.network.testVersion(closestObjectKey)>165) {
            closestObject.nodes[logicKey] = addedLogic;

            realityEditor.gui.ar.draw.addElement(closestObjectKey, logicKey, "nodes/logic/index.html", addedLogic, 'logic', globalStates);

            var _thisNode = document.getElementById("iframe" + logicKey); //TODO: where does this get created??
            if (_thisNode) {
                if (_thisNode._loaded)
                    realityEditor.network.onElementLoad(closestObjectKey, logicKey);
            }

            globalDOMCach[logicKey].objectId = closestObjectKey;

            realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, logicKey, addedLogic);

            console.log("successfully added logic from pocket to object (" + closestObject.name + ")");
            return {
                logicNode: addedLogic,
                domElement: globalDOMCach[logicKey],
                objectKey: closestObjectKey
            };
        }
    }

    console.log("couldn't add logic from pocket to any objects");
};

realityEditor.gui.memory.nodeMemories.addClickListener = function(memoryContainer, logicNodeObject) {
    
    // var touchedNode = null;

    // memoryContainer.addEventListener('pointerdown', function(evt) {
    //     console.log('pointerdown on memoryContainer for logic node ' + logicNodeObject.name);
    //     touchedNode = logicNodeObject.name;
    // });
    memoryContainer.addEventListener('pointermove', function(evt) {
        console.log('pointermove on memoryContainer for logic node ' + logicNodeObject.name);
        // if (touchedNode === logicNodeObject.name) {
            realityEditor.gui.pocket.pocketHide();
            console.log("move " + touchedNode + " to pointer position");
            
            var addedElement = realityEditor.gui.memory.nodeMemories.createLogicNodeFromPocket(logicNodeObject);

            var objectKey = addedElement.objectKey;
            var generalObject = objects[objectKey];

            // update matrix for object
            var tempMatrix = [];
            var r = globalMatrix.r;
            realityEditor.gui.ar.utilities.multiplyMatrix(globalObjects[objectKey], globalStates.projectionMatrix, r);
            realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, r, tempMatrix);
            realityEditor.gui.ar.draw.drawTransformed(objectKey, objectKey, generalObject, tempMatrix, "ui", globalStates, globalCanvas, globalLogic, globalDOMCach, globalMatrix);         
            realityEditor.gui.ar.draw.hideTransformed(objectKey, objectKey, generalObject, "ui");
        
            // extract true matrix for object so node can be placed correctly on it
            var element = document.getElementById('thisObject' + addedElement.objectKey);
            if (element) {
                var matrixString = element.style.cssText.split('transform: ')[1].split(';')[0];
                if (matrixString.startsWith('matrix3d')) { // get the matrix from the transform3d string
                    var matrix = matrixString
                        .split('(')[1]
                        .split(')')[0]
                        .split(',')
                        .map(parseFloat);
                    objects[objectKey].temp = matrix;
                }
            }
            
            var matrixTouch = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(objects[addedElement.objectKey], [evt.clientX, evt.clientY]);
            addedElement.logicNode.x = matrixTouch[0];
            addedElement.logicNode.y = matrixTouch[1];
            
            globalProgram.objectA = false;
            globalProgram.nodeA = false;
            globalStates.editingNode = addedElement.logicNode.uuid;
            //globalStates.editingMode = true;
            console.log("hello");
            globalStates.editingModeObject = addedElement.objectKey;
            realityEditor.device.activateMultiTouch();
            realityEditor.device.activateNodeMove(addedElement.logicNode.uuid);
            realityEditor.gui.menus.on("bigTrash",[]);
            
            this.removeEventListener('pointermove')
            // touchedNode = null;
        // }
    });
    // memoryContainer.addEventListener('pointerup', function(evt) {
    //     console.log('pointerup on memoryContainer for logic node ' + logicNodeObject.name);
    // });

    // memoryContainer.onclick = function() {
    //     realityEditor.gui.pocket.pocketHide();
    //     realityEditor.gui.memory.nodeMemories.createLogicNodeFromPocket(logicNodeObject);
    //     // console.log("drop logic onto object", logicNodeObject);
    //     //
    //     // // var logicKey = logicNodeObject.uuid;
    //     // var logicKey = realityEditor.device.utilities.uuidTime();
    //     //
    //     // var addedLogic = new Logic();
    //     //
    //     // // var keysToSkip = ['uuid', 'begin', 'data', 'lastEditor', 'visible', 'visibleEditing', 'x', 'y', 'temp'];
    //     // // for (var key in logicNodeObject) {
    //     // //     if (!logicNodeObject.hasOwnProperty(key)) continue;
    //     // //     if (keysToSkip.indexOf(key) > -1) continue;
    //     // //     addedLogic[key] = logicNodeObject[key];
    //     // // }
    //     //
    //     // var keysToCopyOver = ['blocks', 'iconImage', 'lastSetting', 'lastSettingBlock', 'links', 'lockPassword', 'lockType', 'name', 'nameInput', 'nameOutput'];
    //     // keysToCopyOver.forEach( function(key) {
    //     //     addedLogic[key] = logicNodeObject[key];
    //     // });
    //     //
    //     // addedLogic.uuid = logicKey;
    //     // addedLogic.x = -300 + Math.random() * 600;
    //     // addedLogic.y = -300 + Math.random() * 600;
    //     //
    //     // console.log(addedLogic);
    //     //
    //     // var closestObjectAndNode = realityEditor.device.speechProcessor.getClosestObjectNodePair();
    //     // if (closestObjectAndNode) {
    //     //     var closestObjectKey = closestObjectAndNode.objectKey;
    //     //     var closestObject = objects[closestObjectKey];
    //     //
    //     //     // make sure that logic nodes only stick to 2.0 server version
    //     //     if(realityEditor.network.testVersion(closestObjectKey)>165) {
    //     //         closestObject.nodes[logicKey] = addedLogic;
    //     //        
    //     //         realityEditor.gui.ar.draw.addElement(closestObjectKey, logicKey, "nodes/logic/index.html", addedLogic, 'logic', globalStates);
    //     //
    //     //         var _thisNode = document.getElementById("iframe" + logicKey); //TODO: where does this get created??
    //     //         if (_thisNode) {
    //     //             if (_thisNode._loaded)
    //     //                 realityEditor.network.onElementLoad(closestObjectKey, logicKey);
    //     //         }
    //     //
    //     //         globalDOMCach[logicKey].objectId = closestObjectKey;
    //     //
    //     //         realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, logicKey, addedLogic);
    //     //        
    //     //         console.log("successfully added logic from pocket to object (" + closestObject.name + ")");
    //     //         return;
    //     //     }
    //     // }
    //     //
    //     // console.log("couldn't add logic from pocket to any objects");
    //
    // }
};

realityEditor.gui.memory.nodeMemories.nodePocketDragHandler = function(evt) {
    
}

realityEditor.gui.memory.nodeMemories.getIndexOfLogic = function(logic) {
    return this.states.memories.map( function(logicNodeObject) {
        if (logicNodeObject) {
            return logicNodeObject.name;
        }
        return null;
    }).indexOf(logic.name);
};
