-- Fix story_analytics view to use security_invoker
DROP VIEW IF EXISTS story_analytics;

CREATE VIEW story_analytics
WITH (security_invoker = on)
AS
SELECT 
    id,
    headline,
    category,
    region,
    published_date,
    created_at,
    view_count,
    save_count,
    share_count,
    click_count,
    views_today,
    views_this_week,
    engagement_score,
    save_rate,
    click_through_rate
FROM discovery_stories
WHERE is_active = true;