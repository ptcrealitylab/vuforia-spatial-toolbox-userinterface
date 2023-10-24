export class MapShaderSettingsUI {
    constructor() {

        this.root = document.createElement('div');
        this.root.id = 'hpa-settings';

        // Styled via css/humanPoseAnalyzerSettingsUi.css
        this.root.innerHTML = `
            <div class="hpa-settings-header">
                <div class="hpa-settings-title">Map Settings</div>
                <div class="hpa-settings-header-icon">_</div>
            </div>
            <div class="hpa-settings-body">
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">Map Settings</div>
                    <div class="hpa-settings-section-body">
                        <div class="hpa-settings-section-row">
                            <div class="hpa-settings-section-row-label">Select Maps</div>
                            <select class="hpa-settings-section-row-select" id="measure-app-select-map-shader">
                                <option value="color">Colored Map</option>
                                <option value="height">Height Map</option>
                                <option value="steepness">Steepness Map</option>
                            </select>
                        </div>
                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">
                            <div class="hpa-settings-section-row-label">Highlight walkable area</div>
                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="measure-app-highlight-walkable-area">
                        </div>
                    </div>
                </div>
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">Steepness Range</div>
                    <div class="hpa-settings-section-body">
                        <div class='hpa-settings-section-row range-slider'>
                            <input type="range" min="0" max="90" step="1" id="sliderMinRange" value="0">
                            <input type="range" min="0" max="90" step="1" id="sliderMaxRange" value="25">
                            <input type="number" min="0" max="90" step="1" id="sliderMinNumber" value="0">
                            <input type="number" min="0" max="90" step="1" id="sliderMaxNumber" value="25">
                        </div>
<!--                        <div class="hpa-settings-section-row">-->
<!--                            <div class="hpa-settings-section-row-button" id="hpa-settings-reset-history">Update Paths</div>-->
<!--                        </div>-->
                    </div>
                </div>
            </div>
        `;

        this.addDoubleSlider();
        this.setUpEventListeners();
        this.enableDrag();
        document.body.appendChild(this.root);
        this.setInitialPosition();
        this.hide(); // It is important to set the menu's position before hiding it, otherwise its width will be calculated as 0
    }

    /**
     * Sets the initial position of the settings UI to be in the top right corner of the screen, under the navbar and menu button
     */
    setInitialPosition() {
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        // const sessionMenuContainer = document.querySelector('#sessionMenuContainer');
        // const sessionMenuLeft = sessionMenuContainer ? sessionMenuContainer.offsetLeft : 0;
        // if (sessionMenuContainer) { // Avoid the top right menu
        //     this.root.style.top = `calc(${navbarHeight}px + 2em)`;
        //     this.root.style.left = `calc(${sessionMenuLeft - this.root.offsetWidth}px - 6em)`;
        //     return;
        // }
        this.root.style.top = `calc(${navbarHeight}px + 2em)`;
        this.root.style.left = `calc(${window.innerWidth - this.root.offsetWidth}px - 2em)`;
        this.snapToFitScreen();
    }

    addDoubleSlider() {
        const sliderMinRange = this.root.querySelector('#sliderMinRange');
        const sliderMinNumber = this.root.querySelector('#sliderMinNumber');
        const sliderMaxRange = this.root.querySelector('#sliderMaxRange');
        const sliderMaxNumber = this.root.querySelector('#sliderMaxNumber');

        let minAngle = sliderMinRange.value;
        let maxAngle = sliderMaxRange.value;

        sliderMinRange.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (val > maxAngle) {
                sliderMaxRange.value = val;
                sliderMaxNumber.value = val;
                maxAngle = val;
            }
            sliderMinNumber.value = val;
            minAngle = val;
            realityEditor.gui.threejsScene.updateGradientMapThreshold(minAngle, maxAngle);
            realityEditor.app.pathfinding.updateSteepnessRange(minAngle, maxAngle);
        });

        sliderMinNumber.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (val > maxAngle) {
                sliderMaxRange.value = val;
                sliderMaxNumber.value = val;
                maxAngle = val;
            }
            sliderMinRange.value = val;
            minAngle = val;
            realityEditor.gui.threejsScene.updateGradientMapThreshold(minAngle, maxAngle);
            realityEditor.app.pathfinding.updateSteepnessRange(minAngle, maxAngle);
        });

        sliderMaxRange.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (val < minAngle) {
                sliderMinRange.value = val;
                sliderMinNumber.value = val;
                minAngle = val;
            }
            sliderMaxNumber.value = val;
            maxAngle = val;
            realityEditor.gui.threejsScene.updateGradientMapThreshold(minAngle, maxAngle);
            realityEditor.app.pathfinding.updateSteepnessRange(minAngle, maxAngle);
        });

        sliderMaxNumber.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (val < minAngle) {
                sliderMinRange.value = val;
                sliderMinNumber.value = val;
                minAngle = val;
            }
            sliderMaxRange.value = val;
            maxAngle = val;
            realityEditor.gui.threejsScene.updateGradientMapThreshold(minAngle, maxAngle);
            realityEditor.app.pathfinding.updateSteepnessRange(minAngle, maxAngle);
        });
    }

    setUpEventListeners() {
        // todo Steve: add event listeners for turning / toggling the UI on and off
        realityEditor.network.addPostMessageHandler('measureAppTurnMapUI', (boolean) => {
            if (boolean) this.show();
            else this.hide();
        });
        realityEditor.network.addPostMessageHandler('measureAppToggleMapUI', () => {
            this.toggle();
        });
        // Toggle menu minimization when clicking on the header, but only if not dragging
        this.root.querySelector('.hpa-settings-header').addEventListener('mousedown', event => {
            event.stopPropagation();
            let mouseDownX = event.clientX;
            let mouseDownY = event.clientY;
            const mouseUpListener = event => {
                const mouseUpX = event.clientX;
                const mouseUpY = event.clientY;
                if (mouseDownX === mouseUpX && mouseDownY === mouseUpY) {
                    this.toggleMinimized();
                }
                this.root.querySelector('.hpa-settings-header').removeEventListener('mouseup', mouseUpListener);
            };
            this.root.querySelector('.hpa-settings-header').addEventListener('mouseup', mouseUpListener);
        });

        this.root.querySelector('#measure-app-select-map-shader').addEventListener('change', (event) => {
            realityEditor.gui.threejsScene.changeMeasureMapType(event.target.value);
        });
        
        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted.bind(this)); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted.bind(this)); // deleted using server

        this.root.querySelector('#measure-app-highlight-walkable-area').addEventListener('change', (event) => {
            realityEditor.gui.threejsScene.highlightWalkableArea(event.target.checked);
        });

        // Add listeners to aid with clicking checkboxes
        this.root.querySelectorAll('.hpa-settings-section-row-checkbox').forEach((checkbox) => {
            const checkboxContainer = checkbox.parentElement;
            checkboxContainer.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });
            checkbox.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent double-counting clicks
            });
        });

        // Add click listeners to selects to stop propagation to rest of app
        this.root.querySelectorAll('.hpa-settings-section-row-select').forEach((select) => {
            select.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });
    }

    onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }
        if (realityEditor.envelopeManager.getFrameTypeFromKey(event.objectKey, event.frameKey) === 'spatialMeasure') {
            this.root.querySelector('#measure-app-select-map-shader').value = 'color';
            realityEditor.gui.threejsScene.changeMeasureMapType('color');
            this.hide();

            let iframe = document.getElementById('iframe' + event.frameKey);
            iframe.contentWindow.postMessage(JSON.stringify({
                isAppClosed: true,
            }), '*');
        }
    }

    enableDrag() {
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLeft = 0;
        let dragStartTop = 0;

        this.root.querySelector('.hpa-settings-header').addEventListener('mousedown', (event) => {
            event.stopPropagation();
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragStartLeft = this.root.offsetLeft;
            dragStartTop = this.root.offsetTop;

            const mouseMoveListener = (event) => {
                event.stopPropagation();
                this.root.style.left = `${dragStartLeft + event.clientX - dragStartX}px`;
                this.root.style.top = `${dragStartTop + event.clientY - dragStartY}px`;
                this.snapToFitScreen();
            }
            const mouseUpListener = () => {
                document.removeEventListener('mousemove', mouseMoveListener);
                document.removeEventListener('mouseup', mouseUpListener);
            }
            document.addEventListener('mousemove', mouseMoveListener);
            document.addEventListener('mouseup', mouseUpListener);
        });
    }

    /**
     * If the settings menu is out of bounds, snap it back into the screen
     */
    snapToFitScreen() {
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        if (this.root.offsetTop < navbarHeight) {
            this.root.style.top = `${navbarHeight}px`;
        }
        if (this.root.offsetLeft < 0) {
            this.root.style.left = '0px';
        }
        if (this.root.offsetLeft + this.root.offsetWidth > window.innerWidth) {
            this.root.style.left = `${window.innerWidth - this.root.offsetWidth}px`;
        }
        // Keep the header visible on the screen off the bottom
        if (this.root.offsetTop + this.root.querySelector('.hpa-settings-header').offsetHeight > window.innerHeight) {
            this.root.style.top = `${window.innerHeight - this.root.querySelector('.hpa-settings-header').offsetHeight}px`;
        }
    }

    show() {
        this.root.classList.remove('hidden');
    }

    hide() {
        this.root.classList.add('hidden');
    }

    toggle() {
        if (this.root.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    minimize() {
        if (this.root.classList.contains('hidden')) {
            return;
        }
        const previousWidth = this.root.offsetWidth;
        this.root.classList.add('hpa-settings-minimized');
        this.root.style.width = `${previousWidth}px`;
        this.root.querySelector('.hpa-settings-header-icon').innerText = '+';
    }

    maximize() {
        if (this.root.classList.contains('hidden')) {
            return;
        }
        this.root.classList.remove('hpa-settings-minimized');
        this.root.querySelector('.hpa-settings-header-icon').innerText = '_';
    }

    toggleMinimized() {
        if (this.root.classList.contains('hpa-settings-minimized')) {
            this.maximize();
        } else {
            this.minimize();
        }
    }
}
