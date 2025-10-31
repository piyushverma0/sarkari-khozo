package com.sarkarikhozo.app.data.supabase

import com.sarkarikhozo.app.BuildConfig
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import javax.inject.Singleton

@Singleton
object SupabaseClient {
    
    val client = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY
    ) {
        install(GoTrue)
        install(Postgrest)
        install(Functions)
        install(Realtime)
        install(Storage)
    }
    
    val gotrue: GoTrue get() = client.gotrue
    val postgrest: Postgrest get() = client.postgrest
    val functions: Functions get() = client.functions
    val realtime: Realtime get() = client.realtime
    val storage: Storage get() = client.storage
}