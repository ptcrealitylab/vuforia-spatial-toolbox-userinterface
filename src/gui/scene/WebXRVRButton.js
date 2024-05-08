class WebXRVRButton {

	static createButton( renderer ) {

		const button = new realityEditor.gui.MenuItem("", {toggle: false}, null);

		function showEnterVR( /*device*/ ) {

			let currentSession = null;

			async function onSessionStarted( session ) {

				session.addEventListener( 'end', onSessionEnded );

				await renderer.xr.setSession( session );
				button.setText('Exit VR');

				currentSession = session;

			}

			function onSessionEnded( /*event*/ ) {

				currentSession.removeEventListener( 'end', onSessionEnded );

				button.setText('Enter VR');

				currentSession = null;

			}

			//

			button.setText('Enter VR');

			button.addCallback(function () {

				if ( currentSession === null ) {

					// WebXR's requestReferenceSpace only works if the corresponding feature
					// was requested at session creation time. For simplicity, just ask for
					// the interesting ones as optional features, but be aware that the
					// requestReferenceSpace call will fail if it turns out to be unavailable.
					// ('local' is always available for immersive sessions and doesn't need to
					// be requested separately.)

					const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
					navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );

				} else {

					currentSession.end();

				}

			});

		}

		function disableButton() {

			button.disable();

		}

		function showWebXRNotFound() {

			disableButton();

			button.setText('VR not supported');

		}

		function showVRNotAllowed( exception ) {

			disableButton();

			console.warn( 'Exception when trying to call xr.isSessionSupported', exception );

			button.setText('VR not allowed');

		}

		if ( 'xr' in navigator ) {

			navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {

				supported ? showEnterVR() : showWebXRNotFound();

				if ( supported && WebXRVRButton.xrSessionIsGranted ) {

					button.triggerItem();

				}

			} ).catch( showVRNotAllowed );

			return button;

		} else {

            disableButton();

			if ( window.isSecureContext === false ) {

                button.setText('WebXR needs https'); // TODO Improve message
                

			} else {

                button.setText('WebXR not available');

			}

			return button;

		}

	}

	static xrSessionIsGranted = false;

	static registerSessionGrantedListener() {

		if ( 'xr' in navigator ) {

			// WebXRViewer (based on Firefox) has a bug where addEventListener
			// throws a silent exception and aborts execution entirely.
			if ( /WebXRViewer\//i.test( navigator.userAgent ) ) return;

			navigator.xr.addEventListener( 'sessiongranted', () => {

				WebXRVRButton.xrSessionIsGranted = true;

			} );

		}

	}

}

WebXRVRButton.registerSessionGrantedListener();

export { WebXRVRButton };
