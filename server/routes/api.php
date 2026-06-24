<?php

use App\Http\Controllers\Api\AppConfigController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarEventController;
use App\Http\Controllers\Api\CalendarEventNoteController;
use App\Http\Controllers\Api\FeedbackItemController;
use App\Http\Controllers\Api\HouseholdController;
use App\Http\Controllers\Api\InventoryCategoryController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\ShoppingItemController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WishlistItemController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);
    Route::get('/config/maps', [AppConfigController::class, 'maps']);

    Route::get('/push/public-key', [PushSubscriptionController::class, 'publicKey']);
    Route::post('/push/subscriptions', [PushSubscriptionController::class, 'store']);

    Route::get('/users', [UserController::class, 'index'])->middleware('permission:manage_users');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:manage_users');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:manage_roles');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:manage_users');

    Route::get('/households', [HouseholdController::class, 'index'])->middleware('permission:manage_households');
    Route::post('/households', [HouseholdController::class, 'store'])->middleware('permission:manage_households');
    Route::delete('/households/{household}', [HouseholdController::class, 'destroy'])->middleware('permission:manage_households');

    Route::get('/categories', [InventoryCategoryController::class, 'index']);
    Route::post('/categories', [InventoryCategoryController::class, 'store'])->middleware('permission:edit_household');

    Route::get('/inventory-items', [InventoryItemController::class, 'index']);
    Route::post('/inventory-items', [InventoryItemController::class, 'store'])->middleware('permission:edit_household');
    Route::put('/inventory-items/{inventoryItem}', [InventoryItemController::class, 'update'])->middleware('permission:edit_household');
    Route::delete('/inventory-items/{inventoryItem}', [InventoryItemController::class, 'destroy'])->middleware('permission:edit_household');
    Route::post('/inventory-items/{inventoryItem}/media', [InventoryItemController::class, 'uploadMedia'])->middleware('permission:edit_household');

    Route::get('/media/{media}/content', [MediaController::class, 'content']);
    Route::delete('/media/{media}', [MediaController::class, 'destroy'])->middleware('permission:edit_household');
    Route::put('/media/{media}/primary', [MediaController::class, 'primary'])->middleware('permission:edit_household');

    Route::get('/shopping-items', [ShoppingItemController::class, 'index']);
    Route::post('/shopping-items', [ShoppingItemController::class, 'store'])->middleware('permission:edit_household');
    Route::put('/shopping-items/{shoppingItem}', [ShoppingItemController::class, 'update'])->middleware('permission:edit_household');
    Route::delete('/shopping-items/{shoppingItem}', [ShoppingItemController::class, 'destroy'])->middleware('permission:edit_household');
    Route::post('/shopping-items/{shoppingItem}/acquire', [ShoppingItemController::class, 'acquire'])->middleware('permission:edit_household');

    Route::get('/calendar-events', [CalendarEventController::class, 'index']);
    Route::post('/calendar-events', [CalendarEventController::class, 'store'])->middleware('permission:edit_household');
    Route::put('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'update'])->middleware('permission:edit_household');
    Route::delete('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'destroy'])->middleware('permission:edit_household');
    Route::post('/calendar-events/{calendarEvent}/notes', [CalendarEventNoteController::class, 'store'])->middleware('permission:edit_household');

    Route::get('/wishlist-items', [WishlistItemController::class, 'index']);
    Route::post('/wishlist-items', [WishlistItemController::class, 'store'])->middleware('permission:edit_household');
    Route::put('/wishlist-items/{wishlistItem}', [WishlistItemController::class, 'update'])->middleware('permission:edit_household');
    Route::delete('/wishlist-items/{wishlistItem}', [WishlistItemController::class, 'destroy'])->middleware('permission:edit_household');

    Route::get('/feedback-items', [FeedbackItemController::class, 'index']);
    Route::post('/feedback-items', [FeedbackItemController::class, 'store']);
    Route::put('/feedback-items/{feedbackItem}', [FeedbackItemController::class, 'update'])->middleware('permission:manage_feedback');
    Route::delete('/feedback-items/{feedbackItem}', [FeedbackItemController::class, 'destroy'])->middleware('permission:manage_feedback');
});
