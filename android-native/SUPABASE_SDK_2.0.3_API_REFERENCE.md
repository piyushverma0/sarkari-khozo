# Supabase Kotlin SDK 2.0.3 - Complete API Reference

## 📘 **SDK Version: 2.0.3**

This document provides a complete reference for using Supabase Kotlin SDK **2.0.3** in the Android native app. All code examples and patterns in this codebase are specifically designed for this version.

---

## 🔧 **Installation & Setup**

### Dependencies (Already Configured)
```kotlin
// gradle/libs.versions.toml
supabase = "2.0.3"
ktor = "2.3.12"

// Libraries
implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.3")
implementation("io.github.jan-tennert.supabase:gotrue-kt:2.0.3")
implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.3")
implementation("io.github.jan-tennert.supabase:functions-kt:2.0.3")
implementation("io.github.jan-tennert.supabase:storage-kt:2.0.3")
implementation("io.ktor:ktor-client-android:2.3.12")
implementation("io.ktor:ktor-client-core:2.3.12")
implementation("io.ktor:ktor-utils:2.3.12")
```

### Client Initialization
```kotlin
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

val client = createSupabaseClient(
    supabaseUrl = "YOUR_SUPABASE_URL",
    supabaseKey = "YOUR_ANON_KEY"
) {
    install(GoTrue) {
        scheme = "https"
        host = "your-project.supabase.co"
    }
    install(Postgrest)
    install(Functions)
    install(Realtime)
    install(Storage)
}
```

---

## 🔐 **Authentication (GoTrue)**

### Important: SDK 2.0.3 Uses `gotrue`, NOT `auth`

```kotlin
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.user.UserInfo
import io.github.jan.supabase.gotrue.SessionStatus

// Access GoTrue
val gotrue = client.gotrue
```

### Sign Up
```kotlin
// SDK 2.0.3 API
supabase.gotrue.signUpWith(Email) {
    email = "user@example.com"
    password = "password123"
    data = buildMap {
        put("name", "John Doe")
    }
}

// Get current session after signup
val session = supabase.gotrue.currentSessionOrNull()
val user = session?.user
```

### Sign In / Login
```kotlin
// SDK 2.0.3 uses loginWith, NOT signInWith
supabase.gotrue.loginWith(Email) {
    email = "user@example.com"
    password = "password123"
}

// Get user after login
val user = supabase.gotrue.currentUserOrNull()
val session = supabase.gotrue.currentSessionOrNull()
```

### Sign Out / Logout
```kotlin
// SDK 2.0.3 uses logout(), NOT signOut()
supabase.gotrue.logout()
```

### Get Current User
```kotlin
// Get user (nullable)
val user: UserInfo? = supabase.gotrue.currentUserOrNull()

// Get session (nullable)
val session = supabase.gotrue.currentSessionOrNull()

// Access user properties
user?.let {
    val id = it.id
    val email = it.email
    val metadata = it.userMetadata
    val createdAt = it.createdAt
}
```

### Session Status Monitoring
```kotlin
import io.github.jan.supabase.gotrue.SessionStatus

supabase.gotrue.sessionStatus.collect { status ->
    when (status) {
        is SessionStatus.Authenticated -> {
            // User is logged in
            val session = status.session
        }
        is SessionStatus.NotAuthenticated -> {
            // User is logged out
        }
        is SessionStatus.LoadingFromStorage -> {
            // Loading session from storage
        }
        is SessionStatus.NetworkError -> {
            // Network error occurred
        }
    }
}
```

---

## 🗄️ **Database (Postgrest)**

### Query Data
```kotlin
import io.github.jan.supabase.postgrest.from

// Select all
val results = supabase.from("table_name")
    .select()
    .decodeList<YourDataClass>()

// Select with filter
val filtered = supabase.from("table_name")
    .select()
    .eq("column", "value")
    .decodeList<YourDataClass>()

// Select single record
val single = supabase.from("table_name")
    .select()
    .eq("id", "123")
    .decodeSingle<YourDataClass>()

// Select with ordering - IMPORTANT: Use column parameter
val ordered = supabase.from("table_name")
    .select()
    .order(column = "created_at", ascending = false)
    .decodeList<YourDataClass>()
```

### Insert Data
```kotlin
// Insert single record
val result = supabase.from("table_name")
    .insert(
        mapOf(
            "column1" to "value1",
            "column2" to "value2"
        )
    )
    .decodeSingle<YourDataClass>()

// Insert multiple records
val results = supabase.from("table_name")
    .insert(
        listOf(
            mapOf("column1" to "value1"),
            mapOf("column1" to "value2")
        )
    )
    .decodeList<YourDataClass>()
```

