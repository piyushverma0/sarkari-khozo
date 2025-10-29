# Sarkari Khozo - Native Android App

A native Android application for finding government job opportunities in India, built with Kotlin and Material Design 3.

## Features

- **Modern Material Design 3 UI** with dynamic theming
- **Government Job Listings** from various categories (SSC, Railway, Banking, UPSC, etc.)
- **Search and Filter** functionality for jobs
- **Notifications** for new job postings and deadline reminders
- **Save Jobs** for later reference
- **Dark/Light Theme** support
- **Offline Support** with local caching
- **Push Notifications** for important updates

## Tech Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Architecture**: MVVM with Clean Architecture
- **Dependency Injection**: Hilt
- **Networking**: Retrofit + OkHttp
- **Serialization**: Kotlinx Serialization
- **Navigation**: Navigation Compose
- **Database**: Room (for offline support)
- **Image Loading**: Coil
- **Background Tasks**: WorkManager

## Project Structure

```
app/
├── src/main/java/com/sarkarikhozo/app/
│   ├── data/
│   │   ├── api/          # API service interfaces
│   │   ├── model/        # Data models
│   │   └── repository/   # Repository implementations
│   ├── di/               # Dependency injection modules
│   ├── ui/
│   │   ├── components/   # Reusable UI components
│   │   ├── navigation/   # Navigation setup
│   │   ├── screens/      # Screen composables
│   │   └── theme/        # Material Design theme
│   ├── workers/          # Background workers
│   └── SarkariKhozoApplication.kt
└── src/main/res/         # Resources (strings, colors, etc.)
```

## Getting Started

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 8 or higher
- Android SDK with API level 24+ (Android 7.0)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd android-native
   ```

2. **Open in Android Studio**:
   - Open Android Studio
   - Select "Open an existing project"
   - Navigate to the `android-native` folder and select it

3. **Sync the project**:
   - Android Studio will automatically sync Gradle dependencies
   - Wait for the sync to complete

4. **Build and Run**:
   - Connect an Android device or start an emulator
   - Click the "Run" button or press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)

### Configuration

1. **API Configuration**:
   - Update the `BASE_URL` in `NetworkModule.kt` to point to your backend API
   - Add any required API keys or authentication headers

2. **Firebase (Optional)**:
   - Add `google-services.json` to the `app/` directory for push notifications
   - Uncomment Firebase-related code in `AndroidManifest.xml`

## Building for Release

1. **Generate Signed APK/AAB**:
   ```bash
   ./gradlew assembleRelease
   # or for Android App Bundle
   ./gradlew bundleRelease
   ```

2. **Configure Signing**:
   - Create a keystore file for app signing
   - Update `build.gradle.kts` with signing configuration
   - Store sensitive information in `local.properties`

## API Integration

The app expects a REST API with the following endpoints:

- `GET /jobs` - Get paginated job listings
- `GET /jobs/{id}` - Get job details by ID
- `GET /jobs/featured` - Get featured jobs
- `GET /jobs/trending` - Get trending jobs
- `GET /jobs/latest` - Get latest jobs
- `GET /categories` - Get job categories

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Screenshots

[Add screenshots of the app here]

## Contact

For any questions or support, please contact:
- Email: support@sarkarikhozo.com
- Website: https://sarkarikhozo.com

---

**Note**: This is a native Android application built specifically for the Google Play Store. It provides better performance and native Android features compared to hybrid solutions.