# MFK Mobile Development Build

Development builds are required for native OBD/BLE features such as `react-native-ble-plx`.
Expo Go cannot run those native modules.

## Environment

Create `artifacts/mfk-mobile/.env` from `.env.example` and set:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_DOMAIN=
```

Leave `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_DOMAIN` empty for development builds so the mobile Supabase bridge handles API calls directly.

## Install

From the repository root:

```powershell
pnpm install --config.confirmModulesPurge=false
```

If pnpm asks for approved builds, approve `esbuild`:

```powershell
pnpm approve-builds
```

## Build Android

Install or run EAS CLI:

```powershell
npm install --global eas-cli
eas login
```

Then build the Android development APK:

```powershell
cd artifacts\mfk-mobile
eas build --platform android --profile development
```

## Build iOS

```powershell
cd artifacts\mfk-mobile
eas build --platform ios --profile development
```

## Start Metro For The Dev Client

After installing the development build on the phone:

```powershell
cd artifacts\mfk-mobile
pnpm dev:client
```
