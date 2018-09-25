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
    var arrow;
    var contentSize = {
        width: 100,
        height: 100
    };
    var margins = {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
    };
    var isMoving = false;
    var prevMoveDelay;

    var isTransitioningFullscreen = false;

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
        // console.log(frameScreenPosition);
        isWithinScreen = !(frameScreenPosition.lowerRight.x < 0 || frameScreenPosition.lowerRight.y < 0 ||
                frameScreenPosition.upperLeft.x > screen.height || frameScreenPosition.upperLeft.y > screen.width );
        
        centerPosition = frameScreenPosition.center;
    }

    function matrixCallback(/*modelViewMatrix, projectionMatrix*/) {
        if (isPaused) return;

        // var x = realityInterface.getPositionX();
        // var y = realityInterface.getPositionY();

        // var withinScreen = isWithinScreen;
        // if (alwaysFullscreen || isArrowShown) {
        //     // can't rely on screenPositionCallback when it is a fullscreen frame
        //     withinScreen = (Math.abs(x) < screen.height/2 + contentSize.width && Math.abs(y) < screen.width/2 + contentSize.height);
        // }
        
        // noinspection JSSuspiciousNameCombination
        if (isMoving || isWithinScreen) {
        // if (isMoving || (Math.abs(x) < screen.height/2 + contentSize.width && Math.abs(y) < screen.width/2 + contentSize.height)) {
            // hideArrow();

            if (!isTransitioningFullscreen) {
                if (isArrowShown) {
                    isTransitioningFullscreen = true;
                    containerWrapper.style.display = 'none';
                    arrow.style.display = 'none';
                    if (!alwaysFullscreen) {
                        realityInterface.setFullScreenOff();
                        
                        // become movable and listen for touches again
                        realityInterface.setMoveDelay(prevMoveDelay);
                        if (originalTouchDecider) {
                            realityInterface.registerTouchDecider(originalTouchDecider);
                        } else {
                            realityInterface.unregisterTouchDecider();
                        }
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

        var arrowSize = 20;

        var arrowX = centerPosition.x; //realityInterface.getPositionX();
        var arrowY = centerPosition.y; //realityInterface.getPositionY();
        var centerX = (screen.height / 2) - arrowSize; // 20 is the width of the arrow
        var centerY = (screen.width / 2) - arrowSize; // 20 is the height of the arrow

        var angleOffset = -1 * Math.PI / 4; // icon is naturally facing upper right... turn to point straight up
        var arrowAngle = angleOffset + Math.atan2(arrowY, arrowX) - Math.PI/2;
        // var distance = 75; // to put it on a center of fixed distance

        var distance = Math.sqrt(arrowX*arrowX + arrowY*arrowY); //to put it as far away as the object, limited to within the screen
        var newX = centerX + distance * Math.cos(arrowAngle+angleOffset);
        var newY = centerY + distance * Math.sin(arrowAngle+angleOffset);
        newX = Math.max(margins.left, Math.min(screen.height - 2*arrowSize - margins.right, newX));
        newY = Math.max(margins.top, Math.min(screen.width - 2*arrowSize - margins.bottom, newY));
        
        arrow.style.left = newX + 'px';
        arrow.style.top = newY + 'px';
        arrow.style.transform = 'rotate(' + arrowAngle + 'rad)';
    }

    function setContentSize(width, height) {
        contentSize.width = width;
        contentSize.height = height;
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
    exports.setNavigationContentSize = setContentSize;
    exports.setNavigationMargins = setMargins;

})(window);
