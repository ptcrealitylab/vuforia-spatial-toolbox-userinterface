createNameSpace("realityEditor.gui.dropdown");

(function(exports) {

    function Dropdown(id, text, css, isCollapsed, onSelectionChanged) {
        this.id = id;
        this.text = text;
        this.originalText = text;
        this.css = css;

        this.dom = null;
        this.textDiv = null;
        this.selectables = [];
        this.isCollapsed = !!isCollapsed;

        this.selected = null;
        this.onSelectionChanged = onSelectionChanged;
    }

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

        this.setText(this.text);

        selectableDom.addEventListener('click', function(event) {

            if (this.selected && this.selected.element) {
                // remove style from previously selected dom
                this.selected.element.classList.remove('dropdownSelected');

                // if clicked the currently selected element again, deselect it
                if (this.selected.element === selectableDom) {
                    this.selected = null;
                    this.setText(this.originalText);
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

            this.setText('Connected to ' + selectableDom.innerHTML, true);
            this.collapse();

            if (this.onSelectionChanged) {
                this.onSelectionChanged(this.selected);
            }

        }.bind(this));

        this.dom.appendChild(selectableDom);
    };

    Dropdown.prototype.setText = function(newText, hideSelectableCount) {
        this.text = newText;
        this.textDiv.innerHTML = newText;
        if (!hideSelectableCount) {
            this.textDiv.innerHTML += ' (' + this.selectables.length + ')';
        }
    };

    Dropdown.prototype.collapse = function() {
        this.isCollapsed = true;
        this.selectables.forEach(function(element) {
            setTimeout(function() {
                element.classList.remove('dropdownExpanded');
                element.classList.add('dropdownCollapsed');
            }, (((this.selectables.length-1) - element.dataset.index) * 50));
        }.bind(this));
        this.dom.classList.add('containerCollapsed');
    };

    Dropdown.prototype.expand = function() {
        this.isCollapsed = false;
        this.selectables.forEach(function(element) {
            setTimeout(function() {
                element.classList.remove('dropdownCollapsed');
                element.classList.add('dropdownExpanded');
            }, (element.dataset.index * 50));
        });
        this.dom.classList.remove('containerCollapsed');
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
