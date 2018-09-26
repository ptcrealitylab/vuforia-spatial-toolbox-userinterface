(function(exports) {

    var isPaused = false;
    var container;
    var containerWrapper;
    var realityInterface;
    var alwaysFullscreen;
    var originalTouchDecider;
    var isArrowShown = false;
    var isWithinScreen = true;
    var centerPosition = {
        x: 0,
        y: 0
    };
    var isMoving = false;
    var prevMoveDelay;
    var isTransitioningFullscreen = false;
    var arrow;
    var arrowSize = 20;
    var margins = {
        top: 20,
        bottom: 20,
        left: 20,
        right: 82
    };

    function init(_container, _realityInterface, _alwaysFullscreen, _originalTouchDecider) {
        container = _container;
        realityInterface = _realityInterface;
        alwaysFullscreen = _alwaysFullscreen;
        originalTouchDecider = _originalTouchDecider;

        realityInterface.subscribeToMatrix();
        realityInterface.addMatrixListener(matrixCallback);
        realityInterface.addScreenPositionListener(screenPositionCallback);
        realityInterface.addIsMovingListener(isMovingCallback);

        containerWrapper = document.createElement('div');
        wrap(container, containerWrapper);

        arrow = document.createElement('div');
        arrow.id = 'navigationArrow';
        document.body.appendChild(arrow);
        arrow.style.display = 'none';
    }

    function pause() {
        isPaused = true;
    }

    function resume() {
        isPaused = false;
    }

    function wrap(el, wrapper) {
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
    }
    
    function screenPositionCallback(frameScreenPosition) {
        centerPosition = frameScreenPosition.center;
        
        var extraPadding = 20;
        isWithinScreen = !(frameScreenPosition.lowerRight.x < 0 - extraPadding || frameScreenPosition.lowerRight.y < 0 - extraPadding ||
                frameScreenPosition.upperLeft.x > screen.height + extraPadding || frameScreenPosition.upperLeft.y > screen.width + extraPadding );
    }

    function matrixCallback(/*modelViewMatrix, projectionMatrix*/) {
        if (isPaused) return;
        
        if (isMoving || isWithinScreen) {
            if (!isTransitioningFullscreen) {
                if (isArrowShown) {
                    isTransitioningFullscreen = true;
                    containerWrapper.style.display = 'none';
                    arrow.style.display = 'none';
                    if (!alwaysFullscreen) {
                        realityInterface.setFullScreenOff();
                    }
                    // become movable and listen for touches again
                    realityInterface.setMoveDelay(prevMoveDelay);
                    if (originalTouchDecider) {
                        realityInterface.registerTouchDecider(originalTouchDecider);
                    } else {
                        realityInterface.unregisterTouchDecider();
                    }
                    setTimeout(function() {
                        containerWrapper.style.display = '';
                        isTransitioningFullscreen = false;
                        isArrowShown = false;
                    }, 100);
                }
            }

        } else {
            updateArrow();

            if (!isTransitioningFullscreen) {
                if (!isArrowShown) {

                    isTransitioningFullscreen = true;
                    containerWrapper.style.display = 'none';
                    arrow.style.display = 'none';
                    realityInterface.setFullScreenOn();
                    
                    // become immovable and ignore touches
                    prevMoveDelay = realityObject.moveDelay;
                    realityInterface.setMoveDelay(-1);
                    realityInterface.registerTouchDecider(function() {
                        return false;
                    });

                    setTimeout(function() {
                        arrow.style.display = 'inline';
                        isTransitioningFullscreen = false;
                        isArrowShown = true;
                    }, 100);

                }
            }
        }
    }

    function updateArrow() {
        var arrowX = centerPosition.x;
        var arrowY = centerPosition.y;
        var centerX = (screen.height / 2);
        var centerY = (screen.width / 2);
        
        var dx = arrowX - centerX;
        var dy = arrowY - centerY;
        
        var angleOffset = -1 * Math.PI / 4; // icon is naturally facing upper right... turn to point straight up
        var arrowAngle = angleOffset + Math.atan2(dy, dx) + Math.PI/2;

        var distance = Math.sqrt(dx*dx + dy*dy); //to put it as far away as the object, limited to within the screen
        var newX = centerX + distance * Math.cos(arrowAngle+angleOffset);
        var newY = centerY + distance * Math.sin(arrowAngle+angleOffset);

        newX = Math.max(margins.left, Math.min(screen.height - 2*arrowSize - margins.right, newX));
        newY = Math.max(margins.top, Math.min(screen.width - 2*arrowSize - margins.bottom, newY));
        
        arrow.style.left = newX + 'px';
        arrow.style.top = newY + 'px';
        arrow.style.transform = 'rotate(' + arrowAngle + 'rad)';
    }

    function setMargins(top, bottom, left, right) {
        margins.top = top;
        margins.bottom = bottom;
        margins.left = left;
        margins.right = right;
    }
    
    function isMovingCallback(e) {
        if (e) {
            console.log('disable arrow mode until done moving... ');
            isMoving = true;
        } else {
            console.log('enable arrow mode, not moving anymore');
            isMoving = false;
        }
    }

    exports.initNavigationArrow = init;
    exports.pauseNavigationArrow = pause;
    exports.resumeNavigationArrow = resume;
    exports.setNavigationMargins = setMargins;

})(window);
