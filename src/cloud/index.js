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
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

createNameSpace("realityEditor.cloud");
realityEditor.cloud = {};

realityEditor.cloud.state = {};
realityEditor.cloud.socket = null;

realityEditor.cloud.updateEdgeConnections = function(connections) {
    globalStates.network.edgeServer = connections;
};

realityEditor.cloud.connectToCloud = function (){
    const isSecure = realityEditor.network.state.proxyProtocol.includes('https');
    const wsProtocol = isSecure ? 'wss://' : 'ws://';
    const wsURL = wsProtocol + realityEditor.network.state.proxyHost;

    if(realityEditor.cloud.socket) realityEditor.cloud.socket.close();

    this.socket = new ToolSocket(wsURL, realityEditor.network.state.proxyNetwork , "web");

    this.socket.on('beat', function (route, body) {
        // todo validate for heartbeat
        //  realityEditor.network.addHeartbeatObject(body);
        body.network = realityEditor.network.state.proxyNetwork;
        realityEditor.app.callbacks.receivedUDPMessage(body)
        // console.log(route, body);
    });

    this.socket.on('action', function (route, body) {
        // todo validate for heartbeat
        body.network = realityEditor.network.state.proxyNetwork;
        realityEditor.app.callbacks.receivedUDPMessage(body)
        // realityEditor.network.addHeartbeatObject(body);
    });
    //  globalStates.network.edgeServer = connections;
}.bind(realityEditor.cloud);

// load remote interface via dekstop interface
let getDesktopLinkData = realityEditor.network.desktopURLSchema.parseRoute(window.location.pathname);
if(getDesktopLinkData) {
    if(getDesktopLinkData.n) {
        realityEditor.network.state.proxyProtocol = window.location.protocol.slice(0, -1); // Need to remove the colon
        realityEditor.network.state.proxyPort = window.location.port;
        realityEditor.network.state.proxyUrl = window.location.host;
        realityEditor.network.state.proxyHost = window.location.host;
        realityEditor.network.state.proxyHostname = window.location.hostname;
        if(getDesktopLinkData.n) realityEditor.network.state.proxyNetwork = getDesktopLinkData.n;
        if(getDesktopLinkData.s) realityEditor.network.state.proxySecret = getDesktopLinkData.s;
        realityEditor.cloud.connectToCloud();
    } else {
        /*
        realityEditor.cloud.worker = new Worker("src/cloud/hrqrWorker.js");

        realityEditor.cloud.worker.onmessage = function(event) {
            let msg = event.data;
            if(msg["mode"] === "msg") {
                let getLinkData = io.parseUrl(msg["msg"][0].msg, realityEditor.network.qrSchema);

                if(getLinkData.protocol === "spatialtoolbox") {
                    realityEditor.app.tap();
                    realityEditor.network.state.proxyProtocol = "https";
                    realityEditor.network.state.proxyPort = 443;
                    if(getLinkData.server) realityEditor.network.state.proxyUrl = getLinkData.server;
                    if(getLinkData.n) realityEditor.network.state.proxyNetwork = getLinkData.n;
                    if(getLinkData.s) realityEditor.network.state.proxySecret = getLinkData.s;
                    realityEditor.cloud.connectToCloud();
                }
            }
        }
        */
    }
}

realityEditor.cloud.imageBuffer = new window.Image();
// setInterval(function (){
//    // time = Date.now();
//    realityEditor.app.getScreenshot("MS", function(image){
//        let img = realityEditor.cloud.imageBuffer;
//            realityEditor.cloud.imageBuffer.onload = function() {
//            globalCanvas.canv23.width = img.width;
//            globalCanvas.canv23.height = img.height;
//            globalCanvas.ctx2333.drawImage(img, 0, 0,img.width,img.height);
//            let pixels = globalCanvas.ctx2333.getImageData(0, 0, img.width, img.height);
//            realityEditor.cloud.worker.postMessage({image: pixels}, [pixels.data.buffer]);
//        };
//        img.src = image;
//        //console.log("total main thread time: ", Date.now()-time);
//    });
// },2000);
