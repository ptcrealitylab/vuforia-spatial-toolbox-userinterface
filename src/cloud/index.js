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

realityEditor.cloud.worker = new Worker("src/cloud/hrqrWorker.js");

realityEditor.cloud.worker.onmessage = function(event) {
    let msg = event.data;
    if(msg["mode"] === "msg") {
        let info = null;
        try{
            info = msg["msg"][0].msg
            realityEditor.app.tap();
            
            info = info.replace(/[^a-zA-Z0-9:./]/gim,"");
            info.trim();
            
            let networkIdentity = info.split("/");
           
            console.log(networkIdentity);
            
            if(networkIdentity[0] === "spatialtoolbox:" && networkIdentity[3].length === 20 && networkIdentity[4].length === 40){
                if(true){
                    globalStates.network.cloudServer = networkIdentity[2];
                }

                if(networkIdentity[3].length === 20){
                    globalStates.network.networkID = networkIdentity[3];
                }

                if(networkIdentity[4].length === 40){
                    globalStates.network.networkSecret = networkIdentity[3];
                }
                realityEditor.cloud.connectToCloud();
            }
            
            // todo check valid URL
         
            
        } catch(e){
            console.log("this is not a msg")
        }
    }
};
realityEditor.cloud.socket = null;

realityEditor.cloud.connectToCloud = function (){
    log("start connecting");
    let serverPort = 52317;
    let socketURL = 'ws://'+globalStates.network.cloudServer+':'+serverPort;
    
    if(realityEditor.cloud.socket) realityEditor.cloud.socket.close();
    
    this.socket = new ToolSocket(socketURL,globalStates.network.networkID , "web");

    this.socket.on('beat', function (route, body) {
        console.log(route, body);
    });
    
    globalStates.network.edgeServer = connections;
}

realityEditor.cloud.updateEdgeConnections = function (connections){
    globalStates.network.edgeServer = connections;
}

//realityEditor.cloud.worker.postMessage([myData,video.videoWidth, video.videoHeight]);
/*
setTimeout(
setInterval(function (){
   realityEditor.app.getScreenshot("S", function(){


      var img = new window.Image();
       // img.setAttribute("src", "data:image/jpeg;base64,"+image);
      //  document.getElementById("canvas").getContext("2d").drawImage(img, 0, 0);
        
       // realityEditor.cloud.worker.postMessage(image);
    });
}, 1000),100000);
*/

realityEditor.cloud.workerL = {}

hrqr = new HRQR();
cv["onRuntimeInitialized"] = () => {
   hrqr.init();
};

realityEditor.cloud.workerL.postMessage = function(msg){
   let resp =  hrqr.render(msg.image);
  
   if(resp[0]){
       realityEditor.app.tap();
       console.log(resp[0].msg);
   }
 
}
let time;
realityEditor.cloud.imageBuffer = new window.Image();
setInterval(function (){
   // time = Date.now();
   realityEditor.app.getScreenshot("MS", function(image){
       let img = realityEditor.cloud.imageBuffer;
           realityEditor.cloud.imageBuffer.onload = function() {
           globalCanvas.canv23.width = img.width;
           globalCanvas.canv23.height = img.height;
           globalCanvas.ctx2333.drawImage(img, 0, 0,img.width,img.height);
           let pixels = globalCanvas.ctx2333.getImageData(0, 0, img.width, img.height);
           realityEditor.cloud.worker.postMessage({image: pixels}, [pixels.data.buffer]);
       };
       img.src = image;
       //console.log("total main thread time: ", Date.now()-time);
   });
},2000);


