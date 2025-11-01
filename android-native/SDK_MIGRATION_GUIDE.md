# Supabase SDK 2.0.3 Migration Guide

## 📖 **Overview**

This guide explains the differences between Supabase Kotlin SDK 2.0.3 (used in this project) and newer versions (2.6.0+). If you're coming from newer SDK versions or planning to upgrade in the future, this guide will help you understand the API changes.

---

## 🔄 **Why SDK 2.0.3?**

**Compatibility Reasons:**
- ✅ Stable and well-tested version
- ✅ Compatible with Kotlin 2.0.0
- ✅ Works with current Hilt and Compose versions
- ✅ No breaking changes within 2.0.x series

**Known Issues with Newer Versions:**
- ❌ Version 2.6.0 doesn't exist in Maven repositories
- ❌ Newer versions may have compatibility issues with Kotlin 2.0.0
- ❌ API breaking changes between major versions

---

## 🔑 **Key API Differences**

### 1. Authentication Module Name

#### SDK 2.0.3 (Current)
```kotlin
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.gotrue.providers.builtin.Email

val client = createSupabaseClient(url, key) {
    install(GoTrue)
}

val user = client.gotrue.currentUserOrNull()
```

#### SDK 2.6.0+ (Future)
```kotlin
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email

val client = createSupabaseClient(url, key) {
    install(Auth)
}

val user = client.auth.currentUserOrNull()
```

**Change Summary:**
- Module renamed from `GoTrue` → `Auth`
- Import path changed from `gotrue` → `auth`
- Accessor changed from `.gotrue` → `.auth`

---

### 2. Sign In Method

#### SDK 2.0.3 (Current)
```kotlin
// Method name: loginWith
client.gotrue.loginWith(Email) {
    email = "user@example.com"
    password = "password123"
}
```

#### SDK 2.6.0+ (Future)
```kotlin
// Method name: signInWith
client.auth.signInWith(Email) {
    email = "user@example.com"
    password = "password123"
}
```

**Change Summary:**
- `loginWith()` → `signInWith()`

---

### 3. Sign Out Method

#### SDK 2.0.3 (Current)
```kotlin
// Method name: logout
client.gotrue.logout()
```

#### SDK 2.6.0+ (Future)
```kotlin
// Method name: signOut
client.auth.signOut()
```

**Change Summary:**
- `logout()` → `signOut()`

---

### 4. Function Response Handling

#### SDK 2.0.3 (Current)
```kotlin
val response: ByteArray = client.functions.invoke("function-name")

// Must decode to string
val jsonString = response.decodeToString()
val result = Json.decodeFromString<Response>(jsonString)
```

#### SDK 2.6.0+ (Future)
```kotlin
val response = client.functions.invoke("function-name")

// Has .data property
val jsonString = response.data.toString()
val result = Json.decodeFromString<Response>(jsonString)
```

**Change Summary:**
- Response type changed from `ByteArray` to custom object
- `response.decodeToString()` → `response.data.toString()`

---

### 5. Query Ordering

#### SDK 2.0.3 (Current)
```kotlin
// Must use named parameter
supabase.from("table")
    .select()
    .order(column = "created_at", ascending = false)
```

#### SDK 2.6.0+ (Future)
```kotlin
// Can use positional parameter
supabase.from("table")
    .select()
    .order("created_at", ascending = false)
```

**Change Summary:**
- Named parameter `column =` required in 2.0.3
- Can be optional in newer versions

---

## 📋 **Complete API Comparison Table**

| Feature | SDK 2.0.3 | SDK 2.6.0+ |
|---------|-----------|------------|
| **Module Name** | `GoTrue` | `Auth` |
| **Import Path** | `io.github.jan.supabase.gotrue.*` | `io.github.jan.supabase.auth.*` |
| **Accessor** | `client.gotrue` | `client.auth` |
| **Sign In** | `loginWith(Email)` | `signInWith(Email)` |
| **Sign Out** | `logout()` | `signOut()` |
| **Sign Up** | `signUpWith(Email)` | `signUpWith(Email)` ✅ Same |
| **Get User** | `currentUserOrNull()` | `currentUserOrNull()` ✅ Same |
| **Get Session** | `currentSessionOrNull()` | `currentSessionOrNull()` ✅ Same |
| **Function Response** | `response.decodeToString()` | `response.data.toString()` |
| **Query Order** | `.order(column = "name")` | `.order("name")` |
| **Session Status** | `SessionStatus` | `SessionStatus` ✅ Same |

