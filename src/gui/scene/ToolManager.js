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

    constructor(toolProxy, worker) {
        this.#toolProxy = toolProxy;
        const messageInterface = new IFrameMessageInterface(worker, "*");
        this.#socket = new ToolRenderSocket(messageInterface);
        this.#socket.setListener(this);
    }

    sendSet(delta) {
        this.#socket.sendSet(delta);
    }

    onReceivedGet() {
        this.sendSet(this.#toolProxy.getWorldState());
    }

    onReceivedUpdate(delta) {
        console.log("Composition layer: ", delta);
        this.#toolProxy.setWorldChanges(delta);
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

    /** @type {THREE.Group} */
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
    }

    /**
     * 
     * @param {string} toolId 
     */
    remove(toolId) {
        this.#toolsRootNode.getListener().getToolsRoot().remove(toolId);
    }

    /**
     * 
     * @param {string} toolId 
     */
    add(toolId) {
        this.remove(toolId);
        const worker = globalDOMCache['iframe' + toolId];
        const toolRoot = this.#toolsRootNode.getListener().getToolsRoot().create(toolId);
        this.#toolsRootNode.set(toolId, new ToolNode(new Engine3DToolStore(new ToolProxy(this, toolId, worker, toolRoot))));
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
}

export {ToolManager, ToolProxy}
