export type ChannelType = 'email' | 'livechat' | 'web';
export type PriorityId = 'urgent' | 'high' | 'medium' | 'low';
export type TicketStatus = 'all' | 'needs_review' | 'auto_routed' | 'resolved';

export interface TokenAttention {
  token: string;
  weight: number;
}

export interface CategoryProbability {
  id: string;
  name_vi: string;
  icon: string;
  probability: number;
  percent_str: string;
}

export interface CategoryResult {
  id: string;
  name_vi: string;
  icon: string;
  description: string;
  confidence: number;
  confidence_str: string;
  suggested_reply: string;
  all_probabilities: CategoryProbability[];
}

export interface PriorityResult {
  id: PriorityId;
  name_vi: string;
  badge: string;
  color: string;
  sla: string;
  confidence: number;
  confidence_str: string;
}

export interface TriageResult {
  human_review_required: boolean;
  status: string;
  status_color: string;
  reasons: string[];
}

export interface RoutingTarget {
  industry: string;
  target_queue: string;
}

export interface RoutingResponse {
  raw_text: string;
  clean_text: string;
  category: CategoryResult;
  priority: PriorityResult;
  triage: TriageResult;
  routing: RoutingTarget;
  token_attentions: TokenAttention[];
  channel: ChannelType;
}

export interface Ticket {
  id: string;
  subject: string;
  sender: string;
  email: string;
  channel: ChannelType;
  createdAt: string;
  text: string;
  status: 'needs_review' | 'auto_routed' | 'resolved';
  analysis?: RoutingResponse;
  humanCorrected?: boolean;
}

export interface HumanFeedback {
  ticket_id: string;
  original_category: string;
  corrected_category: string;
  original_priority: string;
  corrected_priority: string;
  agent_comment: string;
  timestamp: string;
}
