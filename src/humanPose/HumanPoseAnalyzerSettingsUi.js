import {JOINTS} from "./utils.js";
import {setChildHumanPosesVisible} from "./draw.js"

export class HumanPoseAnalyzerSettingsUi {
    constructor(humanPoseAnalyzer) {
        this.humanPoseAnalyzer = humanPoseAnalyzer;
        
        this.root = document.createElement('div');
        this.root.id = 'hpa-settings';

        // Styled via css/humanPoseAnalyzerSettingsUi.css
        this.root.innerHTML = `
            <div class="hpa-settings-header">
                <div class="hpa-settings-title">Analytics Settings</div>
                <div class="hpa-settings-header-icon">_</div>
            </div>
            <div class="hpa-settings-body">
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">Lens Settings</div>
                    <div class="hpa-settings-section-body">
                        <div class="hpa-settings-section-row">
                            <div class="hpa-settings-section-row-label">Select Lens</div>
                            <select class="hpa-settings-section-row-select" id="hpa-settings-select-lens">
                                <option value="Sample Option">This should only display if something is broken with this.populateSelects()</option>
                            </select>
                        </div>
                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">
                            <div class="hpa-settings-section-row-label">View auxiliary poses</div>
                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="hpa-settings-toggle-child-human-poses">
                        </div>
                    </div>
                </div>
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">Live Settings</div>
                    <div class="hpa-settings-section-body">
<!--                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">-->
<!--                            <div class="hpa-settings-section-row-label">Toggle Poses</div>-->
<!--                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="hpa-settings-toggle-poses">-->
<!--                        </div>-->
                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">
                            <div class="hpa-settings-section-row-label">View Spaghetti Lines</div>
                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="hpa-settings-toggle-live-history-lines">
                        </div>
                        <div class="hpa-settings-section-row">
                            <div class="hpa-settings-section-row-button" id="hpa-settings-reset-history">Clear Live Data</div>
                        </div>
                    </div>
                </div>
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">Historical Settings</div>
                    <div class="hpa-settings-section-body">
<!--                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">-->
<!--                            <div class="hpa-settings-section-row-label">Toggle Poses</div>-->
<!--                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="hpa-settings-toggle-poses">-->
<!--                        </div>-->
                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">
                            <div class="hpa-settings-section-row-label">View Spaghetti Lines</div>
                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="hpa-settings-toggle-historical-history-lines">
                        </div>
                    </div>
                </div>
                <div class="hpa-settings-section" id="hpa-joint-settings">
                    <div class="hpa-settings-section-title">Joint Settings</div>
                    <div class="hpa-settings-section-body">
                        <div class="hpa-settings-section-row">
                            <div class="hpa-settings-section-row-label">Select Joint</div>
                            <select class="hpa-settings-section-row-select" id="hpa-settings-select-joint">
                                <option value="Sample Option">This should only display if something is broken with this.populateSelects()</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.populateSelects();
        this.setUpEventListeners();
        this.enableDrag();
        document.body.appendChild(this.root);
        this.setInitialPosition();
        this.root.querySelector('#hpa-joint-settings').remove(); // TODO: implement joint selection and remove this line
        this.hide(); // It is important to set the menu's position before hiding it, otherwise its width will be calculated as 0
    }

    /**
     * Sets the initial position of the settings UI to be in the top right corner of the screen, under the navbar and menu button
     */
    setInitialPosition() {
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const sessionMenuContainer = document.querySelector('#sessionMenuContainer');
        const sessionMenuLeft = sessionMenuContainer ? sessionMenuContainer.offsetLeft : 0; 
        if (sessionMenuContainer) { // Avoid the top right menu
            this.root.style.top = `calc(${navbarHeight}px + 2em)`;
            this.root.style.left = `calc(${sessionMenuLeft - this.root.offsetWidth}px - 6em)`;
            return;
        }
        this.root.style.top = `calc(${navbarHeight}px + 2em)`;
        this.root.style.left = `calc(${window.innerWidth - this.root.offsetWidth}px - 2em)`;
        this.snapToFitScreen();
    }
    
    populateSelects() {
        this.root.querySelector('#hpa-settings-select-lens').innerHTML = this.humanPoseAnalyzer.lenses.map((lens) => {
            return `<option value="${lens.name}">${lens.name}</option>`;
        }).join('');
        
        const jointNames = ['', ...Object.values(JOINTS)];
        this.root.querySelector('#hpa-settings-select-joint').innerHTML = jointNames.map((jointName) => {
            return `<option value="${jointName}">${jointName}</option>`;
        }).join('');
    }
    
    setUpEventListeners() {
        this.root.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
        });
        this.root.addEventListener('pointermove', (event) => {
            event.stopPropagation();
        });
        this.root.addEventListener('pointerup', (event) => {
            event.stopPropagation();
        });
        
        // Toggle menu minimization when clicking on the header, but only if not dragging
        this.root.querySelector('.hpa-settings-header').addEventListener('mousedown', event => {
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

        this.root.querySelector('#hpa-settings-toggle-live-history-lines').addEventListener('change', (event) => {
            this.humanPoseAnalyzer.setLiveHistoryLinesVisible(event.target.checked);
        });
        
        this.root.querySelector('#hpa-settings-toggle-child-human-poses').addEventListener('change', (event) => {
            setChildHumanPosesVisible(event.target.checked);
        });

        this.root.querySelector('#hpa-settings-toggle-historical-history-lines').addEventListener('change', (event) => {
            this.humanPoseAnalyzer.setHistoricalHistoryLinesVisible(event.target.checked);
        });
        
        this.root.querySelector('#hpa-settings-reset-history').addEventListener('mouseup', () => {
            this.humanPoseAnalyzer.resetLiveHistoryLines();
            this.humanPoseAnalyzer.resetLiveHistoryClones();
        });

        this.root.querySelector('#hpa-settings-select-lens').addEventListener('change', (event) => {
            this.humanPoseAnalyzer.setActiveLensByName(event.target.value);
        });
        
        this.root.querySelector('#hpa-settings-select-joint').addEventListener('change', (event) => {
            this.humanPoseAnalyzer.setActiveJointByName(event.target.value);
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
    
    enableDrag() {
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLeft = 0;
        let dragStartTop = 0;
        
        this.root.querySelector('.hpa-settings-header').addEventListener('mousedown', (event) => {
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragStartLeft = this.root.offsetLeft;
            dragStartTop = this.root.offsetTop;

            const mouseMoveListener = (event) => {
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
        const navbarHeight = document.querySelector('.desktopMenuBar').offsetHeight;
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

    setActiveLens(lens) {
        this.root.querySelector('#hpa-settings-select-lens').value = lens.name;
    }

    setLiveHistoryLinesVisible(historyLinesVisible) {
        this.root.querySelector('#hpa-settings-toggle-live-history-lines').checked = historyLinesVisible;
    }

    setChildHumanPosesVisible(visible) {
        this.root.querySelector('#hpa-settings-toggle-child-human-poses').checked = visible;
    }

    setHistoricalHistoryLinesVisible(historyLinesVisible) {
        this.root.querySelector('#hpa-settings-toggle-historical-history-lines').checked = historyLinesVisible;
    }

    setActiveJointByName(_jointName) {
        // this.root.querySelector('#hpa-settings-select-joint').value = jointName; // TODO: re-add once implemented
    }
}
