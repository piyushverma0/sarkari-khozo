package com.sarkarikhozo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sarkarikhozo.app.data.model.AuthState
import com.sarkarikhozo.app.data.model.User
import com.sarkarikhozo.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _authState = MutableStateFlow(AuthState.LOADING)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    init {
        observeAuthState()
        getCurrentUser()
    }
    
    private fun observeAuthState() {
        viewModelScope.launch {
            authRepository.getAuthState().collect { state ->
                _authState.value = state
            }
        }
    }
    
    private fun getCurrentUser() {
        viewModelScope.launch {
            authRepository.getCurrentUser().collect { user ->
                _currentUser.value = user
            }
        }
    }
    
    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            authRepository.signIn(email, password).collect { result ->
                _isLoading.value = false
                result.fold(
                    onSuccess = { user ->
                        _currentUser.value = user
                        _authState.value = AuthState.AUTHENTICATED
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                        _authState.value = AuthState.ERROR
                    }
                )
            }
        }
    }
    
    fun signUp(email: String, password: String, name: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            authRepository.signUp(email, password, name).collect { result ->
                _isLoading.value = false
                result.fold(
                    onSuccess = { user ->
                        _currentUser.value = user
                        _authState.value = AuthState.AUTHENTICATED
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                        _authState.value = AuthState.ERROR
                    }
                )
            }
        }
    }
    
    fun signOut() {
        viewModelScope.launch {
            _isLoading.value = true
            
            val result = authRepository.signOut()
            result.fold(
                onSuccess = {
                    _currentUser.value = null
                    _authState.value = AuthState.UNAUTHENTICATED
                },
                onFailure = { error ->
                    _errorMessage.value = error.message
                }
            )
            
            _isLoading.value = false
        }
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
}