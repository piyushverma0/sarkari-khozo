package com.sarkarikhozo.app.di

import com.sarkarikhozo.app.data.repository.ApplicationRepository
import com.sarkarikhozo.app.data.repository.AuthRepository
import com.sarkarikhozo.app.data.repository.DiscoveryRepository
import com.sarkarikhozo.app.data.repository.JobRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object SupabaseModule {
    
    @Provides
    @Singleton
    fun provideAuthRepository(): AuthRepository {
        return AuthRepository()
    }
    
    @Provides
    @Singleton
    fun provideApplicationRepository(): ApplicationRepository {
        return ApplicationRepository()
    }
    
    @Provides
    @Singleton
    fun provideDiscoveryRepository(): DiscoveryRepository {
        return DiscoveryRepository()
    }
    
    @Provides
    @Singleton
    fun provideJobRepository(): JobRepository {
        return JobRepository()
    }
}