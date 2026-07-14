ALTER TABLE widget_settings
RENAME TO widget_configs;
ALTER TABLE widget_configs
ADD COLUMN support_email text;