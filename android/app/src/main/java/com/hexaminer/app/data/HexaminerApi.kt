package com.hexaminer.app.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface HexaminerApi {
    @POST("upload-url")
    suspend fun uploadUrl(@Body body: UploadUrlRequest): UploadUrlResponse

    @POST("analyze-product")
    suspend fun analyzeProduct(@Body body: AnalyzeRequest): AnalyzeResponse

    @POST("analyze-product/start")
    suspend fun startAnalyzeJob(@Body body: AnalyzeRequest): StartAnalyzeJobResponse

    @GET("analyze-product/job")
    suspend fun getAnalyzeJob(
        @Query("jobId") jobId: String,
        @Query("userId") userId: String?,
    ): AnalyzeJobPollResponse

    @GET("dashboard")
    suspend fun dashboard(@Query("userId") userId: String?): DashboardResponse

    @GET("product")
    suspend fun getProduct(
        @Query("uid") uid: String,
        @Query("userId") userId: String?,
    ): GetProductResponse

    @POST("shopping-list/items")
    suspend fun addShoppingItem(@Body body: AddShoppingItemRequest): AddShoppingItemResponse

    @POST("shopping-list/evaluate")
    suspend fun evaluate(@Body body: EvaluateRequest): EvaluateResponse
}
