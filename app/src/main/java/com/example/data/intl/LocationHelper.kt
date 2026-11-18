package com.example.data.intl

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

data class SuggestedLocation(
    val countryCode: String,
    val stateRegion: String,
    val city: String,
    val postalCode: String
)

object LocationHelper {
    @SuppressLint("MissingPermission")
    suspend fun resolveCoarseLocationCountry(context: Context): SuggestedLocation? = withContext(Dispatchers.IO) {
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return@withContext null
            val providers = lm.getProviders(true)
            var bestLocation: Location? = null
            for (provider in providers) {
                val loc = lm.getLastKnownLocation(provider) ?: continue
                if (bestLocation == null || loc.accuracy < bestLocation.accuracy) {
                    bestLocation = loc
                }
            }
            val loc = bestLocation ?: return@withContext null
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocation(loc.latitude, loc.longitude, 1)
            val addr = addresses?.firstOrNull() ?: return@withContext null
            val code = addr.countryCode?.uppercase(Locale.ROOT) ?: return@withContext null
            SuggestedLocation(
                countryCode = code,
                stateRegion = addr.adminArea.orEmpty(),
                city = (addr.locality ?: addr.subAdminArea).orEmpty(),
                postalCode = addr.postalCode.orEmpty()
            )
        } catch (_: Exception) {
            null
        }
    }
}
