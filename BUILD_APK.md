# 📱 Build TaskFlow APK

Three ways to get your APK file!

---

## 🚀 Option 1: EAS Build (Recommended!)

The easiest way to get your APK - uses Expo's cloud build service!

### Step 1: Sign up for Expo
1. Go to https://expo.dev/
2. Sign up or log in with GitHub

### Step 2: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 3: Login
```bash
eas login
```

### Step 4: Configure Project
```bash
eas build:configure
```

### Step 5: Build APK!
```bash
# Build a preview APK (installable directly)
eas build --platform android --profile preview
```

### Step 6: Download
When build finishes, you'll get a download link!

---

## 💻 Option 2: Local Build (No Account Needed!)

Build APK on your own computer!

### Prerequisites
- **Java Development Kit (JDK) 17 or higher**
- **Node.js 18 or higher**
- **Android Studio (optional but helpful)**

### Step 1: Install Dependencies
```bash
cd /workspace
npm install
```

### Step 2: Prebuild Android Project
```bash
npx expo prebuild --platform android
```

### Step 3: Build APK
```bash
cd android

# Linux/Mac
chmod +x gradlew
./gradlew assembleDebug

# Windows
gradlew.bat assembleDebug
```

### Step 4: Find Your APK!
The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔧 Option 3: GitHub Actions Build (No Account Needed!)

I'll configure GitHub Actions to build for you!

Just visit:
https://github.com/badhope/TaskFlow/actions

And manually run the workflow.

---

## 📁 What You'll Get

When you build:

```
APK File: app-debug.apk
Size: ~20-30 MB
Type: Debug build (installable on any Android device)
Features: Full TaskFlow app!
```

---

## 📱 Installing APK

1. Transfer the APK to your Android device
2. Open it on your phone
3. Enable "Unknown Sources" if needed
4. Install!
5. Start organizing your tasks! 🎉

---

## 🔍 Troubleshooting

### Gradle Download Times Out
If you see "Connection timed out" when downloading Gradle:
- Try again on a better internet connection
- Or use Option 1 (EAS Build) - no local setup needed!

### Other Issues
- Check that you have JDK 17+ installed
- Verify your JAVA_HOME environment variable is set
- See QUICK_START.md for more help!

---

## 📞 Need Help?

- First try **Option 1 (EAS Build)** - it's easiest!
- Then try **Option 2 (Local Build)** if you prefer
- See QUICK_START.md for even more help
