package com.sarkarikhozo.app.data.repository

import com.sarkarikhozo.app.data.api.ApiService
import com.sarkarikhozo.app.data.model.Job
import com.sarkarikhozo.app.data.model.JobCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class JobRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    fun getJobs(
        page: Int = 1,
        category: JobCategory? = null,
        location: String? = null,
        searchQuery: String? = null
    ): Flow<Result<List<Job>>> = flow {
        try {
            val response = apiService.getJobs(
                page = page,
                category = category?.name,
                location = location,
                search = searchQuery
            )
            
            if (response.isSuccessful) {
                response.body()?.let { jobsResponse ->
                    emit(Result.success(jobsResponse.jobs))
                } ?: emit(Result.failure(Exception("Empty response")))
            } else {
                emit(Result.failure(Exception("API Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getJobById(jobId: String): Flow<Result<Job>> = flow {
        try {
            val response = apiService.getJobById(jobId)
            
            if (response.isSuccessful) {
                response.body()?.let { job ->
                    emit(Result.success(job))
                } ?: emit(Result.failure(Exception("Job not found")))
            } else {
                emit(Result.failure(Exception("API Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getFeaturedJobs(): Flow<Result<List<Job>>> = flow {
        try {
            val response = apiService.getFeaturedJobs()
            
            if (response.isSuccessful) {
                response.body()?.let { jobsResponse ->
                    emit(Result.success(jobsResponse.jobs))
                } ?: emit(Result.failure(Exception("Empty response")))
            } else {
                emit(Result.failure(Exception("API Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getTrendingJobs(): Flow<Result<List<Job>>> = flow {
        try {
            val response = apiService.getTrendingJobs()
            
            if (response.isSuccessful) {
                response.body()?.let { jobsResponse ->
                    emit(Result.success(jobsResponse.jobs))
                } ?: emit(Result.failure(Exception("Empty response")))
            } else {
                emit(Result.failure(Exception("API Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getLatestJobs(): Flow<Result<List<Job>>> = flow {
        try {
            val response = apiService.getLatestJobs()
            
            if (response.isSuccessful) {
                response.body()?.let { jobsResponse ->
                    emit(Result.success(jobsResponse.jobs))
                } ?: emit(Result.failure(Exception("Empty response")))
            } else {
                emit(Result.failure(Exception("API Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}