/* global importScripts, HRQR, cv */

importScripts("../../thirdPartyCode/opencv.js");
importScripts("../../thirdPartyCode/HRQRDecoder.js");

let hrqr = new HRQR();
//let hrqr = new MEMORYTEST();

cv["onRuntimeInitialized"] = () => {
    hrqr.init();
    postMessage({"mode":"ready"});
};

onmessage = function(msg) {

  //  console.log("worker",msg.data.image);
  //  console.log(msg.data);

 let message = hrqr.render(msg.data.image)
    
   // console.log(msg.data[0].data);
    if(message) {
        postMessage({"mode": "msg", msg: message});
    }
};

