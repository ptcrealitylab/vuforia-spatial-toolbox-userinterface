/**
 * @preserve
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

/**********************************************************************************************************************
 ******************************************** global namespace *******************************************************
 **********************************************************************************************************************/

var realityEditor = realityEditor || {
        app:{},
		device: {
		    security:{},
            utilities: {}
		},
		gui: {
			ar: {
				draw: {},
				positioning: {},
				lines: {},
				utilities: {}
			},
            crafting: {
                blockMenu: {},
                eventHandlers: {},
                eventHelper: {},
                grid: {},
                utilities: {}
            },
            memory: {},
            settings: {
                logo:{}
            },
            buttons: {},
            frames:{},
            instantConnect:{},
            menus:{},
            pocket: {},
            search:{},
            utilities: {},
            canvasCache: {},
            domCache: {},
            setup: {}
		},
        network: {
            utilities: {}
         }
	};

/**
 * @desc This function generates all required namespaces and initializes a namespace if not existing.
 * Additional it includes pointers to each subspace.
 *
 * Inspired by code examples from:
 * https://www.kenneth-truyers.net/2013/04/27/javascript-namespaces-and-modules/
 *
 * @param namespace string of the full namespace path
 * @return object that presents the actual used namespace
 **/
var createNameSpace = createNameSpace || function (namespace) {
		var splitNameSpace = namespace.split("."), object = this, object2;
		for (var i = 0; i < splitNameSpace.length; i++) {
			object = object[splitNameSpace[i]] = object[splitNameSpace[i]] || {};
			object2 = this;
			for (var e = 0; e < i; e++) {
				object2 = object2[splitNameSpace[e]];
				object[splitNameSpace[e]] = object[splitNameSpace[e]] || object2;
				object.cout = this.cout;
			}
		}
		return object;
	};
