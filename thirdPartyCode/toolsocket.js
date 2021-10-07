/**
 * Copyright (c) 2021 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */

class ToolboxEventEmitter {
    constructor(){this.eCb={}};
    on(e,...args){if(!this.eCb[e])this.eCb[e]=[];this.eCb[e].push(...args);};
    emit(e,...args){if(this.eCb[e])this.eCb[e].forEach(cb=>cb(...args));};
    removeAllListeners() {for(let k in this.eCb) delete this.eCb[k];};
}

class MainToolboxSocket extends ToolboxEventEmitter {
    constructor(url, networkID, origin) {
        super();
        let that = this;
        let log = (...args) => console.log(...args);
        this.retryAmount = 5;
        this.timetoRequestPackage = 3000;
        this.netBeatInterval = 1000;
        this.networkID = networkID;
        this.url = url;
        this.orging = origin;
        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
        this.readyState = 3;
        this.rsOld = null;
        this.packageID = 0;
        this.packageCb = {};
        this.routineIntervalRef = null;
        this.netBeatIntervalRef = null;
        this.envNode = false;
        this.isServer = false;
        this.CbObj = function (callback, time, msg) {
            this.callback = callback;
            this.time = time;
            this.retry = 0;
            this.msg = msg;
        }
        this.CbSub = function (route, socket) {
            this.route = route;
            this.socket = socket;
            //sub and pub are acknowledged. pub is not acknowledged
            // user subscribes, pub message is forwarded to all subscribers. if socket ends or subscription ends
        }
        this.DataPackage = function (origin, network, method, route, body, id = null) {
            this.i = id;
            this.o = origin;
            this.n = network;
            this.m = method;
            this.r = route;
            this.b = body;
            this.s = null
        };
        this.dataPackageSchema = {
            "type": "object",
            "items": {
                "properties": {
                    "i": {"type": ["integer", "null"], "minimum": 0, "maximum": Number.MAX_SAFE_INTEGER},
                    "o": {"type": "string", "minLength": 1, "maxLength": 10, "enum": ["server", "client", "web", "edge", "proxy"]},
                    "n": {"type": "string", "minLength": 1, "maxLength": 25, "pattern": "^[A-Za-z0-9_]*$"},
                    "m": {"type": "string", "minLength": 1, "maxLength": 10, "enum": ["beat", "action", "ping", "get", "post", "put", "patch", "delete", "new", "unsub", "sub", "pub", "message", "res"]},
                    "r": {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9_/?:&+.%=-]*$"},
                    "b": {"type": ["boolean", "array", "number", "string", "object"], "minLength": 0, "maxLength": 70000000},
                    "s": {"type": ["string", "null", "undefined"], "minLength": 0, "maxLength": 45, "pattern": "^[A-Za-z0-9_]*$"}
                },
                "required": ["i", "o", "n", "m", "r", "b"]
            }
        }
        this.Response = function (obj) {
            this.send = (res) => {
                if (obj.i) {
                    let resObj = new that.DataPackage(that.origin, obj.n, 'res', obj.r, {}, obj.i);
                    if (res) resObj.b = res;
                    else resObj.b = 204;
                    that.send(resObj);
                }
            }
        }
        this.validate = (obj, msgLength, schema,) => {
            if(typeof obj !== "object") return false; // for now only objects
            let validString = (obj, p, key) => {
                if (typeof obj[key] !== 'string') return false; // this if is a hack to test for null as well
                if (Number.isInteger(p[key].minLength)) if (obj[key].length < p[key].minLength) return false;
                if (Number.isInteger(p[key].maxLength)) if (obj[key].length > p[key].maxLength) return false;
                if (p[key].pattern) if (!obj[key].match(p[key].pattern)) return false;
                if (p[key].enum) if (!p[key].enum.includes(obj[key])) return false;
                return true;
            }
            let validInteger = (obj, p, key) => {
                if (!Number.isInteger(obj[key])) return false;
                if (Number.isInteger(p[key].minimum)) {if (obj[key] < p[key].minimum) return false;}
                if (Number.isInteger(p[key].maximum)) {if (obj[key] > p[key].maximum) return false;}
                return true;
            }
            let validNull = (obj, p, key) => {
                if(obj.m === "res" && obj[key] === null) return false;
                return obj[key] === null;
            }
            let validBoolean = (obj, p, key) => {
                return typeof obj[key] === 'boolean';
            }
            let validNumber = (obj, p, key) => {
                return typeof obj[key] === 'number';
            }
            let validUndefined = (obj, p, key) => {
                return !obj[key];
            }
            let validArray = (obj, p, key, msgLength) => {
                if (!Array.isArray(obj[key])) return false;

                if (Number.isInteger(p[key].minLength)) if (msgLength < p[key].minLength) return false;
                if (Number.isInteger(p[key].maxLength)) if (msgLength > p[key].maxLength) return false;
                return true;
            }
            let validObject = (obj, p, key, msgLength) => {
                if (typeof obj[key] !== 'object') return;
                if (Number.isInteger(p[key].minLength)) if (msgLength < p[key].minLength) return false;
                if (Number.isInteger(p[key].maxLength)) if (msgLength > p[key].maxLength) return false;
                return true;
            }
            let validKey = (obj, p, key) => {
                return p.hasOwnProperty(key);
            }
            let validRequired = (obj, required) => {
                for (let key in required) {if(!obj.hasOwnProperty(required[key])) return false;}
                return true;
            }
            let p = schema.items.properties;
            let verdict = true;
            for (let key in obj) {
                if(validKey(obj, p, key)) {
                    let evaluate = false;
                    if (p[key].type.includes("string")) if(validString(obj, p, key)) evaluate = true;
                    if (p[key].type.includes("integer")) if(validInteger(obj, p, key)) evaluate = true;
                    if (p[key].type.includes("null")) if(validNull(obj, p, key)) evaluate = true;
                    if (p[key].type.includes("boolean")) if(validBoolean(obj, p, key)) evaluate = true;
                    if (p[key].type.includes("number")) if(validNumber(obj, p, key)) evaluate = true;
                    if (p[key].type.includes("array")) if(validArray(obj, p, key, msgLength)) evaluate = true; // use msg for length to simplify / speedup
                    if (p[key].type.includes("object")) if(validObject(obj, p, key, msgLength)) evaluate = true; // use msg for length to simplify / speedup
                    if (p[key].type.includes("undefined")) if(validUndefined(obj, p, key)) evaluate = true;
                    if(!evaluate) verdict = false;
                } else verdict = false;
            }
            if(!validRequired(obj, schema.items.required)) verdict = false;
            return !verdict;
        }
        this.router = (msg) => {
            let obj;
            try { obj = JSON.parse(msg); } catch (e) { console.log('no json'); return; }
            if (that.validate(obj, msg.length, this.dataPackageSchema)) {
                console.log("not allowed");
                return;
            }

            if (obj.m === 'ping') {
                that.send(new that.DataPackage(that.origin, obj.n, 'res', obj.r, 'pong', obj.i));
                if (that.networkID !== obj.n) {
                    this.emit('network', obj.n, that.networkID, obj);
                    that.networkID = obj.n;
                }
            }
            if (obj.i && obj.m === 'res') {
                if (this.packageCb.hasOwnProperty(obj.i)) {
                    this.packageCb[obj.i].callback(obj.b);
                    delete this.packageCb[obj.i];
                }
                return;
            }
            if (this.dataPackageSchema.items.properties.m.enum.includes(obj.m)) {
                this.routerCallback(obj);
            }
        }
        this.routerCallback = (obj) => {
            if (obj.i) {
                this.emit(obj.m, obj.r, obj.b, new this.Response(obj));
            } else {
                this.emit(obj.m, obj.r, obj.b);
            }
        }

        this.routineIntervalRef = setInterval(function () {
            //  if (!this.isServer) console.log('state', Object.keys(this.packageCb).length, this.packageID);
            if (this.readyState === this.CLOSED || !this.readyState) {
                if (!this.isServer)
                    this.connect(this.url, this.networkID, this.origin)
            }
            for (let key in this.packageCb) {
                if (this.timetoRequestPackage < (Date.now() - this.packageCb[key].time)) {
                    if (this.packageCb.hasOwnProperty(key)) {
                        this.packageCb[key].retry++;
                        if (this.retryAmount < this.packageCb[key].retry)
                            delete this.packageCb[key];
                        else {
                            this.packageCb[key].time = Date.now();
                            this.resend(key);
                        }
                    }
                }
            }
        }.bind(this), this.timetoRequestPackage);

        this.message =  this.new =  this.delete = this.patch =
            this.put = this.post = this.get = this.action = this.beat = (route, body, callback) => {};
        for (let value of this.dataPackageSchema.items.properties.m.enum) {
            this[value] = (route, body, callback) => {
                this.send(new this.DataPackage(this.origin, this.networkID, value, route, body), callback);
            };
        }
        this.send = (obj, callback) => {
            if (this.readyState !== this.OPEN || !obj) return;
            if (typeof callback === 'function') {
                if (this.packageID < Number.MAX_SAFE_INTEGER) {
                    this.packageID++;
                } else {
                    this.packageID = 0;
                }
                obj.i = this.packageID;
                this.packageCb[this.packageID] = new this.CbObj(callback, Date.now(), obj);
            } else {
                if (obj.m !== 'res')
                    obj.i = null;
            }
            this.socket.send(JSON.stringify(obj));
        }
        this.resend = (id) => {
            if (this.readyState !== this.OPEN) return;
            if (this.packageCb.hasOwnProperty(id)) {
                this.socket.send(JSON.stringify(this.packageCb[id].msg));
            }
        }
        this.stateEmitter = (emitterString, statusID,) => {
            this.readyState = statusID;
            this.emit(emitterString, statusID);
            if (this.rsOld !== this.readyState) {
                this.emit('status', this.readyState);
                this.rsOld = this.readyState
            }
        }
        this.attachEvents = () => {
            if(this.envNode){
                this.socket.on('connected', () => { that.stateEmitter('connected', that.OPEN); });
                this.socket.on('connecting', () => { that.stateEmitter('connecting', that.CONNECTING); });
            }
            this.socket.onclose = () => { that.stateEmitter('close', that.CLOSED); };
            this.socket.onopen = () => { that.ping(); that.stateEmitter('open', that.OPEN); };
            this.socket.onerror = (err) => { that.emit('error', err); };
            this.socket.onmessage = (msg) => { that.router(msg.data) };
            this.close = () => { this.socket.close(); this.removeAllListeners();
                clearInterval(this.routineIntervalRef);
                clearInterval(this.netBeatIntervalRef);
            }
        }
        this.ping = () => {
            let netBeatMsg = new that.DataPackage(this.origin, this.networkID, 'ping', 'action/ping', '');
            if (that.readyState !== this.OPEN) {
                that.readyState = that.CLOSED;
                return;
            }
            try {
                that.send(netBeatMsg, (msg) => {
                    if (msg === 'pong' || msg === '')
                        that.readyState = that.OPEN;
                    else
                        that.readyState = that.CLOSED;
                }, that.socket)
            } catch (e) {
                that.readyState = that.CLOSED;
                console.log(e);
            }
        }
        this.setNetworkId = (networkId) =>  this.networkID = networkId;
    }
}
class ToolSocket extends MainToolboxSocket {
    constructor(url, networkID, origin) {
        super();
        let that = this;
        this.url = url;
        this.networkID = networkID;
        this.origin = origin;
        this.WebSocket = null;
        this.socket = null;
        if (typeof window === 'undefined') { this.WebSocket = require('ws'); this.envNode = true;
        } else if (typeof WebSocket !== 'undefined') { this.WebSocket = WebSocket
        } else if (typeof MozWebSocket !== 'undefined') { this.WebSocket = MozWebSocket
        } else if (typeof global !== 'undefined') { this.WebSocket = global.WebSocket || global.MozWebSocket
        } else if (typeof window !== 'undefined') { this.WebSocket = window.WebSocket || window.MozWebSocket
        } else if (typeof self !== 'undefined') { this.WebSocket = self.WebSocket || self.MozWebSocket
        } else { console.log("websocket not available"); return;}

        this.netBeatIntervalRef = setInterval(() => {
            if (that.readyState === that.OPEN)
                that.ping();
        }, that.netBeatInterval);

        this.connect = (url, networkID, origin) => {
            if (networkID) that.networkID = networkID;
            if (origin) that.origin = origin;
            if (that.socket) {
                that.readyState = that.CLOSED;
                that.socket.close();
            }
            that.socket = new that.WebSocket(url);
            that.readyState = that.CONNECTING;
            this.attachEvents();
        }
        // connect for the first time when opened.
        this.connect(this.url, this.networkID, this.origin);
    }
    static Server = class Server extends ToolboxEventEmitter {
        constructor(param, origin) {
            super();
            if(origin) this.origin = origin; else this.origin = "server";
            if (typeof window !== 'undefined') return;
            let that = this;
            console.log('Server init')
            let WebSocket = require('ws');
            this.server = new WebSocket.Server(param);
            this.server.on('connection', (socket, ...args) => {
                class Socket extends MainToolboxSocket {
                    constructor(socket) {
                        super();
                        this._socket = socket._socket;
                        this.socket = socket;
                        this.envNode = true;
                        this.isServer = true;
                        this.readyState = this.OPEN;
                        this.origin = that.origin;
                        this.attachEvents();
                    }
                }
                // todo proxy origin from main class and parameters
                that.emit('connection', new Socket(socket), ...args);
            });
        };
    }
}
if (typeof window === 'undefined')
{  module.exports = ToolSocket; }