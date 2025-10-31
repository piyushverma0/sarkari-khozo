package com.sarkarikhozo.app.ui.screens.notifications

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.R
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme
import com.sarkarikhozo.app.ui.theme.SuccessGreen
import com.sarkarikhozo.app.ui.theme.UrgentRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onNavigateToJobDetails: (String) -> Unit = {}
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = stringResource(R.string.notifications_title),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        )

        val notifications = getSampleNotifications()
        
        if (notifications.isEmpty()) {
            // Empty State
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.NotificationsNone,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.no_notifications),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            // Notifications List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(notifications) { notification ->
                    NotificationCard(
                        notification = notification,
                        onClick = {
                            if (notification.jobId != null) {
                                onNavigateToJobDetails(notification.jobId)
                            }
                        }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotificationCard(
    notification: NotificationItem,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (notification.isRead) {
                MaterialTheme.colorScheme.surface
            } else {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.1f)
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = getNotificationIcon(notification.type),
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = getNotificationIconColor(notification.type)
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = notification.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = if (notification.isRead) FontWeight.Normal else FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = notification.timestamp,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            if (!notification.isRead) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .padding(top = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.foundation.Canvas(
                        modifier = Modifier.size(8.dp)
                    ) {
                        drawCircle(color = androidx.compose.ui.graphics.Color.Blue)
                    }
                }
            }
        }
    }
}

@Composable
private fun getNotificationIcon(type: NotificationType): ImageVector {
    return when (type) {
        NotificationType.NEW_JOB -> Icons.Default.Work
        NotificationType.DEADLINE_REMINDER -> Icons.Default.Schedule
        NotificationType.GENERAL -> Icons.Default.Notifications
    }
}

@Composable
private fun getNotificationIconColor(type: NotificationType): androidx.compose.ui.graphics.Color {
    return when (type) {
        NotificationType.NEW_JOB -> SuccessGreen
        NotificationType.DEADLINE_REMINDER -> UrgentRed
        NotificationType.GENERAL -> MaterialTheme.colorScheme.primary
    }
}

// Sample data classes and functions
data class NotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val type: NotificationType,
    val timestamp: String,
    val isRead: Boolean = false,
    val jobId: String? = null
)

enum class NotificationType {
    NEW_JOB,
    DEADLINE_REMINDER,
    GENERAL
}

private fun getSampleNotifications() = listOf(
    NotificationItem(
        id = "1",
        title = "New Job Posted: SSC CGL 2024",
        message = "Staff Selection Commission has announced Combined Graduate Level Examination 2024. Application deadline: December 15, 2024.",
        type = NotificationType.NEW_JOB,
        timestamp = "2 hours ago",
        isRead = false,
        jobId = "1"
    ),
    NotificationItem(
        id = "2",
        title = "Application Deadline Reminder",
        message = "Don't forget! Railway NTPC application deadline is approaching in 3 days. Complete your application now.",
        type = NotificationType.DEADLINE_REMINDER,
        timestamp = "1 day ago",
        isRead = false,
        jobId = "2"
    ),
    NotificationItem(
        id = "3",
        title = "IBPS Clerk Results Declared",
        message = "Institute of Banking Personnel Selection has declared the results for Clerk recruitment. Check your result now.",
        type = NotificationType.GENERAL,
        timestamp = "3 days ago",
        isRead = true
    ),
    NotificationItem(
        id = "4",
        title = "New Banking Jobs Available",
        message = "Multiple banking sector jobs have been posted. Explore opportunities in SBI, PNB, and other public sector banks.",
        type = NotificationType.NEW_JOB,
        timestamp = "1 week ago",
        isRead = true,
        jobId = "3"
    )
)

@Preview(showBackground = true)
@Composable
fun NotificationsScreenPreview() {
    SarkariKhozoTheme {
        NotificationsScreen()
    }
}