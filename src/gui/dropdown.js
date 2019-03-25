createNameSpace("realityEditor.gui.dropdown");

(function(exports) {

    function Dropdown(id, textStates, css, parent, isCollapsed, onSelectionChanged, onExpandedChanged) {
        this.id = id;
        this.text = '';
        // this.originalText = text;
        this.css = css;

        this.dom = null;
        this.textDiv = null;
        this.selectables = [];
        this.isCollapsed = !!isCollapsed;

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

        this.textDiv.addEventListener('click', function(event) {
            this.toggleExpansion();
        }.bind(this));

        if (this.isCollapsed) {
            this.collapse();
        } else {
            this.expand();
        }

        return this.dom;
    };

    Dropdown.prototype.addDomToParent = function(parentElement) {
        this.createDom();
        parentElement.appendChild(this.dom);
    };

    Dropdown.prototype.addSelectable = function(id, text) {
        var selectableDom = document.createElement('div');
        selectableDom.classList.add('dropdownSelectable');
        selectableDom.id = id;
        selectableDom.innerText = text;

        // var height = 40;
        // selectableDom.style.height = height + 'px';
        // selectableDom.style.lineHeight = selectableDom.style.height;
        var index = this.selectables.length;
        selectableDom.dataset.index = index;

        // selectableDom.style.left = this.dom.style.left;
        // selectableDom.style.top = (index * (height)) + 'px';

        if (this.isCollapsed) {
            selectableDom.classList.add('dropdownCollapsed');
        } else {
            selectableDom.classList.add('dropdownExpanded');
        }

        this.selectables.push(selectableDom);
        
        if (this.state === this.states.expandedEmpty || this.state === this.states.expandedOptions) {
            this.updateState(this.states.expandedOptions);
        }

        // this.setText(this.text);

        selectableDom.addEventListener('click', function(event) {

            if (this.isAnimating) { return; }
            
            if (this.selected && this.selected.element) {
                // remove style from previously selected dom
                this.selected.element.classList.remove('dropdownSelected');

                // if clicked the currently selected element again, deselect it
                if (this.selected.element === selectableDom) {
                    this.selected = null;
                    // this.setText(this.originalText);
                    
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

    // Dropdown.prototype.setOriginalText = function(newOriginalText) {
    //     this.originalText = newOriginalText;
    //     this.setText(this.originalText);
    // };

    Dropdown.prototype.setText = function(newText, hideSelectableCount) {
        this.text = newText;
        this.textDiv.innerHTML = newText;
        if (!hideSelectableCount) {
            this.textDiv.innerHTML += ' (' + this.selectables.length + ')';
        }
    };

    Dropdown.prototype.collapse = function() {
        if (this.isAnimating) { return; }

        this.isAnimating = true;
        this.isCollapsed = true;
        this.selectables.forEach(function(element) {
            setTimeout(function() {
                element.classList.remove('dropdownExpanded');
                element.classList.add('dropdownCollapsed');
            }, (((this.selectables.length-1) - element.dataset.index) * 50));
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

    Dropdown.prototype.getExpansionSpeed = function() {
        return 200 / (this.selectables.length+1);
    };

    Dropdown.prototype.expand = function() {
        if (this.isAnimating) { return; }

        this.isAnimating = true;
        this.isCollapsed = false;
        this.selectables.forEach(function(element) {
            setTimeout(function() {
                element.classList.remove('dropdownCollapsed');
                element.classList.add('dropdownExpanded');
            }, (element.dataset.index * 50));
        });
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

    Dropdown.prototype.toggleExpansion = function() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    };
    
    exports.Dropdown = Dropdown;

})(realityEditor.gui.dropdown);
