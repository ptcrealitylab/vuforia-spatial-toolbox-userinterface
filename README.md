# vuforia-spatial-toolbox-userinterface

The vuforia-spatial-toolbox-userinterface contains the large majority of the code for rendering the user interface and for client-user interactions. It is a web application that is built to run in a WebView in the [vuforia-spatial-toolbox-ios](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-ios) application, which provides device-specific APIs such as AR tracking. All content rendering, user interactions, and most communication with [Vuforia Spatial Edge Servers](https://github.com/ptcrealitylab/vuforia-spatial-edge-server) takes place in the userinterface repository.

## Installation

Installation instructions for iOS can be found in the [Vuforia Toolbox iOS](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-ios) repository.

Installation instructions for Android, when available, will be found in the [Vuforia Toolbox Android](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-android) repository.

## Development

If you just want to compile and run the app as it is currently implemented, that is all you need to know about the userinterface.

If, however, you want to understand and contribute to the codebase, the following sections will give you an overview of what you need to know.

Beyond this README, please refer to our [Spatial Toolbox Forum](https://forum.spatialtoolbox.vuforia.com) for additional questions and answers.

### Navigating the Code

`index.html` is the entry-point for this codebase, and mostly consists of including all the relevant scripts.

The `src` directory contains all of the JavaScript files defining the application behavior.

It contains the following tree:

- `addons`
    - scripts related to importing userinterface addons (see section below)
- `app`
    - scripts related to communicating with native device APIs, such as interacting with Vuforia Engine.
- `device`
    - wide variety of scripts related to device events and characteristics such as touch events, keyboard events, screen size layout, as well as the onLoad script that acts to initialize the userinterface.
- `gui`
    - scripts related to all visual features, including sub-categories:
    - `ar`
        - scripts related to 3d positioning, rendering, and features that make heavy use of the 3d positioning (e.g. grouping and history)
    - `crafting`
        - scripts related to the grid-based visual programming environment within logic nodes
    - `memory`
        - scripts related to creating and viewing "memories" (saved screenshots with live AR content)
    - `settings`
        - scripts and html pages for creating and viewing the settings menus
- `network`
    - scripts related to REST or websocket-based networking with Vuforia Spatial Edge Servers, and for messages passed between different iframes

Outside of the `src` directory, we also have directories for additional resources including: `css` styles, `svg` and `png` images (for menu and button icons, etc), `nodes` (the HTML for how to render each node type), and `thirdPartyCode`, which contains additional libraries used by the userinterface.

### Extending the userinterface with new features

The userinterface has an addon system where it can load additional content_scripts from the addon packages installed on the local vuforia-spatial-edge-server running within the app, such as the [Core Addon](https://github.com/ptcrealitylab/vuforia-spatial-core-addon), whose README contains an example of how to structure such a script.

You will have to recompile the app to update the userinterface with its new content_scripts.

"Plugin" features that are optional to the core functionality of the app are best constructed as addons. Core services that other modules depend on should instead be included directly in this repository.

### Important Concepts

To understand how the userinterface works, you should start with a handful of core concepts and entry-points into the codebase:

- There is a global variable called `objects` which contains the entire set of recognizable objects (loaded from any vuforia-spatial-edge-servers in the local network) and their associated AR content. By default, this will contain one "world object" where all of your AR content will be placed if you don't connect to any external edge servers.
- The `objects` data structure is composed hierarchically of  `Objects`, `Frames` (also known as  `Tools`), and `Nodes`. Refer to additional documentation about the role each of these entities plays in the sytem.
- Public functions from each module are defined and addressable using scoped namespaces e.g. the `src/addons/index.js` function named `onInit` can be accessed at `realityEditor.addons.onInit`, and and the  `src/app/targetDownloader.js` function named `onTargetFileDownloaded` can be accessed with `realityEditor.app.targetDownloader.onTargetFileDownloaded`.
- The `src/gui/ar/draw.js` file contains the main `update` function, which iterates over the current set of `visibleObjects` detected by Vuforia every frame, and renders all AR content relative to the objects. The `visibleObjects` will always contain the set of objects Vuforia can see right now, as a set of their unique IDs (referred to as a `uuid` or `objectKey`) mapped to a 4x4 transformation matrix (its model matrix relative to some origin point in the world).
- We store each 4x4 transformation matrix in a length-16 array of floats, in column-major order. We have some custom implementations in `src/gui/ar/utilities.js` for efficiently manipulating these matrices.
- The camera position (and resulting view matrix) for the rendering is updated by the `realityEditor.app.callbacks.receiveCameraMatricesFromAR` function, which uses Vuforia's PositionalDeviceTracker to maintain knowledge of the phone's position in space.
- The `src/device/onLoad.js` file contains the `onload` function which initializes the application, including initializing any core or addon modules, building out the menus and 2D UI elements, and asking the native app to initialize the Vuforia Engine.
- The app auto-discovers objects hosted by edge-servers in the local WiFi network by listening to UDP messages in the network using the `receivedUDPMessage` function in `src/app/callbacks.js`. When edge-servers periodically broadcast heartbeat messages for each object they contain, the userinterface will call `realityEditor.network.addHeartbeatObject` to download all data from that object, add its target data to the Vuforia tracker, and add it to the global `objects`.
- The `src/device/index.js` file contains most of the touch event listeners for interacting with AR content, such as moving frames around and drawing links between programming nodes.
- Some extendable components that you might expect to reside in the userinterface repository are actually provided to the userinterface by connected edge servers. There is always at least one connected edge server, because the app itself spins up a local edge server when it launches. That server contains, by default, the [core-addon](https://github.com/ptcrealitylab/vuforia-spatial-core-addon), which has the set of frames (tools) that will load into the pocket, and the sets of nodes and logic blocks you can use for programming.
- The pocket, defined in `src/gui/pocket.js` will load the set of frames (tools) from all the connected edge servers (including the aforementioned local edge server). Thus, to create a new type of frame (tool) that you can drop into the world, you should create an addon with a `tools` directory rather than edit the userinterface.

### Notable DOM Elements

If you are debugging the userinterface and need to inspect the HTML Elements, you may want to look at these:

- `<div id="GUI">`
  - This is the parent element for all of the frame and node divs belonging to current visibleObjects.
  - For each object whose marker is currently visible on the screen, each of that object's frames are added as sibling divs within the #GUI div. They have the following structure:
    - `<div id="object+[frameId]">` is a container for the entire frame, which has a CSS matrix3d transformation applied to position it in 3D space.
      - `<iframe id="iframe+[frameId]">` is the iframe containing the frame's index.html web content.
      - `<div id="[frameId]">` is an invisible element covering the frame, which catches all the touch events.
        - `<svg id="svg+[frameId]">` is a deprecated element that can provide visual feedback when this frame is selected.
- `<div id="craftingBoard">` contains the entire interface for the grid-based programming mode, referred to in the code as "logic crafting".
- `<div id="UIButtons">` contains the sidebar menu buttons and all of their variations.
- `<div class="pocket">` contains the pocket screen that holds the palette of available frames that can be dropped into the world.
- `<canvas id="canvas">` is a fullscreen canvas behind the AR content where the links are rendered onto in pseudo-3D.
- `<div id="overlay">` is a small circular icon that gives visual feedback when you touch the screen.
- `<iframe id="settingsIframe">` contains the settings menu and all of its sub-menus.

### Code Documentation

Most code is documented using JSDoc comments, which can be compiled into human-readable pages of documentation using [documentation.js](http://documentation.js.org).

You should first install the documentation.js node package:

```bash
npm install -g documentation
```

Then you can generate up-to-date documentation of each file by running the included `generate_docs` script:

```bash
bash ./generate_docs.sh
```

This will generate a `docs` directory with a hierarchical set of folders mirroring the structure of the `src` directory. Open each `index.html` to view the documented members of each module.


