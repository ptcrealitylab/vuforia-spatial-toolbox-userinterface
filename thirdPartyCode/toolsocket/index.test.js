/* global test, expect, afterAll */

const ToolSocket = require('./index.js');
let client = new ToolSocket("ws://localhost:4321", "xkjhasdflk", "web");
let server = new ToolSocket.Server({port: 4321});
let ioServ = null;
let ioCli = null;

test('server & client connection test', done => {
    let packageCount = 0;
    let packageRes = 0;
    let hello = false;
    let simple = false;

    server.on('connection', function connection(ws) {
        ws.dataPackageSchema.items.properties.m.enum.map(method => {
            if (method !== "res" && method !== "ping" && method !== "pong" ) {
                ws.on(method, function (route, msg, res) {
                    if (route === "action/ping") {
                        packageRes++;
                    }
                    if (route === "/") {
                        packageRes++;
                        res.send('hello');
                        hello = true;
                    } else if (route === "/x/") {
                        packageRes++;
                        res.send('hola');
                    } else if (route === "/y/") {
                        packageRes++;
                        expect(msg).toBe('simple');
                        simple = true;
                    }

                });
            }
        });


        client.on('open', function connection() {
            client.dataPackageSchema.items.properties.m.enum.map(method => {
                if (method !== "res" && method !== "ping" && method !== "pong" ) {
                    packageCount++;
                    client[method]('/', 'hello', function (m) {
                        expect(m).toBe('hello');
                    });
                }
            });

            client.dataPackageSchema.items.properties.m.enum.map(method => {
                if (method !== "res" && method !== "ping" && method !== "pong" ) {
                    packageCount++;
                    client[method]('/x/', 'hello', function (m) {
                        expect(m).toBe('hola');
                    });
                }
            });

            client.dataPackageSchema.items.properties.m.enum.map(method => {
                if (method !== "res" && method !== "ping" && method !== "pong" ) {
                    packageCount++;
                    client[method]('/y/', 'simple');
                }
            });
        });

        setTimeout(function() {
            expect(Object.keys(client.packageCb).length).toBe(0);
            expect(packageCount).toBe(packageRes);
            expect(hello).toBe(true);
            expect(simple).toBe(true);
            ws.close();
            client.close();
            done();
        }, 2000);
    });
});

test("testing IO compatibility", done => {
    let enc = new TextEncoder();
    let dec = new TextDecoder();
    let ioServer = new ToolSocket.Io.Server({port: 4433});
    let io = new ToolSocket.Io();
    let ioClient = io.connect("ws://localhost:4433/n/xkjhasdflk");

    ioClient.on("connect", () => {
        ioClient.emit("/x", "/x client", {data: enc.encode("IO bin client")});
        ioClient.on("/x", (m, d) => {
            //  console.log("/x client: ", m, dec.decode(d.data))
            expect(m).toBe('/x server');
            expect(dec.decode(d.data)).toBe('IO bin server');
        });

        ioClient.emit("/binArray", "/binArray client", {data: [enc.encode("IO_00 bin client"), enc.encode("IO_01 bin client"), enc.encode("IO_02 bin client"), enc.encode("IO_03 bin client")]});
        ioClient.on("/binArray", (m, d) => {
            //  console.log("/x client: ", m, dec.decode(d.data))
            expect(m).toBe('/binArray server');
            expect(dec.decode(d.data[0])).toBe('IO_00 bin server');
            expect(dec.decode(d.data[1])).toBe('IO_01 bin server');
            expect(dec.decode(d.data[2])).toBe('IO_02 bin server');
            expect(dec.decode(d.data[3])).toBe('IO_03 bin server');
        });


        ioClient.emit("/no", "/no client",  enc.encode(" IO bin client"));
        ioClient.on("/no", (m, d) => {
            console.warn('ioClient /no called', m, d);
            // should not be reached
            expect(true).toBe(false);
        });

        ioClient.emit("/n", "/n client says Hi");
        ioClient.on("/n", (m) => {
            expect(m).toBe('/n server');
        });
        expect(ioClient.connected).toBe(true);
        // console.log("client", ioClient.connected);
    });

    ioServer.on('connection', (ioSocket) => {
        console.log("thisID ", ioSocket.id);
        //  expect(ioSocket.id).toBe("2´´");

        ioSocket.emit("/x", "/x server", {
            data: enc.encode("IO bin server")
        });
        ioSocket.on("/x", (m, d) => {
            expect(m).toBe('/x client');
            expect(dec.decode(d.data)).toBe('IO bin client');
        });

        ioSocket.emit("/binArray", "/binArray server", {
            data: [enc.encode("IO_00 bin server"), enc.encode("IO_01 bin server"), enc.encode("IO_02 bin server"), enc.encode("IO_03 bin server")]
        });
        ioSocket.on("/binArray", (m, d) => {
            expect(m).toBe('/binArray client');
            expect(dec.decode(d.data[0])).toBe('IO_00 bin client');
            expect(dec.decode(d.data[1])).toBe('IO_01 bin client');
            expect(dec.decode(d.data[2])).toBe('IO_02 bin client');
            expect(dec.decode(d.data[3])).toBe('IO_03 bin client');
        });

        ioSocket.emit("/no", "/no server", enc.encode(" IO bin server"));
        ioSocket.on("/no", (m, d) => {
            console.warn('ioServer /no called', m, d);
            // should never reach
            expect(true).toBe(false);
            //  console.log("/no server: ", m, dec.decode(d.data))
        });

        ioSocket.emit("/n", "/n server");
        ioSocket.on("/n", (m) => {
            expect(m).toBe('/n client says Hi');
            //  console.log("/n server: ", m)
        });
        expect(ioSocket.connected).toBe(true);
        //console.log("server", ioSocket.connected)

        setTimeout(function() {
            ioCli = ioClient;
            ioServ = ioServer;
            ioClient.close();
            ioSocket.close();
            done();
        }, 2000);
    });
});

