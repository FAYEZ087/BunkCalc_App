<div align="center">

# 📱 BunkCalc

### _Take Control of Your College Life._

[![Version](https://img.shields.io/badge/version-1.1.0-blue?style=for-the-badge)](https://github.com/bunkcalc)
[![Platform](https://img.shields.io/badge/platform-Android-3ddc84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/bunkcalc)
[![License](https://img.shields.io/badge/license-Private-red?style=for-the-badge)](https://github.com/bunkcalc)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com)

The **ultimate proactive attendance tracker** built for university students.  
Smart math. Timely alerts. Beautiful UI. Zero data collection.

---

</div>

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Proactive Calculations** | Know exactly how many classes to attend to hit 75%, or how many you can safely skip |
| 🔔 **Smart Notifications** | Pre-class reminders and post-class attendance prompts, all scheduled locally on-device |
| 📅 **Today View** | See your daily schedule at a glance with one-tap attendance marking |
| 📈 **Statistics Dashboard** | Rich analytics with per-subject and overall attendance percentages |
| 🗂️ **Semester Archives** | Automatically archive past semesters and browse your academic history |
| 🎨 **Share Cards** | Generate beautiful attendance summary cards to share with friends |
| 🧪 **Lab Support** | Lab multiplier (1×/2×) matches university standards for practical classes |
| 🌙 **Dark Mode** | System-aware theming with light, dark, and auto modes |
| 📴 **Fully Offline** | All data stored locally on-device — no internet, no servers, no tracking |
| 📤 **Import / Export** | Backup and restore your data via validated JSON files |
| 🎬 **Splash Animation** | Custom branded launch animation with skip-on-tap support |
| 🔐 **Security Hardened** | CSP headers, strict input validation, prototype pollution prevention |

---

## 🏗️ Tech Stack

```
Frontend       React 19 + TypeScript 6
Styling        Tailwind CSS 4
State          Zustand 5
Build          Vite 8
Native Shell   Capacitor 8 (Android)
Haptics        @capacitor/haptics
Notifications  @capacitor/local-notifications
Storage        @capacitor/preferences (encrypted key-value)
File I/O       @capacitor/filesystem
Share          @capacitor/share
```

---

## 📂 Project Structure

```
BunkCalc1/
├── android/                  # Native Android project (Capacitor-managed)
│   └── app/
│       ├── build.gradle      # Android build config (versionCode 2, v1.1.0)
│       └── src/main/
│           ├── assets/       # Synced web bundle + public assets
│           └── res/          # Launcher icons (mdpi → xxxhdpi) + splash
├── public/                   # Static assets served by Vite
│   ├── favicon.png           # 32×32 favicon
│   ├── icon-192.png          # PWA icon
│   ├── icon-512.png          # PWA splash icon
│   ├── apple-touch-icon.png  # iOS Safari home screen
│   ├── manifest.webmanifest  # PWA manifest
│   └── app_launching_animation.mp4
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── SplashScreen.tsx     # Branded launch animation
│   │   ├── BottomNav.tsx        # Tab navigation
│   │   ├── SubjectCard.tsx      # Subject attendance card
│   │   ├── SubjectModal.tsx     # Add/edit subject modal
│   │   ├── TodayList.tsx        # Daily schedule list
│   │   ├── TimetableGrid.tsx    # Weekly timetable grid
│   │   ├── ShareCard.tsx        # Shareable attendance card
│   │   ├── OnboardingCarousel.tsx
│   │   ├── AlertBanner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LegalModal.tsx
│   │   ├── AppModal.tsx
│   │   └── UndoToast.tsx
│   ├── pages/                # Screen-level views
│   │   ├── Home.tsx             # Dashboard
│   │   ├── Today.tsx            # Today's schedule
│   │   ├── Statistics.tsx       # Analytics
│   │   ├── Settings.tsx         # App settings
│   │   ├── Setup.tsx            # First-run setup
│   │   ├── SubjectDetail.tsx    # Individual subject view
│   │   └── GlobalHistory.tsx    # Semester archive browser
│   ├── store/                # Zustand state management
│   │   ├── useSubjects.ts
│   │   ├── useAttendance.ts
│   │   └── useSettings.ts
│   ├── lib/                  # Business logic & utilities
│   │   ├── calculations.ts      # Attendance math engine
│   │   ├── validation.ts        # Input sanitisation & import validation
│   │   ├── notifications.ts     # Local notification scheduling
│   │   ├── permissions.ts       # Native permission requests
│   │   ├── storage.ts           # Data migration & persistence
│   │   ├── shareCard.ts         # Share card image generation
│   │   └── types.ts             # TypeScript type definitions
│   ├── App.tsx               # Root component
│   ├── App.css
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles
├── index.html                # HTML entry (with CSP meta tag)
├── capacitor.config.ts       # Capacitor configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Android Studio** (for building the APK)
- **Java JDK 17** (for Gradle)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd BunkCalc1

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

### Building for Android

```bash
# 1. Build the production web bundle
npm run build

# 2. Sync with the Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Build → Generate Signed APK from Android Studio
```

---

## 🔒 Security

BunkCalc takes security seriously, even as a fully offline application:

| Layer | Implementation |
|---|---|
| **Content Security Policy** | Strict CSP meta tag blocks all external scripts, styles, and connections |
| **Input Sanitisation** | All user inputs are stripped of HTML, script tags, control characters, and zero-width unicode |
| **Import Validation** | JSON import payloads are schema-validated with prototype pollution detection |
| **Type Safety** | Full TypeScript with strict mode across the entire codebase |
| **No Secrets in Code** | Zero API keys, tokens, or credentials — the app has no backend |
| **Secure Storage** | Data persisted via Capacitor Preferences (Android SharedPreferences, encrypted) |

---

## 🎨 Design Philosophy

- **Local-first**: Your data never leaves your device
- **Proactive, not reactive**: The app tells you what to do _before_ it's too late
- **Respectful**: No ads, no tracking, no analytics, no subscriptions
- **Beautiful**: Polished dark/light UI with micro-animations and haptic feedback
- **Accessible**: Designed for one-handed use with a clear information hierarchy

---

## 📋 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint across the codebase |
| `npm run preview` | Preview the production build locally |
| `npx cap sync android` | Sync web assets → Android native project |
| `npx cap open android` | Open the Android project in Android Studio |

---

## 📄 License

This project is **private** and not open-source. All rights reserved.

---

<div align="center">

**Built with ❤️ for students who know when to show up — and when not to.**

`v1.1.0` · `com.bunkcalc.app`

</div>
