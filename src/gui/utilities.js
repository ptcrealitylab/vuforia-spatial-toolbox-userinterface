/**
 *
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * @fileOverview realityEditor.gui.utilities.js
 * Contains utility functions related to the onscreen graphics, such as line calculations and image preloading.
 */

createNameSpace("realityEditor.gui.utilities");

/**
 * Checks if the line (x11,y11) -> (x12,y12) intersects with the line (x21,y21) -> (x22,y22)
 * @param {number} x11
 * @param {number} y11
 * @param {number} x12
 * @param {number} y12
 * @param {number} x21
 * @param {number} y21
 * @param {number} x22
 * @param {number} y22
 * @param {number} w - width of canvas
 * @param {number} h - height of canvas (ignores intersections outside of canvas
 * @return {boolean}
 */
realityEditor.gui.utilities.checkLineCross = function (x11, y11, x12, y12, x21, y21, x22, y22, w, h) {
	var l1 = this.lineEq(x11, y11, x12, y12),
		l2 = this.lineEq(x21, y21, x22, y22);

	var interX = this.calculateX(l1, l2); //calculate the intersection X value
	if (interX > w || interX < 0) {
		return false; //false if intersection of lines is output of canvas
	}
	var interY = this.calculateY(l1, interX);
	// cout("interX, interY",interX, interY);

	if (!interY || !interX) {
		return false;
	}
	if (interY > h || interY < 0) {
		return false; //false if intersection of lines is output of canvas
	}
	//  cout("point on line --- checking on segment now");
	return (this.checkBetween(x11, x12, interX) && this.checkBetween(y11, y12, interY)
	&& this.checkBetween(x21, x22, interX) && this.checkBetween(y21, y22, interY));
};

/**
 * function for calculating the line equation given the endpoints of a line.
 * returns [m, b], where this corresponds to y = mx + b
 * y = [(y1-y2)/(x1-x2), -(y1-y2)/(x1-x2)*x1 + y1]
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @return {Array.<number>} - length 2 array. first entry is m (slope), seconds is b (y-intercept)
 */
realityEditor.gui.utilities.lineEq = function (x1, y1, x2, y2) {
	var m = this.slopeCalc(x1, y1, x2, y2);
	// if(m == 'vertical'){
	//     return ['vertical', 'vertical'];
	// }
	return [m, -1 * m * x1 + y1];

};

/**
 * Calculates the slope of the line defined by the provided endpoints (x1,y1) -> (x2,y2)
 * slope has to be multiplied by -1 because the y-axis value increases we we go down
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @return {number}
 */
realityEditor.gui.utilities.slopeCalc = function (x1, y1, x2, y2) {
	if ((x1 - x2) === 0) {
		return 9999; //handle cases when slope is infinity
	}
	return (y1 - y2) / (x1 - x2);
};

/**
 * calculate the intersection x value given two line segment
 * @param {Array.<number>} seg1 - [slope of line 1, y-intercept of line 1]
 * @param {Array.<number>} seg2 - [slope of line 2, y-intercept of line 2]
 * @return {number} - the x value of their intersection
 */
realityEditor.gui.utilities.calculateX = function (seg1, seg2) {
	return (seg2[1] - seg1[1]) / (seg1[0] - seg2[0]);
};

/**
 * calculate y given x and the line equation 
 * @param {Array.<number>} seg1 - [slope of line 1, y-intercept of line 1]
 * @param {number} x
 * @return {number} - returns (y = mx + b)
 */
realityEditor.gui.utilities.calculateY = function (seg1, x) {
	return seg1[0] * x + seg1[1];
};

/**
 * Given two end points of the segment and some other point p,
 * return true if p is between the two segment points.
 * (utility that helps with e.g. checking if two lines cross)
 * @param {number} e1
 * @param {number} e2
 * @param {number} p
 * @return {boolean}
 */
realityEditor.gui.utilities.checkBetween = function (e1, e2, p) {
	var marg2 = 2;

	if (e1 - marg2 <= p && p <= e2 + marg2) {
		return true;
	}
	if (e2 - marg2 <= p && p <= e1 + marg2) {
		return true;
	}

	return false;
};

/**
 * Utility that pre-loads a number of image resources so that they can be more quickly added when they are needed
 * First parameter is the array to hold the pre-loaded references
 * Any number of additional string parameters can be passed in as file paths that should be loaded
 * @param {Array.<string>} array
 */
realityEditor.gui.utilities.preload = function(array) {
    var args = realityEditor.gui.utilities.preload.arguments;
    for (var i = 0; i < arguments.length - 1; i++) {
        array[i] = new Image();
        array[i].src = args[i + 1];
    }

    cout("preload");
};

/**
 * Very simply polyfill for webkitConvertPointFromPageToNode - but only works for divs with no 3D transformation
 * @param {HTMLElement} elt - the div whose coordinate space you are converting into
 * @param {number} pageX
 * @param {number} pageY
 * @return {{x: number, y: number}} matching coordinates within the elt's frame of reference
 */
realityEditor.gui.utilities.convertPointFromPageToNode = function(elt, pageX, pageY) {
    var eltRect = elt.getClientRects()[0];
    var nodeX = (pageX - eltRect.left) / eltRect.width * parseFloat(elt.style.width);
    var nodeY = (pageY - eltRect.top) / eltRect.height * parseFloat(elt.style.height);
    return {
        x: nodeX,
        y: nodeY
    }
};

/**
 * Tries to retrieve the target size from the given object.
 * Defaults to 0.3 if any errors or can't find it, to avoid divide-by-zero errors
 * @param {string} objectKey
 * @return {{width: number, height: number}}
 */
realityEditor.gui.utilities.getTargetSize = function(objectKey) {
    let targetSize = {
        width: 0.3,
        height: 0.3
    };

    let object = realityEditor.getObject(objectKey);
    if (object) {
        if (typeof object.targetSize !== 'undefined') {
            if (typeof object.targetSize.width !== 'undefined') {
                targetSize.width = object.targetSize.width;
            } else if (typeof object.targetSize.x !== 'undefined') {
                targetSize.width = object.targetSize.x;
            }
            if (typeof object.targetSize.height !== 'undefined') {
                targetSize.height = object.targetSize.height;
            } else if (typeof object.targetSize.y !== 'undefined') {
                targetSize.height = object.targetSize.y;
            }
        }
    }

    return targetSize;
};

/**
 * Smoothly animates a set of translations using the first-last-invert-play
 * technique
 * @param {Array<Element>} elements
 * @param {Function} translationFn - called to apply translation
 * @param {object} options - used for Web Animations API
 */
realityEditor.gui.utilities.animateTranslations = function(elements, translationFn, options) {
    const starts = elements.map(element => element.getBoundingClientRect());
    translationFn();
    const ends = elements.map(element => element.getBoundingClientRect());

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const start = starts[i];
        const end = ends[i];

        const dx = start.left - end.left;
        const dy = start.top - end.top;

        element.animate([
            {
                transform: `translate(${dx}px, ${dy}px)`,
            }, {
                transform: `none`,
            }
        ], Object.assign({
            fill: 'both', // Transform should persist afterwards and be applied before
        }, options));
    }
};
