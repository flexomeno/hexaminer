package com.hexaminer.app.data

import android.content.Context
import android.net.Uri
import com.hexaminer.app.BuildConfig
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

class HexaminerRepository(context: Context) {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/') + "/"

    private val okHttp: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(
                    HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC),
                )
            }
        }
        .build()

    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttp)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val api: HexaminerApi = retrofit.create(HexaminerApi::class.java)

    private val appContext = context.applicationContext

    suspend fun uploadBytesToPresigned(uploadUrl: String, bytes: ByteArray, contentType: String) {
        withContext(Dispatchers.IO) {
            val body = bytes.toRequestBody(contentType.toMediaType())
            val request = Request.Builder()
                .url(uploadUrl)
                .put(body)
                .header("Content-Type", contentType)
                .build()
            okHttp.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) {
                    error("S3 upload failed: HTTP ${resp.code}")
                }
            }
        }
    }

    fun readUriBytes(uri: Uri): Pair<ByteArray, String> {
        val stream = appContext.contentResolver.openInputStream(uri)
            ?: error("No se pudo leer la imagen")
        stream.use { input ->
            val bytes = input.readBytes()
            val type = appContext.contentResolver.getType(uri) ?: "image/jpeg"
            return bytes to type
        }
    }

    private suspend fun uploadImagesAndCollectKeys(uris: List<Uri>): List<String> = withContext(Dispatchers.IO) {
        require(uris.isNotEmpty()) { "Se necesita al menos una imagen" }
        val keys = ArrayList<String>(uris.size)
        uris.forEachIndexed { index, uri ->
            val (bytes, contentType) = readUriBytes(uri)
            val safeName = "upload-${System.currentTimeMillis()}-$index.jpg"
            val up = api.uploadUrl(
                UploadUrlRequest(
                    fileName = safeName,
                    contentType = if (contentType.startsWith("image/")) contentType else "image/jpeg",
                ),
            )
            uploadBytesToPresigned(up.uploadUrl, bytes, up.contentType ?: contentType)
            keys.add(up.key)
        }
        keys
    }

    /**
     * Sube imágenes, encola análisis asíncrono y devuelve [jobId].
     * El backend añade el producto a la lista al terminar.
     */
    suspend fun uploadAndStartAnalysisJob(uris: List<Uri>, userId: String?): String =
        withContext(Dispatchers.IO) {
            val keys = uploadImagesAndCollectKeys(uris)
            val started = api.startAnalyzeJob(AnalyzeRequest(imageKeys = keys, userId = userId))
            started.jobId
        }

    suspend fun waitForAnalysisJob(jobId: String, userId: String?): ProductDto =
        withContext(Dispatchers.IO) {
            repeat(48) {
                delay(2_500)
                val res = api.getAnalyzeJob(jobId, userId)
                when (res.job.status) {
                    "COMPLETED" -> {
                        val p = res.product ?: error("Análisis completado sin datos de producto")
                        return@withContext p
                    }
                    "FAILED" -> error(res.job.errorMessage ?: "El análisis falló")
                    else -> Unit
                }
            }
            error("Tiempo de espera agotado. Revisa el panel en unos minutos.")
        }

    /** Flujo síncrono legacy (scripts / compat). La app usa [uploadAndStartAnalysisJob] + [waitForAnalysisJob]. */
    suspend fun analyzeFromUris(uris: List<Uri>, userId: String?): ProductDto = withContext(Dispatchers.IO) {
        val keys = uploadImagesAndCollectKeys(uris)
        val analyzed = api.analyzeProduct(
            AnalyzeRequest(imageKeys = keys, userId = userId),
        )
        try {
            api.addShoppingItem(
                AddShoppingItemRequest(uid = analyzed.product.uid, userId = userId),
            )
        } catch (_: Exception) {
            // no bloquear si la lista falla
        }
        analyzed.product
    }

    suspend fun analyzeFromUri(uri: Uri, userId: String?): ProductDto =
        analyzeFromUris(listOf(uri), userId)

    suspend fun loadDashboard(userId: String?): DashboardResponse =
        withContext(Dispatchers.IO) { api.dashboard(userId) }

    suspend fun fetchProduct(productUid: String, userId: String?): ProductDto =
        withContext(Dispatchers.IO) {
            api.getProduct(uid = productUid, userId = userId).product
        }

    suspend fun evaluateList(userId: String?): EvaluateResponse =
        withContext(Dispatchers.IO) { api.evaluate(EvaluateRequest(userId = userId)) }

    suspend fun resetSession(
        userId: String?,
        shoppingList: Boolean = true,
        recentScans: Boolean = false,
    ): ResetSessionResponse =
        withContext(Dispatchers.IO) {
            api.resetSession(
                ResetSessionRequest(
                    userId = userId,
                    shoppingList = shoppingList,
                    recentScans = recentScans,
                ),
            )
        }
}
