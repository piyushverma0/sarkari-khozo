package com.sarkarikhozo.app.ui.screens.applications

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.R
import com.sarkarikhozo.app.data.model.Application
import com.sarkarikhozo.app.data.model.ApplicationStatus
import com.sarkarikhozo.app.ui.components.ApplicationCard
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme
import com.sarkarikhozo.app.ui.theme.SuccessGreen
import com.sarkarikhozo.app.ui.theme.UrgentRed
import com.sarkarikhozo.app.ui.theme.WarningOrange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplicationsScreen(
    onNavigateToApplicationDetails: (String) -> Unit = {},
    onAddNewApplication: () -> Unit = {}
) {
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val tabs = listOf("All", "Discovered", "Applied", "Completed", "Archived")
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "My Applications",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = { /* Handle filter */ }) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = "Filter"
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddNewApplication,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add Application"
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Quick Stats
            QuickStatsSection()
            
            // Tab Row
            TabRow(
                selectedTabIndex = selectedTabIndex,
                modifier = Modifier.fillMaxWidth()
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        text = { Text(title) }
                    )
                }
            }
            
            // Applications List
            ApplicationsList(
                statusFilter = when (selectedTabIndex) {
                    0 -> null
                    1 -> ApplicationStatus.DISCOVERED
                    2 -> ApplicationStatus.APPLIED
                    3 -> ApplicationStatus.COMPLETED
                    4 -> ApplicationStatus.ARCHIVED
                    else -> null
                },
                onNavigateToApplicationDetails = onNavigateToApplicationDetails
            )
        }
    }
}

@Composable
private fun QuickStatsSection() {
    val stats = getSampleStats()
    
    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = "Quick Overview",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                title = "Total Tracked",
                value = stats.total.toString(),
                icon = Icons.Default.Assignment,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f)
            )
            
            StatCard(
                title = "Applied",
                value = stats.applied.toString(),
                icon = Icons.Default.CheckCircle,
                color = SuccessGreen,
                modifier = Modifier.weight(1f)
            )
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                title = "Upcoming",
                value = stats.upcoming.toString(),
                icon = Icons.Default.Schedule,
                color = WarningOrange,
                modifier = Modifier.weight(1f)
            )
            
            StatCard(
                title = "Archived",
                value = stats.archived.toString(),
                icon = Icons.Default.Archive,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = color
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ApplicationsList(
    statusFilter: ApplicationStatus?,
    onNavigateToApplicationDetails: (String) -> Unit
) {
    val applications = getSampleApplications().let { apps ->
        if (statusFilter != null) {
            apps.filter { it.applicationStatus == statusFilter }
        } else {
            apps
        }
    }
    
    if (applications.isEmpty()) {
        // Empty State
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Assignment,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "No applications found",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Start tracking your applications to see them here",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(applications) { application ->
                ApplicationCard(
                    application = application,
                    onClick = { onNavigateToApplicationDetails(application.id) }
                )
            }
        }
    }
}

// Sample data
data class ApplicationStats(
    val total: Int,
    val applied: Int,
    val upcoming: Int,
    val archived: Int
)

private fun getSampleStats() = ApplicationStats(
    total = 12,
    applied = 5,
    upcoming = 3,
    archived = 2
)

private fun getSampleApplications() = listOf(
    Application(
        id = "1",
        userId = "user1",
        title = "SSC Combined Graduate Level Examination (CGL) 2024",
        description = "Staff Selection Commission conducts CGL exam for recruitment to various Group B and Group C posts in different ministries and departments of the Government of India.",
        url = "https://ssc.nic.in/cgl2024",
        category = "SSC",
        applicationStatus = ApplicationStatus.APPLIED,
        importantDates = mapOf(
            "Application Start" to "2024-11-01",
            "Application End" to "2024-12-15",
            "Exam Date" to "2025-02-20"
        ),
        eligibility = "Bachelor's degree from a recognized university",
        appliedConfirmed = true,
        savedAt = "2024-10-29T10:00:00Z",
        updatedAt = "2024-10-29T10:00:00Z"
    ),
    Application(
        id = "2",
        userId = "user1",
        title = "Railway Recruitment Board NTPC 2024",
        description = "RRB NTPC recruitment for various technical and non-technical posts in Indian Railways.",
        url = "https://rrbcdg.gov.in/ntpc2024",
        category = "Railway",
        applicationStatus = ApplicationStatus.DISCOVERED,
        importantDates = mapOf(
            "Application Start" to "2024-10-15",
            "Application End" to "2024-11-30",
            "Exam Date" to "2025-01-15"
        ),
        eligibility = "12th Pass / Graduate",
        appliedConfirmed = false,
        savedAt = "2024-10-28T15:30:00Z",
        updatedAt = "2024-10-28T15:30:00Z"
    ),
    Application(
        id = "3",
        userId = "user1",
        title = "IBPS Clerk Recruitment 2024",
        description = "Institute of Banking Personnel Selection conducts recruitment for clerical cadre posts in participating banks.",
        url = "https://ibps.in/clerk2024",
        category = "Banking",
        applicationStatus = ApplicationStatus.COMPLETED,
        importantDates = mapOf(
            "Application Start" to "2024-09-01",
            "Application End" to "2024-10-10",
            "Exam Date" to "2024-11-20",
            "Result Date" to "2024-12-05"
        ),
        eligibility = "Graduate in any discipline",
        appliedConfirmed = true,
        savedAt = "2024-09-15T09:00:00Z",
        updatedAt = "2024-12-05T16:00:00Z"
    )
)

@Preview(showBackground = true)
@Composable
fun ApplicationsScreenPreview() {
    SarkariKhozoTheme {
        ApplicationsScreen()
    }
}