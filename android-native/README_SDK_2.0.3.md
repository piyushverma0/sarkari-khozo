# Sarkari Khozo - Android Native App

## 🎯 **Supabase Kotlin SDK 2.0.3**

This Android native app uses **Supabase Kotlin SDK 2.0.3** for backend connectivity.

---

## 📚 **Documentation**

### Quick Links
1. **[SUPABASE_SDK_2.0.3_API_REFERENCE.md](./SUPABASE_SDK_2.0.3_API_REFERENCE.md)** - Complete SDK 2.0.3 API documentation
2. **[SUPABASE_INTEGRATION_GUIDE.md](./SUPABASE_INTEGRATION_GUIDE.md)** - Integration setup and features
3. **[SDK_MIGRATION_GUIDE.md](./SDK_MIGRATION_GUIDE.md)** - Differences from newer SDK versions
4. **[BUILD_FIXES_SUMMARY.md](./BUILD_FIXES_SUMMARY.md)** - All build fixes applied
5. **[FINAL_VERIFICATION_REPORT.md](./FINAL_VERIFICATION_REPORT.md)** - Complete verification report

---

## 🔧 **Technology Stack**

| Component | Version | Notes |
|-----------|---------|-------|
| **Supabase SDK** | 2.0.3 | Uses `gotrue`, not `auth` |
| **Kotlin** | 2.0.0 | Compatible with SDK 2.0.3 |
| **Android Gradle Plugin** | 8.7.2 | Latest stable |
| **Compose BOM** | 2024.10.01 | Latest Jetpack Compose |
| **Material3** | 1.3.1 | Modern UI components |
| **Hilt** | 2.52 | Dependency injection |
| **Ktor** | 2.3.12 | HTTP client for Supabase |

---

## ⚡ **Quick Start**

### 1. Prerequisites
- Android Studio Hedgehog or newer
- JDK 17 or newer
- Android SDK 24+ (Minimum)
- Android SDK 35 (Target)

### 2. Setup
```bash
# Clone and navigate
cd android-native

# Sync dependencies
./gradlew build

# Run on device/emulator
./gradlew installDebug
```

### 3. Configuration
All Supabase credentials are pre-configured in `app/build.gradle.kts`:
```kotlin
buildConfigField("String", "SUPABASE_URL", "\"https://rmgtjzeuhckqhuwwzrlm.supabase.co\"")
buildConfigField("String", "SUPABASE_ANON_KEY", "\"your-anon-key\"")
```

---

## 🔑 **Key SDK 2.0.3 Differences**

### Authentication
```kotlin
// ✅ SDK 2.0.3 (Current)
import io.github.jan.supabase.gotrue.gotrue
supabase.gotrue.loginWith(Email) { }
supabase.gotrue.logout()

// ❌ SDK 2.6.0+ (Don't use - incompatible)
import io.github.jan.supabase.auth.auth
supabase.auth.signInWith(Email) { }
supabase.auth.signOut()
```

### Function Calls
```kotlin
// ✅ SDK 2.0.3 (Current)
val response = supabase.functions.invoke("function")
val result = response.decodeToString()

// ❌ SDK 2.6.0+ (Don't use - incompatible)
val response = supabase.functions.invoke("function")
val result = response.data.toString()
```

### Database Queries
```kotlin
// ✅ SDK 2.0.3 (Current)
supabase.from("table")
    .select()
    .order(column = "created_at", ascending = false)  // Named parameter required

// ⚠️ SDK 2.6.0+ (Different API)
supabase.from("table")
    .select()
    .order("created_at", ascending = false)  // Positional parameter
```

---

## 📁 **Project Structure**

```
android-native/
├── app/
│   └── src/main/java/com/sarkarikhozo/app/
│       ├── data/
│       │   ├── model/           # Data models
│       │   ├── repository/      # Repository pattern (SDK 2.0.3)
│       │   └── supabase/        # Supabase client (GoTrue)
│       ├── di/                  # Hilt modules
│       ├── ui/                  # Compose UI
│       └── workers/             # Background tasks
├── gradle/
│   └── libs.versions.toml       # Dependency versions
└── Documentation files
```

---

## 🚀 **Features**

