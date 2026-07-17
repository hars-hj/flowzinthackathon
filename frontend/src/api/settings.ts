import { apiFetch } from './client' 

export interface Organization {
  id: string
  name: string
  widget_key: string
  plan: string
}

export interface WidgetConfig {
  org_id: string
  primary_color: string | null
  bot_name: string | null
  avatar_url: string | null
  welcome_message: string | null
  quick_questions: string[] | null
  bubble_position: string | null
  show_history_tab: boolean | null
  escalation_enabled: boolean | null
  updated_at: string | null
  support_email: string | null
}

export interface SettingsResponse {
  organization: Organization
  widgetConfig: WidgetConfig | null
}

export interface RegenerateKeyResponse {
  widgetKey: string
}

export interface UpdateWidgetConfigResponse {
  widgetConfig: WidgetConfig
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiFetch<SettingsResponse>('/api/settings', {
    method: 'GET',
  })
}


export async function updateWidgetConfig(
  config: Partial<Omit<WidgetConfig, 'org_id' | 'updated_at'>>,
): Promise<WidgetConfig> {
  const data = await apiFetch<UpdateWidgetConfigResponse>('/api/settings/widget-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
  return data.widgetConfig
}

export async function regenerateWidgetKey(): Promise<string> {
  const data = await apiFetch<RegenerateKeyResponse>('/api/settings/regenerate-key', {
    method: 'POST',
  })
  return data.widgetKey
}