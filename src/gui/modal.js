createNameSpace("realityEditor.gui.modal");

(function(exports) {

    /**
     * Creates and presents a minimal modal with cancel and submit buttons styled like the Reality Server frontend.
     * @param {string} cancelButtonText - Can comfortably fit 8 "m" characters (or around 11 average characters) @todo auto-resize font to fit
     * @param {string} submitButtonText - Can comfortably fit 14 "m" characters (or around 20 average characters)
     * @param {function} onCancelCallback
     * @param {function} onSubmitCallback
     */
    function openRealityModal(cancelButtonText, submitButtonText, onCancelCallback, onSubmitCallback) {
        // create the instance of the modal
        // instantiate / modify the DOM elements
        var domElements = createRealityModalDOM();
        domElements.cancelButton.innerHTML = cancelButtonText || 'Cancel';
        domElements.submitButton.innerHTML = submitButtonText || 'Submit';

        // attach callbacks to button pointer events + delete/hide when done
        domElements.cancelButton.addEventListener('pointerup', function(event) {
            hideModal(domElements);
            onCancelCallback(event);
        });
        domElements.submitButton.addEventListener('pointerup', function(event) {
            hideModal(domElements);
            onSubmitCallback(event);
        });

        // disable touch actions elsewhere on the screen
        // todo does this happen automatically from the fade element?
        domElements.fade.addEventListener('pointerevent', function(event) {
            event.stopPropagation();
        });
        
        // present on the DOM
        document.body.appendChild(domElements.fade);
        document.body.appendChild(domElements.container);
    }

    /**
     * Properly hides the modal with animations, etc.
     * @param domElements
     */
    function hideModal(domElements) {
        // immediately remove container
        removeElements([domElements.container]);

        // fade out darkened background
        domElements.fade.classList.remove('modalVisibleFadeIn');
        domElements.fade.classList.add('modalInvisibleFadeOut');
        
        setTimeout(function() {
            removeElements([domElements.fade]);
        }, 250);
    }

    /**
     * Helper function to remove a list of DOM elements
     * @param {Array.<HTMLElement>} domElementsToRemove
     */
    function removeElements(domElementsToRemove) {
        domElementsToRemove.forEach(function(domElement) {
            domElement.parentElement.removeChild(domElement);
        });
    }

    /**
     * Creates and presents a modal interface with a description, cancel, and submit button, with a flat/material UI.
     * @param {string} headerText
     * @param {string} descriptionText
     * @param {string} cancelButtonText
     * @param {string} submitButtonText
     * @param {function} onCancelCallback
     * @param {function} onSubmitCallback
     */
    function openClassicModal(headerText, descriptionText, cancelButtonText, submitButtonText, onCancelCallback, onSubmitCallback, useSmallerVersion) {
        // create the instance of the modal
        // instantiate / modify the DOM elements
        var domElements = createClassicModalDOM(useSmallerVersion);
        domElements.header.innerHTML = headerText;
        domElements.description.innerHTML = descriptionText;
        domElements.cancelButton.innerHTML = cancelButtonText || 'Cancel';
        domElements.submitButton.innerHTML = submitButtonText || 'Submit';

        // attach callbacks to button pointer events + delete/hide when done
        domElements.cancelButton.addEventListener('pointerup', function(event) {
            onCancelCallback(event);
            hideModal(domElements);
        });
        domElements.submitButton.addEventListener('pointerup', function(event) {
            onSubmitCallback(event);
            hideModal(domElements);
        });

        // disable touch actions elsewhere on the screen
        // todo does this happen automatically from the fade element?
        domElements.fade.addEventListener('pointerevent', function(event) {
            event.stopPropagation();
        });
        
        // present on the DOM
        document.body.appendChild(domElements.fade);
        document.body.appendChild(domElements.container);
    }
    
    /**
     * Constructs the DOM and returns references to its elements
     * @return {{fade: HTMLDivElement, container: HTMLDivElement, cancelButton: HTMLDivElement, submitButton: HTMLDivElement}}
     */
    function createRealityModalDOM() {
        var fade = document.createElement('div'); // darkens/blurs the background
        var container = document.createElement('div'); // panel holding all the modal elements
        var cancelButton = document.createElement('div');
        var submitButton = document.createElement('div');

        fade.id = 'modalFade';
        container.id = 'modalContainer';
        cancelButton.id = 'modalCancel';
        submitButton.id = 'modalSubmit';

        cancelButton.classList.add('modalButton', 'buttonWhite');
        submitButton.classList.add('modalButton', 'buttonRed');
        
        fade.classList.add('modalVisibleFadeIn');

        container.appendChild(cancelButton);
        container.appendChild(submitButton);

        return {
            fade: fade,
            container: container,
            cancelButton: cancelButton,
            submitButton: submitButton
        }
    }

    /**
     * Constructs the DOM and returns references to its elements
     * @return {{fade: HTMLDivElement, container: HTMLDivElement, description: HTMLDivElement, cancelButton: HTMLDivElement, submitButton: HTMLDivElement}}
     */
    function createClassicModalDOM(useSmallerCenteredVersion) {
        var fade = document.createElement('div'); // darkens/blurs the background
        var container = document.createElement('div'); // panel holding all the modal elements
        var header = document.createElement('div');
        var description = document.createElement('div');
        var cancelButton = document.createElement('div');
        var submitButton = document.createElement('div');
        
        fade.id = 'modalFadeClassic';
        container.id = useSmallerCenteredVersion ? 'modalContainerClassicCentered' : 'modalContainerClassic';
        header.id = 'modalHeaderClassic';
        description.id = 'modalDescriptionClassic';
        cancelButton.id = 'modalCancelClassic';
        submitButton.id = 'modalSubmitClassic';
        
        cancelButton.classList.add('modalButtonClassic');
        submitButton.classList.add('modalButtonClassic');

        container.appendChild(header);
        container.appendChild(description);
        container.appendChild(cancelButton);
        container.appendChild(submitButton);
        
        return {
            fade: fade,
            container: container,
            header: header,
            description: description,
            cancelButton: cancelButton,
            submitButton: submitButton
        }
    }
    
    function Notification(headerText, descriptionText, onCloseCallback, isPortraitLayout) {
        this.headerText = headerText;
        this.descriptionText = descriptionText;
        this.onCloseCallback = onCloseCallback;
        this.domElements = createNotificationDOM(true, isPortraitLayout);
    }
    
    Notification.prototype.dismiss = function() {
        hideModal(this.domElements);
        this.onCloseCallback();
    };
    
    function showSimpleNotification(headerText, descriptionText, onCloseCallback, isPortraitLayout) {
        
        let notification = new Notification(headerText, descriptionText, onCloseCallback, isPortraitLayout);
        
        // create the instance of the modal
        // instantiate / modify the DOM elements
        let domElements = notification.domElements;
        domElements.header.innerHTML = headerText;
        domElements.description.innerHTML = descriptionText;
        // domElements.cancelButton.innerHTML = 'Dismiss'; // cancelButtonText || 'Cancel';

        // attach callbacks to button pointer events + delete/hide when done
        // domElements.cancelButton.addEventListener('pointerup', function(event) {
        //     hideModal(domElements);
        //     onCloseCallback(event);
        // });

        // disable touch actions elsewhere on the screen
        // todo does this happen automatically from the fade element?
        domElements.fade.addEventListener('pointerevent', function(event) {
            event.stopPropagation();
        });

        // present on the DOM
        document.body.appendChild(domElements.fade);
        document.body.appendChild(domElements.container);
        
        return notification;
    }
    
    function createNotificationDOM(includeLoader, isPortraitLayout) {
        var fade = document.createElement('div'); // darkens/blurs the background
        var container = document.createElement('div'); // panel holding all the modal elements
        var header = document.createElement('div');
        var description = document.createElement('div');
        // var cancelButton = document.createElement('div');

        fade.id = 'modalFadeNotification';
        container.id = 'modalContainerNotification';
        header.id = 'modalHeaderNotification';
        description.id = 'modalDescriptionNotification';
        // cancelButton.id = 'modalCancelNotification';

        if (isPortraitLayout) {
            container.classList.add('notificationPortrait');
            header.classList.add('notificationHeaderPortrait');
            description.classList.add('notificationDescriptionPortrait');
        }

        // cancelButton.classList.add('modalButtonNotification');
        
        fade.classList.add('modalBlurOut');

        container.appendChild(header);

        let loader = null;
        if (includeLoader) {
            loader = document.createElement('div');
            container.classList.add('loaderContainer');
            loader.classList.add('loader');
            container.appendChild(loader);

            if (isPortraitLayout) {
                container.classList.add('loaderContainerPortrait');
            }
        }
        
        container.appendChild(description);
        // container.appendChild(cancelButton);

        return {
            fade: fade,
            container: container,
            header: header,
            description: description,
            // cancelButton: cancelButton,
            loader: loader
        }
    }

    exports.openClassicModal = openClassicModal;
    exports.openRealityModal = openRealityModal;
    exports.showSimpleNotification = showSimpleNotification;
    
})(realityEditor.gui.modal);
