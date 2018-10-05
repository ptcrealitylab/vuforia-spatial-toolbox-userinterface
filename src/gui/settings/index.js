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


        var buttonState = document.getElementById('discoveryButton');

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

realityEditor.gui.settings.reloadUI = function () {
    if (this.states.externalState !== "" && this.states.externalState !== "http") {
        console.log("loadNewUI: " + this.states.externalState);
        this.appFunctionCall("loadNewUI", {reloadURL: this.states.externalState});
    }
};

realityEditor.gui.settings.discovery = function () {
    if (!this.states.discoveryActive) {
        if (this.states.discoveryState !== "" && this.states.discoveryState !== "http") {
            console.log("setDiscovery" + this.states.discoveryState);
            this.appFunctionCall("setDiscovery", {discoveryURL: this.states.discoveryState});
            this.states.discoveryActive = true;
        }
    } else {
        console.log("removeDiscovery");
        this.appFunctionCall("removeDiscovery", null);
        this.states.discoveryActive = false;
        this.states.discoveryState = "";
        document.getElementById("discoveryText").value = this.states.discoveryState;
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
    parent.postMessage(
        //  Gett all the Setting states.
        JSON.stringify({
            settings: {
                getSettings: true
            }
        })
        // this needs to contain the final interface source
        , "*");

    window.addEventListener("message", function (e) {

        var msg = JSON.parse(e.data);

        if (msg.getSettings) {

            this.states.extendedTracking = msg.getSettings.extendedTracking;
            this.states.editingMode = msg.getSettings.editingMode;
            this.states.clearSkyState = msg.getSettings.clearSkyState;
            this.states.instantState = msg.getSettings.instantState;
            this.states.speechState = msg.getSettings.speechState;
            this.states.videoRecordingEnabled = msg.getSettings.videoRecordingEnabled;
            this.states.matrixBroadcastEnabled = msg.getSettings.matrixBroadcastEnabled;
            this.states.hololensModeEnabled = msg.getSettings.hololensModeEnabled;
            this.states.externalState = msg.getSettings.externalState;
            this.states.discoveryState = msg.getSettings.discoveryState;
            this.states.settingsButton = msg.getSettings.settingsButton;
            this.states.lockingMode = msg.getSettings.lockingMode;
            this.states.lockPassword = msg.getSettings.lockPassword;
            this.states.zoneState = msg.getSettings.zoneState;
            this.states.zoneText = msg.getSettings.zoneText;

            this.states.realityState = msg.getSettings.realityState;

            this.setSettings("extendedTracking", this.states.extendedTracking);
            this.setSettings("instantState", this.states.instantState);
            this.setSettings("speechState", this.states.speechState);
            this.setSettings("videoRecordingEnabled", this.states.videoRecordingEnabled);
            this.setSettings("matrixBroadcastEnabled", this.states.matrixBroadcastEnabled)
            this.setSettings("hololensModeEnabled", this.states.hololensModeEnabled);
            this.setSettings("editingMode", this.states.editingMode);
            this.setSettings("clearSkyState", this.states.clearSkyState);
            this.setSettings("externalText", this.states.externalState);
            this.setSettings("discoveryText", this.states.discoveryState);
            this.setSettings("lockingToggle", this.states.lockingMode);
            this.setSettings("lockText", this.states.lockPassword);
            this.setSettings("zoneState", this.states.zoneState);
            this.setSettings("zoneText", this.states.zoneText);
            
            //if (!this.states.lockingMode) {
            //    document.getElementById('lockingToggle').firstChild.style.transform = "translate3d(0px, 0px, 0px);";
            //}

            this.setSettings("realityState", this.states.realityState);

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
        }
    }.bind(realityEditor.gui.settings));

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
