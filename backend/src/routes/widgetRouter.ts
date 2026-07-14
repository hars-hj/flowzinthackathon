import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseClient.js';

const widgetConfigRouter = Router();

interface WidgetConfigResponse {
  bot_name: string;
  avatar_url: string | null;
  primary_color: string;
  welcome_message: string;
  quick_questions: string[];
  bubble_position: string;
  show_history_tab: boolean;
  escalation_enabled: boolean;
}

widgetConfigRouter.get('/', async (req: Request, res: Response) => {
  const widgetKey = req.query.key as string | undefined;
 
  if (!widgetKey) {
    return res.status(400).json({ error: 'Missing key parameter' });
  }

  // 1. Resolve org_id from widget_key
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('widget_key', widgetKey)
    .single();

  if (orgError || !org) {
    return res.status(404).json({ error: 'Invalid widget key' });
  }

  // 2. Fetch widget config for that org
  const { data: config, error: configError } = await supabaseAdmin
    .from('widget_configs')
    .select(
      'bot_name, avatar_url, primary_color, welcome_message, quick_questions, bubble_position, show_history_tab, escalation_enabled'
    )
    .eq('org_id', org.id)
    .single();

  if (configError || !config) {
    // Org exists but hasn't set up widget_configs yet — return sensible defaults
    // instead of erroring, so widget.js still renders something.
    const defaults: WidgetConfigResponse = {
      bot_name: 'Support',
      avatar_url: null,
      primary_color: '#5A2EFF',
      welcome_message: 'Hi! How can I help you today?',
      quick_questions: [],
      bubble_position: 'bottom-right',
      show_history_tab: true,
      escalation_enabled: true,
    };
    return res.status(200).json(defaults);
  }

  return res.status(200).json(config as WidgetConfigResponse);
});

export default widgetConfigRouter;