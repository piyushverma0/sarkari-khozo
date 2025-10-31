package com.sarkarikhozo.app.data.repository

import com.sarkarikhozo.app.data.model.Application
import com.sarkarikhozo.app.data.model.ApplicationStatus
import com.sarkarikhozo.app.data.model.ApplicationTrackingRequest
import com.sarkarikhozo.app.data.model.ApplicationTrackingResponse
import com.sarkarikhozo.app.data.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApplicationRepository @Inject constructor() {
    
    private val supabase = SupabaseClient.client
    
    fun trackApplication(query: String): Flow<Result<ApplicationTrackingResponse>> = flow {
        try {
            val request = ApplicationTrackingRequest(query = query)
            val response = supabase.functions.invoke(
                function = "process-query",
                body = buildJsonObject {
                    put("query", query)
                }
            )
            
            val trackingResponse = Json.decodeFromString<ApplicationTrackingResponse>(response.decodeToString())
            emit(Result.success(trackingResponse))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun saveApplication(
        title: String,
        description: String,
        url: String?,
        category: String?,
        importantDates: Map<String, String>?,
        eligibility: String?,
        applicationSteps: List<String>?,
        documentsRequired: List<String>?,
        feeStructure: String?,
        deadlineReminders: List<String>?,
        applicationGuidance: String?
    ): Flow<Result<Application>> = flow {
        try {
            val userId = supabase.gotrue.currentUserOrNull()?.id
                ?: throw Exception("User not authenticated")
            
            val result = supabase.from("applications").insert(
                mapOf(
                    "user_id" to userId,
                    "title" to title,
                    "description" to description,
                    "url" to url,
                    "category" to category,
                    "important_dates" to importantDates,
                    "eligibility" to eligibility,
                    "application_steps" to applicationSteps,
                    "documents_required" to documentsRequired,
                    "fee_structure" to feeStructure,
                    "deadline_reminders" to deadlineReminders,
                    "application_guidance" to applicationGuidance
                )
            ).decodeSingle<Map<String, Any>>()
            
            val application = mapToApplication(result)
            emit(Result.success(application))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getUserApplications(): Flow<Result<List<Application>>> = flow {
        try {
            val userId = supabase.gotrue.currentUserOrNull()?.id
                ?: throw Exception("User not authenticated")
            
            val results = supabase.from("applications")
                .select()
                .eq("user_id", userId)
                .order(column = "saved_at", ascending = false)
                .decodeList<Map<String, Any>>()
            
            val applications = results.map { mapToApplication(it) }
            emit(Result.success(applications))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getApplicationById(applicationId: String): Flow<Result<Application>> = flow {
        try {
            val result = supabase.from("applications")
                .select()
                .eq("id", applicationId)
                .decodeSingle<Map<String, Any>>()
            
            val application = mapToApplication(result)
            emit(Result.success(application))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun updateApplicationStatus(
        applicationId: String,
        status: ApplicationStatus
    ): Flow<Result<Unit>> = flow {
        try {
            supabase.from("applications")
                .update(mapOf("application_status" to status.name.lowercase()))
                .eq("id", applicationId)
            
            emit(Result.success(Unit))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun markApplicationAsApplied(applicationId: String): Flow<Result<Unit>> = flow {
        try {
            supabase.from("applications")
                .update(mapOf("applied_confirmed" to true))
                .eq("id", applicationId)
            
            emit(Result.success(Unit))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    private fun mapToApplication(data: Map<String, Any>): Application {
        return Application(
            id = data["id"] as String,
            userId = data["user_id"] as String,
            title = data["title"] as String,
            description = data["description"] as String,
            url = data["url"] as String?,
            category = data["category"] as String?,
            applicationStatus = ApplicationStatus.valueOf(
                (data["application_status"] as? String)?.uppercase() ?: "DISCOVERED"
            ),
            importantDates = data["important_dates"] as? Map<String, String>,
            eligibility = data["eligibility"] as String?,
            applicationSteps = data["application_steps"] as? List<String>,
            documentsRequired = data["documents_required"] as? List<String>,
            feeStructure = data["fee_structure"] as String?,
            deadlineReminders = data["deadline_reminders"] as? List<String>,
            applicationGuidance = data["application_guidance"] as String?,
            appliedConfirmed = data["applied_confirmed"] as? Boolean ?: false,
            savedAt = data["saved_at"] as String,
            updatedAt = data["updated_at"] as String
        )
    }
}