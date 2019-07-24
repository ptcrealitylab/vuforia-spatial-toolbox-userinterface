createNameSpace('realityEditor.gui.moveabilityCorners');

(function(exports) {

    function wrapDivWithCorners(div, padding, exclusive, additionalStyling, sizeAdjustment, borderWidth, extraLength) {
        if (!sizeAdjustment) { sizeAdjustment = 0; }
        if (exclusive) {
            var cornersFound = div.querySelector('.corners');
            if (cornersFound) {
                console.warn('not adding corners because it already has some');
                return;
            }
        }
        var rect = div.getClientRects()[0];
        var divWidth = rect ? rect.width : 100;
        var divHeight = rect ? rect.height : 100;
        var corners = createMoveabilityCorners(div.id+'corners', divWidth + sizeAdjustment, divHeight + sizeAdjustment, padding, borderWidth, extraLength);
        corners.style.left = (-padding) + 'px';
        corners.style.top = (-padding) + 'px';

        for (var propertyName in additionalStyling) {
            corners.style[propertyName] = additionalStyling[propertyName];
        }

        div.appendChild(corners);
        return corners;
    }
    
    function removeCornersFromDiv(div) {
        var cornersFound = div.querySelector('.corners');
        if (cornersFound) {
            div.removeChild(cornersFound);
        }
    }
    
    function wrapDivInOutline(div, padding, exclusive, additionalStyling, sizeAdjustment, borderWidth) {
        if (!sizeAdjustment) { sizeAdjustment = 0; }
        if (!borderWidth) { borderWidth = 2; }
        if (exclusive) {
            var outlineFound = div.querySelector('.outline');
            if (outlineFound) {
                console.warn('not adding outline because it already has some');
                return;
            }
        }
        var rect = div.getClientRects()[0];
        var outline = createDiv(div.id+'outline', 'outline', null, div);
        outline.style.border = borderWidth + 'px solid cyan';
        outline.style.left = (-padding) + 'px';
        outline.style.top = (-padding) + 'px';
        outline.style.width = (rect.width+padding*2 - (2*borderWidth) + sizeAdjustment) + 'px';
        outline.style.height = (rect.height+padding*2 - (2*borderWidth) + sizeAdjustment) + 'px';

        for (var propertyName in additionalStyling) {
            outline.style[propertyName] = additionalStyling[propertyName];
        }
        
        return outline;
    }
    
    function removeOutlineFromDiv(div) {
        var outlineFound = div.querySelector('.outline');
        if (outlineFound) {
            div.removeChild(outlineFound);
        }
    }

    function createMoveabilityCorners(id, width, height, padding, borderWidth, extraLength) {
        var corners = createDiv(id, 'corners', null, null);
        var topLeft = createDiv(id+'topleft', 'cornersTop cornersLeft', null, corners);
        var topRight = createDiv(id+'topleft', 'cornersTop cornersRight', null, corners);
        var bottomRight = createDiv(id+'topleft', 'cornersBottom cornersRight', null, corners);
        var bottomLeft = createDiv(id+'topleft', 'cornersBottom cornersLeft', null, corners);
        if (borderWidth) {
            topLeft.style.borderTop = borderWidth + 'px solid cyan';
            topLeft.style.borderLeft = borderWidth + 'px solid cyan';

            topRight.style.borderTop = borderWidth + 'px solid cyan';
            topRight.style.borderRight = borderWidth + 'px solid cyan';

            bottomRight.style.borderBottom = borderWidth + 'px solid cyan';
            bottomRight.style.borderRight = borderWidth + 'px solid cyan';

            bottomLeft.style.borderBottom = borderWidth + 'px solid cyan';
            bottomLeft.style.borderLeft = borderWidth + 'px solid cyan';
        }
        if (extraLength) {
            [topLeft, topRight, bottomRight, bottomLeft].forEach(function(corner) {
                corner.style.width = (parseInt(corner.style.width) || 0) + extraLength + 'px';
                corner.style.height = (parseInt(corner.style.height) || 0) + extraLength + 'px';
            });
        }
        corners.style.width = (width-20+padding*2) + 'px';
        corners.style.height = (height-20+padding*2) + 'px';
        return corners;
    }

    /**
     * Shortcut for creating a div with certain style and contents, and possibly adding to a parent element
     * Any parameter can be omitted (pass in null) to ignore those effects
     * @param {string|null} id
     * @param {string|Array.<string>|null} classList
     * @param {string|null} innerHTML
     * @param {HTMLElement|null} parentToAddTo
     * @return {HTMLDivElement}
     */
    function createDiv(id, classList, innerHTML, parentToAddTo) {
        var div = document.createElement('div');
        if (id) {
            div.id = id;
        }
        if (classList) {
            if (typeof classList === 'string') {
                div.className = classList;
            } else if (typeof classList === 'object') {
                classList.forEach(function(className) {
                    div.classList.add(className);
                });
            }
        }
        if (innerHTML) {
            div.innerHTML = innerHTML;
        }
        if (parentToAddTo) {
            parentToAddTo.appendChild(div);
        }
        return div;
    }
    
    exports.createMoveabilityCorners = createMoveabilityCorners;
    exports.wrapDivWithCorners = wrapDivWithCorners;
    exports.removeCornersFromDiv = removeCornersFromDiv;
    exports.wrapDivInOutline = wrapDivInOutline;
    exports.removeOutlineFromDiv = removeOutlineFromDiv;
    
})(realityEditor.gui.moveabilityCorners);
