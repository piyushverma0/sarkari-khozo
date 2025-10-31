package com.sarkarikhozo.app.data.repository

import com.sarkarikhozo.app.data.model.AuthState
import com.sarkarikhozo.app.data.model.User
import com.sarkarikhozo.app.data.supabase.SupabaseClient
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.exceptions.RestException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor() {
    
    private val supabase = SupabaseClient.client
    
    fun getCurrentUser(): Flow<User?> = flow {
        try {
            val session = supabase.auth.currentSessionOrNull()
            if (session != null) {
                val userInfo = session.user
                emit(mapUserInfoToUser(userInfo))
            } else {
                emit(null)
            }
        } catch (e: Exception) {
            emit(null)
        }
    }
    
    fun signIn(email: String, password: String): Flow<Result<User>> = flow {
        try {
            supabase.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            
            val session = supabase.auth.currentSessionOrNull()
            val user = session?.user?.let { mapUserInfoToUser(it) }
                ?: throw Exception("Failed to get user after login")
            emit(Result.success(user))
        } catch (e: RestException) {
            emit(Result.failure(Exception("Invalid email or password")))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun signUp(email: String, password: String, name: String? = null): Flow<Result<User>> = flow {
        try {
            supabase.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            
            val session = supabase.auth.currentSessionOrNull()
            val user = session?.user?.let { mapUserInfoToUser(it) }
                ?: throw Exception("Failed to get user after signup")
            emit(Result.success(user))
        } catch (e: RestException) {
            emit(Result.failure(Exception("Failed to create account: ${e.message}")))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    suspend fun signOut(): Result<Unit> {
        return try {
            supabase.auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun getAuthState(): Flow<AuthState> = flow {
        try {
            supabase.auth.sessionStatus.collect { status ->
                when (status) {
                    is io.github.jan.supabase.auth.SessionStatus.Authenticated -> {
                        emit(AuthState.AUTHENTICATED)
                    }
                    is io.github.jan.supabase.auth.SessionStatus.NotAuthenticated -> {
                        emit(AuthState.UNAUTHENTICATED)
                    }
                    is io.github.jan.supabase.auth.SessionStatus.LoadingFromStorage -> {
                        emit(AuthState.LOADING)
                    }
                    is io.github.jan.supabase.auth.SessionStatus.NetworkError -> {
                        emit(AuthState.ERROR)
                    }
                }
            }
        } catch (e: Exception) {
            emit(AuthState.ERROR)
        }
    }
    
    private fun mapUserInfoToUser(userInfo: UserInfo): User {
        return User(
            id = userInfo.id,
            email = userInfo.email ?: "",
            name = userInfo.userMetadata?.get("name")?.jsonPrimitive?.content,
            avatarUrl = userInfo.userMetadata?.get("avatar_url")?.jsonPrimitive?.content,
            createdAt = userInfo.createdAt.toString(),
            updatedAt = userInfo.updatedAt.toString()
        )
    }
}