### Update Data
```kotlin
supabase.from("table_name")
    .update(
        mapOf("column" to "new_value")
    )
    .eq("id", "123")

// Returns nothing in SDK 2.0.3
```

### Delete Data
```kotlin
supabase.from("table_name")
    .delete()
    .eq("id", "123")
```

### Common Filters
```kotlin
// Equal
.eq("column", "value")

// Not equal
.neq("column", "value")

// Greater than
.gt("column", 100)

// Less than
.lt("column", 100)

// Like (pattern matching)
.like("column", "%pattern%")

// In list
.`in`("column", listOf("value1", "value2"))

// Is null
.`is`("column", null)
```

---

## ⚡ **Edge Functions**

### Invoke Function
```kotlin
import io.github.jan.supabase.functions.functions
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Invoke function - Returns ByteArray in SDK 2.0.3
val response: ByteArray = supabase.functions.invoke(
    function = "function-name",
    body = buildJsonObject {
        put("key", "value")
        put("another", 123)
    }
)

// IMPORTANT: In SDK 2.0.3, use decodeToString(), NOT .data
val jsonString = response.decodeToString()

// Parse response
val result = Json.decodeFromString<YourResponseClass>(jsonString)
```

### Function Response Handling Pattern
```kotlin
// ✅ CORRECT for SDK 2.0.3
fun callFunction(): Flow<Result<Response>> = flow {
    try {
        val response = supabase.functions.invoke(
            function = "my-function",
            body = buildJsonObject {
                put("param", "value")
            }
        )
        
        // Decode to string first
        val jsonString = response.decodeToString()
        
        // Then parse JSON
        val result = Json.decodeFromString<Response>(jsonString)
        emit(Result.success(result))
    } catch (e: Exception) {
        emit(Result.failure(e))
    }
}

// ❌ WRONG - This is for newer SDK versions
val response = supabase.functions.invoke("function")
val result = response.data.toString() // .data doesn't exist in 2.0.3
```

---

## 🔄 **Real-time (Realtime)**

### Subscribe to Changes
```kotlin
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.PostgresAction

val channel = supabase.realtime.channel("public:table_name")

channel.postgresChangeFlow<PostgresAction>(schema = "public") {
    table = "table_name"
}.collect { action ->
    when (action) {
        is PostgresAction.Insert -> {
            // New record inserted
            val record = action.record
        }
        is PostgresAction.Update -> {
            // Record updated
            val oldRecord = action.oldRecord
            val newRecord = action.newRecord
        }
        is PostgresAction.Delete -> {
            // Record deleted
            val record = action.oldRecord
        }
    }
}

// Subscribe to channel
channel.subscribe()

// Unsubscribe when done
channel.unsubscribe()
```

---

## 📦 **Storage**

### Upload File
```kotlin
import io.github.jan.supabase.storage.storage

val bucket = supabase.storage["bucket-name"]

// Upload file
bucket.upload("path/file.png", byteArray, upsert = false)

// Upload with public access
bucket.upload("path/file.png", byteArray, upsert = false)
```

### Download File
```kotlin
// Download file
val byteArray = bucket.download("path/file.png")

// Get public URL
val url = bucket.publicUrl("path/file.png")
```

### Delete File
```kotlin
bucket.delete("path/file.png")
```

---

## 🔑 **Key Differences from Newer SDK Versions**

### Authentication Module Name
| SDK Version | Module Name | Import Path |
|-------------|-------------|-------------|
| **2.0.3** | ✅ `gotrue` | `io.github.jan.supabase.gotrue.*` |
| 2.6.0+ | ❌ `auth` | `io.github.jan.supabase.auth.*` |

### Authentication Methods
| Operation | SDK 2.0.3 | SDK 2.6.0+ |
|-----------|-----------|------------|
| Sign In | ✅ `loginWith(Email)` | ❌ `signInWith(Email)` |
| Sign Out | ✅ `logout()` | ❌ `signOut()` |
| Sign Up | ✅ `signUpWith(Email)` | ✅ `signUpWith(Email)` |

### Function Response Handling
| Operation | SDK 2.0.3 | SDK 2.6.0+ |
|-----------|-----------|------------|
| Get response | ✅ `response.decodeToString()` | ❌ `response.data.toString()` |
| Response type | `ByteArray` | Custom response object |

### Query Ordering
| Operation | SDK 2.0.3 | SDK 2.6.0+ |
|-----------|-----------|------------|
| Order query | ✅ `.order(column = "name")` | ❌ `.order("name")` |

---

## 💡 **Best Practices for SDK 2.0.3**

