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

    window.localStorage.setItem('realityEditor.memory.nodeMemories.states.memories', JSON.stringify(this.states.memories));

};

realityEditor.gui.memory.nodeMemories.addMemoryAtIndex = function(logicNodeObject, index) {
    
    var previousIndex = this.getIndexOfLogic(logicNodeObject);
    if (previousIndex != index) {
        this.states.memories[previousIndex] = null;
    }
    
    if (index >= 0 && index < 5) {
        var simpleLogic = this.realityEditor.gui.crafting.utilities.convertLogicToServerFormat(logicNodeObject);
        this.states.memories[index] = simpleLogic;
    }
    
    this.renderMemories();
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

realityEditor.gui.memory.nodeMemories.addClickListener = function(memoryContainer, logicNodeObject) {
    memoryContainer.onclick = function() {
        realityEditor.gui.pocket.pocketHide();
        console.log("drop logic onto object", logicNodeObject);
        
        // var logic = new Logic();
        
    }
};

/*

// todo for testing only
    if (globalStates.pocketButtonDown === true && globalStates.guiState ==="node") {

        pocketItemId = realityEditor.device.utilities.uuidTime();
        console.log(pocketItemId);
        pocketItem.pocket.nodes[pocketItemId] = new Logic();

        var thisItem = pocketItem.pocket.nodes[pocketItemId];

            thisItem.uuid = pocketItemId;

        thisItem.x = globalStates.pointerPosition[0] - (globalStates.height / 2);
        thisItem.y = globalStates.pointerPosition[1] - (globalStates.width / 2);

        // else {
        // var matrixTouch =  screenCoordinatesToMatrixXY(thisItem, [evt.clientX,evt.clientY]);
        // thisItem.x = matrixTouch[0];
        // thisItem.y = matrixTouch[1];
        //}
        thisItem.loaded = false;

        var thisObject = pocketItem.pocket;
        // this is a work around to set the state of an objects to not being visible.
        thisObject.objectId = "pocket";
        thisObject.name = "pocket";
        thisObject.objectVisible = false;
        thisObject.screenZ = 1000;
        thisObject.fullScreen = false;
        thisObject.sendMatrix = false;
        thisObject.loaded = false;
        thisObject.integerVersion = 170;
        thisObject.matrix = [];
        // thisObject.nodes = {};
        thisObject.protocol = "R1";

        //
        //thisObject.visibleCounter = timeForContentLoaded;

        //addElement("pocket", pocketItemId, "nodes/" + thisItem.type + "/index.html",  pocketItem.pocket, "logic",globalStates);

    }
    realityEditor.gui.pocket.setPocketPosition(event);


 */

realityEditor.gui.memory.nodeMemories.getIndexOfLogic = function(logic) {
    return this.states.memories.map( function(logicNodeObject) {
        if (logicNodeObject) {
            return logicNodeObject.name;
        }
        return null;
    }).indexOf(logic.name);
};



cc = realityEditor.app.clearCache.bind(realityEditor.app);
