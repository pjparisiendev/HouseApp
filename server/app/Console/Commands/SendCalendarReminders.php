<?php

namespace App\Console\Commands;

use App\Models\CalendarEventReminder;
use App\Models\PushSubscription;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class SendCalendarReminders extends Command
{
    protected $signature = 'houseapp:send-calendar-reminders';

    protected $description = 'Send due calendar reminder push notifications.';

    public function handle(): int
    {
        $auth = [
            'VAPID' => [
                'subject' => config('services.webpush.subject'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ];

        if (! $auth['VAPID']['publicKey'] || ! $auth['VAPID']['privateKey']) {
            $this->warn('Web Push VAPID keys are not configured.');

            return self::FAILURE;
        }

        $subscriptions = PushSubscription::query()->with('user:id,household_id')->get();
        if ($subscriptions->isEmpty()) {
            return self::SUCCESS;
        }

        $now = now();
        $webPush = new WebPush($auth);
        $sent = 0;

        CalendarEventReminder::query()
            ->with('calendarEvent')
            ->whereHas('calendarEvent', fn ($query) => $query->whereNotNull('start_time'))
            ->get()
            ->each(function (CalendarEventReminder $reminder) use ($now, $subscriptions, $webPush, &$sent) {
                $event = $reminder->calendarEvent;
                $eventAt = Carbon::parse("{$event->event_date->format('Y-m-d')} {$event->start_time}");
                $scheduledAt = $eventAt->copy()->subMinutes($reminder->minutes_before);

                if ($scheduledAt->greaterThan($now) || $eventAt->lessThan($now)) {
                    return;
                }

                foreach ($subscriptions->filter(fn ($subscription) => $subscription->user?->household_id === $event->household_id) as $subscription) {
                    $alreadyHandled = DB::table('calendar_reminder_deliveries')
                        ->where('calendar_event_reminder_id', $reminder->id)
                        ->where('push_subscription_id', $subscription->id)
                        ->where('scheduled_at', $scheduledAt)
                        ->exists();

                    if ($alreadyHandled) {
                        continue;
                    }

                    try {
                        $report = $webPush->sendOneNotification(
                            Subscription::create([
                                'endpoint' => $subscription->endpoint,
                                'publicKey' => $subscription->public_key,
                                'authToken' => $subscription->auth_token,
                                'contentEncoding' => $subscription->content_encoding,
                            ]),
                            json_encode([
                                'title' => 'Calendar reminder',
                                'body' => $event->title,
                                'url' => '/calendar',
                            ]),
                        );

                        if ($report->isSubscriptionExpired()) {
                            $subscription->delete();
                        }

                        DB::table('calendar_reminder_deliveries')->insert([
                            'calendar_event_reminder_id' => $reminder->id,
                            'push_subscription_id' => $subscription->id,
                            'scheduled_at' => $scheduledAt,
                            'sent_at' => $report->isSuccess() ? now() : null,
                            'failed_at' => $report->isSuccess() ? null : now(),
                            'failure_reason' => $report->isSuccess() ? null : $report->getReason(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        if ($report->isSuccess()) {
                            $sent++;
                        }
                    } catch (\Throwable $exception) {
                        DB::table('calendar_reminder_deliveries')->insert([
                            'calendar_event_reminder_id' => $reminder->id,
                            'push_subscription_id' => $subscription->id,
                            'scheduled_at' => $scheduledAt,
                            'sent_at' => null,
                            'failed_at' => now(),
                            'failure_reason' => $exception->getMessage(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            });

        $this->info("Sent {$sent} reminder notification(s).");

        return self::SUCCESS;
    }
}