### 1. Always Use GoTrue, Not Auth
```kotlin
// ✅ CORRECT
import io.github.jan.supabase.gotrue.gotrue
val user = client.gotrue.currentUserOrNull()

// ❌ WRONG
import io.github.jan.supabase.auth.auth
val user = client.auth.currentUserOrNull() // Will not compile
```

### 2. Function Responses Are ByteArray
```kotlin
// ✅ CORRECT
val response = supabase.functions.invoke("function")
val jsonString = response.decodeToString()
val data = Json.decodeFromString<MyClass>(jsonString)

// ❌ WRONG
val data = response.data // Property doesn't exist
```

### 3. Use Named Parameters for Order
```kotlin
// ✅ CORRECT
.order(column = "created_at", ascending = false)

// ❌ WRONG (might work but not recommended)
.order("created_at", false)
```

### 4. Session Management
```kotlin
// ✅ CORRECT - Check session with nullable
val session = supabase.gotrue.currentSessionOrNull()
if (session != null) {
    val user = session.user
    // User is authenticated
}

// ❌ WRONG - Don't assume session exists
val user = supabase.gotrue.currentSession().user // Might throw
```

---

## 📚 **Complete Code Examples**

### Authentication Flow
```kotlin
class AuthRepository @Inject constructor() {
    private val supabase = SupabaseClient.client
    
    suspend fun signUp(email: String, password: String, name: String): Result<User> {
        return try {
            supabase.gotrue.signUpWith(Email) {
                this.email = email
                this.password = password
                data = mapOf("name" to name)
            }
            
            val session = supabase.gotrue.currentSessionOrNull()
            val user = session?.user ?: throw Exception("No user after signup")
            
            Result.success(mapToUser(user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signIn(email: String, password: String): Result<User> {
        return try {
            supabase.gotrue.loginWith(Email) {
                this.email = email
                this.password = password
            }
            
            val user = supabase.gotrue.currentUserOrNull() 
                ?: throw Exception("No user after login")
            
            Result.success(mapToUser(user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut(): Result<Unit> {
        return try {
            supabase.gotrue.logout()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### Database Operations
```kotlin
class DataRepository @Inject constructor() {
    private val supabase = SupabaseClient.client
    
    suspend fun getItems(): Result<List<Item>> {
        return try {
            val userId = supabase.gotrue.currentUserOrNull()?.id
                ?: throw Exception("Not authenticated")
            
            val items = supabase.from("items")
                .select()
                .eq("user_id", userId)
                .order(column = "created_at", ascending = false)
                .decodeList<Item>()
            
            Result.success(items)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun createItem(name: String): Result<Item> {
        return try {
            val userId = supabase.gotrue.currentUserOrNull()?.id
                ?: throw Exception("Not authenticated")
            
            val item = supabase.from("items")
                .insert(
                    mapOf(
                        "user_id" to userId,
                        "name" to name
                    )
                )
                .decodeSingle<Item>()
            
            Result.success(item)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### Edge Function Call
```kotlin
class FunctionRepository @Inject constructor() {
    private val supabase = SupabaseClient.client
    
    suspend fun processQuery(query: String): Result<Response> {
        return try {
            val response = supabase.functions.invoke(
                function = "process-query",
                body = buildJsonObject {
                    put("query", query)
                }
            )
            
            val jsonString = response.decodeToString()
            val result = Json.decodeFromString<Response>(jsonString)
            
            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

## ⚠️ **Common Errors & Solutions**

### Error: Unresolved reference 'auth'
```kotlin
// ❌ Problem
import io.github.jan.supabase.auth.auth
val user = client.auth.currentUserOrNull()

// ✅ Solution
import io.github.jan.supabase.gotrue.gotrue
val user = client.gotrue.currentUserOrNull()
```

### Error: Unresolved reference 'data'
```kotlin
// ❌ Problem
val result = response.data.toString()

// ✅ Solution
val result = response.decodeToString()
```

### Error: No value passed for parameter 'column'
```kotlin
// ❌ Problem
.order("created_at", false)

// ✅ Solution
.order(column = "created_at", ascending = false)
```

---

## 📖 **Official Documentation**

- **Supabase Kotlin Docs**: https://supabase.com/docs/reference/kotlin/introduction
- **GitHub Repository**: https://github.com/supabase-community/supabase-kt
- **Release 2.0.3**: https://github.com/supabase-community/supabase-kt/releases/tag/2.0.3

---

## ✅ **Status**

All code in this Android native project is **fully compatible** with Supabase Kotlin SDK **2.0.3**.

**Last Updated**: 2025-10-31