test('validate(): normal package validation', done => {
    client.dataPackageSchema.items.properties.o.enum.map(origin => {
        client.dataPackageSchema.items.properties.m.enum.map(method => {
            expect(client.validate(new client.DataPackage(origin, "dklasdjd", method, "/", "{test:rest}", "2xsN"), 2000, client.dataPackageSchema)).toBe(true);
        });
    });
    expect(client.validate(new client.DataPackage("client", "dklasdjd", "post", "/", "{test:rest}", null), 2000, client.dataPackageSchema)).toBe(true);
    expect(client.validate(new client.DataPackage("client", "dklasdjd", "post", "/", "{test:rest}", "0xNsd"), 2000, client.dataPackageSchema)).toBe(true);
    done();
});
test('validate(): out of range ID validation', () => {
    var obj = new client.DataPackage("client", "dklasdjd", "post", "/", "{test:rest}", Number.MAX_SAFE_INTEGER + 1);
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/", "{test:rest}", "skjdhslkdjgsdklshgjhgkjhgkjhgkjhgkjhgkjhgkjhgkjhgkjhgkjhgkjhgkjhgkjhgksdsds");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/", "{test:rest}", -1);
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
});
test('validate(): out of range origin validation', () => {
    var obj = new client.DataPackage("cl&ient", "dklasdjd", "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    // eslint-disable-next-line no-loss-of-precision
    obj = new client.DataPackage(2394876234983649892738462398746, "dklasdjd", "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("something", "dklasdjd", "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    let string = "";
    while (string.length < 2000) {
        string = string + "client";
    }
    obj = new client.DataPackage(string, "dklasdjd", "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
});

test('validate(): out of range method validation', () => {
    var obj = new client.DataPackage("client", "dklasdjd", "po''st", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    // eslint-disable-next-line no-loss-of-precision
    obj = new client.DataPackage("client", "dklasdjd", 2348734092387402394867230492376492347639487, "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("client", "dklasdjd", null, "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    let string = "";
    while (string.length < 2000) {
        string = string + "post";
    }
    obj = new client.DataPackage("client", "dklasdjd", string, "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
});

test('validate(): out of range network validation', () => {
    var obj = new client.DataPackage("client", "cli''ent", "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("client", 2, "post", "/", "{test:rest}",  1);
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("client", "some%$thing", "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    let string = "";
    while (string.length < 2000) {
        string = string + "client";
    }
    obj = new client.DataPackage("client", string, "post", "/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
});
test('validate(): out of range route validation', () => {
    var obj = new client.DataPackage("client", "dklasdjd", "post", "/''", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    // eslint-disable-next-line no-loss-of-precision
    obj = new client.DataPackage("client", "dklasdjd", "post", 232312423423543523534565436456, "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/&%(/$&)/=()(/", "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
    let string = "";
    while (string.length < 2000) {
        string = string + "client";
    }
    obj = new client.DataPackage('client', "dklasdjd", "post", string, "{test:rest}", "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(false);
});

test('validate(): body validation', () => {
    var obj = new client.DataPackage("client", "dklasdjd", "post", "/", 0, "1xaJk");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(true);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/", "''zwidugaodig826/%&(8758765", "1fdJ");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(true);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/", {test: 0}, "1djwH");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(true);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/", null, "1dshh");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(true);
    obj = new client.DataPackage("client", "dklasdjd", "post", "/", [0, 1, 4, 2, 4, 5], "1sHs");
    expect(client.validate(obj, 2000, client.dataPackageSchema)).toBe(true);
});

test('validate(): out of range body validation', done => {
    let string = "";
    while (string.length < 70000002) {
        string = string + "cl";
    }
    let obj = new client.DataPackage('client', "dklasdjd", "post", "/", string, "1dshh");
    expect(client.validate(obj, string.length, client.dataPackageSchema)).toBe(false);

    done();
});
let jsonFromURLRouteSchema = {
    "type": "object",
    "items": {
        "properties": {
            "n": {"type": "string", "minLength": 1, "maxLength": 25, "pattern": "^[A-Za-z0-9_]*$"},
            "s": {"type": ["string", "null", "undefined"], "minLength": 0, "maxLength": 45, "pattern": "^[A-Za-z0-9_]*$"},
            "ip": {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9.-]*$"},
            "p": {"type": ["string", "null", "undefined"], "minLength": 1, "maxLength": 5, "pattern": "^[0-9]*$"},
        },
        "required": ["ip", "n"],
        "expected": ["n", "s", "ip", "p"],
    }
};

test('parseJsonFromUrl(): validation', () => {
    var obj = "/xse/p/8080/l/skdjhlkdjh/n/eehsjdkalwoepsdwk2dJ/ip/192.168.1.2/obj/sdjhsdflkjh?adhsfhdfkldsj22376dgjsjfdhkfdh";
    expect(client.parseUrl(obj, jsonFromURLRouteSchema)).toStrictEqual({"ip": "192.168.1.2", "n": "eehsjdkalwoepsdwk2dJ", "p": "8080", "query": "adhsfhdfkldsj22376dgjsjfdhkfdh", "route": "/xse/l/skdjhlkdjh/obj/sdjhsdflkjh"});

    obj = "/xse/p/8080/l/skdjhlkdjh/n/eehsjdkalwoepsdwk2dJ/ip/192.168.1.2/obj/sdjhsdflkjh.gif?adhsfhdfkldsj22376dgjsjfdhkfdh";
    expect(client.parseUrl(obj, jsonFromURLRouteSchema)).toStrictEqual({"ip": "192.168.1.2", "n": "eehsjdkalwoepsdwk2dJ", "p": "8080", "query": "adhsfhdfkldsj22376dgjsjfdhkfdh", "route": "/xse/l/skdjhlkdjh/obj/sdjhsdflkjh.gif", "type": "gif"}, );

});

test('parseJsonFromUrl(): out of range validation', () => {
    var obj = "/xse/p/8080/l/skdjhlkdjh/n/eehsjdkalwoepsdwk2dJ/ip/192.168.1.2/obj/sdjhsdflkjh?adhsfhdfkldsj";
    expect(client.parseUrl(obj, {})).toBe(null);

    obj = "/xse/p/8080/l/skdjhlkdjh/n/eehsjdkalwoepsdwk2dJ/ip/192.168.1+2/obj/sdjhsdflkjh?adhsfhdfkldsj";
    expect(client.parseUrl(obj, jsonFromURLRouteSchema)).toBe(null);

    obj = "/xse/p/8080/l/skdjhlkdjh/n/eehsjdka&&7lwoepsdwk2dJ/ip/192.168.1.2/obj/sdjhsdflkjh?adhsfhdfkldsj";
    expect(client.parseUrl(obj, jsonFromURLRouteSchema)).toBe(null);

    obj = "/xse/p/80998880/l/skdjhlkdjh/n/eehsjdkalwoepsdwk2dJ/ip/192.168.1.2/obj/sdjhsdflkjh?adhsfhdfkldsj";
    expect(client.parseUrl(obj, jsonFromURLRouteSchema)).toBe(null);

    obj = "/xse/sdjhsdflkjh?adhsfhdfkldsj";
    expect(client.parseUrl(obj, jsonFromURLRouteSchema)).toBe(null);
});


test('server and client contain correct origins', () => {
    expect(server.origin).toBe('server');
    expect(client.origin).toBe('web');
});


afterAll(() => {
    client.close();
    server.server.close();
    ioCli.close();
    ioServ.server.server.close();
});
