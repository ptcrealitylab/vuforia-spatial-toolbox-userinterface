createNameSpace("realityEditor.network.search");

/**
 * @fileOverview realityEditor.network.frameContentAPI.js
 * Provides accesss to REST APIs to search the network for objects and tools satisfying certain conditions
 */

(function(exports) {

    /**
     * Public init method sets up module by registering callbacks when important events happen in other modules
     */
    function initService() {
        console.log('network.search initService');
    }
    
    // function searchFrames(ip, queryParams, callback) {
    //    
    //     // download the object data from its server
    //     let port = 8080;
    //     let baseUrl = 'http://' + ip + ':' + port + '/spatial/searchFrames' + stringifyQueryParams(queryParams);
    //    
    //     realityEditor.network.getData(null,  null, null, baseUrl, function (objectKey, frameKey, nodeKey, msg) {
    //         if (msg && msg.validAddresses) {
    //             console.log(msg);
    //             callback(msg.validAddresses);
    //         }
    //     });
    // }
    //
    // function stringifyQueryParams(queryParams) {
    //     if (!queryParams || Object.keys(queryParams).length === 0) {
    //         return '';
    //     }
    //    
    //     let result = '';
    //     Object.keys(queryParams).forEach(function(key, index) {
    //         let value = queryParams[key];
    //         result += index > 0 ? '&' : '?';
    //         result += key + '=' + value;
    //     });
    //    
    //     return result;
    // }
    
    function searchFrames(ip, port, queryParams, callback) {
        let search = new Search();
        for (let key in queryParams) {
            search.addQueryParam(key, queryParams[key]);
        }
        search.performAndForEachDownload(ip, port, function(results) {
            console.log(results);
            callback(results);
        });
    }
    
    class Search {
        constructor() {
            this.queryParams = {};
        }
        addQueryParam(key, value) {
            this.queryParams[key] = value;
        }
        // max distance needs to know where you are and which world you are localized within
        addMaxDistanceParam(distanceInMm, clientX, clientY, clientZ, worldId) {
            this.addQueryParam('maxDistance', distanceInMm);
            this.addQueryParam('clientX', clientX);
            this.addQueryParam('clientY', clientY);
            this.addQueryParam('clientZ', clientZ);
            this.addQueryParam('worldId', worldId);
        }
        addSrcParam(src) {
            this.addQueryParam('src', src);
        }
        addPublicDataParam(dataName, specifiedValue, operator) {
            // currently supported operators: 'includes', 'equals', 'beginsWith'
            let concatenated = 'publicData.' + dataName + '.' + operator;
            this.addQueryParam(concatenated, specifiedValue);
        }
        perform(ip, port, callback) {
            let baseUrl = 'http://' + ip + ':' + port + '/spatial/searchFrames' + this.stringifyQueryParams();

            realityEditor.network.getData(null,  null, null, baseUrl, function (_objectKey, _frameKey, _nodeKey, msg) {
                if (msg && msg.validAddresses) {
                    console.log(msg);
                    callback(msg.validAddresses);
                }
            });
        }
        performAndForEachDownload(ip, port, callback) {
            this.perform(ip, port, function(validAddresses) {
                validAddresses.forEach(function(address) {
                    let downloadUrl = 'http://' + ip + ':' + port + '/object/' + address.objectId + '/frame/' + address.frameId;
                    realityEditor.network.getData(null,  null, null, downloadUrl, function (_objectKey, _frameKey, _nodeKey, msg) {
                        if (msg) {
                            console.log(msg);
                            callback(msg);
                        }
                    });
                });
            });
        }
        stringifyQueryParams() {
            if (!this.queryParams || Object.keys(this.queryParams).length === 0) {
                return '';
            }

            let result = '';
            Object.keys(this.queryParams).forEach(function(key, index) {
                let value = this.queryParams[key];
                result += index > 0 ? '&' : '?';
                result += key + '=' + value;
            }.bind(this));

            return result;
        }
    }

    exports.initService = initService;
    exports.searchFrames = searchFrames;

})(realityEditor.network.search);
