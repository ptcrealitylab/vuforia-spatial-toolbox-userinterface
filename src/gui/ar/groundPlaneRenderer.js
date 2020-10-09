/*
* Created by Ben Reynolds on 10/08/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.ar.groundPlaneRenderer");

(function(exports) {

    var isUpdateListenerRegistered = false;

    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initService() {

        // register callbacks to various buttons to perform commits
        realityEditor.gui.buttons.registerCallbackForButton('reset', function(params) {
            if (params.newButtonState === 'up') {
                // Do something when button pressed
            }
        });
        

        // only adds the render update listener for frame history ghosts after you enter editing mode for the first time
        // saves resources when we don't use the service
        realityEditor.device.registerCallback('setEditingMode', function(params) {
            if (!isUpdateListenerRegistered && params.newEditingMode) {

                // registers a callback to the gui.ar.draw.update loop so that this module can manage its own rendering
                realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
                    // render the ground plane visualizer
                });

            }
        });


    }

    exports.initService = initService;

}(realityEditor.gui.ar.groundPlaneRenderer));
