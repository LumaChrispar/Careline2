# Expo SDK 57 upgrade

The installed application lives in `ecomedik-mobile`. This upgrade moves it from SDK 54 through SDK 55 and 56 to the latest stable SDK 57 release available on 15 September 2026. Preview SDK releases are excluded.

Installed versions: Expo **57.0.23**, React Native **0.86.3**, React **19.2.3**. The dependency ranges stay within SDK 57, and `package-lock.json` records the exact installation.

Verified locally: all **21 Expo Doctor checks**, matching bundled-module versions, a valid installed dependency tree, and Android/iOS Hermes exports. Metro's Android manifest reports **SDK 57.0.0**, which is the SDK identifier expected by Expo Go 57. Existing 47 regression tests, lint and the web production build also pass. Physical-device acceptance remains outstanding.

## Install and check

Use Node.js 24 LTS and run these commands from `ecomedik-mobile`:

```sh
npm ci
npm run check:dependencies
npm run doctor
npm run export:native
```

The lockfile records the complete dependency installation. Keep it with `package.json`; use `expo install` when adding native modules so their versions match the SDK.

## Rebuild the installed app

For Expo Go on SDK 57, run `npm run start:go` and scan the new QR code. This explicitly selects Expo Go and clears Metro's old SDK cache. Stop any previously running Metro process before starting it. `npm start` also selects Expo Go; use `npm run start:dev` for a custom development client.

An SDK upgrade changes native code. Previously installed SDK 54 development clients must be rebuilt. A JavaScript refresh or over-the-air update cannot perform this upgrade.

The existing EAS development profile uses `expo-dev-client`. After configuring EAS credentials, build and install a new client:

```sh
npx eas-cli@latest build --profile development --platform android
npm run start:dev
```

For a standalone Android test APK, use `npx eas-cli@latest build --profile preview --platform android`. Set the mobile Supabase public environment variables in the EAS environment used for the build. Never include a service-role key in the app.

iOS requires iOS 16.4 or later and Xcode 26.4 or later for local builds. Local iOS builds require macOS. Configure the iOS bundle identifier and Apple signing credentials before building for an iPhone; this project currently specifies only the existing Android application identifier. No cloud build or store submission is part of this dependency upgrade.

The project uses generated native projects and does not track `android/` or `ios/`. SDK 57 prebuild regenerates those directories by default. Keep any future native customizations in config plugins or account for regeneration before running prebuild.

## Compatibility review

- Expo native modules, React and React Native follow SDK 57's supported versions.
- New Architecture and Android edge-to-edge behavior are mandatory; obsolete opt-out flags are absent from the app configuration.
- The Careline launch image uses the `expo-splash-screen` config plugin; SDK 57 no longer accepts the old top-level `splash` field.
- The existing FileSystem calls do not use the copy/move methods whose asynchronous behavior changed in SDK 56.
- Camera, document selection, secure session storage, date selection, PDF generation and native sharing require acceptance tests on rebuilt devices.

See [release verification](RELEASE_CHECKLIST.md) for the hosted-service and device test checklist. Bundle exports check compilation; they do not create signed installation packages or exercise device permissions.

Sources: [SDK upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [SDK 55 changes](https://expo.dev/changelog/sdk-55), [SDK 56 changes and platform requirements](https://expo.dev/changelog/sdk-56), and [SDK 57 release notes](https://expo.dev/changelog/sdk-57).
