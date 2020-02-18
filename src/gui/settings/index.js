createNameSpace("realityEditor.gui.settings");

// TODO: import this from common source as settings.js gets it instead of redefining
const InterfaceType = Object.freeze({
    TOGGLE: 'TOGGLE',
    TOGGLE_WITH_TEXT: 'TOGGLE_WITH_TEXT',
    TOGGLE_WITH_FROZEN_TEXT: 'TOGGLE_WITH_FROZEN_TEXT'
});

realityEditor.gui.settings.setSettings = function (id, state) {
    if (!document.getElementById(id)) return;

    // updates the toggle switch to display the current value
    if (id) {
        if (state) {
            document.getElementById(id).classList.add('active');
        } else {
            document.getElementById(id).classList.remove('active');
        }
        
        // update associated text field if needed (for TOGGLE_WITH_FROZEN_TEXT)
        let textfield = document.getElementById(id).parentElement.querySelector('.settingTextField');
        if (textfield && textfield.classList.contains('frozen')) {
            textfield.disabled = document.getElementById(id).classList.contains('active');
        }
    }
};

realityEditor.gui.settings.loadSettingsPost = function () {
    console.log('settings/index loaded');

    let settingsRequest = {
        getSettings: true // ask for the current values of all settings variables
    };

    // this is a temporary fix to check if this script is being executed on the main settings vs the developer settings
    if (document.querySelector('.content').id === 'mainSettings') {
        settingsRequest.getMainDynamicSettings = true; // ask for which settings should be displayed on the main settings page
    
    } else if (document.querySelector('.content').id === 'developSettings') {
        settingsRequest.getDevelopDynamicSettings = true; // ask for which settings should be displayed on the main settings page
    }
    
    //  Get all the Setting states.
    parent.postMessage(JSON.stringify({
        settings: settingsRequest
    }), "*");

    window.addEventListener("message", function (e) {

        var msg = JSON.parse(e.data);

        if (typeof msg.getSettings !== 'undefined') {
            onGetSettings(msg);
        }

        if (typeof msg.getMainDynamicSettings !== 'undefined') {
            if (document.querySelector('.content').id === 'mainSettings') {
                onGetMainDynamicSettings(msg.getMainDynamicSettings);
            }
        }

        if (typeof msg.getDevelopDynamicSettings !== 'undefined') {
            console.log('iframe got dynamic DEVELOP settings', msg);
            if (document.querySelector('.content').id === 'developSettings') {
                onGetMainDynamicSettings(msg.getDevelopDynamicSettings); // TODO: see if I can re-use this function or need to create another
            }
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

    var onGetMainDynamicSettings = function(dynamicSettings) {
        console.log('settings/index.js getMainDynamicSettings', dynamicSettings);
        var container = document.querySelector('.content').querySelector('.table-view');
        if (!container) {
            console.warn('cant find container to create settings');
            return;
        }

        for (let key in dynamicSettings) {

            var settingInfo = dynamicSettings[key];
            console.log(key, settingInfo);

            // add HTML element for this toggle if it doesn't exist already
            var existingElement = container.querySelector('#' + key);

            if (existingElement) {
                console.log('found element for ' + key);
            } else {
                console.log('need to create element for ' + key);

                let newElement = document.createElement('li');
                newElement.classList.add('table-view-cell');
                newElement.style.position = 'relative';

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

                if (settingInfo.settingType === InterfaceType.TOGGLE_WITH_TEXT ||
                    settingInfo.settingType === InterfaceType.TOGGLE_WITH_FROZEN_TEXT) {

                    let textField = document.createElement('input');
                    textField.id = key + 'Text';
                    textField.classList.add('pull-left', 'settingTextField');
                    if (settingInfo.settingType === InterfaceType.TOGGLE_WITH_FROZEN_TEXT) {
                        textField.classList.add('frozen');
                    }
                    textField.type = 'text';
                    if (settingInfo.associatedText) {
                        textField.value = settingInfo.associatedText.value;
                        textField.placeholder = settingInfo.associatedText.placeholderText || '';
                    }
                    
                    textField.addEventListener('input', function() {
                        uploadSettingText(this.id);
                    });

                    newElement.appendChild(textField);
                }

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

    document.addEventListener('toggle', function (e) {
        uploadSettingsForToggle(e.target.id, e.detail.isActive);
        
        let textfield = e.target.parentElement.querySelector('.settingTextField');
        // check if it has an attached text field, and if so, update if it needs frozen/unfrozen
        if (textfield && textfield.classList.contains('frozen')) {
            textfield.disabled = e.target.classList.contains('active');
        }
    });

    function uploadSettingsForToggle(elementId, isActive) {
        var msg = {};
        msg.settings = {};
        msg.settings.setSettings = {};
        msg.settings.setSettings[elementId] = isActive;

        let element = document.getElementById(elementId);
        // check if it has an attached text field, and if so, send that text too
        if (element.parentElement.querySelector('.settingTextField')) {
            msg.settings.setSettings[elementId + 'Text'] = element.parentElement.querySelector('.settingTextField').value;
        }
        parent.postMessage(JSON.stringify(msg), "*");
    }

    function uploadSettingText(textElementId) {
        console.log('upload setting text');
        var msg = {};
        msg.settings = {};
        msg.settings.setSettings = {};
        msg.settings.setSettings[textElementId] = document.getElementById(textElementId).value;
        parent.postMessage(JSON.stringify(msg), "*");
    }

};

window.onload = realityEditor.gui.settings.loadSettingsPost;
realityEditor.gui.settings.loadSettingsPost();
