export class ProfilerSettingsUI {
    constructor() {
        this.stats = null;
        this.isHidden = true;

        this.root = document.createElement('div');
        this.root.id = 'profiler-settings';

        // Styled via css/humanPoseAnalyzerSettingsUi.css
        this.root.innerHTML = `
            <div class="hpa-settings-header">
                <div class="hpa-settings-title">Profiler</div>
                <div class="hpa-settings-header-icon">_</div>
            </div>
            <div class="hpa-settings-body">
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">FPS</div>
                    <div class="hpa-settings-section-body">
                        <div class="hpa-settings-section-row-tall">
                            <div class="hpa-settings-section-row-label">FPS</div>
                            <div class="hpa-settings-section-row-select profiler-stats-container"></div>
                        </div>
                    </div>
                </div>
                <div class="hpa-settings-section">
                    <div class="hpa-settings-section-title">Detailed Logging</div>
                    <div class="hpa-settings-section-body">
                        <div class="hpa-settings-section-row hpa-settings-section-row-checkbox-container">
                            <div class="hpa-settings-section-row-label">Enable Metrics</div>
                            <input type="checkbox" class="hpa-settings-section-row-checkbox" id="profiler-settings-enable-metrics">
                        </div>
                    </div>
                </div>
                <div class="hpa-settings-section profiler-log-container">
                </div>
            </div>
        `;

        this.addStats();
        this.setUpEventListeners();
        this.enableDrag();
        document.body.appendChild(this.root);
        let container = document.querySelector('.profiler-log-container');
        container.style.display = 'none';
        this.setInitialPosition();
        this.hide(); // It is important to set the menu's position before hiding it, otherwise its width will be calculated as 0
    }
    
    update() {
        if (this.isHidden) return; // cancels the update loop while hidden

        try {
            if (this.stats) {
                this.stats.update();
            }
        } catch (e) {
            console.warn(e);
        }
        
        requestAnimationFrame(this.update.bind(this));
    }

    addLabel(id, text, options = {}) {
        let container = document.querySelector('.profiler-log-container');
        let label = document.createElement('div');
        label.id = this.getDomIdForLabelId(id);
        label.classList.add('debugContainerLabel');
        label.innerHTML = text;

        // Append at the top
        if (options.pinToTop && container.firstChild) {
            container.insertBefore(label, container.firstChild);
        } else {
            container.appendChild(label);
        }
    }
    updateLabelText(id, text) {
        let labelDomId = this.getDomIdForLabelId(id);
        let existingLabel = document.getElementById(labelDomId);
        if (existingLabel) {
            existingLabel.innerHTML = text;
        }
    }
    addOrUpdateLabel(id, text, options) {
        let labelDomId = this.getDomIdForLabelId(id);
        let existingLabel = document.getElementById(labelDomId);
        if (existingLabel) {
            this.updateLabelText(id, text);
        } else {
            this.addLabel(id, text, options);
        }
    }
    removeLabel(id) {
        let labelDomId = this.getDomIdForLabelId(id);
        let existingLabel = document.getElementById(labelDomId);
        if (existingLabel && existingLabel.parentElement) {
            existingLabel.parentElement.removeChild(existingLabel);
        }
    }
    getDomIdForLabelId(id) {
        return `ProfilerSettings_Label_${id}`;
    }

    /**
     * Sets the initial position of the settings UI to be in the top right corner of the screen, under the navbar and menu button
     */
    setInitialPosition() {
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        this.root.style.top = `calc(${navbarHeight}px + 2em + 5em)`;
        this.root.style.left = '2em';
        this.snapToFitScreen();
    }
    
    addStats() {
        this.stats = new Stats();
        let statsContainer = this.root.querySelector('.profiler-stats-container');
        statsContainer.appendChild(this.stats.dom);
    }

    setUpEventListeners() {
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

        this.root.querySelector('#profiler-settings-enable-metrics').addEventListener('change', (event) => {
            this.updateMetrics(event.target.checked);
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
        this.isHidden = false;
        this.update(); // start up the update loop again
    }

    hide() {
        this.root.classList.add('hidden');
        this.isHidden = true;
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

    setEnableMetrics(enabled) {
        this.root.querySelector('#profiler-settings-enable-metrics').checked = enabled;
        this.updateMetrics(enabled);
    }
    
    updateMetrics(enabled) {
        let container = document.querySelector('.profiler-log-container');
        if (enabled) {
            realityEditor.device.profiling.activate();
            if (container) container.style.display = '';
        } else {
            realityEditor.device.profiling.deactivate();
            if (container) container.style.display = 'none';
        }
    }
}
