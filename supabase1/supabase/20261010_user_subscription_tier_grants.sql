-- Allow a signed-in user to persist their own subscription_tier.
-- Do not apply to production from an OTA; run in a staging SQL editor first.

grant update (
  subscription_tier,
  subscription_started_at,
  subscription_ends_at,
  subscription_auto_renew
) on table public.users to authenticated;

grant select, insert on table public.subscriptions to authenticated;
