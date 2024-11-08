/*
 *  MIT License
 *  Copyright (c) 2023 Kevin Kwok
 * 
 *  Modified by Steve KX 2023, 2024
 *
 *  Use of the original version of this source code is governed by a license
 *  that can be found in the LICENSE_splat file in the thirdPartyCode directory.
 */
import * as THREE from '../../thirdPartyCode/three/three.module.js';
import GUI from '../../thirdPartyCode/lil-gui.esm.js';
import { getPendingCapture } from '../gui/sceneCapture.js';
import { remap, remapCurveEaseOut } from "../utilities/MathUtils.js";
import { iPhoneVerticalFOV, projectionMatrixFrom, multiply4, multiply4v, multiply3v, quaternionToRotationMatrix, invert4 } from "./math.js";

let gsInitialized = false;
let gsActive = false;
let gsContainer;
let gsSettingsPanel;
let isGSRaycasting = false;

import { vertexShaderSource, fragmentShaderSource } from "./shader.js";
import SplatManager from './SplatManager.js';
let splatData = null;
let maxSplatCount = null;
let downsample = null;
let worker = null; // splat worker
let vertexCount = null, lastVertexCount = null;
let gl = null, program = null;
let splatRegionCount = null;

async function main(initialFilePath) {

    // const url = new URL('http://192.168.0.12:8080/obj/_WORLD_test/target/target_splats/target.splat');
    console.log(initialFilePath);
    splatRegionCount = initialFilePath.length;
    // todo Steve: 
    //  1. this still needs to read full byte length in advance, and generate a fixed-length array
    //  cannot support dynamically loading splat files, as new .splat files are generated
    //  need to instanciate a worker, dedicated to expanding the array & copying old data over !!!!!
    //  2. when delete / add another splat region async, need to recompile the vertex shader source, b/c splat region count changes
    //  3. when delete / add another splat region async, need to re-compute maxSplatCount and downsample
    //   and then manually perform resize() function, b/c downsample affects canvas & gl context size
    let byteLengths = [];
    let totalByteLength = 0;
    for (let i = 0; i < splatRegionCount; i++) {
        const url = new URL([initialFilePath[i]]);
        const req = await fetch(url, {
            mode: "cors", // no-cors, *cors, same-origin
            credentials: "omit", // include, *same-origin, omit
        });
        if (req.status != 200) {
            throw new Error(req.status + " Unable to load " + req.url);
        }
        let length = parseInt(req.headers.get("content-length"));
        let splatFileName = initialFilePath[i].split('/');
        splatFileName = splatFileName[splatFileName.length - 2] + '/' + splatFileName[splatFileName.length - 1];
        console.log(`${splatFileName} has ${length} bytes.`);
        byteLengths.push(length);
        totalByteLength += length;
    }
    console.log(`All ${splatRegionCount} splat files have ${totalByteLength} bytes in total.`);

    splatData = new Uint8Array(totalByteLength);
    const minRowLength = 32;
    maxSplatCount = splatData.length / minRowLength;
    downsample = maxSplatCount > 500000 ? 1 : 1 / window.devicePixelRatio;

    worker = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
    })

    const fps = document.getElementById("gsFps");
    const gsCanvas = document.getElementById("gsCanvas");

    gl = gsCanvas.getContext("webgl2", {
        antialias: false,
    });

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource(splatRegionCount));
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(vertexShader));

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource());
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(fragmentShader));

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(program));

    gl.disable(gl.DEPTH_TEST); // Disable depth testing

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate( // Painter's algorithm, sorted from back to front
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
    );

    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    const u_projection = gl.getUniformLocation(program, "projection");
    const u_viewport = gl.getUniformLocation(program, "viewport");
    const u_focal = gl.getUniformLocation(program, "focal");
    const u_view = gl.getUniformLocation(program, "view");
    const u_mouse = gl.getUniformLocation(program, "uMouse");
    const u_collideIndex = gl.getUniformLocation(program, "uCollideIndex");
    const u_uIsGSRaycasting = gl.getUniformLocation(program, "uIsGSRaycasting");
    const u_toggleBoundary = gl.getUniformLocation(program, "uToggleBoundary");
    const u_worldLowAlpha = gl.getUniformLocation(program, "uWorldLowAlpha");

    let uMode = 0;
    const u_mode = gl.getUniformLocation(program, "mode");
    gl.uniform1f(u_mode, uMode);

    let uEdit = 0;
    const u_edit = gl.getUniformLocation(program, "uEdit");
    gl.uniform1i(u_edit, uEdit);

    let pendingHiddenSplatIndexSet = new Set();
    window.splatSet = pendingHiddenSplatIndexSet;
    const u_pendingSplatIndices = gl.getUniformLocation(program, "pendingHiddenSplatIndices");
    gl.uniform1iv(u_pendingSplatIndices, Array.from(pendingHiddenSplatIndexSet));

    window.addEventListener("keydown", (e) => {
        if (e.key === 'j' || e.key === 'J') {
            uMode = uMode === 1 ? 0 : 1;
            gl.uniform1f(u_mode, uMode);
        } else if (e.key === 'y' || e.key === 'Y') {
            uEdit = uEdit === 1 ? 0 : 1;
            gl.uniform1i(u_edit, uEdit);
            if (uEdit === 0) {
                pendingHiddenSplatIndexSet.clear();
                gl.uniform1iv(u_pendingSplatIndices, [-1]); // -1 is dummy value, b/c min index is 0
            }
        } else if (e.key === 'Backspace') {
            console.log(pendingHiddenSplatIndexSet);
            // todo Steve: change the texture for the edited splats
            worker.postMessage({
                isSplatEdited: true,
                hiddenSplatIndexSet: pendingHiddenSplatIndexSet,
            });
            pendingHiddenSplatIndexSet.clear();
            gl.uniform1iv(u_pendingSplatIndices, [-1]);
        }
    });

    let isEditDragging = false;
    window.addEventListener('pointerdown', (e) => {
        if (!realityEditor.spatialCursor.isGSActive()) return;
        if (e.button !== 0) return;
        if (uEdit === 0) return;
        isEditDragging = true;
        if (vCollideIndex === -1) return;
        pendingHiddenSplatIndexSet.add(vCollideIndex);
        gl.uniform1iv(u_pendingSplatIndices, Array.from(pendingHiddenSplatIndexSet));
    })

    window.addEventListener('pointerup', (e) => {
        if (!realityEditor.spatialCursor.isGSActive()) return;
        if (e.button !== 0) return;
        if (uEdit === 0) return;
        isEditDragging = false;
    })

    window.addEventListener('pointermove', () => {
        if (!realityEditor.spatialCursor.isGSActive()) return;
        if (uEdit === 0) return;
        if (!isEditDragging) return;
        if (vCollideIndex === -1) return;
        pendingHiddenSplatIndexSet.add(vCollideIndex);
        gl.uniform1iv(u_pendingSplatIndices, Array.from(pendingHiddenSplatIndexSet));
    })

    let uRegion = -1;
    const u_region = gl.getUniformLocation(program, "uRegion");
    gl.uniform1f(u_region, uRegion);
    
    let uLabel = -1;
    const u_label = gl.getUniformLocation(program, "uLabel");
    gl.uniform1f(u_label, uLabel);

    // positions
    const triangleVertices = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    const a_position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var u_textureLocation = gl.getUniformLocation(program, "u_texture");
    gl.uniform1i(u_textureLocation, 0);

    const indexBuffer = gl.createBuffer();
    const a_index = gl.getAttribLocation(program, "index");
    gl.enableVertexAttribArray(a_index);
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.vertexAttribIPointer(a_index, 1, gl.INT, false, 0, 0);
    gl.vertexAttribDivisor(a_index, 1);

    let actualViewMatrix;
    let projectionMatrix;
    let camNear, camNearWidth, camNearHeight;

    // set up an off-screen frame buffer object texture
    let offscreenTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, offscreenTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, innerWidth, innerHeight, 0, gl.RGBA, gl.FLOAT, null);
    // Set texture parameters as needed
    // Check and enable the EXT_color_buffer_float extension in WebGL2
    const extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
    if (!extColorBufferFloat) {
        console.error('32-bit floating point linear filtering not supported');
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // create frame buffer object
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer is incomplete');
        console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        return;
    }

    let resizeId = null;
    const onResizeEnd = () => {
        // delete, create, and bind the new texture for FBO
        gl.deleteTexture(offscreenTexture);
        offscreenTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, offscreenTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, innerWidth, innerHeight, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is incomplete');
            console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        }
    }

    const resize = () => {

        const canvas = document.getElementById("gsCanvas");
        canvas.width = window.innerWidth / downsample;
        canvas.height = window.innerHeight / downsample;

        // near and far plane defined in mm as in the rest of Toolbox
        projectionMatrix = projectionMatrixFrom(iPhoneVerticalFOV, window.innerWidth / window.innerHeight, 10, 300000);

        camNear = 10 / 1000;
        camNearHeight = camNear * Math.tan(iPhoneVerticalFOV * (Math.PI / 180) / 2) * 2;
        camNearWidth = camNearHeight / window.innerHeight * window.innerWidth;

        // compute horizontal and vertical focal length in pixels from projection matrix. This is needed in shaders.
        const fx = projectionMatrix[0] * window.innerWidth / 2.0;
        const fy = projectionMatrix[5] * -window.innerHeight / 2.0;

        gl.uniform2fv(u_focal, new Float32Array([fx, fy]));

        gl.canvas.width = Math.round(window.innerWidth / downsample);
        gl.canvas.height = Math.round(window.innerHeight / downsample);
        gl.uniform2fv(u_viewport, new Float32Array([gl.canvas.width, gl.canvas.height]));
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

        if (resizeId !== null) {
            clearTimeout(resizeId);
        }
        resizeId = setTimeout(() => {
            onResizeEnd();
        }, 150);
    };

    window.addEventListener("resize", resize);
    resize();

    let labelContainer = document.createElement('div');
    labelContainer.id = 'label-container';
    document.body.append(labelContainer);
    let currentInfoContainer, currentRegionId, currentLabelId, currentAddInfoButton, currentCustomTextContainer;
    let center_maps_from_worker;

    // todo Steve: figure out how to make it labelContainer.addEventListener(......)
    window.addEventListener('pointerdown', (e) => {
        if (!realityEditor.spatialCursor.isGSActive()) return;
        if (e.button !== 0) return;
        if (e.target.id.includes('label_')) {
            uRegion = parseFloat(e.target.id.split('_')[1]);
            uLabel = parseFloat(e.target.id.split('_')[2]);

            currentRegionId.innerHTML = `Region: ${uRegion}`;
            currentLabelId.innerHTML = `Label: ${uLabel}`;
            // todo Steve: clear & re-add the label information based on center_map_from_worker's most up-to-date user-added labels
            while (currentCustomTextContainer.children.length > 1) { // removes all child custom info text except the "+" button
                currentCustomTextContainer.removeChild(currentCustomTextContainer.firstElementChild);
            }
            let customTexts = center_maps_from_worker.get(uRegion).get(uLabel).userData;
            for (let i = 0; i < customTexts.length; i++) {
                addInfo(customTexts[i], i)
            }

            currentInfoContainer.style.visibility = 'visible';

            gl.uniform1f(u_region, uRegion);
            gl.uniform1f(u_label, uLabel);
        } else {
            uRegion = -1;
            uLabel = -1;

            currentRegionId.innerHTML = `Region: ${uRegion}`;
            currentLabelId.innerHTML = `Label: ${uLabel}`;
            while (currentCustomTextContainer.children.length > 1) { // removes all child custom info text except the "+" button
                currentCustomTextContainer.removeChild(currentCustomTextContainer.firstElementChild);
            }

            currentInfoContainer.style.visibility = 'hidden';

            gl.uniform1f(u_region, uRegion);
            gl.uniform1f(u_label, uLabel);
            
            loopThroughLabels();
        }
    })

    function loopThroughLabels() {
        // todo Steve: the entire looping through label is very slow. Definitely need to get rid of all the labels and replace them with either WebGL stuff, or something else
        return;
        if (isGSRaycasting && !isFlying) return; 
        for (let [regionId, center_map] of center_maps_from_worker.entries()) {
            let minCount = Infinity, maxCount = 0;
            for (let info of center_map.values()) {
                if (info.count < minCount) minCount = info.count;
                if (info.count > maxCount) maxCount = info.count;
            }
            for (let [labelId, info] of center_map.entries()) {
                let label = document.getElementById(`label_${regionId}_${labelId}`);
                if (label === null) {
                    let scaleFactor = remapCurveEaseOut(info.count, minCount, maxCount, 1, 8);
                    
                    label = document.createElement('div');
                    label.classList.add('cluster-label');
                    label.id = `label_${regionId}_${labelId}`;
                    label.style.width = `${scaleFactor * 6}px`;
                    label.style.height = `${scaleFactor * 6}px`;
                    
                    let labelDot = document.createElement('div');
                    labelDot.classList.add('cluster-label-dot');
                    labelDot.innerHTML = `&centerdot;`;
                    labelDot.style.fontSize = `${scaleFactor}rem`;
                    // labelDot.style.visibility = 'hidden';
                    label.appendChild(labelDot);

                    let label_info = document.createElement('div');
                    label_info.classList.add('cluster-label-info');
                    // label_info.style.visibility = 'hidden';
                    let label_info_regionId = document.createElement('div');
                    label_info_regionId.innerHTML = `Region: ${regionId}`;
                    label_info.appendChild(label_info_regionId);
                    let label_info_labelId = document.createElement('div');
                    label_info_labelId.innerHTML = `Label: ${labelId}`;
                    label_info.appendChild(label_info_labelId);
                    
                    // display the user-added labels
                    let label_info_userData = document.createElement('div');
                    label_info_userData.classList.add('cluster-label-user-data');
                    let userDataString = '';
                    for (let i = 0; i < info.userData.length; i++) {
                        if (i === info.userData.length - 1) userDataString += `${info.userData[i]}`;
                        else userDataString += `${info.userData[i]}, `;
                    }
                    label_info_userData.innerHTML = `User Data: ${userDataString}`;
                    label_info.appendChild(label_info_userData);
                    
                    label.append(label_info);

                    labelContainer.append(label);
                }
                // early return, hide labels
                if (!realityEditor.spatialCursor.isGSActive()) {
                    label.style.visibility = 'hidden';
                    continue;
                }
                let dont_render = (uLabel !== -1) && (uRegion !== -1) && !( (uLabel === labelId) && (uRegion === regionId) );
                if (dont_render) {
                    label.style.visibility = 'hidden';
                    continue;
                }
                // compute label screen-space position
                let splatRegion = SplatManager.getSplatRegions().get(regionId);
                let pos = [info.x, info.y, info.z];
                let bMin = splatRegion.getBoundaryMin();
                let bMax = splatRegion.getBoundaryMax();
                if (pos[0] < bMin[0] || pos[1] < bMin[1] || pos[2] < bMin[2] || pos[0] > bMax[0] || pos[1] > bMax[1] || pos[2] > bMax[2]) { // out of boundary
                    label.style.visibility = 'hidden';
                    continue;
                }
                let posOffset = splatRegion.getPositionOffset(); // mm --> m
                let q = splatRegion.getQuaternion();
                pos = multiply3v(quaternionToRotationMatrix(q), pos);
                pos[0] += posOffset[0];
                pos[1] += posOffset[1];
                pos[2] += posOffset[2];
                let pos2d = multiply4v(multiply4(projectionMatrix, actualViewMatrix), [...pos, 1]);
                let clip = 1.2 * pos2d[3];
                if (pos2d[2] < -clip || pos2d[0] < -clip || pos2d[0] > clip || pos2d[1] < -clip || pos2d[1] > clip) {
                    label.style.visibility = 'hidden';
                } else {
                    label.style.visibility = 'visible';
                    let ndcXY = [pos2d[0] / pos2d[3], pos2d[1] / pos2d[3]];
                    let screenXY = [(ndcXY[0] + 1) / 2 * innerWidth, (-ndcXY[1] + 1) / 2 * innerHeight];
                    label.style.transform = `translate(-50%, -50%) translate(${screenXY[0]}px, ${screenXY[1]}px)`;
                }
                
                // display up-to-date user-added labels
                let label_info_userData = label.getElementsByClassName('cluster-label-user-data')[0];
                if (info.userData.length === 0) {
                    // todo Steve: updating this every frame is VERY performance consuming, need to update it only when corresponding user data changes
                    label_info_userData.innerHTML = 'User data: ';
                    continue;
                }
                let userDataString = '';
                for (let i = 0; i < info.userData.length; i++) {
                    if (i === info.userData.length - 1) userDataString += `${info.userData[i]}`;
                    else userDataString += `${info.userData[i]}, `;
                }
                label_info_userData.innerHTML = `User Data: ${userDataString}`;
            }
        }
        // console.timeEnd('label');
    }

    function selectAllTextInNode(node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function addInfo(newInfoString, newInfoIndex) { // todo Steve: if already have new info string & index, then don't append the center_map_from_worker userData, b/c it already exists
        if (uRegion === -1 || uLabel === -1) return;
        let activeString = newInfoString !== undefined ? `${newInfoString}` : 'new info';
        let activeIdx = newInfoIndex !== undefined ? newInfoIndex : center_maps_from_worker.get(uRegion).get(uLabel).userData.length;
        if (newInfoString === undefined) center_maps_from_worker.get(uRegion).get(uLabel).userData.push(activeString);
        
        let newInfo = document.createElement('span');
        newInfo.classList.add('info-current');
        currentCustomTextContainer.insertBefore(newInfo, currentCustomTextContainer.lastChild);
        newInfo.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        })
        
        let newInfoText = document.createElement('span');
        newInfoText.classList.add('info-text');
        newInfoText.innerHTML = activeString;
        newInfoText.contentEditable = 'true';
        newInfo.appendChild(newInfoText);

        // https://stackoverflow.com/questions/3805852/select-all-text-in-contenteditable-div-when-it-focus-click
        // not sure if the content editable property makes everything slower by a fraction of a second, but editing / selecting all needs an extra delay to work, see below
        setTimeout(() => {
            selectAllTextInNode(newInfoText);
        }, 0);
        
        newInfoText.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            setTimeout(() => {
                selectAllTextInNode(newInfoText);
            }, 0);
            let p = newInfoText.parentElement; // newInfo
            let gp = newInfoText.parentElement.parentElement; // currentCustomTextContainer
            activeIdx = Array.from(gp.children).indexOf(p);
        })
        
        newInfoText.addEventListener('keydown', (e) => {
            if (realityEditor.device.keyboardEvents.isKeyboardActive()) return;
            e.stopPropagation();
            if (uRegion === -1 || uLabel === -1) return;
            
            setTimeout(() => {
                center_maps_from_worker.get(uRegion).get(uLabel).userData[activeIdx] = newInfoText.innerText;
            }, 0);
        })
        
        let newInfoDelete = document.createElement('span');
        newInfoDelete.classList.add('info-delete');
        newInfoDelete.innerHTML = 'x';
        newInfo.appendChild(newInfoDelete);
        
        newInfoDelete.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (uRegion === -1 || uLabel === -1) return;
            
            let p = newInfoText.parentElement; // newInfo
            let gp = newInfoText.parentElement.parentElement; // currentCustomTextContainer
            activeIdx = Array.from(gp.children).indexOf(p);
            setTimeout(() => {
                center_maps_from_worker.get(uRegion).get(uLabel).userData.splice(activeIdx, 1);
                console.log(center_maps_from_worker.get(uRegion).get(uLabel).userData);
            }, 0)
            gp.removeChild(p);
        })
    }
    
    function initLabelCurrent() {
        currentInfoContainer = document.createElement('div');
        currentInfoContainer.id = 'info-container-current';
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        currentInfoContainer.style.top = `${navbarHeight}px`;
        labelContainer.appendChild(currentInfoContainer);
        currentRegionId = document.createElement('div');
        currentRegionId.style.fontSize = '1.5rem';
        currentRegionId.innerHTML = `Region: ${uRegion}`;
        currentInfoContainer.appendChild(currentRegionId);
        currentLabelId = document.createElement('div');
        currentLabelId.style.fontSize = '1.3rem';
        currentLabelId.innerHTML = `Label: ${uLabel}`;
        currentInfoContainer.appendChild(currentLabelId);
        
        // add info container
        currentCustomTextContainer = document.createElement('div');
        currentCustomTextContainer.id = 'custom-text-container-current';
        currentInfoContainer.appendChild(currentCustomTextContainer);
        
        currentAddInfoButton = document.createElement('span');
        currentAddInfoButton.classList.add('info-add');
        currentAddInfoButton.innerHTML = `+`;
        currentAddInfoButton.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            addInfo();
        })
        currentCustomTextContainer.appendChild(currentAddInfoButton);

        // todo Steve: comment this out for debug display style purposes, uncomment this later
        currentInfoContainer.style.visibility = 'hidden';
    }
    
    function clearLabels() {
        labelContainer.innerHTML = '';
    }
    
    function initLabels() {
        if (center_maps_from_worker.size === 0) return; // todo Steve: figure out why there is ONLY 245 instead of 265 clusters
        initLabelCurrent();
        // realityEditor.gui.threejsScene.onAnimationFrame(loopThroughLabels);
        SplatManager.createLabels(center_maps_from_worker);
    }
    
    function clearSensors() {
        console.log('clear sensors');
    }
    
    function initSensors() {
        
    }

    worker.onmessage = (e) => {
        if (e.data.buffer) {
            splatData = new Uint8Array(e.data.buffer);
            const blob = new Blob([splatData.buffer], {
                type: "application/octet-stream",
            });
            // TODO (Dan): don't download, send to server
            const link = document.createElement("a");
            link.download = "model.splat";
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else if (e.data.texdata) {
            const { texdata, texwidth, texheight } = e.data;
            // console.log(texdata)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            // console.log('%c update texture in main thread', 'color: green');
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA32UI,
                texwidth,
                texheight,
                0,
                gl.RGBA_INTEGER,
                gl.UNSIGNED_INT,
                texdata,
            );
            gl.bindTexture(gl.TEXTURE_2D, texture);
        } else if (e.data.depthIndex) {
            const { depthIndex, _viewProj } = e.data;
            gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, depthIndex, gl.DYNAMIC_DRAW);
            vertexCount = e.data.vertexCount;
            // console.log(`In e.data.depthIndex, update main thread vertex count: ${vertexCount}`);
            behindCameraAmount = e.data.behindCameraAmount;
            outOfBoundaryAmount = e.data.outOfBoundaryAmount;
            // console.log(depthIndex.length, vertexCount, behindCameraAmount, outOfBoundaryAmount);
            // console.log(behindCameraAmount, outOfBoundaryAmount, vertexCount, (vertexCount - behindCameraAmount - outOfBoundaryAmount) / vertexCount * 100);
            let forceSortDone = e.data.forceSortDone;
            if (forceSortDone) {
                toggleGSRaycast(true);
                // console.log('%c force sort done, toggle gs raycast on for a sec.', 'color: cyan');
            }
        } else if (e.data.center_maps) {
            center_maps_from_worker = e.data.center_maps;
            clearLabels();
            initLabels();
            clearSensors();
            initSensors();
            SplatManager.setRegionBoundaryFromStorageOrWorker(e.data.boundary_maps);
        }
    };

    // region + label
    function extractCollideRegionAndLabel(x) {
        let collideRegionId = x >> 16;
        let collideLabelId = x - collideRegionId;
        return {collideRegionId, collideLabelId};
    }

    vertexCount = 0;
    let behindCameraAmount = 0;
    let outOfBoundaryAmount = 0;
    let lastFrame = 0;
    let avgFps = 0;
    // let start = 0;

    let isLowFPS = false;
    let lowFPSId = null;
    function lowFPSMode() {
        isLowFPS = true;
        if (lowFPSId !== null) {
            clearTimeout(lowFPSId);
        }
        lowFPSId = setTimeout(() => {
            isLowFPS = false;
        }, 500);
    }

    let vWorld = new THREE.Vector3();
    let vCollideIndex = -1;

    const frame = (now) => {

        window.requestAnimationFrame(frame);
        if (!realityEditor.spatialCursor.isGSActive()) return;

        // obtain camera pose from Toolbox scene graph 
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
        let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
        if (!gpNode) {
            gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
        }
        // transformation from camera CS to ground plane CS
        let newCamMatrix = cameraNode.getMatrixRelativeTo(gpNode);

        const scaleF = 1.0;  // extra scaling factor in target CS
        const offset_x = 0;  // extra offset in target CS (in meter units)
        const offset_y = 0;
        const offset_z = 0;

        const SCALE = 1 / 1000; // conversion from mm (Toolbox) to meters (GS renderer) 
        const floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset() // in mm units
        // update translation vector (camera wrt. world CS)
        newCamMatrix[12] = (newCamMatrix[12]*SCALE + offset_x) * scaleF;
        newCamMatrix[13] = ((newCamMatrix[13] + floorOffset)*SCALE + offset_y)*scaleF;
        newCamMatrix[14] = (newCamMatrix[14]*SCALE + offset_z)*scaleF;

        // flip the y, z axes (OpenGL to Colmap camera CS)
        const flipMatrix =   
            [1, 0, 0, 0,
             0,-1, 0, 0,
             0, 0,-1, 0,
             0, 0, 0, 1];

        let resultMatrix_1 = multiply4(newCamMatrix, flipMatrix);
        // inversion is needed
        actualViewMatrix = invert4(resultMatrix_1);

        const viewProj = multiply4(projectionMatrix, actualViewMatrix);
        worker.postMessage({ view: viewProj });

        const currentFps = 1000 / (now - lastFrame) || 0;
        avgFps = avgFps * 0.9 + currentFps * 0.1;

        let renderVertexCount = vertexCount - behindCameraAmount - outOfBoundaryAmount;

        if (renderVertexCount > 0 && realityEditor.spatialCursor.isGSActive()) {
            document.getElementById("gsSpinner").style.display = "none";
            gl.uniformMatrix4fv(u_view, false, actualViewMatrix);
            gl.uniform2fv(u_mouse, new Float32Array(uMouse));
            gl.clear(gl.COLOR_BUFFER_BIT);
            FBORendering: if (isGSRaycasting && !isLowFPS) {
                // if average FPS is lower than 40, then switch back to default ray-casting method
                if (avgFps < 30) {
                    // console.warn('Low FPS, stop gs raycasting for now.');
                    // lowFPSMode();
                    // realityEditor.spatialCursor.gsToggleRaycast(false);
                    // break FBORendering;
                }
                realityEditor.spatialCursor.gsToggleRaycast(true);
                // render to frame buffer object texture
                gl.uniform1i(u_uIsGSRaycasting, 1);
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                gl.clear(gl.COLOR_BUFFER_BIT);
                // todo Steve: 1. see if this outOfBoundaryAmount and shader checking out of boundary is repetitive
                //  2. figure out why FBO rendering mode is NOT rendering every splat position info when a label is selected
                gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, renderVertexCount);
                // read the texture
                const pixelBuffer = new Float32Array(4); // 4 components for RGBA
                gl.readPixels(Math.floor(uMouseScreen[0]), Math.floor(innerHeight - uMouseScreen[1]), 1, 1, gl.RGBA, gl.FLOAT, pixelBuffer);
                if (pixelBuffer[3] !== 0) { // todo Steve: this is the reason why FBO rendering mode is NOT rendering every splat position info when a label is selected !!!!
                    // set world collide position
                    let camDepth = pixelBuffer[0];
                    let xOffset = remap(uMouse[0], -1, 1, -camNearWidth / 2, camNearWidth / 2) / camNear * camDepth;
                    let yOffset = remap(uMouse[1], -1, 1, camNearHeight / 2, -camNearHeight / 2) / camNear * camDepth;
                    let camSpacePosition = [xOffset, yOffset, camDepth, 1];
                    let worldSpacePosition = multiply4v(resultMatrix_1, camSpacePosition);
                    vWorld.set(worldSpacePosition[0], worldSpacePosition[1], worldSpacePosition[2]);
                    vWorld.x = (vWorld.x / scaleF - offset_x) / SCALE;
                    vWorld.y = (vWorld.y / scaleF - offset_y) / SCALE - floorOffset;
                    vWorld.z = (vWorld.z / scaleF - offset_z) / SCALE;
                    realityEditor.spatialCursor.gsSetPosition(vWorld);
                    // set collide index
                    gl.uniform1i(u_collideIndex, pixelBuffer[1]);
                    vCollideIndex = pixelBuffer[1];
                    // // get collide region id & label
                    // let {collideRegionId, collideLabelId} = extractCollideRegionAndLabel(pixelBuffer[2]);
                    // console.log(collideRegionId, collideLabelId);
                } else {
                    gl.uniform1i(u_collideIndex, -1);
                    vCollideIndex = -1;
                }
            }
            // render to screen
            gl.uniform1i(u_uIsGSRaycasting, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            // gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);
            // console.log(renderVertexCount);
            gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, renderVertexCount);

            let pendingCapture = getPendingCapture('gsCanvas');
            if (pendingCapture) {
                pendingCapture.performCapture();
            }

        } else {
            gl.clear(gl.COLOR_BUFFER_BIT);
            document.getElementById("gsSpinner").style.display = "";
            // start = Date.now() + 2000;
        }
        const progress = (100 * SplatManager.getTotalBytesRead()) / totalByteLength;
        if (progress < 100) {
            document.getElementById("gsProgress").style.width = progress + "%";
        } else {
            document.getElementById("gsProgress").style.display = "none";
        }
        fps.innerText = Math.round(avgFps) + " fps";
        lastFrame = now;
        // window.requestAnimationFrame(frame);
    };

    frame();

    let uMouse = [0, 0];
    let uMouseScreen = [0, 0];
    let uLastMouse = [0, 0];
    let uLastMouseScreen = [0, 0];
    window.addEventListener("pointermove", (e) => {
        if (isFlying) return;
        // uMouseScreen = [e.clientX, e.clientY];
        // uMouse = [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
        uMouseScreen = [Math.round(e.clientX), Math.round(e.clientY)];
        uMouse = [(uMouseScreen[0] / innerWidth) * 2 - 1, -(uMouseScreen[1] / innerHeight) * 2 + 1];
    })
    // add fly mode support
    let isFlying = false;
    realityEditor.device.keyboardEvents.registerCallback('enterFlyMode', function (params) {
        isFlying = params.isFlying;
        let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
        uLastMouseScreen = [mousePosition.x, mousePosition.y];
        uLastMouse = [(mousePosition.x / innerWidth) * 2 - 1, -(mousePosition.y / innerHeight) * 2 + 1]
        uMouseScreen = [innerWidth / 2, innerHeight / 2];
        uMouse = [0, 0];
    });
    realityEditor.device.keyboardEvents.registerCallback('enterNormalMode', function (params) {
        isFlying = params.isFlying;
        uMouseScreen[0] = uLastMouseScreen[0];
        uMouseScreen[1] = uLastMouseScreen[1];
        uMouse[0] = uLastMouse[0];
        uMouse[1] = uLastMouse[1];
    });

    // lil GUI settings
    gsSettingsPanel = new GUI({width: 300});
    gsSettingsPanel.domElement.style.zIndex = '10001';
    gsSettingsPanel.domElement.style.display = 'none';
    let uToggleBoundary = true;
    let uWorldLowAlpha = 0.3;
    const folder = gsSettingsPanel.addFolder('Visibility');
    let settings = {
        "toggle boundary": uToggleBoundary,
        "world low alpha": uWorldLowAlpha,
    }
    folder.add(settings, 'toggle boundary').onChange((value) => {
        uToggleBoundary = value;
        gl.uniform1f(u_toggleBoundary, uToggleBoundary ? 1 : 0);
    });
    gl.uniform1f(u_toggleBoundary, uToggleBoundary ? 1 : 0);
    let d1 = folder.add(settings, 'world low alpha', 0, 1).onChange((value) => {
        uWorldLowAlpha = value;
        gl.uniform1f(u_worldLowAlpha, uWorldLowAlpha);
    });
    d1.step(0.1);
    gl.uniform1f(u_worldLowAlpha, uWorldLowAlpha);
    folder.close();

    const preventDefault = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    gsContainer.addEventListener("dragenter", preventDefault);
    gsContainer.addEventListener("dragover", preventDefault);
    gsContainer.addEventListener("dragleave", preventDefault);
    /*
    gsContainer.addEventListener("drop", (e) => {
        preventDefault(e);
        selectFile(e.dataTransfer.files[0]);
    }); */

    lastVertexCount = -1;
    let stopLoading = false;

    // eslint-disable-next-line no-constant-condition
    SplatManager.initService();
    // return;
    // for (let i = 0; i < splatRegionCount; i++) {
    for (let i = 0; i < splatRegionCount - 1; i++) {
        let region = new SplatManager.SplatRegion(initialFilePath[i], byteLengths[i], i);
        await region.load();
    }
    if (!stopLoading) {
        console.log('main thread post doneLoading to worker');
        worker.postMessage({
            doneLoading: true,
            buffer: splatData.buffer,
            vertexCount: SplatManager.getTotalVertexRead(),
            vertexCountArray: SplatManager.getVertexCountArray(),
            regionIdArray: SplatManager.getRegionIdArray(),
            rowLengthArray: SplatManager.getRowLengthArray(),
        });
    }
    setTimeout(async () => {
        // console.log(`%c Done loading all splat regions. vertex count: ${vertexCount} last vertex count: ${lastVertexCount}.`, 'color: red');
        console.log(`%c Loading last region...`, 'color: red');
        let newRegion = new SplatManager.SplatRegion(initialFilePath[splatRegionCount - 1], byteLengths[splatRegionCount - 1], splatRegionCount - 1);
        await newRegion.load();

        worker.postMessage({
            doneLoading: true,
            buffer: splatData.buffer,
            vertexCount: SplatManager.getTotalVertexRead(),
            vertexCountArray: SplatManager.getVertexCountArray(),
            regionIdArray: SplatManager.getRegionIdArray(),
            rowLengthArray: SplatManager.getRowLengthArray(),
        });
    }, 2000);
}

