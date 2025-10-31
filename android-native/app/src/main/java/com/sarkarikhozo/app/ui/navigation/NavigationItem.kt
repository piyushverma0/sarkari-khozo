package com.sarkarikhozo.app.ui.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.sarkarikhozo.app.R

sealed class NavigationItem(
    val route: String,
    @StringRes val title: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    data object Home : NavigationItem(
        route = "home",
        title = R.string.nav_home,
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    )
    
    data object Jobs : NavigationItem(
        route = "jobs",
        title = R.string.nav_jobs,
        selectedIcon = Icons.Filled.Work,
        unselectedIcon = Icons.Outlined.Work
    )
    
    data object Applications : NavigationItem(
        route = "applications",
        title = R.string.nav_applications,
        selectedIcon = Icons.Filled.Assignment,
        unselectedIcon = Icons.Outlined.Assignment
    )
    
    data object Notifications : NavigationItem(
        route = "notifications",
        title = R.string.nav_notifications,
        selectedIcon = Icons.Filled.Notifications,
        unselectedIcon = Icons.Outlined.Notifications
    )
    
    data object Profile : NavigationItem(
        route = "profile",
        title = R.string.nav_profile,
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person
    )
}

val bottomNavigationItems = listOf(
    NavigationItem.Home,
    NavigationItem.Jobs,
    NavigationItem.Applications,
    NavigationItem.Notifications,
    NavigationItem.Profile
)