createNameSpace("realityEditor.avatar.iconMenu");

/**
 * @fileOverview realityEditor.avatar.iconMenu
 * Renders the interactable UI component with the list of avatars connected to the scene
 * Show their initials, and clicking on them allows you to rename yourself or follow other users' views
 */

(function(exports) {
    // Note: MAX_ICONS isn't set here, it is set to realityEditor.device.environment.variables.maxAvatarIcons
    // If more than MAX_ICONS avatars are connected, the icons for extras will be hidden/combined in the ellipsis icon

    const ADDITIONAL_NAMES = 2; // list out this many extra names with commas when hovering over the ellipsis
    const ICON_WIDTH = 30; // layout information for circular icons
    const ICON_GAP = 10;

    let callbacks = {
        onMenuItemClicked: [],
    }

    // Enum of the menu item labels, which other modules can also check against to listen to specific menu items
    const MENU_ITEMS = Object.freeze({
        EditName: 'Edit Name',
        AllFollowMe: 'All Follow Me',
        FollowThem: 'Follow',
        FollowMe: 'Follow Me'
    });

    function initService() {
        // the iconMenu itself provides the implementation of the Edit Name menu item.
        // Other menu items can be implemented by their relevant modules, e.g. desktopCamera can handle Follow actions
        onAvatarIconMenuItemSelected((params) => {
            if (!(params.isMyIcon && params.buttonText === realityEditor.avatar.iconMenu.MENU_ITEMS.EditName)) return;
            // show a modal that lets you type in a name
            realityEditor.gui.modal.openInputModal({
                headerText: 'Edit Avatar Name',
                descriptionText: 'Specify the name that other users will see.',
                inputPlaceholderText: 'Your username here',
                onSubmitCallback: (e, userName) => {
                    if (userName && typeof userName === 'string') {
                        userName = userName.trim();
                        if (userName.length === 0) {
                            userName = 'Anonymous';
                        }
                        realityEditor.avatar.setMyUsername(userName);
                        realityEditor.avatar.writeUsername(userName);
                        // write to window.localStorage and use instead of anonymous in the future in this browser
                        window.localStorage.setItem('manuallyEnteredUsername', userName);
                    }
                }
            });
        });
    }
    /**
     * Show a list of circular icons, one per avatar, with the (random) color and (chosen) initials of that user.
     * If too many avatars, combines the overflow into a final icon with (+N) in it.
     * This uses very simple render logic, which entirely clears the container and rebuilds it each time it renders.
     * @param {Object.<string, UserProfile>} connectedAvatars
     */
    function renderAvatarIconList(connectedAvatars) {
        let iconContainer = document.getElementById('avatarIconContainer');
        if (!iconContainer) {
            iconContainer = createIconContainer();
        }

        // reset the container, so we can rebuild it from scratch. simple, inefficient, but reliable.
        while (iconContainer.hasChildNodes()) {
            iconContainer.removeChild(iconContainer.lastChild);
        }

        if (Object.keys(connectedAvatars).length < 1) {
            return; // don't show unless there is at least one avatar
        }

        // moves you to the front // TODO: sort by recent activity, or who's following you, etc
        let sortedKeys = realityEditor.avatar.utils.sortAvatarList(connectedAvatars);

        // if too many collaborators, show a "+N..." at the end (I'm calling this the ellipsis) and limit how many icons
        const MAX_ICONS = realityEditor.device.environment.variables.maxAvatarIcons;

        // build and add each of the icons to the container, and attach pointer event listeners to them
        sortedKeys.forEach((objectKey, index) => {
            if (index >= MAX_ICONS) { return; } // after the ellipsis, we ignore the rest
            let isEllipsis = index === (MAX_ICONS - 1) && sortedKeys.length > MAX_ICONS; // last one turns into "+2", "+3", etc
            let numTooMany = sortedKeys.length - (MAX_ICONS - 1);

            let info = connectedAvatars[objectKey];
            let initials = realityEditor.avatar.utils.getInitialsFromName(info.name) || '';
            if (isEllipsis) {
                initials = '+' + numTooMany;
            }

            let usersFollowingMe = realityEditor.avatar.utils.getUsersFollowingUser(objectKey, connectedAvatars);
            let isMyIcon = objectKey.includes(realityEditor.avatar.utils.getAvatarName());
            let iconDiv = createAvatarIcon(iconContainer, objectKey, initials, index, isMyIcon, isEllipsis);

            // TODO: show more details on who you are following, and who is following you
            if (usersFollowingMe.length > 0) {
                // currently just adds a notification bubble showing the number of users following me
                let bubble = document.createElement('div');
                bubble.classList.add('avatarListIconFollowingBubble');
                bubble.textContent = `${usersFollowingMe.length}`;
                iconDiv.appendChild(bubble);
            }

            // show full name when hovering over the icon
            let tooltipText = info.name;
            // or put all the extra names into the tooltip text
            if (isEllipsis) {
                let remainingKeys = sortedKeys.slice(-1 * numTooMany);
                let names = remainingKeys.map(key => connectedAvatars[key].name).filter(name => !!name);
                names = names.slice(0, ADDITIONAL_NAMES); // limit number of comma-separated names
                tooltipText = names.join(', ');

                let additional = numTooMany - names.length; // number of anonymous and beyond-additional
                if (additional > 0) {
                    tooltipText += ' and ' + additional + ' more';
                }
            }

            // hovering/clicking on icon image triggers tooltip or dropdown
            let iconImageDiv = iconDiv.querySelector('.avatarListIconImage');
            iconImageDiv.addEventListener('pointerover', () => {
                showFullNameTooltip(iconImageDiv, tooltipText, isMyIcon, isEllipsis);
            });
            ['pointerout', 'pointercancel', 'pointerup'].forEach((eventName) => {
                iconImageDiv.addEventListener(eventName, hideFullNameTooltip);
            });
            iconImageDiv.addEventListener('pointerup', () => {
                if (isEllipsis) { // don't add follow menu to ellipsis
                    return; // TODO: what should happen when you click on the "+N" icon? show all names?
                }
                toggleDropdown(objectKey, info, initials, isMyIcon);
            });
        });

        let iconsWidth = Math.min(MAX_ICONS, sortedKeys.length) * (ICON_WIDTH + ICON_GAP) + ICON_GAP;
        iconContainer.style.width = iconsWidth + 'px';
    }
    /**
     * Shows or hides the dropdown corresponding to the avatar icon for the given avatar objectId
     * @param {string} objectId
     * @param {UserProfile} userProfile
     * @param {string|null} userInitials
     * @param {boolean} isMyIcon
     */
    function toggleDropdown(objectId, userProfile, userInitials, isMyIcon) {
        let iconDropdown = document.getElementById('avatarIconDropdown' + objectId);
        if (!iconDropdown) {
            iconDropdown = createAvatarIconDropdown(objectId, userProfile, userInitials, isMyIcon);
        }

        // show or hide the clicked menu depending on previous state
        let newIsShown = iconDropdown.classList.contains('hiddenDropdown'); // show if it was hidden
        // if we're going to show this one, hide all other dropdown menus
        if (newIsShown) {
            showDropdown(iconDropdown);
        } else {
            hideDropdown(iconDropdown);
        }
    }
    /**
     * Show the dropdown menu, and hide other dropdowns and tooltips
     * @param {HTMLElement} iconDropdown
     */
    function showDropdown(iconDropdown) {
        Array.from(document.querySelectorAll('.avatarListIconDropdown')).forEach(dropdown => {
            hideDropdown(dropdown);
        });
        iconDropdown.classList.remove('hiddenDropdown');
        hideFullNameTooltip();
    }
    /**
     * Hides a particular dropdown menu
     * @param {HTMLElement} iconDropdown
     */
    function hideDropdown(iconDropdown) {
        iconDropdown.classList.add('hiddenDropdown');
    }
    /**
     * Constructs a dropdown menu with the correct menu items for the specified avatar.
     * E.g. your own avatar has Edit Name and All Follow Me, while others have Follow and Follow Me
     * @param {string} objectId
     * @param {UserProfile} userProfile
     * @param {string|null} userInitials
     * @param {boolean} isMyIcon
     */
    function createAvatarIconDropdown(objectId, userProfile, userInitials, isMyIcon) {
        let parent = document.getElementById('avatarIcon' + objectId);
        if (!parent) {
            console.warn('cant create avatar icon dropdown because parent doesnt exist');
            return;
        }
        let container = document.createElement('div');
        container.id = 'avatarIconDropdown' + objectId;
        container.classList.add('avatarListIconDropdown', 'hiddenDropdown'); // hide, because toggle happens right after creation
        if (isMyIcon) {
            addMenuItemToDropdown(container, MENU_ITEMS.EditName, objectId, userProfile, userInitials, isMyIcon);
            addMenuItemToDropdown(container, MENU_ITEMS.AllFollowMe, objectId, userProfile, userInitials, isMyIcon);
        } else {
            addMenuItemToDropdown(container, MENU_ITEMS.FollowThem, objectId, userProfile, userInitials, isMyIcon);
            addMenuItemToDropdown(container, MENU_ITEMS.FollowMe, objectId, userProfile, userInitials, isMyIcon);
        }
        parent.appendChild(container);
        return container;
    }
    /**
     * Creates a div for the menu item and attaches a pointerup event that other modules can subscribe to
     * @param {HTMLElement} parentDiv
     * @param {string} textContent
     * @param {string} objectId
     * @param {UserProfile} userProfile
     * @param {string|null} userInitials
     * @param {boolean} isMyIcon
     */
    function addMenuItemToDropdown(parentDiv, textContent, objectId, userProfile, userInitials, isMyIcon) {
        let item = document.createElement('div');
        item.classList.add('avatarListIconDropdownItem');
        item.textContent = textContent;
        parentDiv.appendChild(item);

        item.addEventListener('pointerup', (e) => {
            callbacks.onMenuItemClicked.forEach((cb) => {
                cb({
                    buttonText: textContent,
                    avatarObjectId: objectId,
                    avatarProfile: userProfile,
                    userInitials: userInitials,
                    isMyIcon: isMyIcon,
                    pointerEvent: e
                });
            });
            hideDropdown(parentDiv);
        });
    }
    /**
     * Other modules can use this to detect when any avatar icon menu item was selected
     * @param {function} callback
     */
    function onAvatarIconMenuItemSelected(callback) {
        callbacks.onMenuItemClicked.push(callback);
    }
    /**
     * Create the container that all the avatar icon list elements will get added to
     * @returns {HTMLDivElement}
     */
    function createIconContainer() {
        let iconContainer = document.createElement('div');
        iconContainer.id = 'avatarIconContainer';
        iconContainer.classList.add('avatarIconContainerScaleAdjustment')
        iconContainer.style.top = (realityEditor.device.environment.variables.screenTopOffset + 20) + 'px';
        document.body.appendChild(iconContainer)
        return iconContainer;
    }
    /**
     * Create an icon for this avatar, and add hover event listeners to show tooltip with full name
     * @param {HTMLElement} parent
     * @param {string} objectKey
     * @param {string|null} initials
     * @param {number} index
     * @param {boolean} isMyIcon
     * @param {boolean} isEllipsis
     * @returns {HTMLDivElement}
     */
    function createAvatarIcon(parent, objectKey, initials, index, isMyIcon, isEllipsis) {
        let iconDiv = document.createElement('div');
        iconDiv.id = 'avatarIcon' + objectKey;
        iconDiv.classList.add('avatarListIcon', 'avatarListIconVerticalAdjustment');
        iconDiv.style.left = (ICON_GAP + (ICON_WIDTH + ICON_GAP) * index) + 'px';
        parent.appendChild(iconDiv);

        let iconImg = document.createElement('img');
        iconImg.classList.add('avatarListIconImage');
        iconDiv.appendChild(iconImg);

        // your icon has a different visual style (and different default image if no username/initials set)
        if (initials) {
            iconImg.src = 'svg/avatar-initials-background-dark.svg';
            let iconInitials = document.createElement('div');
            iconInitials.classList.add('avatarListIconInitials');
            iconInitials.innerText = initials;
            iconDiv.appendChild(iconInitials);
        } else {
            if (isMyIcon) {
                iconImg.src = 'svg/avatar-placeholder-icon.svg';
            } else {
                iconImg.src = 'svg/avatar-placeholder-icon-dark.svg';
            }
        }

        // color the avatar icon to match the avatar color (the same color used by cursor, pointer, etc)
        let color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey));
        let lightColor = realityEditor.avatar.utils.getColorLighter(realityEditor.getObject(objectKey));
        if (isMyIcon && color) {
            iconImg.style.border = '2px solid white';
            iconImg.style.backgroundColor = color;
        } else if (!isEllipsis && lightColor) {
            iconImg.style.border = '2px solid ' + lightColor;
            iconImg.style.backgroundColor = lightColor;
        } else {
            iconImg.style.border = '2px solid black';
            iconImg.style.backgroundColor = 'rgb(95, 95, 95)';
        }
        iconImg.style.borderRadius = '20px';

        return iconDiv;
    }
    /**
     * Helper function to detect if any menus are visible
     * @returns {boolean}
     */
    function areAnyDropdownsShown() {
        return Array.from(document.querySelectorAll('.avatarListIconDropdown')).some(dropdown => {
            return dropdown && dropdown.classList && !dropdown.classList.contains('hiddenDropdown');
        });
    }
    /**
     * shows a tooltip that either says the name, or "You" or "Anonymous", or a list of extra names
     * @param {HTMLElement} element
     * @param {string|null} name
     * @param {boolean} isMyAvatar
     * @param {boolean} isEllipsis
     */
    function showFullNameTooltip(element, name, isMyAvatar, isEllipsis) {
        // only show it if there aren't any dropdown menus shown
        if (areAnyDropdownsShown()) {
            return;
        }

        let container = document.getElementById('avatarListHoverName');
        if (!container) {
            container = document.createElement('div');
            container.id = 'avatarListHoverName';
        }
        element.parentElement.appendChild(container);

        let nameDiv = document.getElementById('avatarListHoverNameText');
        if (!nameDiv) {
            nameDiv = document.createElement('div');
            nameDiv.id = 'avatarListHoverNameText';
            container.appendChild(nameDiv);
        }

        let tooltipArrow = document.getElementById('avatarListTooltipArrow');
        if (!tooltipArrow) {
            let tooltipArrow = document.createElement('img');
            tooltipArrow.id = 'avatarListTooltipArrow';
            tooltipArrow.src = 'svg/tooltip-arrow-up.svg';
            container.appendChild(tooltipArrow);
        }

        const clickActionText = isEllipsis ? '' : ' (click for options)';
        const nameText = isMyAvatar ? (name ? `${name} (You)` : 'You') : (name || 'Anonymous');
        nameDiv.innerText = `${nameText}${clickActionText}`;
        let clickActionTextWidth = 8 * clickActionText.length;
        let width = Math.max(120, ((nameDiv.innerText.length - clickActionText.length)) * 12 + clickActionTextWidth);
        nameDiv.style.width = width + 'px';
        container.style.display = '';
    }
    /**
     * Hides the tooltip, if shown
     */
    function hideFullNameTooltip() {
        let nameDiv = document.getElementById('avatarListHoverName');
        if (nameDiv) {
            nameDiv.style.display = 'none';
        }
    }

    exports.initService = initService;
    exports.renderAvatarIconList = renderAvatarIconList;
    exports.onAvatarIconMenuItemSelected = onAvatarIconMenuItemSelected;
    exports.MENU_ITEMS = MENU_ITEMS;

}(realityEditor.avatar.iconMenu));
