# TaskFlow releases

Built APKs land here. The repo doesn't ship binaries; this folder exists
so a manual upload via the GitHub UI (Actions → run workflow → upload
artifact → drag into `releases/`) has an obvious destination.

## How to actually build one

Three paths. Pick whichever one you have credentials for.

### EAS (cloud build, needs an Expo account)

```
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

The dashboard gives you a download link when it's done. See
[BUILD_APK.md](../BUILD_APK.md) for the long version.

### Local Gradle (no account)

```
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### GitHub Actions

The `EAS Build APK` workflow takes a `EXPO_TOKEN` secret. Add one in
the repo settings if you want to use this — without it the workflow
will silently skip the actual build step.

## What you'll get

Same APK regardless of path. v1.1.0 bundle ID is `com.taskflow.app`,
min SDK 24, target SDK 34. Release builds are signed with whatever
keystore EAS generated; debug builds use the auto-generated debug
keystore (fine for side-loading, not for the Play Store).
