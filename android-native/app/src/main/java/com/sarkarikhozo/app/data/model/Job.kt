package com.sarkarikhozo.app.data.model

import kotlinx.serialization.Serializable
import java.util.Date

@Serializable
data class Job(
    val id: String,
    val title: String,
    val organization: String,
    val category: JobCategory,
    val location: String,
    val description: String,
    val eligibility: String,
    val applicationDeadline: String,
    val applicationStartDate: String,
    val salary: String?,
    val vacancies: Int?,
    val applicationFee: String?,
    val howToApply: String,
    val importantDates: List<ImportantDate>,
    val requirements: List<String>,
    val benefits: List<String>?,
    val isActive: Boolean = true,
    val isFeatured: Boolean = false,
    val createdAt: String,
    val updatedAt: String,
    val imageUrl: String?,
    val officialWebsite: String?,
    val applicationUrl: String?
)

@Serializable
data class ImportantDate(
    val event: String,
    val date: String,
    val isDeadline: Boolean = false
)

enum class JobCategory(val displayName: String) {
    BANKING("Banking"),
    RAILWAY("Railway"),
    SSC("SSC"),
    UPSC("UPSC"),
    STATE_GOVT("State Government"),
    DEFENCE("Defence"),
    TEACHING("Teaching"),
    POLICE("Police"),
    HEALTHCARE("Healthcare"),
    ENGINEERING("Engineering"),
    JUDICIAL("Judicial"),
    OTHER("Other")
}

@Serializable
data class JobSearchFilter(
    val category: JobCategory? = null,
    val location: String? = null,
    val salaryRange: SalaryRange? = null,
    val experienceLevel: ExperienceLevel? = null,
    val educationLevel: EducationLevel? = null
)

enum class SalaryRange(val displayName: String, val minSalary: Int, val maxSalary: Int) {
    BELOW_25K("Below ₹25,000", 0, 25000),
    RANGE_25K_50K("₹25,000 - ₹50,000", 25000, 50000),
    RANGE_50K_100K("₹50,000 - ₹1,00,000", 50000, 100000),
    ABOVE_100K("Above ₹1,00,000", 100000, Int.MAX_VALUE)
}

enum class ExperienceLevel(val displayName: String) {
    FRESHER("Fresher"),
    EXPERIENCED_1_3("1-3 Years"),
    EXPERIENCED_3_5("3-5 Years"),
    EXPERIENCED_5_PLUS("5+ Years")
}

enum class EducationLevel(val displayName: String) {
    TENTH("10th Pass"),
    TWELFTH("12th Pass"),
    GRADUATE("Graduate"),
    POST_GRADUATE("Post Graduate"),
    PROFESSIONAL("Professional Degree")
}