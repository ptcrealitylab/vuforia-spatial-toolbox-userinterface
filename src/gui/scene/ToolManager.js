import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import {ToolRenderSocket} from "/objectDefaultFiles/scene/ToolRenderStream.js";
import {IFrameMessageInterface} from "/objectDefaultFiles/scene/MessageInterface.js";
import WorldNode from "/objectDefaultFiles/scene/WorldNode.js";
import Engine3DWorldStore from "./engine3D/Engine3DWorldStore.js";
import Engine3DToolStore from "./engine3D/Engine3DToolStore.js";
import ToolNode from "/objectDefaultFiles/scene/ToolNode.js";
import TransformComponentNode from "/objectDefaultFiles/scene/TransformComponentNode.js";
import ThreejsEntity from "./ThreejsEntity.js";
import {setMatrixFromArray} from "./utils.js";


/**
 * @typedef {import('./AnchoredGroup.js').default} AnchoredGroup 
 * @typedef {import('/objectDefaultFiles/scene/AnchoredGroupNode.js').default} AnchoredGroupNode 
 * @typedef {import('/objectDefaultFiles/scene/WorldNode.js').WorldNodeState} WorldNodeState
 * @typedef {import('/objectDefaultFiles/scene/WorldNode.js').WorldNodeDelta} WorldNodeDelta
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
        this.#socket = new ToolRenderSocket(messageInterface, toolProxy.getToolId());
        this.#socket.setListener(this);
        this.#isInitialized = false;
    }

    sendSet(state) {
        this.#socket.sendSet(state);
        this.#isInitialized = true;
    }

    sendUpdate(delta) {
        this.#socket.sendUpdate(delta);
    } 

    onReceivedGet() {
        this.sendSet(this.#toolProxy.getWorldState());
    }

    onReceivedUpdate(delta) {
        console.log(`${this.#toolProxy.getToolId()} -> composition layer: `, delta);
        this.#toolProxy.setWorldChanges(delta);
    }

    isInitialized() {
        return this.#isInitialized;
    }

    onDelete() {
        this.#socket.onDelete();
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

    /** @type {THREE.Matrix4|null} */
    #lastToolMatrix;

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
        this.#lastToolMatrix = new THREE.Matrix4();
    }

    /**
     * 
     * @returns {string}
     */
    getToolId() {
        return this.#toolId;
    }

    /**
     * 
     * @returns {ThreejsEntity}
     */
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
        const ret = {};
        if (propertyName.length === 1) {
            ret[propertyName[0]] = toolChanges;
        } else {
            for (const key of Object.keys(delta)) {
                if (key === propertyName[0]) continue;
                ret[key] = structuredClone(delta[key]);
            }
            const curPropName = propertyName[0];
            propertyName.shift(); 
            ret[curPropName] = this.#createDeltaForTool(delta[curPropName], propertyName, toolChanges);
        }
        return ret;
    }

    sendUpdate(delta) {
        if (this.#handler.isInitialized() && this.#checkPath(delta, ["properties", "tools", "properties", this.#toolId])) {
            const toolChanges = delta.properties.tools.properties[this.#toolId];
            const toolDelta = this.#createDeltaForTool(delta, ["properties", "tools", "properties", this.#toolId], toolChanges);
            this.#handler.sendUpdate(toolDelta);
        } 
    }

    #updateMatrix() {
        const toolMat = new THREE.Matrix4();
        const toolNode = realityEditor.sceneGraph.getSceneNodeById(this.#toolId);
        setMatrixFromArray(toolMat, toolNode.worldMatrix);
       
        if (!toolMat.equals(this.#lastToolMatrix)) {
            this.#lastToolMatrix.copy(toolMat);

            const axisCorrectionMat = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
            const localToolMatrix = toolMat.multiply(axisCorrectionMat);

            const decomposedMatrix = {
                position: new THREE.Vector3(),
                rotation: new THREE.Quaternion(),
                scale: new THREE.Vector3()
            }
            localToolMatrix.decompose(decomposedMatrix.position, decomposedMatrix.rotation, decomposedMatrix.scale);
            const transformComponent = this.#rootEntity.getComponentByType(TransformComponentNode.TYPE);
            transformComponent.setPosition(decomposedMatrix.position);
            transformComponent.setRotation(decomposedMatrix.rotation);
            transformComponent.setScale(decomposedMatrix.scale);
        }
    }

    updateComponents() {
        this.#updateMatrix();
        this.#rootEntity.updateComponents();
    }

    onDelete() {
        this.#handler.onDelete();
    }
}

class ToolManager {
    /** @type {import('./Renderer.js').Renderer} */
    #renderer;

    /** @type {WorldNode} */
    #worldNode;

    /** @type {AnchoredGroupNode} */
    #anchoredGroupNode;

    /** @type {ToolsRootNode} */
    #toolsRootNode;

    /** @type {{[key: string]: ToolProxy} */
    #toolProxies;

    /**
     * 
     * @param {import('./Renderer.js').Renderer} renderer 
     */
    constructor(renderer) {
        this.#renderer = renderer;
        realityEditor.device.registerCallback('vehicleDeleted', (params) => this.onVehicleDeleted(params));
        realityEditor.network.registerCallback('vehicleDeleted', (params) => this.onVehicleDeleted(params));
        this.#worldNode = new WorldNode(new Engine3DWorldStore(this.#renderer));
        this.#anchoredGroupNode = this.#worldNode.get("threejsContainer");
        this.#toolsRootNode = this.#worldNode.get("tools");
        this.#toolProxies = {};
    }

    /**
     * 
     * @param {string} toolId 
     */
    remove(toolId) {
        if (this.#toolProxies.hasOwnProperty(toolId)) {
            this.#toolsRootNode.delete(toolId);
            this.#toolProxies[toolId].onDelete();
            delete this.#toolProxies[toolId];
        }
    }

    /**
     * 
     * @param {string} toolId 
     */
    add(toolId) {
        if (this.#toolProxies.hasOwnProperty(toolId)) {
            console.warn(`toolId already exist`);
            return;
        }
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
     * @returns {WorldNodeState}
     */
    getStateForTool(toolId) {
        return this.#worldNode.getStateForTool(toolId);
    }

    /**
     * 
     * @param {WorldNodeDelta} delta 
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
