package com.sarkarikhozo.app.data.repository

import com.sarkarikhozo.app.data.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DiscoveryRepository @Inject constructor() {
    
    private val supabase = SupabaseClient.client
    
    fun getDiscoveryFeed(
        category: String = "all",
        region: String? = null,
        sort: String = "relevance",
        limit: Int = 20,
        offset: Int = 0
    ): Flow<Result<DiscoveryFeedResponse>> = flow {
        try {
            val response = supabase.functions.invoke(
                function = "get-discovery-feed",
                body = buildJsonObject {
                    put("category", category)
                    put("region", region)
                    put("sort", sort)
                    put("limit", limit)
                    put("offset", offset)
                }
            )
            
            val jsonResponse = Json.parseToJsonElement(response.decodeToString()).jsonObject
            val success = jsonResponse["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
            
            if (success) {
                val storiesJson = jsonResponse["stories"]?.jsonArray ?: emptyList()
                val stories = storiesJson.map { storyJson ->
                    val story = storyJson.jsonObject
                    DiscoveryStory(
                        id = story["id"]?.jsonPrimitive?.content ?: "",
                        headline = story["headline"]?.jsonPrimitive?.content ?: "",
                        summary = story["summary"]?.jsonPrimitive?.content ?: "",
                        category = story["category"]?.jsonPrimitive?.content ?: "",
                        source = story["source"]?.jsonPrimitive?.content ?: "",
                        sourceUrl = story["source_url"]?.jsonPrimitive?.content ?: "",
                        publishedAt = story["published_at"]?.jsonPrimitive?.content ?: "",
                        createdAt = story["created_at"]?.jsonPrimitive?.content ?: ""
                    )
                }
                
                val paginationJson = jsonResponse["pagination"]?.jsonObject
                val pagination = PaginationInfo(
                    total = paginationJson?.get("total")?.jsonPrimitive?.content?.toIntOrNull() ?: 0,
                    hasMore = paginationJson?.get("hasMore")?.jsonPrimitive?.content?.toBoolean() ?: false
                )
                
                emit(Result.success(DiscoveryFeedResponse(stories, pagination)))
            } else {
                emit(Result.failure(Exception("Failed to fetch discovery feed")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getSavedStories(): Flow<Result<List<DiscoveryStory>>> = flow {
        try {
            val response = supabase.functions.invoke(
                function = "get-saved-stories"
            )
            
            val jsonResponse = Json.parseToJsonElement(response.decodeToString()).jsonObject
            val success = jsonResponse["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
            
            if (success) {
                val storiesJson = jsonResponse["stories"]?.jsonArray ?: emptyList()
                val stories = storiesJson.map { storyJson ->
                    val story = storyJson.jsonObject
                    DiscoveryStory(
                        id = story["id"]?.jsonPrimitive?.content ?: "",
                        headline = story["headline"]?.jsonPrimitive?.content ?: "",
                        summary = story["summary"]?.jsonPrimitive?.content ?: "",
                        category = story["category"]?.jsonPrimitive?.content ?: "",
                        source = story["source"]?.jsonPrimitive?.content ?: "",
                        sourceUrl = story["source_url"]?.jsonPrimitive?.content ?: "",
                        publishedAt = story["published_at"]?.jsonPrimitive?.content ?: "",
                        createdAt = story["created_at"]?.jsonPrimitive?.content ?: ""
                    )
                }
                
                emit(Result.success(stories))
            } else {
                emit(Result.failure(Exception("Failed to fetch saved stories")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun trackStoryInteraction(
        storyId: String,
        interactionType: String // "save", "unsave", "view", "share"
    ): Flow<Result<Unit>> = flow {
        try {
            supabase.functions.invoke(
                function = "track-story-interaction",
                body = buildJsonObject {
                    put("story_id", storyId)
                    put("interaction_type", interactionType)
                }
            )
            
            emit(Result.success(Unit))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun scrapeNewsources(): Flow<Result<ScrapeResult>> = flow {
        try {
            val response = supabase.functions.invoke(
                function = "scrape-news-sources"
            )
            
            val jsonResponse = Json.parseToJsonElement(response.decodeToString()).jsonObject
            val success = jsonResponse["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
            val message = jsonResponse["message"]?.jsonPrimitive?.content ?: ""
            
            val resultsJson = jsonResponse["results"]?.jsonObject
            val foundArticles = resultsJson?.get("found_articles")?.jsonPrimitive?.content?.toIntOrNull() ?: 0
            
            emit(Result.success(ScrapeResult(success, message, foundArticles)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun generateAudioBulletin(): Flow<Result<AudioBulletinResult>> = flow {
        try {
            val response = supabase.functions.invoke(
                function = "generate-audio-news-bulletin"
            )
            
            val jsonResponse = Json.parseToJsonElement(response.decodeToString()).jsonObject
            val success = jsonResponse["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
            val storiesCount = jsonResponse["stories_count"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
            val duration = jsonResponse["duration"]?.jsonPrimitive?.content ?: ""
            
            emit(Result.success(AudioBulletinResult(success, storiesCount, duration)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun seedSampleStories(): Flow<Result<SeedResult>> = flow {
        try {
            val response = supabase.functions.invoke(
                function = "seed-sample-stories"
            )
            
            val jsonResponse = Json.parseToJsonElement(response.decodeToString()).jsonObject
            val success = jsonResponse["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
            val count = jsonResponse["count"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
            
            emit(Result.success(SeedResult(success, count)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}

data class DiscoveryStory(
    val id: String,
    val headline: String,
    val summary: String,
    val category: String,
    val source: String,
    val sourceUrl: String,
    val publishedAt: String,
    val createdAt: String
)

data class DiscoveryFeedResponse(
    val stories: List<DiscoveryStory>,
    val pagination: PaginationInfo
)

data class PaginationInfo(
    val total: Int,
    val hasMore: Boolean
)

data class ScrapeResult(
    val success: Boolean,
    val message: String,
    val foundArticles: Int
)

data class AudioBulletinResult(
    val success: Boolean,
    val storiesCount: Int,
    val duration: String
)

data class SeedResult(
    val success: Boolean,
    val count: Int
)