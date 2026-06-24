<?php

namespace Tests\Feature;

use App\Models\CalendarEvent;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\Media;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HouseholdApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_username_and_password(): void
    {
        User::factory()->create([
            'username' => 'pj',
            'password' => 'secret-password',
            'role' => 'admin',
        ]);

        $this->postJson('/api/login', [
            'username' => 'pj',
            'password' => 'secret-password',
        ])->assertOk()
            ->assertJsonPath('user.username', 'pj')
            ->assertJsonStructure(['token']);
    }

    public function test_viewer_cannot_change_household_data(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'viewer']));

        $this->postJson('/api/categories', ['name' => 'Garage'])
            ->assertForbidden();
    }

    public function test_low_stock_item_is_added_and_removed_from_shopping_after_acquisition(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');

        $inventoryResponse = $this->postJson('/api/inventory-items', [
            'name' => 'Milk',
            'inventory_category_id' => $category->id,
            'quantity' => 1,
            'low_stock_threshold' => 2,
        ])->assertCreated();

        $shoppingItem = $this->getJson('/api/shopping-items')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Milk')
            ->assertJsonPath('0.quantity', 1)
            ->json('0');

        $this->postJson("/api/shopping-items/{$shoppingItem['id']}/acquire")
            ->assertOk()
            ->assertJsonPath('quantity', 2);

        $this->getJson('/api/shopping-items')->assertExactJson([]);
        $this->getJson('/api/inventory-items')
            ->assertJsonPath('0.id', $inventoryResponse->json('id'))
            ->assertJsonPath('0.quantity', 2);
    }

    public function test_acquiring_new_shopping_item_creates_inventory_item(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Pantry');

        $shoppingItem = $this->postJson('/api/shopping-items', [
            'name' => 'Rice',
            'inventory_category_id' => $category->id,
            'quantity' => 3,
        ])->assertCreated()->json();

        $this->postJson("/api/shopping-items/{$shoppingItem['id']}/acquire")
            ->assertOk()
            ->assertJsonPath('name', 'Rice')
            ->assertJsonPath('quantity', 3)
            ->assertJsonPath('low_stock_threshold', 0);
    }

    public function test_unit_threshold_adds_and_acquires_a_whole_pack(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');

        $item = $this->postJson('/api/inventory-items', [
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 5,
            'low_stock_threshold' => 6,
            'sub_quantity_enabled' => true,
            'units_per_pack' => 12,
            'unit_label' => 'eggs',
            'pack_label' => 'dozen',
            'low_stock_threshold_mode' => 'unit',
        ])->assertCreated()->json();

        $shoppingItem = $this->getJson('/api/shopping-items')
            ->assertJsonPath('0.quantity', 1)
            ->assertJsonPath('0.purchase_unit', 'pack')
            ->assertJsonPath('0.units_per_purchase', 12)
            ->assertJsonPath('0.purchase_label', 'dozen')
            ->json('0');

        $this->postJson("/api/shopping-items/{$shoppingItem['id']}/acquire")
            ->assertOk()
            ->assertJsonPath('id', $item['id'])
            ->assertJsonPath('quantity', 17);
    }

    public function test_pack_threshold_rounds_shortage_up_to_enough_packs(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');

        $this->postJson('/api/inventory-items', [
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 5,
            'low_stock_threshold' => 2,
            'sub_quantity_enabled' => true,
            'units_per_pack' => 12,
            'unit_label' => 'eggs',
            'pack_label' => 'dozen',
            'low_stock_threshold_mode' => 'pack',
        ])->assertCreated();

        $shoppingItem = $this->getJson('/api/shopping-items')
            ->assertJsonPath('0.quantity', 2)
            ->json('0');

        $this->postJson("/api/shopping-items/{$shoppingItem['id']}/acquire")
            ->assertJsonPath('quantity', 29);
    }

    public function test_exact_pack_threshold_does_not_add_a_shopping_item(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');

        $this->postJson('/api/inventory-items', [
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 12,
            'low_stock_threshold' => 1,
            'sub_quantity_enabled' => true,
            'units_per_pack' => 12,
            'unit_label' => 'eggs',
            'pack_label' => 'dozen',
            'low_stock_threshold_mode' => 'pack',
        ])->assertCreated();

        $this->getJson('/api/shopping-items')->assertExactJson([]);
    }

    public function test_manually_added_known_pack_item_is_acquired_as_packs(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');

        $inventoryItem = $this->postJson('/api/inventory-items', [
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 0,
            'low_stock_threshold' => 0,
            'sub_quantity_enabled' => true,
            'units_per_pack' => 12,
            'unit_label' => 'eggs',
            'pack_label' => 'dozen',
            'low_stock_threshold_mode' => 'unit',
        ])->assertCreated()->json();

        $shoppingItem = $this->postJson('/api/shopping-items', [
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 2,
        ])->assertCreated()
            ->assertJsonPath('purchase_unit', 'pack')
            ->assertJsonPath('units_per_purchase', 12)
            ->json();

        $this->postJson("/api/shopping-items/{$shoppingItem['id']}/acquire")
            ->assertJsonPath('id', $inventoryItem['id'])
            ->assertJsonPath('quantity', 24);
    }

    public function test_member_can_manage_an_inventory_gallery(): void
    {
        Storage::fake('local');
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');
        $item = InventoryItem::query()->create([
            'household_id' => $member->household_id,
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 12,
            'low_stock_threshold' => 0,
        ]);

        $this->post("/api/inventory-items/{$item->id}/media", [
            'image' => $this->fakeImage('front.webp'),
            'original_name' => 'Original front.jpg',
        ])->assertOk()
            ->assertJsonPath('media.0.is_primary', true)
            ->assertJsonPath('media.0.width', 4)
            ->assertJsonPath('media.0.height', 3);
        $this->post("/api/inventory-items/{$item->id}/media", [
            'image' => $this->fakeImage('back.webp'),
            'original_name' => 'Original back.jpg',
        ])->assertOk()->assertJsonCount(2, 'media');

        $first = Media::query()->orderBy('position')->firstOrFail();
        $second = Media::query()->orderBy('position')->skip(1)->firstOrFail();
        $path = $first->path;
        Storage::disk('local')->assertExists($path);
        $this->get("/api/media/{$first->id}/content")
            ->assertOk()
            ->assertHeader('content-type', 'image/webp');

        $this->putJson("/api/media/{$second->id}/primary")
            ->assertOk()
            ->assertJsonPath('is_primary', true);
        $this->assertFalse($first->fresh()->is_primary);

        $this->deleteJson("/api/media/{$second->id}")->assertNoContent();
        $this->assertTrue($first->fresh()->is_primary);

        $this->deleteJson("/api/inventory-items/{$item->id}")->assertNoContent();
        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseCount('media', 0);
    }

    public function test_inventory_gallery_enforces_five_image_limit(): void
    {
        Storage::fake('local');
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);
        $category = $this->createCategory($member, 'Fridge');
        $item = InventoryItem::query()->create([
            'household_id' => $member->household_id,
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 12,
            'low_stock_threshold' => 0,
        ]);

        foreach (range(1, 5) as $number) {
            $this->post("/api/inventory-items/{$item->id}/media", [
                'image' => $this->fakeImage("eggs-{$number}.webp"),
                'original_name' => "eggs-{$number}.jpg",
            ])->assertOk();
        }

        $this->post("/api/inventory-items/{$item->id}/media", [
            'image' => $this->fakeImage('too-many.webp'),
            'original_name' => 'too-many.jpg',
        ])->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_viewer_cannot_modify_inventory_media(): void
    {
        Storage::fake('local');
        $viewer = User::factory()->create(['role' => 'viewer']);
        $category = $this->createCategory($viewer, 'Fridge');
        $item = InventoryItem::query()->create([
            'household_id' => $viewer->household_id,
            'name' => 'Eggs',
            'inventory_category_id' => $category->id,
            'quantity' => 12,
            'low_stock_threshold' => 0,
        ]);
        Sanctum::actingAs($viewer);

        $this->post("/api/inventory-items/{$item->id}/media", [
            'image' => $this->fakeImage(),
            'original_name' => 'eggs.jpg',
        ])->assertForbidden();
    }

    public function test_member_can_manage_wishlist_items(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'member']));

        $item = $this->postJson('/api/wishlist-items', [
            'title' => 'Try the new Italian restaurant',
            'type' => 'place',
            'notes' => 'Book a table for Friday.',
            'url' => 'https://example.com/menu',
        ])->assertCreated()
            ->assertJsonPath('type', 'place')
            ->json();

        $this->putJson("/api/wishlist-items/{$item['id']}", [
            'title' => 'Try the Italian restaurant',
            'type' => 'place',
            'notes' => null,
            'url' => null,
        ])->assertOk()
            ->assertJsonPath('title', 'Try the Italian restaurant');

        $this->getJson('/api/wishlist-items')
            ->assertOk()
            ->assertJsonCount(1);

        $this->deleteJson("/api/wishlist-items/{$item['id']}")
            ->assertNoContent();
    }

    public function test_viewer_can_view_but_cannot_add_wishlist_items(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'viewer']));

        $this->getJson('/api/wishlist-items')->assertOk();
        $this->postJson('/api/wishlist-items', [
            'title' => 'Weekend away',
            'type' => 'trip',
        ])->assertForbidden();
    }

    public function test_member_can_edit_an_event_and_append_a_note_separately(): void
    {
        $member = User::factory()->create(['role' => 'member', 'name' => 'PJ']);
        Sanctum::actingAs($member);
        $event = CalendarEvent::query()->create([
            'household_id' => $member->household_id,
            'title' => 'Dinner',
            'event_date' => '2026-06-21',
            'category' => 'social',
            'notes' => 'Original event description',
            'created_by' => $member->id,
        ]);

        $this->putJson("/api/calendar-events/{$event->id}", [
            'title' => 'Anniversary dinner',
            'event_date' => '2026-06-21',
            'start_time' => '18:30',
            'end_time' => null,
            'category' => 'social',
            'notes' => 'Original event description',
        ])->assertOk()->assertJsonPath('title', 'Anniversary dinner');

        $this->postJson("/api/calendar-events/{$event->id}/notes", [
            'body' => 'The reservation is under PJ.',
        ])->assertCreated()
            ->assertJsonPath('body', 'The reservation is under PJ.')
            ->assertJsonPath('author.name', 'PJ');

        $this->getJson('/api/calendar-events')
            ->assertOk()
            ->assertJsonPath('0.title', 'Anniversary dinner')
            ->assertJsonPath('0.notes', 'Original event description')
            ->assertJsonPath('0.event_notes.0.body', 'The reservation is under PJ.');
    }

    public function test_viewer_cannot_append_an_event_note(): void
    {
        $viewer = User::factory()->create(['role' => 'viewer']);
        $event = CalendarEvent::query()->create([
            'household_id' => $viewer->household_id,
            'title' => 'Appointment',
            'event_date' => '2026-06-21',
            'category' => 'appointment',
        ]);
        Sanctum::actingAs($viewer);

        $this->postJson("/api/calendar-events/{$event->id}/notes", [
            'body' => 'Trying to change the event',
        ])->assertForbidden();
    }

    private function fakeImage(string $name = 'eggs.webp'): UploadedFile
    {
        $contents = base64_decode('UklGRjwAAABXRUJQVlA4IDAAAADwAQCdASoEAAMAAQAcJaACdLoB+AAETAAA/vSj7/7Wh9Wh9Wh/Ld/8lNf4247AAAA=');

        return UploadedFile::fake()->createWithContent($name, $contents);
    }

    private function createCategory(User $user, string $name): InventoryCategory
    {
        return InventoryCategory::query()->create([
            'household_id' => $user->household_id,
            'name' => $name,
        ]);
    }
}
