# 📱 TaskFlow Releases

## Get Your APK! 📦

Three ways to download the app!

---

## 1️⃣ **EAS Build (Recommended)**

The easiest way!

1. Go to https://expo.dev/ and sign up
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Configure: `eas build:configure`
5. Build: `eas build --platform android --profile preview`
6. Download your APK when finished!

See [BUILD_APK.md](../BUILD_APK.md) for detailed instructions.

---

## 2️⃣ **Build Locally (No Account Needed!)**

Build APK on your computer!

**Linux/Mac:**
```bash
cd /workspace
npm install
npx expo prebuild --platform android
cd android
chmod +x gradlew
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

**Windows:**
```batch
cd \workspace
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleDebug

# APK will be at: android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 3️⃣ **GitHub Actions (Optional)**

If you have configured your `EXPO_TOKEN` in GitHub Secrets:

1. Go to: https://github.com/badhope/TaskFlow/actions
2. Select the "EAS Build APK" workflow
3. Click "Run workflow"
4. Check your Expo dashboard for progress!

---

## 4️⃣ **Test First! (Fastest!)**

Don't want to build yet? Test the app instantly!

1. Install **Expo Go** on your phone:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. Run in the project directory:
   ```bash
   cd /workspace
   npm start
   ```

3. Open Expo Go and scan the QR code!

---

## About TaskFlow

TaskFlow is a beautiful, modern todo list application built with React Native and Expo.

### ✨ Features
- Create, edit, and delete tasks
- Mark tasks as complete
- Organize with categories
- Beautiful, intuitive UI
- Local data persistence
- TypeScript support

### 🛠️ Tech Stack
- React Native
- Expo
- TypeScript
- React Navigation
- Zustand (State Management)
- AsyncStorage

---

## 📞 Need Help?

Check out these files:
- [QUICK_START.md](../QUICK_START.md) - Fast start guide!
- [BUILD_APK.md](../BUILD_APK.md) - Detailed build instructions!
- [README.md](../README.md) - Project overview!

---

Made with ❤️
