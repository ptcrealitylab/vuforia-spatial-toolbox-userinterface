import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import {GLTFLoader} from '../../../thirdPartyCode/three/GLTFLoader.module.js';
import {ToolRenderSocket} from "/objectDefaultFiles/scene/ToolRenderStream.js";
import {IFrameMessageInterface} from "/objectDefaultFiles/scene/MessageInterface.js";
import WorldNode from "/objectDefaultFiles/scene/WorldNode.js";
import Engine3DWorldStore from "./engine3D/Engine3DWorldStore.js";
import Engine3DToolStore from "./engine3D/Engine3DToolStore.js";
import ToolNode from "/objectDefaultFiles/scene/ToolNode.js";
import ThreejsEntity from "./ThreejsEntity.js";


/**
 * @typedef {import('./AnchoredGroup.js').default} AnchoredGroup 
 * 
 * @typedef {{type: string, properties: Object.<string, AnchoredGroupObjectState>}} WorldObjectState
 * @typedef {{type: string, properties: Object.<string, ToolsRootObjectState}} AnchoredGroupObjectState
 * @typedef {{type: string, properties: Object.<string, ToolObjectState}} ToolsRootObjectState
 * @typedef {{type: string, properties: Object.<string, *>}} ToolObjectState
 */

class ToolProxyHandler {
    /** @type {ToolProxy} */
    #toolProxy;

    /** @type {ToolRenderInterface} */
    #socket

    /** @type {boolean} Received initial get command*/
    #isInitialized

    constructor(toolProxy, worker) {
        this.#toolProxy = toolProxy;
        const messageInterface = new IFrameMessageInterface(worker, "*");
        this.#socket = new ToolRenderSocket(messageInterface);
        this.#socket.setListener(this);
        this.#isInitialized = false;
    }

    sendSet(delta) {
        this.#socket.sendSet(delta);
        this.#isInitialized = true;
    }

    sendUpdate(delta) {
        this.#socket.sendUpdate(delta);
    } 

    onReceivedGet() {
        this.sendSet(this.#toolProxy.getWorldState());
    }

    onReceivedUpdate(delta) {
        console.log("Composition layer: ", delta);
        this.#toolProxy.setWorldChanges(delta);
    }

    isInitialized() {
        return this.#isInitialized;
    }
}

class ToolProxy {
    /** @type {ToolManager} */
    #manager;

    /** @type {string} */
    #toolId;

    /** @type {HTMLIFrameElement} */
    #worker;

    /** @type {ToolProxyHandler} */
    #handler;

    /** @type {ThreejsEntity} */
    #rootEntity;

    /**
     * 
     * @param {ToolManager} manager
     * @param {string} toolId 
     * @param {HTMLIFrameElement} worker
     * @param {THREE.Group} rootGroup 
     */
    constructor(manager, toolId, worker, rootGroup) {
        this.#manager = manager;
        this.#toolId = toolId;
        this.#worker = worker;
        this.#rootEntity = new ThreejsEntity(rootGroup);
        this.#handler = new ToolProxyHandler(this, this.#worker);
    }

    getEntity() {
        return this.#rootEntity;
    }

    /**
     * 
     * @returns {WorldObjectState}
     */
    getWorldState() {
        return this.#manager.getStateForTool(this.#toolId);
    }

    setWorldChanges(delta) {
        this.#manager.setChanges(delta);
    }

    #checkPath(obj, propertyName) {
        if (propertyName.length === 0) return Object.keys(obj).length > 0;
        if (obj.hasOwnProperty(propertyName[0])) {
            const curPropName = propertyName[0];
            propertyName.shift();
            return this.#checkPath(obj[curPropName], propertyName);
        }
        return false;
    }

