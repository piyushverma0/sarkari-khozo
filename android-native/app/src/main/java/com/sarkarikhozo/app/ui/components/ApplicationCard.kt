package com.sarkarikhozo.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.data.model.Application
import com.sarkarikhozo.app.data.model.ApplicationStatus
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme
import com.sarkarikhozo.app.ui.theme.SuccessGreen
import com.sarkarikhozo.app.ui.theme.UrgentRed
import com.sarkarikhozo.app.ui.theme.WarningOrange
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplicationCard(
    application: Application,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header with title and status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = application.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    
                    if (application.category != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = application.category,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(8.dp))
                
                StatusChip(status = application.applicationStatus)
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Description
            Text(
                text = application.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Important dates or deadline
            application.importantDates?.let { dates ->
                val nextDeadline = getNextDeadline(dates)
                if (nextDeadline != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccessTime,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = getDeadlineColor(nextDeadline.second)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${nextDeadline.first}: ${formatDate(nextDeadline.second)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = getDeadlineColor(nextDeadline.second),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Applied status indicator
            if (application.appliedConfirmed) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SuccessGreen
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Application Submitted",
                        style = MaterialTheme.typography.bodySmall,
                        color = SuccessGreen,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: ApplicationStatus) {
    val (color, icon) = when (status) {
        ApplicationStatus.DISCOVERED -> MaterialTheme.colorScheme.primary to Icons.Default.Circle
        ApplicationStatus.APPLIED -> SuccessGreen to Icons.Default.CheckCircle
        ApplicationStatus.UNDER_REVIEW -> WarningOrange to Icons.Default.Schedule
        ApplicationStatus.ADMIT_CARD_RELEASED -> MaterialTheme.colorScheme.secondary to Icons.Default.Schedule
        ApplicationStatus.RESULTS_DECLARED -> SuccessGreen to Icons.Default.CheckCircle
        ApplicationStatus.COMPLETED -> SuccessGreen to Icons.Default.CheckCircle
        ApplicationStatus.ARCHIVED -> MaterialTheme.colorScheme.onSurfaceVariant to Icons.Default.Circle
    }
    
    AssistChip(
        onClick = { },
        label = {
            Text(
                text = status.displayName,
                style = MaterialTheme.typography.labelSmall
            )
        },
        leadingIcon = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(14.dp)
            )
        },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = color.copy(alpha = 0.1f),
            labelColor = color,
            leadingIconColor = color
        )
    )
}

private fun getNextDeadline(dates: Map<String, String>): Pair<String, String>? {
    val currentDate = Date()
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    
    return dates.entries
        .mapNotNull { (key, value) ->
            try {
                val date = dateFormat.parse(value)
                if (date != null && date.after(currentDate)) {
                    key to value
                } else null
            } catch (e: Exception) {
                null
            }
        }
        .minByOrNull { (_, dateString) ->
            try {
                dateFormat.parse(dateString)?.time ?: Long.MAX_VALUE
            } catch (e: Exception) {
                Long.MAX_VALUE
            }
        }
}

private fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        if (date != null) {
            outputFormat.format(date)
        } else {
            dateString
        }
    } catch (e: Exception) {
        dateString
    }
}

@Composable
private fun getDeadlineColor(dateString: String): androidx.compose.ui.graphics.Color {
    return try {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val date = dateFormat.parse(dateString)
        val currentDate = Date()
        
        if (date != null) {
            val daysUntilDeadline = ((date.time - currentDate.time) / (1000 * 60 * 60 * 24)).toInt()
            when {
                daysUntilDeadline <= 7 -> UrgentRed
                daysUntilDeadline <= 30 -> WarningOrange
                else -> MaterialTheme.colorScheme.primary
            }
        } else {
            MaterialTheme.colorScheme.onSurfaceVariant
        }
    } catch (e: Exception) {
        MaterialTheme.colorScheme.onSurfaceVariant
    }
}

@Preview(showBackground = true)
@Composable
fun ApplicationCardPreview() {
    SarkariKhozoTheme {
        ApplicationCard(
            application = Application(
                id = "1",
                userId = "user1",
                title = "SSC Combined Graduate Level Examination (CGL) 2024",
                description = "Staff Selection Commission conducts CGL exam for recruitment to various Group B and Group C posts in different ministries and departments of the Government of India.",
                url = "https://ssc.nic.in/cgl2024",
                category = "SSC",
                applicationStatus = ApplicationStatus.APPLIED,
                importantDates = mapOf(
                    "Application End" to "2024-12-15",
                    "Exam Date" to "2025-02-20"
                ),
                eligibility = "Bachelor's degree from a recognized university",
                appliedConfirmed = true,
                savedAt = "2024-10-29T10:00:00Z",
                updatedAt = "2024-10-29T10:00:00Z"
            ),
            onClick = { }
        )
    }
}