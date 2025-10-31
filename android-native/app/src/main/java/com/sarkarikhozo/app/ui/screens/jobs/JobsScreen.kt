package com.sarkarikhozo.app.ui.screens.jobs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
fun JobsScreen(
    onNavigateToJobDetails: (String) -> Unit = {},
    onNavigateToSearch: () -> Unit = {}
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = stringResource(R.string.nav_jobs),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            },
            actions = {
                IconButton(onClick = onNavigateToSearch) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = stringResource(R.string.cd_search_button)
                    )
                }
                IconButton(onClick = { /* Handle filter */ }) {
                    Icon(
                        imageVector = Icons.Default.FilterList,
                        contentDescription = stringResource(R.string.cd_filter_button)
                    )
                }
            }
        )

        // Jobs List
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "All Government Jobs",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${getSampleJobs().size} jobs found",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Jobs List
            items(getSampleJobs()) { job ->
                JobCard(
                    job = job,
                    onClick = { onNavigateToJobDetails(job.id) }
                )
            }
        }
    }
}

// Sample data - in real app, this would come from repository/ViewModel
private fun getSampleJobs() = listOf(
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
        id = "2",
        title = "Railway Recruitment Board NTPC",
        organization = "Railway Recruitment Board",
        category = JobCategory.RAILWAY,
        location = "All India",
        description = "RRB NTPC recruitment for various technical and non-technical posts in Indian Railways.",
        eligibility = "12th Pass / Graduate",
        applicationDeadline = "2024-11-30",
        applicationStartDate = "2024-10-15",
        salary = "₹19,900 - ₹63,200",
        vacancies = 35281,
        applicationFee = "₹250",
        howToApply = "Apply online through RRB official website",
        importantDates = emptyList(),
        requirements = listOf("12th Pass or Graduate", "Age: 18-33 years"),
        benefits = listOf("Free railway pass", "Medical benefits", "Pension"),
        createdAt = "2024-10-28",
        updatedAt = "2024-10-28",
        imageUrl = null,
        officialWebsite = "https://rrbcdg.gov.in",
        applicationUrl = "https://rrbcdg.gov.in/apply"
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
fun JobsScreenPreview() {
    SarkariKhozoTheme {
        JobsScreen()
    }
}