    #createDeltaForTool(delta, propertyName, toolChanges) {
        if (propertyName.length === 0) return toolChanges;
        const ret = {};
        for (const key of Object.keys(delta)) {
            if (key === propertyName[0]) continue;
            ret[key] = structuredClone(delta[key]);
        }
        const curPropName = propertyName[0];
        propertyName.shift(); 
        ret[curPropName] = this.#createDeltaForTool(delta[curPropName], propertyName, toolChanges);
        return ret;
    }

    sendUpdate(delta) {
        if (this.#handler.isInitialized() && this.#checkPath(delta, ["properties", "threejsContainer", "properties", "tools", "properties", this.#toolId])) {
            const toolChanges = delta.properties.threejsContainer.properties.tools.properties[this.#toolId];
            if (toolChanges.type) {
                return; // tool creation is handled by tool initialisation get/set
            }
            const toolDelta = this.#createDeltaForTool(delta, ["properties", "threejsContainer", "properties", "tools", "properties", this.#toolId], toolChanges);
            this.#handler.sendUpdate(toolDelta);
        } 
    }

    updateComponents() {
        this.#rootEntity.updateComponents();
    }
}

class ToolManager {
    /** @type {import('./Renderer.js').Renderer} */
    #renderer;

    /** @type {WorldNode} */
    #worldNode

    /** @type {AnchoredGroupNode} */
    #anchoredGroupNode

    /** @type {ToolsRootNode} */
    #toolsRootNode

    /** @type {{[key: string]: ToolProxy} */
    #toolProxies

    /**
     * 
     * @param {import('./Renderer.js').Renderer} renderer 
     */
    constructor(renderer) {
        this.#renderer = renderer;
        realityEditor.device.registerCallback('onVehicleDeleted', (params) => this.onVehicleDeleted(params));
        realityEditor.network.registerCallback('onVehicleDeleted', (params) => this.onVehicleDeleted(params));
        this.#worldNode = new WorldNode(new Engine3DWorldStore(this.#renderer));
        this.#anchoredGroupNode = this.#worldNode.get("threejsContainer");
        this.#toolsRootNode = this.#anchoredGroupNode.get("tools");
        this.#toolProxies = {};
    }

    /**
     * 
     * @param {string} toolId 
     */
    remove(toolId) {
        this.#toolsRootNode.getListener().getToolsRoot().remove(toolId);
        if (this.#toolProxies.hasOwnProperty(toolId)) {
            delete this.#toolProxies[toolId];
        }
    }

    /**
     * 
     * @param {string} toolId 
     */
    add(toolId) {
        this.remove(toolId);
        const worker = globalDOMCache['iframe' + toolId];
        const toolRoot = this.#toolsRootNode.getListener().getToolsRoot().create(toolId);
        const toolProxy = new ToolProxy(this, toolId, worker, toolRoot);
        this.#toolsRootNode.set(toolId, new ToolNode(new Engine3DToolStore(toolProxy)));
        this.#toolProxies[toolId] = toolProxy;
    }

    /**
     * 
     * @param {*} params 
     */
    onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only react to frames, not nodes
            this.remove(params.frameKey);
        }
    }

    /**
     * 
     * @param {AnchoredGroup} anchoredGroup 
     */
    setAnchoredGroup(anchoredGroup) {
        this.#anchoredGroupNode.getListener().setAnchoredGroup(anchoredGroup);
    }

    /**
     * 
     * @param {string} toolId 
     * @returns {WorldObjectState}
     */
    getStateForTool(toolId) {
        return this.#worldNode.getStateForTool(toolId);
    }

    /**
     * 
     * @param {WorldObjectDelta} delta 
     */
    setChanges(delta) {
        this.#worldNode.setChanges(delta);
    }

    update() {
        this.updateComponents();
        this.sendUpdate();
    }

    updateComponents() {
        for(let toolProxy of Object.values(this.#toolProxies)) {
            toolProxy.updateComponents();
        }
    }

    sendUpdate() {
        let delta = this.#worldNode.getChanges();
        if (Object.keys(delta).length > 0) {
            for(let toolProxy of Object.values(this.#toolProxies)) {
                toolProxy.sendUpdate(delta);
            }
        }
    }
}

export {ToolManager, ToolProxy}