### ✅ Implemented
- 🔐 **Authentication** - Sign up, sign in, sign out (GoTrue)
- 📊 **Application Tracking** - AI-powered tracking via Edge Functions
- 📰 **Discovery Feed** - News scraping and management
- 💼 **Job Listings** - Government job opportunities
- 🔔 **Notifications** - Real-time updates
- 🌐 **Multi-language** - English & Hindi support
- 🎨 **Material3 UI** - Modern design system

### 🔗 Connected Edge Functions
- `process-query` - AI application tracking
- `get-discovery-feed` - News feed retrieval
- `scrape-news-sources` - Fresh news scraping
- `generate-audio-news-bulletin` - Audio generation
- `track-story-interaction` - User interactions
- `get-saved-stories` - Saved content

---

## 🧪 **Testing**

### Run Tests
```bash
# Unit tests
./gradlew test

# Instrumentation tests
./gradlew connectedAndroidTest

# Lint checks
./gradlew lint
```

### Manual Testing Checklist
- [ ] Sign up with new email
- [ ] Sign in with existing account
- [ ] Track application (e.g., "SSC CGL")
- [ ] Browse discovery feed
- [ ] Save/unsave stories
- [ ] View notifications
- [ ] Change language
- [ ] Sign out

---

## 🐛 **Troubleshooting**

### Build Errors

#### "Unresolved reference 'auth'"
**Cause**: Using newer SDK API  
**Solution**: Use `gotrue` instead of `auth`
```kotlin
// ✅ Correct
import io.github.jan.supabase.gotrue.gotrue
client.gotrue.loginWith(Email) { }
```

#### "Unresolved reference 'data'"
**Cause**: Using newer SDK API  
**Solution**: Use `decodeToString()` instead
```kotlin
// ✅ Correct
val result = response.decodeToString()
```

#### "No value passed for parameter 'column'"
**Cause**: Missing named parameter  
**Solution**: Add `column =`
```kotlin
// ✅ Correct
.order(column = "created_at", ascending = false)
```

### Runtime Errors

#### Authentication Fails
1. Check internet connection
2. Verify Supabase URL and anon key
3. Check email/password format
4. Verify Supabase Auth settings

#### Function Calls Fail
1. Check function name is correct
2. Verify function is deployed
3. Check request payload format
4. Review Edge Function logs in Supabase dashboard

---

## 📖 **Learning Resources**

### SDK 2.0.3 Specific
- **API Reference**: `SUPABASE_SDK_2.0.3_API_REFERENCE.md`
- **Migration Guide**: `SDK_MIGRATION_GUIDE.md`
- **Integration Guide**: `SUPABASE_INTEGRATION_GUIDE.md`

### General
- **Supabase Docs**: https://supabase.com/docs
- **Kotlin Docs**: https://kotlinlang.org/docs/home.html
- **Jetpack Compose**: https://developer.android.com/jetpack/compose
- **Material3**: https://m3.material.io/

---

## 🤝 **Contributing**

### Code Style
- Follow Kotlin coding conventions
- Use meaningful variable/function names
- Add KDoc comments for public APIs
- Keep functions small and focused

### Commit Guidelines
- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep commits atomic and focused

---

## 📝 **Version History**

### Current: 1.0.0
- ✅ Full Supabase SDK 2.0.3 integration
- ✅ Kotlin 2.0.0 compatibility
- ✅ Material3 UI implementation
- ✅ All features working
- ✅ Production ready

---

## 📄 **License**

[Your License Here]

---

## 🔗 **Links**

- **Web App**: [URL]
- **Backend**: Supabase (rmgtjzeuhckqhuwwzrlm.supabase.co)
- **API Docs**: See documentation files

---

## 📧 **Support**

For issues specific to SDK 2.0.3:
1. Check `SUPABASE_SDK_2.0.3_API_REFERENCE.md`
2. Review `SDK_MIGRATION_GUIDE.md`
3. See `FINAL_VERIFICATION_REPORT.md`

For general issues:
- Create GitHub issue
- Check existing documentation
- Review Supabase docs

---

## ✅ **Status**

**Build Status**: ✅ Passing  
**SDK Version**: 2.0.3  
**Kotlin Version**: 2.0.0  
**Last Updated**: 2025-10-31  
**Production Ready**: Yes

---

**Built with ❤️ using Supabase Kotlin SDK 2.0.3**
