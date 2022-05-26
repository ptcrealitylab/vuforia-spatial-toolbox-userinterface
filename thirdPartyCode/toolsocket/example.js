const ToolSocket = require('./index.js');
let enc = new TextEncoder();
let dec = new TextDecoder();
let ioServer = new ToolSocket.Io.Server({port: 12443});
let io = new ToolSocket.Io();
//let ioClient = io.connect("ws://localhost:12443/n/networkName");

ioServer.on('connection', (io) => {
    io.on("/", (m, d) => {
        if (d.data)
            console.log("IO server: ", m, dec.decode(d.data));
        else
            console.log("IO server: ", m);
    });
    io.emit("/", "IO text server", {data: enc.encode(" IO bin server")});
    io.emit("/", "IO text server");
});
/*
ioClient.on("connect", () => {
    ioClient.emit("/", "IO text client", {data: enc.encode("client bin")});
    ioClient.emit("/", "only IO text client");
    ioClient.on("/", (m, d) => {
        if(d.data)
            console.log("IO server: ", m, dec.decode(d.data))
        else
            console.log("IO server: ", m)
    })
});
*/