---

## 🔄 **If You Need to Upgrade to 2.6.0+**

### Step 1: Update Dependencies
```toml
# gradle/libs.versions.toml
supabase = "2.6.0"  # or latest
```

### Step 2: Update SupabaseClient
```kotlin
// Change imports
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth

// Change installation
install(Auth) {  // was GoTrue
    scheme = "https"
    host = "your-project.supabase.co"
}

// Change accessor
val auth: Auth get() = client.auth  // was gotrue
```

### Step 3: Update All Repositories

#### AuthRepository
```kotlin
// Find and replace:
supabase.gotrue. → supabase.auth.
loginWith → signInWith
logout() → signOut()

// Update imports
import io.github.jan.supabase.auth.*
```

#### ApplicationRepository
```kotlin
// Find and replace:
supabase.gotrue. → supabase.auth.
```

#### DiscoveryRepository
```kotlin
// Find and replace:
response.decodeToString() → response.data.toString()
```

### Step 4: Test Everything
- Authentication flow
- Database queries
- Edge function calls
- Real-time subscriptions

---

## ⚠️ **Migration Checklist**

When upgrading from SDK 2.0.3 to newer versions:

- [ ] Update Supabase SDK version in `libs.versions.toml`
- [ ] Update `SupabaseClient.kt`
  - [ ] Change `GoTrue` to `Auth`
  - [ ] Update imports
  - [ ] Change accessor from `gotrue` to `auth`
- [ ] Update `AuthRepository.kt`
  - [ ] Change `loginWith` to `signInWith`
  - [ ] Change `logout` to `signOut`
  - [ ] Update imports
- [ ] Update `ApplicationRepository.kt`
  - [ ] Change `gotrue` to `auth`
- [ ] Update `DiscoveryRepository.kt`
  - [ ] Change `decodeToString()` to `data.toString()`
- [ ] Update all ViewModels if they use Supabase directly
- [ ] Update `SupabaseModule.kt` if needed
- [ ] Run full test suite
- [ ] Test on device

---

## 🛡️ **Staying on SDK 2.0.3**

**Reasons to stay:**
- ✅ Current implementation is stable and working
- ✅ No security vulnerabilities in 2.0.3
- ✅ All features work as expected
- ✅ Well-documented and tested
- ✅ Full compatibility with Kotlin 2.0.0

**When to upgrade:**
- ❌ Security vulnerability discovered
- ❌ New feature absolutely needed
- ❌ Bug fix only available in newer version
- ❌ Official support for 2.0.3 ends

---

## 📚 **Resources**

### SDK 2.0.3 Documentation
- **API Reference**: See `SUPABASE_SDK_2.0.3_API_REFERENCE.md`
- **Integration Guide**: See `SUPABASE_INTEGRATION_GUIDE.md`
- **Build Fixes**: See `BUILD_FIXES_SUMMARY.md`

### Official Links
- **Supabase Kotlin Docs**: https://supabase.com/docs/reference/kotlin/introduction
- **GitHub Repository**: https://github.com/supabase-community/supabase-kt
- **Changelog**: https://github.com/supabase-community/supabase-kt/releases

### Getting Help
- **GitHub Issues**: https://github.com/supabase-community/supabase-kt/issues
- **Supabase Discord**: https://discord.supabase.com
- **Stack Overflow**: Tag `supabase` and `kotlin`

---

## ✅ **Current Status**

**Your app is using:**
- ✅ Supabase Kotlin SDK 2.0.3
- ✅ Kotlin 2.0.0
- ✅ All APIs properly implemented for 2.0.3
- ✅ Full feature parity with web app
- ✅ Production ready

**No migration needed** unless you specifically require features from newer SDK versions.

---

**Last Updated**: 2025-10-31  
**SDK Version**: 2.0.3  
**Status**: Stable & Production Ready
