package com.sarkarikhozo.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Application(
    val id: String,
    val userId: String,
    val title: String,
    val description: String,
    val url: String?,
    val category: String?,
    val applicationStatus: ApplicationStatus = ApplicationStatus.DISCOVERED,
    val importantDates: Map<String, String>? = null,
    val eligibility: String? = null,
    val applicationSteps: List<String>? = null,
    val documentsRequired: List<String>? = null,
    val feeStructure: String? = null,
    val deadlineReminders: List<String>? = null,
    val applicationGuidance: String? = null,
    val appliedConfirmed: Boolean = false,
    val savedAt: String,
    val updatedAt: String
)

enum class ApplicationStatus(val displayName: String) {
    DISCOVERED("Discovered"),
    APPLIED("Applied"),
    UNDER_REVIEW("Under Review"),
    ADMIT_CARD_RELEASED("Admit Card Released"),
    RESULTS_DECLARED("Results Declared"),
    COMPLETED("Completed"),
    ARCHIVED("Archived")
}

@Serializable
data class ApplicationTrackingRequest(
    val query: String
)

@Serializable
data class ApplicationTrackingResponse(
    val isAmbiguous: Boolean = false,
    val organizationName: String? = null,
    val activeOpportunities: List<Opportunity>? = null,
    val expiredOpportunities: List<Opportunity>? = null,
    val title: String? = null,
    val description: String? = null,
    val url: String? = null,
    val category: String? = null,
    val importantDates: Map<String, String>? = null,
    val eligibility: String? = null,
    val applicationSteps: List<String>? = null,
    val documentsRequired: List<String>? = null,
    val feeStructure: String? = null,
    val deadlineReminders: List<String>? = null,
    val applicationGuidance: String? = null
)

@Serializable
data class Opportunity(
    val title: String,
    val description: String,
    val applicationStatus: String,
    val deadline: String,
    val category: String,
    val url: String? = null
)

@Serializable
data class ApplicationNotification(
    val id: String,
    val userId: String,
    val applicationId: String,
    val title: String,
    val message: String,
    val type: NotificationType,
    val isRead: Boolean = false,
    val createdAt: String
)

enum class NotificationType(val displayName: String) {
    DEADLINE_REMINDER("Deadline Reminder"),
    STATUS_UPDATE("Status Update"),
    NEW_OPPORTUNITY("New Opportunity"),
    GENERAL("General")
}