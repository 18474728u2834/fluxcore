DELETE FROM public.activity_events
WHERE event_type = 'chat_message'
  AND (event_data->>'content' IS NULL OR btrim(event_data->>'content') = '');