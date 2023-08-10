export const PERSPECTIVES = [
    {
        keyboardShortcut: '_1',
        menuBarName: 'Follow 1st-Person',
        distanceToCamera: 0,
    },
    {
        keyboardShortcut: '_2',
        menuBarName: 'Follow 1st-Person (Wide)',
        distanceToCamera: 1500,
    },
    {
        keyboardShortcut: '_3',
        menuBarName: 'Follow 3rd-Person',
        distanceToCamera: 3000,
    },
    {
        keyboardShortcut: '_4',
        menuBarName: 'Follow 3rd-Person (Wide)',
        distanceToCamera: 4500,
    },
    {
        keyboardShortcut: '_5',
        menuBarName: 'Follow Aerial',
        distanceToCamera: 6000,
    }
];

/**
 * Wraps a reference to a followable element in a class that we add/delete
 * without accidentally deleting the referenced class instance
 */
class CameraFollowTarget {
    constructor(followable) {
        this.followable = followable;
        this.id = this.followable.id;
        this.displayName = this.followable.displayName;
    }
}

/**
 * Classes that can be followed (e.g. CameraVis, VideoPlayer, Analytics) can
 * adhere to this interface by subclassing it and overriding the methods
 */
export class Followable {
    constructor(id, displayName, parentNode) {
        this.id = id;
        this.displayName = displayName;
        this.sceneNodeId = realityEditor.sceneGraph.addVisualElement(id, parentNode);
        this.sceneNode = realityEditor.sceneGraph.getSceneNodeById(this.sceneNodeId);
        this.frameKey = null; // assign a frameKey if you want it to be able to focus/blur the linked envelope
    }
    enableFirstPersonMode() {
        // console.log(`override enableFirstPersonMode for ${this.id} in subclass`);
    }
    disableFirstPersonMode() {
        // console.log(`override disableFirstPersonMode for ${this.id} in subclass`);
    }
    onFollowDistanceUpdated() {
        // console.log(`override onFollowDistanceUpdated for ${this.id} in subclass`);
    }
    onCameraStartedFollowing() {
        // console.log(`override onCameraStartedFollowing for ${this.id} in subclass`);
    }
    onCameraStoppedFollowing() {
        // console.log(`override onCameraStoppedFollowing for ${this.id} in subclass`);
    }
    updateSceneNode() {
        // console.log(`override updateSceneNode for ${this.id} in subclass`);
    }
}

/**
 * Adding CameraFollowTargets to a CameraFollowCoordinator allows it to control
 * its virtualCamera and make it follow the followable target.
 */
