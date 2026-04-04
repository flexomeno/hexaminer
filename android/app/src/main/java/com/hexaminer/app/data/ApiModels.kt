package com.hexaminer.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UploadUrlRequest(val fileName: String, val contentType: String)

@Serializable
data class UploadUrlResponse(
    val key: String,
    val uploadUrl: String,
    val contentType: String? = null,
)

@Serializable
data class AnalyzeRequest(
    val imageKey: String? = null,
    val imageKeys: List<String>? = null,
    val userId: String? = null,
)

@Serializable
data class AnalyzeResponse(
    val source: String,
    val uid: String,
    val product: ProductDto,
)

@Serializable
data class ChemicalRowDto(
    val ingrediente: String,
    val funcion: String,
    val calificacion: String,
)

@Serializable
data class ProductDto(
    val uid: String,
    val id: String,
    val barcode: String? = null,
    val name: String,
    val brand: String,
    val category: String,
    val ingredients: List<String> = emptyList(),
    val score: Int,
    @SerialName("disruptors_summary") val disruptorsSummary: String,
    @SerialName("labor_ethics") val laborEthics: String,
    @SerialName("endocrine_alerts") val endocrineAlerts: List<String> = emptyList(),
    @SerialName("health_alert") val healthAlert: String,
    @SerialName("chemical_analysis") val chemicalAnalysis: List<ChemicalRowDto> = emptyList(),
    val verdict: String,
    val recommendation: String,
    @SerialName("last_updated") val lastUpdated: String,
)

@Serializable
data class UserDto(
    val userId: String,
    val email: String? = null,
    val name: String? = null,
    val image: String? = null,
)

@Serializable
data class UserScanDto(
    val productUid: String,
    val productName: String,
    val score: Int,
    val scannedAt: String,
)

@Serializable
data class ShoppingItemDto(
    val productUid: String,
    val productName: String,
    val score: Int,
    val endocrineRiskCount: Int,
    val addedAt: String,
)

@Serializable
data class ShoppingEvaluationDto(
    val listSize: Int,
    val averageScore: Double,
    val riskProductCount: Int,
    val riskPercentage: Double,
    val basketGrade: String,
    val tooManyEndocrineRisk: Boolean,
    val recommendation: String,
)

@Serializable
data class DashboardResponse(
    val user: UserDto? = null,
    @SerialName("recent_scans") val recentScans: List<UserScanDto> = emptyList(),
    @SerialName("shopping_list") val shoppingList: List<ShoppingItemDto> = emptyList(),
    @SerialName("shopping_list_summary") val shoppingListSummary: ShoppingEvaluationDto? = null,
)

@Serializable
data class AddShoppingItemRequest(val uid: String, val userId: String? = null)

@Serializable
data class AddShoppingItemResponse(val item: ShoppingItemDto)

@Serializable
data class EvaluateRequest(val userId: String? = null)

@Serializable
data class EvaluateResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("shopping_items") val shoppingItems: List<ShoppingItemDto> = emptyList(),
    val evaluation: ShoppingEvaluationDto,
)
