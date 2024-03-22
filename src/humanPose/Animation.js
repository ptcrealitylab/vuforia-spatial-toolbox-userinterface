const AnimationState = {
    video: 'video',
    noVideo: 'noVideo',
};

/**
 * Animation
 * Organizes all the information about an HPA's animation in one location
 * Coordinates propagating animation information to the motionStudy and its
 * video player if present
 *
 * Notably hands off control of video playback to that video player during any
 * region of the recording that it contains
 *
 * Time is in ms unless otherwise specified
 */
export class Animation {
    constructor(humanPoseAnalyzer, motionStudy, startTime, endTime) {
        this.humanPoseAnalyzer = humanPoseAnalyzer;
        this.motionStudy = motionStudy;

        this.startTime = startTime;
        this.endTime = endTime;

        this.cursorTime = this.startTime;
        this.lastUpdate = -1;
        this.playing = true;

        this.animationState = AnimationState.noVideo;

        if (this.videoPlayer) {
            this.attachVideoPlayerEvents();
        }
    }

    get videoPlayer() {
        return this.motionStudy.videoPlayer;
    }

    get videoStartTime() {
        return this.motionStudy.videoStartTime;
    }

    attachVideoPlayerEvents() {
        this.videoPlayer.colorVideo.addEventListener('play', () => {
            if (this.animationState === AnimationState.video) {
                this.playing = true;
            }
        });
        this.videoPlayer.colorVideo.addEventListener('pause', () => {
            if (this.animationState === AnimationState.video) {
                this.playing = false;
            }
        });
    }

    update(time) {
        if (this.lastUpdate < 0) {
            this.lastUpdate = time;
        }
        let dt = time - this.lastUpdate;
        this.lastUpdate = time;
        const duration = this.endTime - this.startTime;
        if (this.playing) {
            this.cursorTime += dt;
            if (this.cursorTime < this.startTime) {
                this.cursorTime = this.startTime;
            }
        }
        let offset = this.cursorTime - this.startTime;
        if (offset > duration) {
            offset = 0;
            this.cursorTime = this.startTime;
            // Reset animation state
            if (this.animationState === AnimationState.video) {
                this.stopVideoPlayback();
            }
        }

        // Adjusted cursorTime that might be tracking a
        // wobbly-relative-to-real-time video playback
        let cursorTimeAdj = this.cursorTime;
        if (this.isVideoPlayerInControl(cursorTimeAdj)) {
            if (this.animationState !== AnimationState.video) {
                this.startVideoPlayback(cursorTimeAdj);
            } else {
                cursorTimeAdj = this.cursorTimeFromVideo();
            }
        } else if (this.animationState === AnimationState.video) {
            this.stopVideoPlayback();
        }

        // As the active HPA we control the shared cursor
        if (this.humanPoseAnalyzer.active) {
            this.motionStudy.setCursorTime(cursorTimeAdj, true);
        } else {
            // Otherwise display the clone without interfering
            this.humanPoseAnalyzer.displayClonesByTimestamp(cursorTimeAdj);
        }
    }

    startVideoPlayback(cursorTime) {
        this.videoPlayer.currentTime = (cursorTime - this.videoStartTime) / 1000;
        this.videoPlayer.play();
        this.animationState = AnimationState.video;
    }

    stopVideoPlayback() {
        this.animationState = AnimationState.noVideo;
        this.videoPlayer.pause();
    }

    isVideoPlayerInControl(cursorTime) {
        if (!this.videoPlayer) {
            return false;
        }
        if (cursorTime < this.videoStartTime) {
            return false;
        }
        let videoLengthMs = this.videoPlayer.videoLength * 1000;
        if (cursorTime > this.videoStartTime + videoLengthMs) {
            return false;
        }
        return true;
    }

    cursorTimeFromVideo() {
        return this.videoPlayer.currentTime * 1000 + this.videoStartTime;
    }
}
