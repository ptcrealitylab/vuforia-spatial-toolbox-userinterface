/**
 * Manages a set of animations all corresponding to the same step, only looping
 * all animations when all animations have finished
 */
export class StepAnimationManager {
    /**
     * @param {Array<Animation>} animations
     */
    constructor(animations) {
        this.animations = animations;

        for (let animation of this.animations) {
            animation.looping = false;
        }

        this.update = this.update.bind(this);
    }

    update() {
        let allDone = true;
        for (let animation of this.animations) {
            // User has cleared animation on their own
            if (!animation.humanPoseAnalyzer.isAnimationPlaying()) {
                this.clear();
                return;
            }

            if (animation.cursorTime < animation.endTime) {
                allDone = false;
            }
        }
        if (allDone) {
            for (let animation of this.animations) {
                animation.restart();
            }
        }

        window.requestAnimationFrame(this.update);
    }

    clear() {
        for (let animation of this.animations) {
            animation.humanPoseAnalyzer.clearAnimation();
        }
    }
}
