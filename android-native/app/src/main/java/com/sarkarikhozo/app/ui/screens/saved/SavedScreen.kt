package com.sarkarikhozo.app.ui.screens.saved

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.R
import com.sarkarikhozo.app.data.model.Job
import com.sarkarikhozo.app.data.model.JobCategory
import com.sarkarikhozo.app.ui.components.JobCard
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SavedScreen(
    onNavigateToJobDetails: (String) -> Unit = {}
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = stringResource(R.string.saved_jobs_title),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        )

        val savedJobs = getSampleSavedJobs()
        
        if (savedJobs.isEmpty()) {
            // Empty State
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.BookmarkBorder,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.no_saved_jobs),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Start saving jobs you're interested in to see them here",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            // Saved Jobs List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(savedJobs) { job ->
                    JobCard(
                        job = job,
                        onClick = { onNavigateToJobDetails(job.id) }
                    )
                }
            }
        }
    }
}

// Sample data - in real app, this would come from repository/ViewModel
private fun getSampleSavedJobs() = listOf(
    Job(
        id = "1",
        title = "Staff Selection Commission Combined Graduate Level Examination",
        organization = "Staff Selection Commission",
        category = JobCategory.SSC,
        location = "All India",
        description = "SSC CGL is conducted to recruit candidates for various Group B and Group C posts in different ministries and departments of the Government of India.",
        eligibility = "Bachelor's degree from a recognized university",
        applicationDeadline = "2024-12-15",
        applicationStartDate = "2024-11-01",
        salary = "₹25,500 - ₹81,100",
        vacancies = 17727,
        applicationFee = "₹100",
        howToApply = "Apply online through SSC official website",
        importantDates = emptyList(),
        requirements = listOf("Bachelor's degree", "Age: 18-32 years"),
        benefits = listOf("Medical benefits", "Pension", "Leave encashment"),
        createdAt = "2024-10-29",
        updatedAt = "2024-10-29",
        imageUrl = null,
        officialWebsite = "https://ssc.nic.in",
        applicationUrl = "https://ssc.nic.in/apply"
    ),
    Job(
        id = "3",
        title = "IBPS Clerk Recruitment",
        organization = "Institute of Banking Personnel Selection",
        category = JobCategory.BANKING,
        location = "All India",
        description = "IBPS Clerk recruitment for clerical cadre posts in participating banks.",
        eligibility = "Graduate in any discipline",
        applicationDeadline = "2024-12-10",
        applicationStartDate = "2024-10-20",
        salary = "₹11,765 - ₹42,020",
        vacancies = 7855,
        applicationFee = "₹175",
        howToApply = "Apply online through IBPS official website",
        importantDates = emptyList(),
        requirements = listOf("Graduate degree", "Age: 20-28 years", "Computer literacy"),
        benefits = listOf("Medical benefits", "Pension", "Bank loan facilities"),
        createdAt = "2024-10-27",
        updatedAt = "2024-10-27",
        imageUrl = null,
        officialWebsite = "https://ibps.in",
        applicationUrl = "https://ibps.in/apply"
    )
)

@Preview(showBackground = true)
@Composable
fun SavedScreenPreview() {
    SarkariKhozoTheme {
        SavedScreen()
    }
}