// The comma key can be used to toggle the splat rendering visibility after it's been loaded at least once
window.addEventListener("keydown", e => {
    if (e.key === ',') {
        if (!gsInitialized) {
            return; // must be initialized using UI button before comma key can be used
        }
        gsContainer.classList.toggle('hidden');
        gsActive = !gsContainer.classList.contains('hidden');
        if(gsActive)
        {
            realityEditor.gui.threejsScene.enableExternalSceneRendering(true);
            realityEditor.spatialCursor.gsToggleActive(true);
            callbacks.onSplatShown.forEach(cb => {
                cb();
            });
        }
        else
        {
            realityEditor.gui.threejsScene.disableExternalSceneRendering(true);
            realityEditor.spatialCursor.gsToggleActive(false);
            callbacks.onSplatHidden.forEach(cb => {
                cb();
            });
        }
    }
});

function showSplatRenderer(filePath, options = { broadcastToOthers: false }) {
    if (realityEditor.device.environment.isWithinToolboxApp()) {
        return; // for now, disable the gaussian splat renderer within our AR app
    }
    if (!gsInitialized) {
        gsInitialized = true;
        gsContainer = document.querySelector('#gsContainer');
        main(filePath).catch((err) => {
            document.getElementById("gsSpinner").style.display = "none";
            // document.getElementById("gsMessage").innerText = err.toString();
            console.error(err);
        });
    }
    gsContainer.classList.remove('hidden');
    gsActive = true;
    realityEditor.spatialCursor.gsToggleActive(true);
    SplatManager.showSplatRegions();
    // tell the mainThreejsScene to hide the mesh model
    realityEditor.gui.threejsScene.enableExternalSceneRendering(options.broadcastToOthers);
}

