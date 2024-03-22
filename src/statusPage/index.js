import * as StatusCheck from './StatusCheck.js'

createNameSpace("realityEditor.statusPage");

(function(exports) {
    exports.toggle = () => StatusCheck.toggleStatusPage();
}(realityEditor.statusPage));
