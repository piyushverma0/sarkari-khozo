package com.sarkarikhozo.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sarkarikhozo.app.data.repository.DiscoveryRepository
import com.sarkarikhozo.app.data.repository.DiscoveryStory
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository
) : ViewModel() {
    
    private val _stories = MutableStateFlow<List<DiscoveryStory>>(emptyList())
    val stories: StateFlow<List<DiscoveryStory>> = _stories.asStateFlow()
    
    private val _savedStories = MutableStateFlow<List<DiscoveryStory>>(emptyList())
    val savedStories: StateFlow<List<DiscoveryStory>> = _savedStories.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()
    
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    private val _hasMore = MutableStateFlow(true)
    val hasMore: StateFlow<Boolean> = _hasMore.asStateFlow()
    
    private var currentOffset = 0
    private val pageSize = 20
    
    init {
        loadStories(refresh = true)
    }
    
    fun loadStories(
        refresh: Boolean = false,
        category: String = "all",
        region: String? = null,
        sort: String = "relevance"
    ) {
        viewModelScope.launch {
            if (refresh) {
                currentOffset = 0
                _isRefreshing.value = true
            } else {
                _isLoading.value = true
            }
            
            _errorMessage.value = null
            
            discoveryRepository.getDiscoveryFeed(
                category = category,
                region = region,
                sort = sort,
                limit = pageSize,
                offset = currentOffset
            ).collect { result ->
                _isLoading.value = false
                _isRefreshing.value = false
                
                result.fold(
                    onSuccess = { response ->
                        if (refresh) {
                            _stories.value = response.stories
                        } else {
                            _stories.value = _stories.value + response.stories
                        }
                        _hasMore.value = response.pagination.hasMore
                        currentOffset += response.stories.size
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun loadSavedStories() {
        viewModelScope.launch {
            discoveryRepository.getSavedStories().collect { result ->
                result.fold(
                    onSuccess = { stories ->
                        _savedStories.value = stories
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun saveStory(storyId: String) {
        viewModelScope.launch {
            discoveryRepository.trackStoryInteraction(storyId, "save").collect { result ->
                result.fold(
                    onSuccess = {
                        // Optionally update local state or reload saved stories
                        loadSavedStories()
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun unsaveStory(storyId: String) {
        viewModelScope.launch {
            discoveryRepository.trackStoryInteraction(storyId, "unsave").collect { result ->
                result.fold(
                    onSuccess = {
                        // Optionally update local state or reload saved stories
                        loadSavedStories()
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun shareStory(storyId: String) {
        viewModelScope.launch {
            discoveryRepository.trackStoryInteraction(storyId, "share").collect { result ->
                result.fold(
                    onSuccess = {
                        // Track share interaction
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun viewStory(storyId: String) {
        viewModelScope.launch {
            discoveryRepository.trackStoryInteraction(storyId, "view").collect { result ->
                result.fold(
                    onSuccess = {
                        // Track view interaction
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun scrapeNews() {
        viewModelScope.launch {
            _isRefreshing.value = true
            _errorMessage.value = null
            
            discoveryRepository.scrapeNewsources().collect { result ->
                _isRefreshing.value = false
                
                result.fold(
                    onSuccess = { scrapeResult ->
                        if (scrapeResult.foundArticles > 0) {
                            // Refresh stories to show new content
                            loadStories(refresh = true)
                        }
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun generateAudioBulletin() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            discoveryRepository.generateAudioBulletin().collect { result ->
                _isLoading.value = false
                
                result.fold(
                    onSuccess = { bulletinResult ->
                        // Handle successful audio bulletin generation
                        // You might want to show a success message or navigate to audio player
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun seedSampleStories() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            discoveryRepository.seedSampleStories().collect { result ->
                _isLoading.value = false
                
                result.fold(
                    onSuccess = { seedResult ->
                        if (seedResult.count > 0) {
                            // Refresh stories to show sample content
                            loadStories(refresh = true)
                        }
                    },
                    onFailure = { error ->
                        _errorMessage.value = error.message
                    }
                )
            }
        }
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
}