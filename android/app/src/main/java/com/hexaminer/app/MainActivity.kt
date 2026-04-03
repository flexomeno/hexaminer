package com.hexaminer.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.hexaminer.app.data.HexaminerRepository
import com.hexaminer.app.data.UserPreferences
import com.hexaminer.app.ui.HexaminerApp

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val repository = HexaminerRepository(this)
        val userPreferences = UserPreferences(this)

        val webClientId = getString(R.string.default_web_client_id)
        val gsoBuilder = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
        if (webClientId.isNotBlank()) {
            gsoBuilder.requestIdToken(webClientId)
        }
        val googleClient = GoogleSignIn.getClient(this, gsoBuilder.build())

        setContent {
            HexaminerApp(
                repository = repository,
                userPreferences = userPreferences,
                googleClient = googleClient,
            )
        }
    }
}