export class CameraFollowCoordinator {
    constructor(virtualCamera) {
        this.virtualCamera = virtualCamera;
        /**
         * @type {{string: CameraFollowTarget}}
         */
        this.followTargets = {};
        this.currentFollowTarget = null;
        this.followDistance = 3000;
        this.currentFollowIndex = 0;

        this.virtualCamera.onFirstPersonDistanceToggled((isFirstPerson, currentDistance) => {
            if (!this.currentFollowTarget) return;
            this.currentFollowTarget.followable.onFollowDistanceUpdated(currentDistance);
            if (isFirstPerson) {
                this.currentFollowTarget.followable.enableFirstPersonMode();
            } else if (!isFirstPerson) {
                this.currentFollowTarget.followable.disableFirstPersonMode();
            }
        });

        this.virtualCamera.onStopFollowing(() => {
            this.unfollow();
        });
    }
    update() {
        Object.values(this.followTargets).forEach(followTarget => {
            followTarget.followable.updateSceneNode();
        });
    }
    addFollowTarget(followable) {
        this.followTargets[followable.id] = new CameraFollowTarget(followable);
        this.updateFollowMenu();
    }
    removeFollowTarget(id) {
        delete this.followTargets[id];
        this.updateFollowMenu();
    }
    follow(targetId) {
        if (this.currentFollowTarget && targetId !== this.currentFollowTarget.id) {
            this.unfollow();
        }
        this.currentFollowTarget = this.followTargets[targetId];
        if (!this.currentFollowTarget) return;
        if (this.currentFollowTarget.followable) {
            this.currentFollowTarget.followable.onCameraStartedFollowing();
        }
        // try to focus 
        realityEditor.envelopeManager.focusEnvelope(targetId);
        if (typeof this.currentFollowTarget.followable.frameKey !== 'undefined') {
            realityEditor.envelopeManager.focusEnvelope(this.currentFollowTarget.followable.frameKey );
        }

        this.virtualCamera.follow(this.currentFollowTarget.followable.sceneNode, this.followDistance);
    }
    unfollow() {
        if (!this.currentFollowTarget) return;

        realityEditor.envelopeManager.blurEnvelope(this.currentFollowTarget.id);
        if (typeof this.currentFollowTarget.followable.frameKey !== 'undefined') {
            realityEditor.envelopeManager.blurEnvelope(this.currentFollowTarget.followable.frameKey );
        }
        this.currentFollowTarget.followable.onCameraStoppedFollowing();
        this.currentFollowTarget.followable.disableFirstPersonMode();
        this.currentFollowTarget = null;
    }
    followNext() {
        if (!this.currentFollowTarget) return;
        let numTargets = Object.keys(this.followTargets).length;
        this.currentFollowIndex = (this.currentFollowIndex + 1) % numTargets;
        this.chooseFollowTarget(this.currentFollowIndex);
    }
    followPrevious() {
        if (!this.currentFollowTarget) return;
        // this.unfollow();
        let numTargets = Object.keys(this.followTargets).length;
        this.currentFollowIndex = (this.currentFollowIndex - 1) % numTargets;
        if (this.currentFollowIndex < 0) { this.currentFollowIndex += numTargets; }
        this.chooseFollowTarget(this.currentFollowIndex);
    }
    chooseFollowTarget(index) {
        let followTarget = Object.values(this.followTargets)[index];
        if (!followTarget) {
            console.warn('Can\'t find a virtualizer to follow');
            return;
        }
        this.follow(followTarget.id);
    }
    addMenuItems() {
        let menuBar = realityEditor.gui.getMenuBar();

        menuBar.addCallbackToItem(realityEditor.gui.ITEM.FollowVideo, () => {
            if (Object.values(this.followTargets).length === 0) return;
            let thisTarget = Object.values(this.followTargets)[0];
            this.follow(thisTarget.id);
        });

        // Setup Following Menu
        PERSPECTIVES.forEach(info => {
            const followItem = new realityEditor.gui.MenuItem(info.menuBarName, { shortcutKey: info.keyboardShortcut, toggle: false, disabled: false }, () => {
                // currentFollowIndex = lastFollowingIndex; // resumes following the previously followed camera. defaults to 0
                // let followTarget = chooseFollowTarget(currentFollowIndex);
                if (Object.values(this.followTargets).length === 0) {
                    console.warn('Can\'t find a virtualizer to follow');
                    return;
                }

                if (this.currentFollowIndex >= Object.keys(this.followTargets).length) {
                    this.currentFollowIndex = 0;
                }
                let thisTarget = Object.values(this.followTargets)[this.currentFollowIndex];

                this.followDistance = info.distanceToCamera;

                this.follow(thisTarget.id);
            });
            menuBar.addItemToMenu(realityEditor.gui.MENU.Camera, followItem);
        });

        // TODO: enable (or add) this only if there are more than one virtualizers
        const changeTargetButtons = [
            { name: 'Follow Next Target', shortcutKey: 'RIGHT', dIndex: 1 },
            { name: 'Follow Previous Target', shortcutKey: 'LEFT',  dIndex: -1 }
        ];

        changeTargetButtons.forEach(itemInfo => {
            const item = new realityEditor.gui.MenuItem(itemInfo.name, { shortcutKey: itemInfo.shortcutKey, toggle: false, disabled: false }, () => {
                if (Object.values(this.followTargets).length === 0) return; // can't swap targets if not following anything
                if (!this.currentFollowTarget) return;
                (itemInfo.dIndex > 0) ? this.followNext() : this.followPrevious();
            });
            menuBar.addItemToMenu(realityEditor.gui.MENU.Camera, item);
        });
    }
    updateFollowMenu() {
        let menuBar = realityEditor.gui.getMenuBar();
        let numTargets = Object.keys(this.followTargets).length;
        if (numTargets === 0) {
            menuBar.hideMenu(realityEditor.gui.followMenu);
        } else {
            menuBar.unhideMenu(realityEditor.gui.followMenu);
        }

        let itemsToRemove = [];
        // remove items that don't match current set of follow targets
        realityEditor.gui.followMenu.items.forEach(menuItem => {
            itemsToRemove.push(menuItem.text);
        });

        itemsToRemove.forEach(itemText => {
            menuBar.removeItemFromMenu(realityEditor.gui.MENU.Follow, itemText);
        });

        let itemsToAdd = [];

        // add follow targets that don't exist yet in menu items
        Object.values(this.followTargets).forEach(followTarget => {
            itemsToAdd.push(followTarget.displayName);
        });

        itemsToAdd.forEach(displayName => {
            let itemText = `Follow ${displayName}`;
            this.addTargetToFollowMenu(displayName, itemText);
        });
    }
    addTargetToFollowMenu(displayName, menuItemText) {
        let menuBar = realityEditor.gui.getMenuBar();
        const targetItem = new realityEditor.gui.MenuItem(menuItemText, { toggle: false, disabled: false }, () => {
            if (Object.values(this.followTargets).length === 0) {
                console.warn('Can\'t find a target to follow');
                return;
            }
            // search the targets for one whose displayName matches the item text
            let targetDisplayNames = Object.values(this.followTargets).map(target => target.displayName);
            let index = targetDisplayNames.indexOf(displayName);
            let thisTarget = Object.values(this.followTargets)[index];
            if (!thisTarget) return;
            this.follow(thisTarget.id);
        });
        menuBar.addItemToMenu(realityEditor.gui.MENU.Follow, targetItem);
    }
}