function hideSplatRenderer(options = { broadcastToOthers: false }) {
    if (realityEditor.device.environment.isWithinToolboxApp()) {
        return; // for now, disable the gaussian splat renderer within our AR app
    }
    if (!gsContainer) return;
    gsContainer.classList.add('hidden');
    gsActive = false;
    realityEditor.spatialCursor.gsToggleActive(false);
    SplatManager.hideSplatRegions();
    // tell the mainThreejsScene to show the mesh model
    realityEditor.gui.threejsScene.disableExternalSceneRendering(options.broadcastToOthers);
}

function getGL() { return gl; }
function getProgram() { return program; }
function getWorker() { return worker; }
function getSplatData() { return splatData; }
function getVertexCount() { return vertexCount; }
function getLastVertexCount() { return lastVertexCount; }
function setLastVertexCount(count) { lastVertexCount = count; }
function toggleGSRaycast(flag) {
    isGSRaycasting = flag;
}
function toggleForceSort() {
    // after zooming,
    // 1. after zooming, force resort splats. This is needed after zooming out, b/c otherwise camera direction won't change, won't trigger auto resort, user will be looking at previously sorted splats, but previously hidden splats should be displayed again
    // 2. after resort, then force toggle gs raycast to update spatial cursor position. This is needed when zooming in, b/c otherwise even the splats close to camera are hidden by shader, spatial cursor position is not updated, and the camera cannot zoom past a position in front of 
    if (!realityEditor.spatialCursor.isGSActive()) return;
    worker.postMessage({ forceSort: true });
}

let callbacks = {
    onSplatShown: [],
    onSplatHidden: []
}

export default {
    getGL,
    getProgram,
    getWorker,
    getSplatData,
    getVertexCount,
    getLastVertexCount, setLastVertexCount,
    toggleForceSort,
    toggleGSRaycast,
    hideSplatRenderer,
    showSplatRenderer,
    onSplatShown(callback) {
        callbacks.onSplatShown.push(callback);
    },
    onSplatHidden(callback) {
        callbacks.onSplatHidden.push(callback);
    },
    showGSSettingsPanel() {
        gsSettingsPanel.domElement.style.display = 'flex';
    },
    hideGSSettingsPanel() {
        gsSettingsPanel.domElement.style.display = 'none';
    },
}
