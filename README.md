# Vuforia Spatial Toolbox

## Installation
How to build and run Vuforia Spatial Toolbox from your computer.

### Terminal commands

Note: you need to have [CocoaPods](https://guides.cocoapods.org/using/getting-started.html) installed, which you can get on MacOS using:

```bash
sudo gem install cocoapods
```

Then you can run this, line by line:

```bash
cd ~/Documents
mkdir -p vuforia-spatial-toolbox
cd vuforia-spatial-toolbox
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-ios.git
cd vuforia-spatial-toolbox-ios
cd bin/data
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-server.git
mv vuforia-spatial-toolbox-server RE-server
cd RE-server
mkdir addons
cd addons
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-core-addons.git
cd ../
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-apps.git
mv vuforia-spatial-toolbox-apps realityframes
cd realityframes
mkdir .identity
cd ../
npm install
cd ../
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-userinterface.git
mv vuforia-spatial-toolbox-userinterface userinterface
cd userinterface
cd ../../../
pod install
echo Download Vuforia.framework from developer.vuforia.com
echo Paste Vuforia.framework into this directory:
pwd
echo Acquire your VuforiaKey.h license file
echo paste VuforiaKey.h into this directory:
echo "$(pwd)/Reality\ Editor\ iOS"
echo When these files are in place, open ./Reality\ Editor\ iOS.xcworkspace
echo Then set up code signing, and finally compile and run the project.
```



### Explanation

1. Create a directory to hold the repositories. It doesn't need to be in your Documents, I just chose this for convenience:

```
cd ~/Documents
mkdir -p vuforia-spatial-toolbox
cd vuforia-spatial-toolbox
```

2) Clone the vuforia-toolbox-ios repo from GitHub. The master branches of all repositories should be stable.

```
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-ios.git
cd vuforia-spatial-toolbox-ios
```


3) Clone the vuforia-toolbox-server into the bin/data directory of the app and rename the directory to RE-server

```
cd bin/data
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-server.git
mv vuforia-spatial-toolbox-server RE-server
cd RE-server
```


4) Create an addons folder in the RE-server and clone the vuforia-spatial-toolbox-core-addons into that folder.

```
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-core-addons.git
cd ../
```


5) Clone the vuforia-spatial-toolbox-apps into the RE-server and rename the directory to realityframes. Create a .identity folder inside it because the node server can't do that itself when running within the iOS app.

```
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-apps.git
mv vuforia-spatial-toolbox-apps realityframes
```


6) Run npm install in the RE-server. You may have to go back here and manually run npm install for new node packages if they are missing when you try to run the app.

```
cd ../
npm install
```


7) Clone the vuforia-spatial-toolbox-userinterface into the bin/data directory of the app, and rename the directory to userinterface

```
cd ../
git clone git@github.com:ptcrealitylab/vuforia-spatial-toolbox-userinterface.git
mv vuforia-toolbox-userinterface userinterface
```


8) Go back to the top level directory of the iOS project, and install its dependencies using [CocoaPods](https://guides.cocoapods.org/using/getting-started.html) (run `sudo gem install cocoapods` first if `pod install` fails)

```
cd ../../../
pod install
```


9) Download Vuforia SDK version 8.6.7 from https://developer.vuforia.com/downloads/sdk (Click link for *vuforia-sdk-ios-8-6-7.zip (53.67 MB)*)

    - paste the Vuforia.framework file from the `build` directory of the download, into the `~/Documents/vuforia-spatial-toolbox/vuforia-spatial-toolbox-ios` directory


10) Get the VuforiaKey.h file from Ben or Valentin.

    - paste VuforiaKey.h into the `~/Documents/vuforia-spatial-toolbox/vuforia-spatial-toolbox-ios/Reality Editor iOS` directory 


11) When these files are in place, open Reality Editor iOS.xcworkspace. Make sure to open the .xcworkspace and not the .xcodeproj, otherwise the dependencies won't load. Make sure Xcode is set up with your Apple developer profile for code signing. You should be able to compile and run the project (it won't run on the simulator, need to have an iOS device connected).
