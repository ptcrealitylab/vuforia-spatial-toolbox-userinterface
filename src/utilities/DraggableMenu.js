export class DraggableMenu {
    constructor(id, title, config) {
        this.root = document.createElement('div');
        this.root.id = id;
        this.root.classList.add('draggable-menu');

        this.root.innerHTML = `
            <div class="draggable-menu-header">
                <div class="draggable-menu-title">${title}</div>
                <div class="draggable-menu-header-icons">
                    <div class="draggable-menu-fullscreen-icon draggable-menu-header-icon">⇱</div>  
                    <div class="draggable-menu-minimize-icon draggable-menu-header-icon">_</div>                
                </div>
            </div>
            <div class="draggable-menu-body"></div>
        `;

        this.setUpEventListeners();
        this.enableDrag();
        this.body = this.root.querySelector('.draggable-menu-body');
        this.buildMenuBody(config);
        this.callbacks = {
            show: [],
            hide: [],
            minimize: [],
            maximize: []
        };
        this.isFullscreen = false;
        this.maximized = true;
        this.showing = true;
    }

    /**
     * Call this after setting custom menu contents to ensure menu is sized properly
     */
    initialize() {
        document.body.appendChild(this.root);
        this.setInitialPosition();
        this.minimize();
        this.hide(); // Initially hide until explicitly shown later
    }

    setInitialPosition() {
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        this.root.style.top = `calc(${navbarHeight}px + 2em)`;
        this.root.style.left = `calc(${window.innerWidth - this.root.offsetWidth}px - 2em)`;
        this.snapToFitScreen();
    }

    setUpEventListeners() {
        // Prevent camera control from stealing attempts to scroll the container
        this.root.addEventListener('wheel', (event) => {
            event.stopPropagation();
        });
        
        this.root.querySelector('.draggable-menu-header').addEventListener('mousedown', event => {
            let mouseDownX = event.clientX;
            let mouseDownY = event.clientY;
            const mouseUpListener = event => {
                const mouseUpX = event.clientX;
                const mouseUpY = event.clientY;
                if (mouseDownX === mouseUpX && mouseDownY === mouseUpY) {
                    this.toggleMinimized();
                }
                this.root.querySelector('.draggable-menu-header').removeEventListener('mouseup', mouseUpListener);
            };
            this.root.querySelector('.draggable-menu-header').addEventListener('mouseup', mouseUpListener);
        });
        
        this.root.querySelector('.draggable-menu-fullscreen-icon').addEventListener('mousedown', event => {
            this.toggleFullscreen();
            event.stopPropagation();
        });
    }

    enableDrag() {
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLeft = 0;
        let dragStartTop = 0;

        this.root.querySelector('.draggable-menu-header').addEventListener('mousedown', (event) => {
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragStartLeft = this.root.offsetLeft;
            dragStartTop = this.root.offsetTop;

            const mouseMoveListener = (event) => {
                this.root.style.left = `${dragStartLeft + event.clientX - dragStartX}px`;
                this.root.style.top = `${dragStartTop + event.clientY - dragStartY}px`;
                this.snapToFitScreen();
            };
            const mouseUpListener = () => {
                document.removeEventListener('mousemove', mouseMoveListener);
                document.removeEventListener('mouseup', mouseUpListener);
            };
            document.addEventListener('mousemove', mouseMoveListener);
            document.addEventListener('mouseup', mouseUpListener);
        });
    }

    isOutOfBounds() {
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        if (this.root.offsetTop < navbarHeight) {
            return true;
        }
        if (this.root.offsetLeft < 0) {
            return true;
        }
        if (this.root.offsetLeft + this.root.offsetWidth > window.innerWidth) {
            return true;
        }
        if (this.root.offsetTop + this.root.querySelector('.draggable-menu-header').offsetHeight > window.innerHeight) {
            return true;
        }
        return false;
    }

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
        if (this.root.offsetTop + this.root.querySelector('.draggable-menu-header').offsetHeight > window.innerHeight) {
            this.root.style.top = `${window.innerHeight - this.root.querySelector('.draggable-menu-header').offsetHeight}px`;
        }
    }
    
    on(event, cb) {
        if (!this.callbacks[event]) {
            return;
        }
        this.callbacks[event].push(cb);
    }
    
    removeCallback(event, cb) {
        if (!this.callbacks[event]) {
            return;
        }
        this.callbacks[event].splice(this.callbacks[event].indexOf(cb), 1);
    }

    show() {
        this.showing = true;
        this.root.classList.remove('hidden');
        if (this.isOutOfBounds()) {
            this.setInitialPosition();
        }
        this.callbacks.show.forEach(cb => cb());
    }

    hide() {
        this.showing = false;
        this.root.classList.add('hidden');
        this.callbacks.hide.forEach(cb => cb());
    }

    toggle() {
        if (this.root.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    minimize() {
        this.maximized = false;
        const previousWidth = this.root.offsetWidth;
        this.root.classList.add('draggable-menu-minimized');
        this.root.style.width = `${previousWidth}px`;
        this.root.querySelector('.draggable-menu-minimize-icon').innerText = '+';
        this.root.querySelector('.draggable-menu-fullscreen-icon').classList.add('hidden');
        this.callbacks.minimize.forEach(cb => cb());
    }

    maximize() {
        this.maximized = true;
        this.root.classList.remove('draggable-menu-minimized');
        this.root.style.width = '';
        this.root.querySelector('.draggable-menu-minimize-icon').innerText = '_';
        this.root.querySelector('.draggable-menu-fullscreen-icon').classList.remove('hidden');
        this.callbacks.maximize.forEach(cb => cb());
    }

    toggleMinimized() {
        if (this.root.classList.contains('draggable-menu-minimized')) {
            this.maximize();
        } else {
            this.minimize();
        }
    }
    
    enterFullscreen() {
        this.root.style.zIndex = '3000';
        const navbar = document.querySelector('.desktopMenuBar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const headerHeight = this.root.querySelector('.draggable-menu-header').offsetHeight;
        this.body.style.maxHeight = `calc(100vh - ${navbarHeight + headerHeight}px)`;
        this.root.style.maxWidth = `${window.innerWidth}px`;
        this.root.querySelector('.draggable-menu-fullscreen-icon').innerText = '⇲';
        this.isFullscreen = true;
        this.snapToFitScreen();
    }
    
    exitFullscreen() {
        this.root.style.zIndex = '';
        this.body.style.maxHeight = '';
        this.root.style.maxWidth = '';
        this.root.querySelector('.draggable-menu-fullscreen-icon').innerText = '⇱';
        this.isFullscreen = false;
        this.snapToFitScreen();
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    buildMenuBody(config) {
        if (config === undefined) {
            return;
        }

        const body = this.root.querySelector('.draggable-menu-body');
        
        if (config.sections === undefined) {
            return;
        } 
        config.sections.forEach(section => {
            const sectionElement = document.createElement('div');
            sectionElement.classList.add('draggable-menu-section');
            sectionElement.id = section.id === undefined ? '' : section.id;
            sectionElement.innerHTML = `
                <div class="draggable-menu-section-title">${section.title}</div>
                <div class="draggable-menu-section-body"></div>
            `;

            if (section.items === undefined) {
                return;
            }
            section.items.forEach(item => {
                let itemHtml = '';
                switch (item.type) {
                    case 'select':
                        itemHtml = `
                            <div class="draggable-menu-section-row">
                                <div class="draggable-menu-section-row-label">${item.label}</div>
                                <select class="draggable-menu-section-row-select" id="${item.id}">
                                    ${item.options.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
                                </select>
                            </div>
                        `;
                        break;
                    case 'checkbox':
                        itemHtml = `
                            <div class="draggable-menu-section-row draggable-menu-section-row-checkbox-container">
                                <div class="draggable-menu-section-row-label">${item.label}</div>
                                <input type="checkbox" class="draggable-menu-section-row-checkbox" id="${item.id}">
                            </div>
                        `;
                        break;
                    case 'button':
                        itemHtml = `
                            <div class="draggable-menu-section-row">
                                <div class="draggable-menu-section-row-button" id="${item.id}">${item.label}</div>
                            </div>
                        `;
                        break;
                    default:
                        break;
                }
                sectionElement.querySelector('.draggable-menu-section-body').insertAdjacentHTML('beforeend', itemHtml);
            });

            body.appendChild(sectionElement);
        });
    }

    getElement() {
        return this.root;
    }
}
