package com.sarkarikhozo.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val avatarUrl: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val preferences: UserPreferences = UserPreferences()
)

@Serializable
data class UserPreferences(
    val language: String = "en",
    val notificationsEnabled: Boolean = true,
    val emailNotifications: Boolean = true,
    val pushNotifications: Boolean = true,
    val deadlineReminders: Boolean = true,
    val newsUpdates: Boolean = true,
    val theme: String = "system" // system, light, dark
)

@Serializable
data class AuthRequest(
    val email: String,
    val password: String
)

@Serializable
data class AuthResponse(
    val user: User,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long
)

@Serializable
data class SignUpRequest(
    val email: String,
    val password: String,
    val name: String? = null
)

enum class AuthState {
    LOADING,
    AUTHENTICATED,
    UNAUTHENTICATED,
    ERROR
}