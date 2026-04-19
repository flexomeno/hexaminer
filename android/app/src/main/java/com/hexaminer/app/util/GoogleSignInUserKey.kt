package com.hexaminer.app.util

import android.util.Base64
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import org.json.JSONObject

/**
 * Clave estable para la API: email si existe; si no, id de cuenta; si no, `sub` del idToken (JWT).
 */
fun googleAccountToUserKey(account: GoogleSignInAccount?): String? {
    if (account == null) return null
    account.email?.trim()?.takeIf { it.contains("@") }?.let { return it }
    account.id?.takeIf { it.isNotBlank() }?.let { return it }
    val token = account.idToken ?: return null
    return try {
        val parts = token.split(".")
        if (parts.size < 2) return null
        val payloadJson = String(base64UrlDecode(parts[1]), Charsets.UTF_8)
        JSONObject(payloadJson).optString("sub", "").takeIf { it.isNotBlank() }
    } catch (_: Exception) {
        null
    }
}

private fun base64UrlDecode(segment: String): ByteArray {
    var s = segment.replace('-', '+').replace('_', '/')
    val pad = (4 - s.length % 4) % 4
    if (pad > 0) s += "=".repeat(pad)
    return Base64.decode(s, Base64.DEFAULT)
}
