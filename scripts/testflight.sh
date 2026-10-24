#!/bin/zsh
# Builds the iPhone and iPad app and uploads it to TestFlight. Run on the Mac from the repo folder:
#   scripts/testflight.sh <build number>
# Needs: Xcode signed in to team PCA5FZ26HM, the Firebase CLI signed in, and Google sign-in
# switched on in Firebase before the first run (so the Google file carries its client ID).
set -euo pipefail
BUILD=${1:?Give the build number, for example 1}
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
PLIST=ios/App/App/GoogleService-Info.plist
BUNDLE=com.liferegulationlab.wholestory

npm ci
npm run build:shell

if [[ ! -s $PLIST ]]; then
  APP_ID=$(npx firebase-tools apps:list IOS --project whole-story-lrl --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=(JSON.parse(s).result||[]).find(x=>x.namespace==='$BUNDLE');process.stdout.write(a?a.appId:'')})")
  if [[ -z $APP_ID ]]; then
    npx firebase-tools apps:create IOS "Whole Story iPhone" --bundle-id $BUNDLE --project whole-story-lrl
    APP_ID=$(npx firebase-tools apps:list IOS --project whole-story-lrl --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=(JSON.parse(s).result||[]).find(x=>x.namespace==='$BUNDLE');process.stdout.write(a?a.appId:'')})")
  fi
  npx firebase-tools apps:sdkconfig IOS "$APP_ID" --project whole-story-lrl -o $PLIST
fi

REVERSED=$(/usr/libexec/PlistBuddy -c 'Print :REVERSED_CLIENT_ID' $PLIST 2>/dev/null || true)
if [[ -z $REVERSED ]]; then
  echo "The Google file has no REVERSED_CLIENT_ID. Switch on Google sign-in in Firebase, delete $PLIST and run again."
  exit 1
fi
sed -i '' "s/GOOGLE_REVERSED_CLIENT_ID/$REVERSED/" ios/App/App/Info.plist

cd ios/App
sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $BUILD;/g" App.xcodeproj/project.pbxproj
rm -rf build/WholeStory.xcarchive
xcodebuild -project App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' \
  -archivePath build/WholeStory.xcarchive -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath build/WholeStory.xcarchive -exportOptionsPlist ../ExportOptions.plist \
  -exportPath build/export -allowProvisioningUpdates
echo "Uploaded Whole Story 1.0 ($BUILD). It shows in App Store Connect after Apple processes it."
