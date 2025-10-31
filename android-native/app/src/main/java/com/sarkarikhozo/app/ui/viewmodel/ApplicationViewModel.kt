package com.sarkarikhozo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sarkarikhozo.app.data.model.Application
import com.sarkarikhozo.app.data.model.ApplicationStatus
import com.sarkarikhozo.app.data.model.ApplicationTrackingResponse
import com.sarkarikhozo.app.data.repository.ApplicationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ApplicationViewModel @Inject constructor(
    private val applicationRepository: ApplicationRepository
) : ViewModel() {
    
    private val _applications = MutableStateFlow<List<Application>>(emptyList())
    val applications: StateFlow<List<Application>> = _applications.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking.asStateFlow()
    
    private val _trackingProgress = MutableStateFlow(0)
    val trackingProgress: StateFlow<Int> = _trackingProgress.asStateFlow()
    
    private val _trackingMessage = MutableStateFlow("")
    val trackingMessage: StateFlow<String> = _trackingMessage.asStateFlow()
    
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    private val _trackingResult = MutableStateFlow<ApplicationTrackingResponse?>(null)
    val trackingResult: StateFlow<ApplicationTrackingResponse?> = _trackingResult.asStateFlow()
    
    init {
        loadApplications()
    }
    
    fun loadApplications() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            applicationRepository.getUserApplications().collect { result ->
                _isLoading.value = false
                result.fold(
                    onSuccess = { apps ->
                        _applications.value = apps
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun trackApplication(query: String) {
        viewModelScope.launch {
            _isTracking.value = true
            _errorMessage.value = null
            _trackingResult.value = null
            
            // Simulate progress stages
            simulateTrackingProgress()
            
            applicationRepository.trackApplication(query).collect { result ->
                _isTracking.value = false
                _trackingProgress.value = 100
                _trackingMessage.value = "✅ Success! Your card is ready!"
                
                result.fold(
                    onSuccess = { response ->
                        _trackingResult.value = response
                        if (!response.isAmbiguous) {
                            // Auto-save the application
                            saveTrackedApplication(response)
                        }
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    private fun saveTrackedApplication(response: ApplicationTrackingResponse) {
        viewModelScope.launch {
            if (response.title != null && response.description != null) {
                applicationRepository.saveApplication(
                    title = response.title,
                    description = response.description,
                    url = response.url,
                    category = response.category,
                    importantDates = response.importantDates,
                    eligibility = response.eligibility,
                    applicationSteps = response.applicationSteps,
                    documentsRequired = response.documentsRequired,
                    feeStructure = response.feeStructure,
                    deadlineReminders = response.deadlineReminders,
                    applicationGuidance = response.applicationGuidance
                ).collect { result ->
                    result.fold(
                        onSuccess = {
                            // Reload applications to show the new one
                            loadApplications()
                        },
                        onFailure = { error ->
                            _errorMessage.value = error.message
                        }
                    )
                }
            }
        }
    }
    
    fun updateApplicationStatus(applicationId: String, status: ApplicationStatus) {
        viewModelScope.launch {
            applicationRepository.updateApplicationStatus(applicationId, status).collect { result ->
                result.fold(
                    onSuccess = {
                        // Reload applications to reflect the change
                        loadApplications()
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun markAsApplied(applicationId: String) {
        viewModelScope.launch {
            applicationRepository.markApplicationAsApplied(applicationId).collect { result ->
                result.fold(
                    onSuccess = {
                        // Reload applications to reflect the change
                        loadApplications()
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    private suspend fun simulateTrackingProgress() {
        val stages = listOf(
            25 to "🔍 Searching for official notification...",
            50 to "📄 Fetching document details...",
            75 to "📅 Extracting important dates...",
            90 to "✨ Generating your trackable card..."
        )
        
        for ((progress, message) in stages) {
            _trackingProgress.value = progress
            _trackingMessage.value = message
            kotlinx.coroutines.delay(1000)
        }
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
    
    fun clearTrackingResult() {
        _trackingResult.value = null
        _trackingProgress.value = 0
        _trackingMessage.value = ""
    }
}