createNameSpace("realityEditor.gui.settings");

// TODO: import this from common source as settings.js gets it instead of redefining
const InterfaceType = Object.freeze({
    TOGGLE: 'TOGGLE',
    TOGGLE_WITH_TEXT: 'TOGGLE_WITH_TEXT',
    TOGGLE_WITH_FROZEN_TEXT: 'TOGGLE_WITH_FROZEN_TEXT',
    URL: 'URL',
    SLIDER: 'SLIDER',
});

let sliderDown = null;
let mouseListenersAdded = false;

realityEditor.gui.settings.setSettings = function (id, state) {
    if (!document.getElementById(id)) return;

    // updates the toggle switch to display the current value
    if (id) {
        let isSlider = document.getElementById(id).classList.contains('slider');
        if (isSlider) {
            setSliderValue(id, state);
            return;
        }

        // if not slider, always has a toggle
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

function setSliderValue(id, value) {
    let slider = document.getElementById(id);
    let sliderHandle = slider.querySelector('.slider-handle');
    let sliderFill = slider.querySelector('.slider-fill');
    
    if (slider.getClientRects()[0]) { // avoids error if slider isn't on screen
        sliderHandle.style.left = value * parseFloat(slider.getClientRects()[0].width) + 'px';
        sliderFill.style.width = value * parseFloat(slider.getClientRects()[0].width) + 'px';
    }
}

realityEditor.gui.settings.loadSettingsPost = function () {
    console.log('settings/index loaded');

    let settingsRequest = {
        getSettings: true, // ask for the current values of all settings variables
        getEnvironmentVariables: true // ask for the current environment variables
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

        var msg = {};
        try {
            msg = JSON.parse(e.data);
        } catch (e) {
            // console.warn(e);
        }

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

        if (typeof msg.getEnvironmentVariables !== 'undefined') {
            console.log('iframe got environment variables');
            onGetEnvironmentVaribles(msg.getEnvironmentVariables);
        }

    }.bind(realityEditor.gui.settings));

    var onGetSettings = function (msg) {
        console.log('settings/index.js getSettings', msg.getSettings);

        for (let key in msg.getSettings) {
            this.states[key] = msg.getSettings[key];
            this.setSettings(key, this.states[key]);
        }

        if (typeof realityEditor.gui.settings.logo !== "undefined" && this.states.settingsButton && !this.states.animationFrameRequested) {
            this.states.animationFrameRequested = true;
            if (realityEditor.gui.settings.logo && typeof (realityEditor.gui.settings.logo.step) === 'function') {
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

    var onGetMainDynamicSettings = function (dynamicSettings) {
        console.log('settings/index.js getMainDynamicSettings', dynamicSettings);
        var container = document.querySelector('.content').querySelector('.table-view');
        if (!container) {
            console.warn('cant find container to create settings');
            return;
        }

        for (let key in dynamicSettings) {

            var settingInfo = dynamicSettings[key];

            // add HTML element for this toggle if it doesn't exist already
            var existingElement = container.querySelector('#' + key);

            if (existingElement) {
                // console.log('found element for ' + key);
                if (settingInfo.settingType === InterfaceType.URL) {
                    // TODO update
                }
            } else {
                // console.log('need to create element for ' + key);

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

                    textField.addEventListener('input', function () {
                        uploadSettingText(this.id);
                    });

                    newElement.appendChild(textField);
                }

                if (settingInfo.settingType === InterfaceType.URL) {
                    let urlView = document.createElement('button');
                    let iconShare = document.createElement('span');
                    iconShare.classList.add('icon', 'icon-share');
                    let urlText = document.createElement('span');
                    urlText.innerHTML = '&nbsp;Share';
                    urlView.appendChild(iconShare);
                    urlView.appendChild(urlText);

                    urlView.id = key;
                    urlText.id = key + 'Text';
                    urlView.classList.add('btn', 'btn-primary', 'pull-left', 'settingURLView');
                    if (settingInfo.associatedText) {
                        urlView.dataset.href = settingInfo.associatedText.value;
                    }

                    urlView.addEventListener('click', function() {
                        navigator.share({
                            title: 'Pop-up Metaverse Access',
                            text: 'Pop-up Metaverse Access',
                            url: urlView.dataset.href,
                        });
                    });

                    newElement.appendChild(urlView);
                }

                if (settingInfo.settingType === InterfaceType.TOGGLE ||
                    settingInfo.settingType === InterfaceType.TOGGLE_WITH_TEXT ||
                    settingInfo.settingType === InterfaceType.TOGGLE_WITH_FROZEN_TEXT) {

                    let toggle = document.createElement('div');
                    toggle.classList.add('toggle');
                    toggle.id = key;
                    newElement.appendChild(toggle);

                    let toggleHandle = document.createElement('div');
                    toggleHandle.classList.add('toggle-handle');
                    toggle.appendChild(toggleHandle);

                } else if (settingInfo.settingType === InterfaceType.SLIDER) {

                    let slider = document.createElement('div');
                    slider.classList.add('slider');
                    slider.id = key;
                    newElement.appendChild(slider);

                    // fills the part of the slider to the left of the handle with blue color
                    let sliderFill = document.createElement('div');
                    sliderFill.classList.add('slider-fill');
                    slider.appendChild(sliderFill);

                    let sliderHandle = document.createElement('div');
                    sliderHandle.classList.add('slider-handle');
                    slider.appendChild(sliderHandle);

                    sliderHandle.addEventListener('pointerdown', function (_event) {
                        sliderDown = slider;
                    });
                }

                container.appendChild(newElement);
            }
        }

        for (let key in dynamicSettings) {
            let settingInfo = dynamicSettings[key];
            this.setSettings(key, settingInfo.value);
        }

    }.bind(realityEditor.gui.settings);

    var onGetEnvironmentVaribles = function (environmentVariables) {
        console.log('environment variables:', environmentVariables);
        // allows iOS-styled UI toggles to be clicked using mouse
        if (environmentVariables.requiresMouseEvents && !mouseListenersAdded) {
            document.addEventListener('click', function (e) {
                if (e.target && e.target.classList.contains('toggle-handle')) {
                    console.log('clicked toggle handle for element: ' + e.target.parentElement.id);

                    let wasActive = e.target.parentElement.classList.contains('active');
                    if (wasActive) {
                        e.target.parentElement.classList.remove('active');
                    } else {
                        e.target.parentElement.classList.add('active');
                    }
                    onToggle(e.target.parentElement, !wasActive);
                }
            });
            mouseListenersAdded = true;
        }
    };

    document.addEventListener('toggle', function (e) {
        onToggle(e.target, e.detail.isActive);
    });

    function onToggle(target, newIsActive) {
        uploadSettingsForToggle(target.id, newIsActive);

        let textfield = target.parentElement.querySelector('.settingTextField');
        // check if it has an attached text field, and if so, update if it needs frozen/unfrozen
        if (textfield && textfield.classList.contains('frozen')) {
            textfield.disabled = target.classList.contains('active');
        }
    }

    document.addEventListener('pointermove', function(event) {
        if (sliderDown) {
            let sliderHandle = sliderDown.querySelector('.slider-handle');
            let sliderFill = sliderDown.querySelector('.slider-fill');
            let parentLeft = sliderDown.getClientRects()[0].left;
            let dx = Math.max(0, Math.min(sliderDown.getClientRects()[0].width, event.pageX - parentLeft));
            sliderHandle.style.left = dx - sliderHandle.getClientRects()[0].width/2 + 'px';
            sliderFill.style.width = dx - sliderHandle.getClientRects()[0].width/2 + 'px';
        }
    });
    
    document.addEventListener('pointerup', function(_event) {
        if (sliderDown) {
            let sliderHandle = sliderDown.querySelector('.slider-handle');
            let value = parseFloat(sliderHandle.style.left) / parseFloat(sliderDown.getClientRects()[0].width);
            console.log('set slider ' + sliderDown.id + ' to ' + value);
            uploadSettingsForToggle(sliderDown.id, value);
        }
        sliderDown = null;
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

window.onload = function() {
    setTimeout(function() {
        realityEditor.gui.settings.loadSettingsPost();
    }, 100);  // delay it or it happens too early to load settings
};
