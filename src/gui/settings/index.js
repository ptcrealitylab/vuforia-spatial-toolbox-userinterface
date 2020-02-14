createNameSpace("realityEditor.gui.settings");

realityEditor.gui.settings.setSettings = function (id, state) {
    if (!document.getElementById(id)) return;

    if (id === "externalText") {
        if (state !== "") {
            document.getElementById(id).value = state;
        }
        return;
    }
    if (id === "zoneText") {
        if (state !== "") {
            document.getElementById(id).value = state;
        }
        return;
    }

    if (id === "discoveryText") {

        var buttonState = document.getElementById('discoveryButton');

        if (state !== "") {
            document.getElementById(id).value = state;
            buttonState.innerText = "Deactivate";
            buttonState.className = "btn btn-negative pull-right";
            this.states.discoveryActive = true;
        } else {
            buttonState.innerText = "Activate";
            buttonState.className = "btn btn-positive pull-right";
            this.states.discoveryActive = false;
        }

        if (realityEditor.gui.settings.states.discoveryActive) {
            buttonState.innerText = "Deactivate";
            buttonState.className = "btn btn-negative pull-right";
        } else {
            buttonState.innerText = "Activate";
            buttonState.className = "btn btn-positive pull-right";
        }

        return;
    }
    
    if (id === "lockText") {
        //if (state !== "") {
        //    document.getElementById(id).value = state; // TODO: do we need this?
        //}
        return;
    }

    if (id) {
        if (state) {

            document.getElementById(id).classList.add('active'); // TODO: doesn't really need this change, revert to previous?
            
            //document.getElementById(id).className = "toggle active";
        } else {

            document.getElementById(id).classList.remove('active');

            //document.getElementById(id).className = "toggle";
        }
    }
    
    if (id === "lockingToggle") {
        this.updateLockUI();
        //document.getElementById("lockText").disabled = document.getElementById(id).classList.contains('active');  //e.detail.isActive;
    }
    
    //    if (!state) {
    //        document.getElementById(id).firstElementChild.style.transform = "translate3d(0px, 0px, 0px);";
    //    }
    //    //    document.getElementById("lockText").disabled = state;
    //    //    console.log("change text disabled " + document.getElementById("lockText").disabled);
    //}
};

realityEditor.gui.settings.updateLockUI = function() {
    document.getElementById("lockText").disabled = document.getElementById('lockingToggle').classList.contains('active');  //e.detail.isActive;
};

realityEditor.gui.settings.newURLTextLoad = function () {
    this.states.externalState = document.getElementById('externalText').value; //encodeURIComponent(document.getElementById('externalText').value);
};

realityEditor.gui.settings.newZoneTextLoad = function () {
    this.states.zoneState = document.getElementById('zoneText').value; //encodeURIComponent(document.getElementById('externalText').value);
};

realityEditor.gui.settings.newDiscoveryTextLoad = function () {
    this.states.discoveryState = document.getElementById('discoveryText').value; //encodeURIComponent(document.getElementById('discoveryText').value);
    this.states.discoveryActive = false;

    var buttonState = document.getElementById('discoveryButton');
        buttonState.innerText = "Activate";
        buttonState.className = "btn btn-positive pull-right";
};

realityEditor.gui.settings.appFunctionCall = function(functionName, messageBody) {
    parent.postMessage(JSON.stringify({
        settings: {
            functionName: functionName,
            messageBody: messageBody
        }
    }), "*");
};

realityEditor.gui.settings.setDiscoveryText = function(discoveryText) {
    parent.postMessage(JSON.stringify({
        settings: {
            setDiscoveryText: discoveryText
        }
    }), "*");
};

realityEditor.gui.settings.reloadUI = function () {
    // if (this.states.externalState !== "" && this.states.externalState !== "http") {
        console.log("loadNewUI: " + this.states.externalState);
        this.appFunctionCall('setStorage', {storageID: 'SETUP:EXTERNAL', message: JSON.stringify(this.states.externalState)}, null);
        setTimeout(function() {
            this.appFunctionCall("loadNewUI", {reloadURL: this.states.externalState});
        }.bind(this), 100);
    // }
};

realityEditor.gui.settings.discovery = function () {
    if (!this.states.discoveryActive) {
        if (this.states.discoveryState !== "" && this.states.discoveryState !== "http") {
            console.log("setDiscovery" + this.states.discoveryState);
            this.appFunctionCall("setDiscovery", {discoveryURL: this.states.discoveryState});
            this.states.discoveryActive = true;
            this.setDiscoveryText(this.states.discoveryState);
            this.appFunctionCall('setStorage', {storageID: 'SETUP:DISCOVERY', message: JSON.stringify(this.states.discoveryState)}, null);
        }
    } else {
        console.log("removeDiscovery");
        this.appFunctionCall("removeDiscovery", null);
        this.states.discoveryActive = false;
        this.states.discoveryState = "";
        document.getElementById("discoveryText").value = this.states.discoveryState;
        this.appFunctionCall('setStorage', {storageID: 'SETUP:DISCOVERY', message: JSON.stringify(this.states.discoveryState)}, null);
    }

    var buttonState = document.getElementById('discoveryButton');

    if (this.states.discoveryActive) {
        buttonState.innerText = "Deactivate";
        buttonState.className = "btn btn-negative pull-right";
    } else {
        buttonState.innerText = "Activate";
        buttonState.className = "btn btn-positive pull-right";
    }

};

