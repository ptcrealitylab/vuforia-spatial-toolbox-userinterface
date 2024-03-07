createNameSpace("realityEditor.avatar.iconMenu");

/**
 * @fileOverview realityEditor.avatar.draw
 * Contains a variety of helper functions for avatar/index.js to render all visuals related to avatars
 */

(function(exports) {
    const ICON_WIDTH = 30; // layout information for circular icons
    const ICON_GAP = 10;
    let callbacks = {
        onAvatarIconClicked: [],
    }

    const MENU_ITEMS = Object.freeze({
        EditName: 'Edit Name',
        AllFollowMe: 'All Follow Me',
        FollowThem: 'Follow Them',
        FollowMe: 'Follow Me'
    });

    function initService() {
        registerAvatarIconClickEvent((params) => {
            let {avatarObjectId, avatarProfile, userInitials, isMyIcon, pointerEvent, buttonText } = params;
            if (!(isMyIcon && buttonText === realityEditor.avatar.iconMenu.MENU_ITEMS.EditName)) return;

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

    // show a list of circular icons, one per avatar, with the (random) color and (chosen) initials of that user
    function renderAvatarIconList(connectedAvatars) {
        let iconContainer = document.getElementById('avatarIconContainer');
        if (!iconContainer) {
            iconContainer = createIconContainer();
        }
        while (iconContainer.hasChildNodes()) {
            iconContainer.removeChild(iconContainer.lastChild);
        }

        if (Object.keys(connectedAvatars).length < 1) {
            return; // don't show unless there is at least one avatar
        }

        let sortedKeys = realityEditor.avatar.utils.sortAvatarList(connectedAvatars);

        // if too many collaborators, show a "+N..." at the end (I'm calling this the ellipsis) and limit how many icons
        const MAX_ICONS = realityEditor.device.environment.variables.maxAvatarIcons;
        const ADDITIONAL_NAMES = 2; // list out this many extra names with commas when hovering over the ellipsis

        sortedKeys.forEach((objectKey, index) => {
            let isEllipsis = index === (MAX_ICONS - 1) && sortedKeys.length > MAX_ICONS; // last one turns into "+2", "+3", etc
            let numTooMany = sortedKeys.length - (MAX_ICONS - 1);
            if (index >= MAX_ICONS) { return; } // after the ellipsis, we ignore the rest

            let info = connectedAvatars[objectKey];
            let initials = realityEditor.avatar.utils.getInitialsFromName(info.name) || '';
            if (isEllipsis) {
                initials = '+' + numTooMany;
            }

            let usersFollowingMe = realityEditor.avatar.utils.getUsersFollowingUser(objectKey, connectedAvatars);
            let userIsFollowing = info.lockOnMode;

            let isMyIcon = objectKey.includes(realityEditor.avatar.utils.getAvatarName());
            let iconDiv = createAvatarIcon(iconContainer, objectKey, initials, index, isMyIcon, isEllipsis);

            // TODO: show who you are following, and who is following you
            // if (isMyIcon) {
            if (usersFollowingMe.length > 0) {
                // add a notification bubble showing the number of users following me
                let bubble = document.createElement('div');
                bubble.classList.add('avatarListIconFollowingBubble');
                bubble.textContent = `${usersFollowingMe.length}`;
                iconDiv.appendChild(bubble);
            }
            // }

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

            let iconImageDiv = iconDiv.querySelector('.avatarListIconImage');
            iconImageDiv.addEventListener('pointerover', () => {
                showFullNameTooltip(iconImageDiv, tooltipText, isMyIcon, isEllipsis);
            });
            ['pointerout', 'pointercancel', 'pointerup'].forEach((eventName) => {
                iconImageDiv.addEventListener(eventName, hideFullNameTooltip);
            });

            iconImageDiv.addEventListener('pointerup', (e) => {
                toggleDropdown(objectKey, info, initials, isMyIcon, e);
            });
        });

        let iconsWidth = Math.min(MAX_ICONS, sortedKeys.length) * (ICON_WIDTH + ICON_GAP) + ICON_GAP;
        iconContainer.style.width = iconsWidth + 'px';
    }

    function toggleDropdown(objectId, userProfile, userInitials, isMyIcon, pointerEvent) {
        let iconDropdown = document.getElementById('avatarIconDropdown' + objectId);
        if (!iconDropdown) {
            iconDropdown = createAvatarIconDropdown(objectId, userProfile, userInitials, isMyIcon, pointerEvent);
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

    function showDropdown(iconDropdown) {
        Array.from(document.querySelectorAll('.avatarListIconDropdown')).forEach(dropdown => {
            // dropdown.classList.add('hiddenDropdown'); // ok to add to the clicked one too, because toggle happens next
            hideDropdown(dropdown);
        });
        iconDropdown.classList.remove('hiddenDropdown');

        // hide the hover tooltip, if it's shown
        hideFullNameTooltip();
    }

    function hideDropdown(iconDropdown) {
        iconDropdown.classList.add('hiddenDropdown');
    }

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
            addMenuItemToDropdown(container, 'Edit Name', objectId, userProfile, userInitials, isMyIcon);
            addMenuItemToDropdown(container, 'All Follow Me', objectId, userProfile, userInitials, isMyIcon);
        } else {
            addMenuItemToDropdown(container, 'Follow Them', objectId, userProfile, userInitials, isMyIcon);
            addMenuItemToDropdown(container, 'Follow Me', objectId, userProfile, userInitials, isMyIcon);
        }
        parent.appendChild(container);
        return container;
    }

    function addMenuItemToDropdown(parentDiv, textContent, objectId, userProfile, userInitials, isMyIcon) {
        let item = document.createElement('div');
        item.classList.add('avatarListIconDropdownItem');
        item.textContent = textContent;
        parentDiv.appendChild(item);

        item.addEventListener('pointerup', (e) => {
            callbacks.onAvatarIconClicked.forEach((cb) => {
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
            // // hide menu if showing
            // if (!parentDiv.classList.contains('hiddenDropdown')) {
            //     parentDiv.classList.add('hiddenDropdown');
            // }
        });
    }

    /**
     * @param {function} callback
     */
    function registerAvatarIconClickEvent(callback) {
        callbacks.onAvatarIconClicked.push(callback);
    }

    // create the container that all the avatar icon list elements will get added to
    function createIconContainer() {
        let iconContainer = document.createElement('div');
        iconContainer.id = 'avatarIconContainer';
        iconContainer.classList.add('avatarIconContainerScaleAdjustment')
        iconContainer.style.top = (realityEditor.device.environment.variables.screenTopOffset + 20) + 'px';
        document.body.appendChild(iconContainer)
        return iconContainer;
    }

    // create an icon for this avatar, and add hover event listeners to show tooltip with full name
    function createAvatarIcon(parent, objectKey, initials, index, isMyIcon, isEllipsis) {
        let iconDiv = document.createElement('div');
        iconDiv.id = 'avatarIcon' + objectKey;
        iconDiv.classList.add('avatarListIcon', 'avatarListIconVerticalAdjustment');
        iconDiv.style.left = (ICON_GAP + (ICON_WIDTH + ICON_GAP) * index) + 'px';
        parent.appendChild(iconDiv);

        let iconImg = document.createElement('img');
        iconImg.classList.add('avatarListIconImage');
        iconDiv.appendChild(iconImg);

        if (isMyIcon) {
            iconDiv.classList.add('avatarListIconMyAvatar');
        }

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

    // shows a tooltip that either says the name, or "You" or "Anonymous" if no name is provided, or a list of extra names
    function showFullNameTooltip(element, name, isMyAvatar) {
        // only show it if there aren't any dropdown menus shown
        let anyDropdownsShown = Array.from(document.querySelectorAll('.avatarListIconDropdown')).some(dropdown => {
            return !dropdown.classList.includes('hiddenDropdown');
        });
        if (anyDropdownsShown) {
            return;
        }

        let container = document.getElementById('avatarListHoverName');
        if (!container) {
            container = document.createElement('div');
            container.id = 'avatarListHoverName';
            // container.classList.add('avatarListTooltipVerticalAdjustment'); // lets us position differently in portrait app
            element.parentElement.appendChild(container);
        }

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

        // const clickActionText = isMyAvatar ? 'click to edit your name' : 'click to follow';
        const clickActionText = 'click for options';
        const nameText = isMyAvatar ? (name ? `${name} (You)` : 'You') : (name || 'Anonymous');
        nameDiv.innerText = `${nameText} (${clickActionText})`;
        let clickActionTextWidth = 8 * clickActionText.length;
        let width = Math.max(120, ((nameDiv.innerText.length - clickActionText.length)) * 12 + clickActionTextWidth);
        nameDiv.style.width = width + 'px';
        container.style.width = width + 'px;'

        // center the tooltip on the icon
        let iconRelativeLeft = element.getBoundingClientRect().left - element.parentElement.getBoundingClientRect().left;
        let iconHalfWidth = element.getBoundingClientRect().width / 2;
        container.style.left = (iconRelativeLeft + iconHalfWidth) + 'px';
        container.style.display = '';
    }

    function hideFullNameTooltip() {
        let nameDiv = document.getElementById('avatarListHoverName');
        if (nameDiv) {
            nameDiv.style.display = 'none';
        }
    }

    exports.initService = initService;
    exports.renderAvatarIconList = renderAvatarIconList;
    exports.registerAvatarIconClickEvent = registerAvatarIconClickEvent;
    exports.MENU_ITEMS = MENU_ITEMS;

}(realityEditor.avatar.iconMenu));
