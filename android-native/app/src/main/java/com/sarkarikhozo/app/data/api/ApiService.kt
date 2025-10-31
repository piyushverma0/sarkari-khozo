package com.sarkarikhozo.app.data.api

import com.sarkarikhozo.app.data.model.Job
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    
    @GET("jobs")
    suspend fun getJobs(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") category: String? = null,
        @Query("location") location: String? = null,
        @Query("search") search: String? = null
    ): Response<JobsResponse>
    
    @GET("jobs/{id}")
    suspend fun getJobById(
        @Path("id") jobId: String
    ): Response<Job>
    
    @GET("jobs/featured")
    suspend fun getFeaturedJobs(
        @Query("limit") limit: Int = 10
    ): Response<JobsResponse>
    
    @GET("jobs/trending")
    suspend fun getTrendingJobs(
        @Query("limit") limit: Int = 10
    ): Response<JobsResponse>
    
    @GET("jobs/latest")
    suspend fun getLatestJobs(
        @Query("limit") limit: Int = 10
    ): Response<JobsResponse>
    
    @GET("categories")
    suspend fun getCategories(): Response<List<CategoryResponse>>
}

data class JobsResponse(
    val jobs: List<Job>,
    val totalCount: Int,
    val currentPage: Int,
    val totalPages: Int
)

data class CategoryResponse(
    val id: String,
    val name: String,
    val displayName: String,
    val jobCount: Int
)