realityEditor.gui.settings.discoveryState = function () {
    return this.states.discoveryState;
};



realityEditor.gui.settings.newLockTextLoad = function () {
    this.states.lockPassword = encodeURIComponent(document.getElementById('lockText').value);
    console.log("lockPassword = " + this.states.lockPassword);
};

document.addEventListener('input',
        function (e) {
    
            var msg = {};
            msg.settings = {};
            msg.settings.setSettings = {};
            if (e.target.id === "zoneText") {
                realityEditor.gui.settings.states.zoneText = encodeURIComponent(document.getElementById(e.target.id).value);
                msg.settings.setSettings[e.target.id] = realityEditor.gui.settings.states.zoneText;
                console.log(msg);
                parent.postMessage(JSON.stringify(msg), "*");
            }
        }
    );

realityEditor.gui.settings.loadSettingsPost = function () {
    console.log('settings/index loaded');
    
    //  Get all the Setting states.
    parent.postMessage(JSON.stringify({
        settings: {
            getSettings: true,
            getMainDynamicSettings: true // ask for which settings should be displayed on the main settings page
        }
    }), "*");

    window.addEventListener("message", function (e) {

        var msg = JSON.parse(e.data);

        if (typeof msg.getSettings !== 'undefined') {
            onGetSettings(msg);
        }

        if (typeof msg.getMainDynamicSettings !== 'undefined') {
            onGetMainDynamicSettings(msg);
        }

    }.bind(realityEditor.gui.settings));
    
    var onGetSettings = function(msg) {
        console.log('settings/index.js getSettings', msg.getSettings);

        for (let key in msg.getSettings) {
            this.states[key] = msg.getSettings[key];
            this.setSettings(key, this.states[key]);
        }

        if (typeof realityEditor.gui.settings.logo !== "undefined" && this.states.settingsButton && !this.states.animationFrameRequested) {
            this.states.animationFrameRequested = true;
            if (realityEditor.gui.settings.logo && typeof(realityEditor.gui.settings.logo.step) === 'function') {
                window.requestAnimationFrame(realityEditor.gui.settings.logo.step);
            }
        }

        if (!this.states.settingsButton) {
            this.states.animationFrameRequested = false;
        }

        if (typeof this.callObjects !== "undefined" && this.states.settingsButton && !this.states.setInt) {
            this.states.setInt = true;
            this.objectInterval = setInterval(this.callObjects, 1000);
        }

        if (!this.states.settingsButton) {
            this.states.setInt = false;
            if (typeof this.objectInterval !== "undefined") {
                clearInterval(this.objectInterval);
            }
        }
    }.bind(realityEditor.gui.settings);

    var onGetMainDynamicSettings = function(msg) {
        console.log('settings/index.js getMainDynamicSettings', msg.getMainDynamicSettings);
        var container = document.querySelector('.content').querySelector('.table-view');
        if (!container) {
            console.warn('cant find container to create settings');
            return;
        }

        for (let key in msg.getMainDynamicSettings) {

            var settingInfo = msg.getMainDynamicSettings[key];
            console.log(key, settingInfo);

            // add HTML element for this toggle if it doesn't exist already
            var existingElement = container.querySelector('#' + key);

            if (existingElement) {
                console.log('found element for ' + key);
            } else {
                console.log('need to create element for ' + key);

                let newElement = document.createElement('li');
                newElement.classList.add('table-view-cell');

                let icon = document.createElement('img');
                icon.classList.add('media-object', 'pull-left', 'settingsIcon');
                icon.src = settingInfo.iconSrc; //'../../../svg/object.svg';
                newElement.appendChild(icon);

                let name = document.createElement('span');
                name.innerText = settingInfo.title;
                newElement.appendChild(name);

                let description = document.createElement('small');
                description.innerText = settingInfo.description;
                description.className = 'description';
                newElement.appendChild(description);

                let toggle = document.createElement('div');
                toggle.classList.add('toggle');
                toggle.id = key;
                newElement.appendChild(toggle);

                let toggleHandle = document.createElement('div');
                toggleHandle.classList.add('toggle-handle');
                toggle.appendChild(toggleHandle);

                container.appendChild(newElement);
            }
        }

        
    }.bind(realityEditor.gui.settings);

    document.addEventListener('toggle',
        function (e) {
            var msg = {};
            msg.settings = {};
            msg.settings.setSettings = {};
            msg.settings.setSettings[e.target.id] = e.detail.isActive;
            if (e.target.id === "lockingToggle") {
                
                msg.settings.setSettings['lockPassword'] = realityEditor.gui.settings.states.lockPassword;
                realityEditor.gui.settings.updateLockUI();
            }
            parent.postMessage(JSON.stringify(msg), "*");
        }
    );

};

window.onload = realityEditor.gui.settings.loadSettingsPost;
realityEditor.gui.settings.loadSettingsPost();
