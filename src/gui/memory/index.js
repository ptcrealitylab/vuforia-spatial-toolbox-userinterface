/**
 *
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
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2016 James Hobin
 * Modified by Valentin Heun 2016, 2017
 * Modified by James Hobin 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Memory Bar
 *
 * Allows user creation and selection of memories (images of objects that allow interaction).
 * Sends of://memorize and of://remember/?data=%d. Receives receiveThumbnail with
 * memory image thumbnail.
 */

createNameSpace("realityEditor.gui.memory");

(function(exports) {

var imageCache = {};
var knownObjects = {};
try {
    knownObjects = JSON.parse(window.localStorage.getItem('realityEditor.memory.knownObject') || '{}');
} catch(e) {
    console.warn('Defaulting knownObjects due to data corruption');
}

var currentMemory = {
    id: null,
    matrix: null,
    cameraMatrix: null,
    projectionMatrix: null,
    image: null,
    thumbnailImage: null,
    imageUrl: null,
    thumbnailImageUrl: null
};

function MemoryContainer(element) {
    this.element = element;
    this.image = null;
    this.backgroundImage = null;
    this.memory = null;
    this.dragging = false;
    this.dragTimer = null;
    this.imageLoaded = false;

    this.onTransitionEnd = this.onTransitionEnd.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerEnter = this.onPointerEnter.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointerenter', this.onPointerEnter);
    this.element.addEventListener('pointerleave', this.onPointerLeave);
}

MemoryContainer.prototype.set = function(obj) {
    this.obj = obj;
    var urlBase = realityEditor.network.getURL(obj.ip, realityEditor.network.getPort(obj), '/obj/' + obj.name + '/memory/');
    var image = urlBase + 'memory.jpg';

    this.backgroundImage = document.createElement('img');
    this.backgroundImage.classList.add('memoryBackgroundImage');
    this.backgroundImage.setAttribute('touch-action', 'none');
    
    var that = this;
    this.backgroundImage.onload = function() {
        that.imageLoaded = true;
    };
    
    this.backgroundImage.src = image;
    
    var thumbnail = urlBase + 'memoryThumbnail.jpg';
    
    // load matrices into thumbnail from the memory stored in the object
    var objectMatrix = obj.memory || realityEditor.gui.ar.utilities.newIdentityMatrix();
    var cameraMatrix = obj.memoryCameraMatrix || realityEditor.gui.ar.utilities.newIdentityMatrix();
    
    // if (obj.memory && obj.memory.matrix) {
    //     objectMatrix = obj.memory.matrix;
    // }

    this.memory = {
        id: obj.objectId,
        image: image,
        thumbnail: thumbnail,
        matrix: objectMatrix, //obj.memory.matrix
        cameraMatrix: cameraMatrix,
        projectionMatrix: globalStates.projectionMatrix
    };
    this.element.dataset.objectId = this.memory.id;

    if (!this.image) {
        var cachedImage = imageCache[thumbnail];
        if (cachedImage && !cachedImage.parentNode && cachedImage.src === thumbnail) {
            this.image = cachedImage;
            this.createImage();
        } else {
            this.createImage();
            this.image.src = thumbnail;
        }
    }

    imageCache[thumbnail] = this.image;
};

MemoryContainer.prototype.clear = function() {
    this.obj = null;
    this.memory = null;
    this.removeImage();
    delete this.element.dataset.objectId;
};

MemoryContainer.prototype.removeImage = function() {
    this.image.removeEventListener('touchstart', this.onTouchStart);
    this.image.removeEventListener('touchmove', this.onTouchMove);
    this.image.removeEventListener('touchend', this.onTouchEnd);
    this.image.removeEventListener('pointerenter', this.onPointerEnter);
    this.image.removeEventListener('pointerleave', this.onPointerLeave);
    this.image.parentNode.removeChild(this.image);
    this.image = null;
    this.imageLoaded = false;
};

MemoryContainer.prototype.onTouchStart = function(event) {

    if (!realityEditor.gui.pocket.pocketShown()) { // we use the same memory container for pointers and pocket buttons - prevent certain events if in pointer
        return; 
    }

    this.lastTouch = {
        left: event.touches[0].clientX,
        top: event.touches[0].clientY
    };

    this.dragTimer = setTimeout(function() {
        this.startDragging();
    }.bind(this), 100);
};

MemoryContainer.prototype.startDragging = function() {
    if (!this.memory || !this.image) {
        return;
    }
    this.dragging = true;

    var rect = this.image.getBoundingClientRect();
    this.image.classList.add('memoryDragging');
    this.image.style.transform = 'translate3d(' + rect.left + 'px,' + rect.top + 'px, 1200px)';

    this.image.parentNode.removeChild(this.image);
    document.querySelector('.memoryDragContainer').appendChild(this.image);

    this.dragDelta = {
        top: rect.top - this.lastTouch.top,
        left: rect.left - this.lastTouch.left
    };

    var isBar = barContainers.indexOf(this) >= 0;

    if (isBar) {
        realityEditor.gui.menus.switchToMenu("bigTrash");
        //realityEditor.gui.pocket.pocketOnMemoryDeletionStart();
    } else {
        realityEditor.gui.menus.switchToMenu("bigPocket");
       // realityEditor.gui.pocket.pocketOnMemoryCreationStart();
    }
};

MemoryContainer.prototype.onTouchMove = function() {
    var touch = {
        left: event.touches[0].clientX,
        top: event.touches[0].clientY
    };

    if (this.dragging) {
        var top = touch.top + this.dragDelta.top + 'px';
        var left = touch.left + this.dragDelta.left + 'px';
        this.image.style.transform = 'translate3d(' + left + ',' + top + ', 1200px)';
    }
};

MemoryContainer.prototype.stopDragging = function() {
    if (!this.dragging) {
        return;
    }
    this.dragging = false;

    var isBar = barContainers.indexOf(this) >= 0;

    if (isBar) {
        realityEditor.gui.menus.switchToMenu("main");
        //realityEditor.gui.pocket.pocketOnMemoryDeletionStop();
    } else {
        realityEditor.gui.menus.switchToMenu("main");
       //realityEditor.gui.pocket.pocketOnMemoryCreationStop();
    }

    var imageRect = this.image.getBoundingClientRect();

    this.image.style.transform = '';
    this.image.classList.remove('memoryDragging');
    this.image.parentNode.removeChild(this.image);
    this.element.appendChild(this.image);

    if (isBar) {
        var rightMostContainer = barContainers[barContainers.length - 1];
        if (imageRect.left - this.dragDelta.left > rightMostContainer.element.getBoundingClientRect().right) {
            this.clear();
            return;
        }
    }

    var containerRect = this.element.getBoundingClientRect();

    if (isBar) {
        // Move requested
        if (imageRect.right < containerRect.left || imageRect.left > containerRect.right) {
            let newContainer = getBarContainerAtLeft(imageRect.left);
            if (newContainer) {
                newContainer.set(this.obj);
                this.clear();
            }
        }
    } else {
        // Move into bar
        if (imageRect.top < memoryBarHeight) {
            let newContainer = getBarContainerAtLeft(imageRect.left);
            if (newContainer) {
                addKnownObject(this.obj.objectId);
                newContainer.set(this.obj);
            }
        } else {
            // Didn't move into bar, pocket should close
            realityEditor.gui.pocket.pocketHide();
        }
    }
};

MemoryContainer.prototype.onPointerUp = function() {
    this.element.classList.remove('selectedContainer');
    realityEditor.gui.pocket.highlightAvailableMemoryContainers(false);

    this.cancelRemember();

    if (this.dragTimer) {
        clearTimeout(this.dragTimer);
        this.dragTimer = null;
    }
    
    if (activeThumbnail) {

        // var objId = potentialObjects[0];
        barContainers.forEach(function(container) {
            if (container.memory && container.memory.id === currentMemory.id) {
                container.clear();
            }
        });

        // pendingMemorizations[objId || ''] = this;
        
        event.stopPropagation();

        // addObjectMemory(realityEditor.getObject(currentMemory.id));
        // this.set(realityEditor.getObject(currentMemory.id));

        realityEditor.gui.menus.switchToMenu("main");

        if (!this.image) {
            this.createImage();
        }
        this.image.src = activeThumbnail;

        overlayDiv.style.backgroundImage = 'none';
        overlayDiv.classList.remove('overlayMemory');
        overlayDiv.style.display = 'none';
        activeThumbnail = '';

        this.set(realityEditor.getObject(currentMemory.id));
        
    } else if (this.dragging) {
        return;
    } else {
        this.remember();
    }
};

MemoryContainer.prototype.onPointerEnter = function() {
    if (overlayDiv.classList.contains('overlayMemory')) {
        // highlight if it's empty and this memory can be placed
        if (!this.element.dataset.objectId) {
            this.element.classList.add('selectedContainer');
        }
        return;
    }
    if (this.dragTimer) {
        return;
    }
    this.beginRemember();
};

MemoryContainer.prototype.onPointerLeave = function() {
    this.element.classList.remove('selectedContainer');
    if (overlayDiv.classList.contains('overlayMemory')) {
        return;
    }
    if (this.dragTimer) {
        return;
    }
    this.cancelRemember();
};

MemoryContainer.prototype.onTouchEnd = function() {
    // Defer stopping to the next event loop when onPointerUp will have already
    // occurred.
    setTimeout(function() {
        this.stopDragging();
    }.bind(this), 0);
};

MemoryContainer.prototype.beginRemember = function() {
    if (this.element.classList.contains('remembering')) {
        return;
    }
    if (this.element.classList.contains('memoryPointer')) {
        this.element.classList.add('remembering');
        this.element.addEventListener('transitionend', this.onTransitionEnd);
    } else {
        this.remember();
    }
};

MemoryContainer.prototype.cancelRemember = function() {
    if (!this.element.classList.contains('remembering')) {
        return;
    }
    this.element.removeEventListener('transitionend', this.onTransitionEnd);
    this.element.classList.remove('remembering');
};

MemoryContainer.prototype.onTransitionEnd = function() {
    this.element.removeEventListener('transitionend', this.onTransitionEnd);
    this.element.classList.remove('remembering');
    this.remember();
};


MemoryContainer.prototype.remember = function() {
    if (!this.memory && !this.image) {
        return;
    }

    if (globalStates.guiState === 'node' && globalStates.drawDotLine) {
        return;
    }

    realityEditor.gui.pocket.pocketHide();
    
    if (this.backgroundImage) {
        var memoryBackground = document.querySelector('.memoryBackground');
        memoryBackground.innerHTML = '';
        memoryBackground.appendChild(this.backgroundImage);
    }
    
    realityEditor.gui.menus.switchToMenu('main', ['freeze'], null);
    globalStates.freezeButtonState = true;
    
    // TODO: unload visible objects (besides WORLD_OBJECTs) first?
    Object.keys(realityEditor.gui.ar.draw.visibleObjects).filter(function(objectKey) {
        return objectKey.indexOf('WORLD_OBJECT') === -1;
    }).forEach(function(nonWorldObjectKey) {
        delete realityEditor.gui.ar.draw.visibleObjectsCopy[nonWorldObjectKey];
        delete realityEditor.gui.ar.draw.visibleObjects[nonWorldObjectKey];
    });

    realityEditor.sceneGraph.setCameraPosition(this.memory.cameraMatrix);
    
    realityEditor.gui.ar.draw.visibleObjectsCopy[this.memory.id] = this.memory.matrix;
    realityEditor.gui.ar.draw.visibleObjects[this.memory.id] = this.memory.matrix;
    
    // also set sceneGraph localMatrix
    let sceneNode = realityEditor.sceneGraph.getSceneNodeById(this.memory.id);
    if (sceneNode) {
        sceneNode.setLocalMatrix(this.memory.matrix);
    }
    
    // TODO: load in temporary projection matrix too?
};

MemoryContainer.prototype.remove = function() {
    this.element.parentNode.removeChild(this.element);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointerenter', this.onPointerEnter);
    this.element.removeEventListener('pointerleave', this.onPointerLeave);
    this.removeImage();
};

MemoryContainer.prototype.createImage = function() {
    if (!this.image) {
        this.image = document.createElement('img');
    }
    if (!this.image.parentNode) {
        this.element.appendChild(this.image);
    }
    this.image.setAttribute('touch-action', 'none');
    this.image.classList.add('memory');
    this.image.addEventListener('touchstart', this.onTouchStart);
    this.image.addEventListener('touchmove', this.onTouchMove);
    this.image.addEventListener('touchend', this.onTouchEnd);
    this.image.addEventListener('pointerenter', this.onPointerEnter);
    this.image.addEventListener('pointerleave', this.onPointerLeave);
    
};


var activeThumbnail = '';
var barContainers = [];
var pendingMemorizations = {};
var memoryBarHeight = 80;
var numMemoryContainers = 4;

function getBarContainerAtLeft(left) {
    // Assumes bar containers are in order of DOM insertion
    for (var i = 0; i < barContainers.length; i++) {
        var barContainer = barContainers[i];
        var barRect = barContainer.element.getBoundingClientRect();
        if (left > barRect.left && left < barRect.right) {
            return barContainer;
        }
    }
    return null;
}

function url(href) {
    return 'url(' + href + ')';
}

function initMemoryBar() {
    var memoryBar = document.querySelector('.memoryBar');
    for (var i = 0; i < numMemoryContainers; i++) {
        var memoryContainer = document.createElement('div');
        memoryContainer.classList.add('memoryContainer');
        memoryContainer.setAttribute('touch-action', 'none');
        memoryBar.appendChild(memoryContainer);

        var container = new MemoryContainer(memoryContainer);
        barContainers.push(container);
    }
}

function removeMemoryBar() {
    barContainers.forEach(function(container) {
        container.remove();
    });
    barContainers = [];
}

function createMemory() {
    overlayDiv.classList.add('overlayMemory');

    console.log('create memory');
    
    realityEditor.app.getSnapshot("L", "realityEditor.gui.memory.receiveScreenshot");
    realityEditor.app.getSnapshot("S", "realityEditor.gui.memory.receiveScreenshotThumbnail");
    
    currentMemory.id = realityEditor.gui.ar.getClosestObject()[0];
    let sceneNode = realityEditor.sceneGraph.getSceneNodeById(currentMemory.id);
    if (sceneNode) {
        currentMemory.matrix = realityEditor.gui.ar.utilities.copyMatrix(sceneNode.localMatrix);
    } else {
        currentMemory.matrix = realityEditor.gui.ar.utilities.copyMatrix(realityEditor.gui.ar.draw.visibleObjects[currentMemory.id]);
    }
    let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
    currentMemory.cameraMatrix = realityEditor.gui.ar.utilities.copyMatrix(cameraNode.localMatrix);
    currentMemory.projectionMatrix = globalStates.projectionMatrix;

    addKnownObject(currentMemory.id);

    realityEditor.gui.menus.switchToMenu("bigPocket");
   // realityEditor.gui.pocket.pocketOnMemoryCreationStart();
}

function receiveScreenshot(base64String) {
    var blob = realityEditor.device.utilities.b64toBlob(base64String, 'image/jpeg');
    var blobUrl = URL.createObjectURL(blob);
    
    currentMemory.image = blob;
    currentMemory.imageUrl = blobUrl;
}

function receiveScreenshotThumbnail(base64String) {
    var blob = realityEditor.device.utilities.b64toBlob(base64String, 'image/jpeg');
    var blobUrl = URL.createObjectURL(blob);

    currentMemory.thumbnailImage = blob;
    currentMemory.thumbnailImageUrl = blobUrl;
    
    receiveThumbnail(currentMemory.thumbnailImageUrl);

    uploadImageToServer(currentMemory.thumbnailImage);
}

function receiveThumbnail(thumbnailUrl) {
    if (overlayDiv.classList.contains('overlayMemory')) {
        overlayDiv.style.backgroundImage = url(thumbnailUrl);
        activeThumbnail = thumbnailUrl;
    }
    
    
}

function addObjectMemory(obj) {
    if (!obj.memory || Object.keys(obj.memory).length === 0) {
        return;
    }

    var freeMemory;
    if (pendingMemorizations.hasOwnProperty(obj.objectId)) {
        freeMemory = pendingMemorizations[obj.objectId];
        delete pendingMemorizations[obj.objectId];
    } else {
        if (!knownObjects[obj.objectId]) {
            console.warn('staying away from memories of a strange object');
            return;
        }
        freeMemory = barContainers.filter(function(container) {
            // Container either doesn't have a memory or the memory is of this object
            return !container.memory || container.memory.id === obj.objectId;
        })[0];

        if (!freeMemory) {
            console.warn('There are no free memory slots');
            return;
        }
    }

    barContainers.forEach(function(container) {
        if (container.memory && container.memory.id === obj.objectId) {
            container.clear();
        }
    });

    addKnownObject(obj.objectId);
    freeMemory.set(obj);
}

function addKnownObject(objectId) {
    knownObjects[objectId] = true;
    window.localStorage.setItem('realityEditor.memory.knownObject', JSON.stringify(knownObjects));
}


function getMemoryWithId(id) {
    for (var i = 0; i < barContainers.length; i++) {
        var barContainer = barContainers[i];
        if (barContainer.memory && barContainer.memory.id === id) {
            return barContainer;
        }
    }
    return null;
}

function memoryCanCreate() {
    // Exactly one visible object
    
    var visibleObjectKeys = Object.keys(realityEditor.gui.ar.draw.visibleObjects);
    visibleObjectKeys.splice(visibleObjectKeys.indexOf(realityEditor.worldObjects.getLocalWorldId()), 1); // remove the local world object, its server cant support memories
    
    // For now, also remove all world objects, regardless of which server they come from
    visibleObjectKeys = visibleObjectKeys.filter(function(objectKey) {
        return objectKey.indexOf('WORLD_OBJECT') === -1;
    });
    
    if (visibleObjectKeys.length !== 1) {
        return false;
    }
    if (globalStates.freezeButtonState) {
        return false;
    }
    if (realityEditor.gui.pocket.pocketShown()) {
        return false;
    }
    if (globalStates.settingsButtonState) {
        return false;
    }
    if (globalStates.editingMode || realityEditor.device.getEditingVehicle()) {
        return false;
    }
    // if (realityEditor.gui.screenExtension.areAnyScreensVisible()) {
    //     return false;
    // }
    if (globalStates.guiState === 'ui') {
        return true;
    }
    // if (globalStates.guiState === 'node' && !globalProgram.objectA) { // TODO: shouldn't this draw dot line?
    //     return true;
    // }
    return false;
}

function uploadImageToServer() {
    // Create a new FormData object.
    var formData = new FormData();
    formData.append('memoryThumbnailImage', currentMemory.thumbnailImage);
    formData.append('memoryImage', currentMemory.image);
    formData.append('memoryInfo', JSON.stringify(currentMemory.matrix));
    formData.append('memoryCameraInfo', JSON.stringify(currentMemory.cameraMatrix));
    formData.append('memoryProjectionInfo', JSON.stringify(currentMemory.projectionMatrix));

    // Set up the request.
    var xhr = new XMLHttpRequest();

    var postUrl = realityEditor.network.getURL(objects[currentMemory.id].ip, realityEditor.network.getPort(objects[currentMemory.id]), '/object/' + currentMemory.id + "/memory");

    // Open the connection.
    xhr.open('POST', postUrl, true);

    // Set up a handler for when the request finishes.
    xhr.onload = function () {
        if (xhr.status === 200) {
            // File(s) uploaded.
            console.log('successful upload');
            setTimeout(function() {
                console.log('successfully uploaded thumbnail image to server');
            }, 1000);
        } else {
            console.log('error uploading');
        }
    };

    // Send the Data.
    xhr.send(formData);
}

exports.initMemoryBar = initMemoryBar;
exports.removeMemoryBar = removeMemoryBar;
exports.receiveThumbnail = receiveThumbnail;
exports.addObjectMemory = addObjectMemory;
exports.MemoryContainer = MemoryContainer;
exports.getMemoryWithId = getMemoryWithId;
exports.memoryCanCreate = memoryCanCreate;
exports.createMemory = createMemory;

exports.receiveScreenshot = receiveScreenshot;
exports.receiveScreenshotThumbnail = receiveScreenshotThumbnail;


}(realityEditor.gui.memory));
