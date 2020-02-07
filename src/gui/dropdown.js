createNameSpace("realityEditor.gui.dropdown");

/**
 * @fileOverview realityEditor.gui.dropdown
 * This exports a class that can be used to create dropdown menus (e.g. the one used to select a Reality Zone)
 * The dropdown can be expanded or collapsed by clicking on the top div
 * "Selectables" (items in the dropdown list) can be added or removed, and clicking on one updates the current selection
 * A callback can be passed in the constructor to listen to changes in the dropdown selection and state.
 */

(function(exports) {

    /**
     * @typedef {Object} DropdownTextStates
     * @description Which text to show on the top-level UI when the dropdown is in each possible state
     * @property {string} collapsedUnselected - what to show when you haven't chosen anything yet, and it's minimized
     * @property {string} expandedEmpty - what to show when it's not minimized, but there are currently no options to choose from
     * @property {string} expandedOptions - what to show when it's not minimized and there are options to choose from
     * @property {string} selected - what to show when you've selected an option (it will minimize itself when this happens, too)
     *                               for this state, appends text from selected item: this.selectedText + this.selected.element.innerHTML
     */

    /**
     * @typedef {Readonly<{collapsedUnselected: number, expandedEmpty: number, expandedOptions: number, selected: number}>} DropdownState
     * @description enum used to keep track of current state of the drop down menu
     */

    /**
     * Constructor for a new drop down menu with all the state, logic, UI, and callbacks
     * @param {string} id - the div id
     * @param {DropdownTextStates} textStates - which text the div should display in each state
     * @param {Object} css - a JSON object with any additional styles to apply to the div (e.g. left, top, etc)
     * @param {HTMLElement} parent - the DOM element to add this to (e.g. document.body)
     * @param {boolean} isCollapsed - by default should it be collapsed (minimized - only show title) or expanded (show all items)
     * @param {function} onSelectionChanged - callback triggered when you select an item in the list
     *                                          includes argument: {index: index, element: selectableDom}
     * @param {function} onExpandedChanged - callback triggered when dropdown is expanded or collapsed
     *                                          includes boolean argument: isExpanded
     * @constructor
     */
    function Dropdown(id, textStates, css, parent, isCollapsed, onSelectionChanged, onExpandedChanged) {
        this.id = id;
        this.text = '';
        this.css = css;

        this.dom = null;
        this.textDiv = null;
        this.selectables = [];
        this.isCollapsed = isCollapsed;

        this.selected = null;
        
        this.onSelectionChanged = onSelectionChanged;
        this.onExpandedChanged = onExpandedChanged;
        
        this.isAnimating = false;
        
        this.states = Object.freeze({
            collapsedUnselected: 0,
            expandedEmpty: 1,
            expandedOptions: 2,
            selected: 3
        });
        this.setTextStates(textStates.collapsedUnselected, textStates.expandedEmpty, textStates.expandedOptions, textStates.selected);
        
        this.addDomToParent(parent);

        if (this.isCollapsed) {
            this.updateState(this.states.collapsedUnselected);
        } else {
            this.updateState(this.states.expandedEmpty);
        }
    }

    /**
     * Sets each of the text variables based on a field from a DropdownTextStates object
     * @param {string} collapsedUnselected
     * @param {string} expandedEmpty
     * @param {string} expandedOptions
     * @param {string} selected
     */
    Dropdown.prototype.setTextStates = function(collapsedUnselected, expandedEmpty, expandedOptions, selected) {
        this.collapsedUnselectedText = collapsedUnselected;
        this.expandedEmptyText = expandedEmpty;
        this.expandedOptionsText = expandedOptions;
        this.selectedText = selected;
    };

    /**
     * Updates the dropdown text based on the current state and the textStates set during the constructor.
     * When expanded, also includes the total number of items in the list in parentheses. 
     * @param {DropdownState} newState
     */
    Dropdown.prototype.updateState = function(newState) {
        this.state = newState;
        
        if (this.state === this.states.collapsedUnselected) {
            this.setText(this.collapsedUnselectedText, true);
        } else if (this.state === this.states.expandedEmpty) {
            this.setText(this.expandedEmptyText);
        } else if (this.state === this.states.expandedOptions) {
            this.setText(this.expandedOptionsText);
        } else if (this.state === this.states.selected) {
            this.setText(this.selectedText + this.selected.element.innerHTML, true);
        }
    };

    /**
     * Creates the divs for this menu, attaches click listeners, and renders it for the correct initial state
     * @return {HTMLElement|undefined}
     */
    Dropdown.prototype.createDom = function() {
        if (this.dom) return;

        this.dom = document.createElement('div');
        this.dom.id = this.id;
        this.dom.classList.add('dropdownContainer');
        this.dom.classList.add('containerCollapsed');

        this.textDiv = document.createElement('div');
        this.textDiv.classList.add('dropdownText');
        this.textDiv.innerHTML = this.text;
        this.dom.appendChild(this.textDiv);

        for (var propKey in this.css) {
            if (!this.css.hasOwnProperty(propKey)) continue;
            this.dom.style[propKey] = this.css[propKey];
        }

        this.textDiv.addEventListener('click', function() {
            this.toggleExpansion();
        }.bind(this));

        if (this.isCollapsed) {
            this.collapse();
        } else {
            this.expand();
        }

        return this.dom;
    };

    /**
     * Creates the DOM elements for the menu if needed, and adds them to the provided parent element
     * @param {HTMLElement} parentElement
     */
    Dropdown.prototype.addDomToParent = function(parentElement) {
        this.createDom();
        parentElement.appendChild(this.dom);
    };

    /**
     * Adds a new item to the dropdown menu list. Creates its DOM element and renders it in the list if needed.
     * @param {string} id - div id for the menu item
     * @param {string} text - human-readable text to display for the menu item
     */
    Dropdown.prototype.addSelectable = function(id, text) {
        var selectableDom = document.createElement('div');
        selectableDom.classList.add('dropdownSelectable');
        selectableDom.id = id;
        selectableDom.innerText = text;
        
        var index = this.selectables.length;
        selectableDom.dataset.index = index;

        if (this.isCollapsed) {
            selectableDom.classList.add('dropdownCollapsed');
        } else {
            selectableDom.classList.add('dropdownExpanded');
        }

        this.selectables.push(selectableDom);
        
        if (this.state === this.states.expandedEmpty || this.state === this.states.expandedOptions) {
            this.updateState(this.states.expandedOptions);
        }

        selectableDom.addEventListener('click', function() {

            if (this.isAnimating) { return; }
            
            if (this.selected && this.selected.element) {
                // remove style from previously selected dom
                this.selected.element.classList.remove('dropdownSelected');

                // if clicked the currently selected element again, deselect it
                if (this.selected.element === selectableDom) {
                    this.selected = null;
                    
                    this.updateState(this.states.expandedOptions);
                    
                    if (this.onSelectionChanged) {
                        this.onSelectionChanged(this.selected);
                    }
                    return;
                }
            }

            // select the new element and restyle it
            this.selected = {
                index: index,
                element: selectableDom
            };
            selectableDom.classList.add('dropdownSelected');

            // this.setText('Connected to ' + selectableDom.innerHTML, true);
            this.collapse();

            if (this.onSelectionChanged) {
                this.onSelectionChanged(this.selected);
            }

        }.bind(this));

        this.dom.appendChild(selectableDom);
    };

    /**
     * Sets the text of the top-level menu element.
     * Also includes the total number of items in parentheses unless "true" passed into last argument.
     * @param {string} newText
     * @param {boolean|undefined} hideSelectableCount
     */
    Dropdown.prototype.setText = function(newText, hideSelectableCount) {
        this.text = newText;
        this.textDiv.innerHTML = newText;
        if (!hideSelectableCount) {
            this.textDiv.innerHTML += ' (' + this.selectables.length + ')';
        }
    };

    /**
     * Minimize the menu so that it doesn't show the list of options, only the selected item
     * (or whatever text was set for the top-level element).
     * Animates the transition based on getExpansionSpeed(), and triggers any registered callbacks.
     */
    Dropdown.prototype.collapse = function() {
        if (this.isAnimating) { return; }

        this.isAnimating = true;
        this.isCollapsed = true;
        this.selectables.forEach(function(element) { // collapses from the bottom up, in an animated fashion
            setTimeout(function() {
                element.classList.remove('dropdownExpanded');
                element.classList.add('dropdownCollapsed');
            }, (((this.selectables.length-1) - element.dataset.index) * this.getExpansionSpeed()));
        }.bind(this));
        this.dom.classList.add('containerCollapsed');

        if (this.selected) {
            this.updateState(this.states.selected);
        } else {
            this.updateState(this.states.collapsedUnselected);
        }

        if (this.onExpandedChanged) {
            this.onExpandedChanged(!this.isCollapsed);
        }

        setTimeout(function() {
            this.isAnimating = false;
        }.bind(this), this.selectables.length * this.getExpansionSpeed());
    };

    /**
     * How many milliseconds to wait before expanding/collapsing the next item, once the previous item was collapsed.
     * The more items there are in total, the shorter the time in between each.
     * @return {number}
     */
    Dropdown.prototype.getExpansionSpeed = function() {
        return 200 / (this.selectables.length+1);
    };

    /**
     * Expands the menu to show the full list of items you can select (similar but opposite of this.collapse)
     */
    Dropdown.prototype.expand = function() {
        if (this.isAnimating) { return; }

        this.isAnimating = true;
        this.isCollapsed = false;
        this.selectables.forEach(function(element) { // expands from the top down, in an animated fashion
            setTimeout(function() {
                element.classList.remove('dropdownCollapsed');
                element.classList.add('dropdownExpanded');
            }, (element.dataset.index * this.getExpansionSpeed()));
        }.bind(this));
        this.dom.classList.remove('containerCollapsed');

        if (this.selected) {
            this.updateState(this.states.selected);
        } else if (this.selectables.length === 0) {
            this.updateState(this.states.expandedEmpty);
        } else {
            this.updateState(this.states.expandedOptions);
        }
        
        if (this.onExpandedChanged) {
            this.onExpandedChanged(!this.isCollapsed);
        }

        setTimeout(function() {
            this.isAnimating = false;
        }.bind(this), this.selectables.length * this.getExpansionSpeed());
    };

    /**
     * Collapses the menu if it's expanded, or expands it if it's collapsed
     */
    Dropdown.prototype.toggleExpansion = function() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    };
    
    Dropdown.prototype.resetSelection = function() {
        if (this.selected && this.selected.element) {
            // remove style from previously selected dom
            this.selected.element.classList.remove('dropdownSelected');

            // if clicked the currently selected element again, deselect it
            this.selected = null;

            this.updateState(this.states.expandedOptions);

            // if (this.onSelectionChanged) {
            //     this.onSelectionChanged(this.selected);
            // }
        }
    };
    
    exports.Dropdown = Dropdown;

})(realityEditor.gui.dropdown);
