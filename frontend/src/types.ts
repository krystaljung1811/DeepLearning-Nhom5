export type ChannelType = 'email' | 'livechat' | 'web';
export type PriorityId = 'urgent' | 'high' | 'medium' | 'low';
export type TicketStatus = 'auto_routed' | 'needs_review' | 'resolved';

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

export interface PipelineTrace {
  cleaned_text: string;
  token_count: number;
  seq_len_clipped: number;
  oov_count: number;
  oov_tokens: string[];
  oov_rate: number;
  oov_rate_pct: string;
  oov_warning: string | null;
  embed_dim: number;
  bilstm_dim: number;
  bilstm_layers: number;
  attn_dim: number;
  top_attention_tokens: TokenAttention[];
  inference_ms: number;
  vocab_size: number;
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
  trace?: PipelineTrace;
}

export interface Ticket {
  id: string;
  customer_name: string;
  email: string;
  channel: ChannelType;
  subject: string;
  body: string;
  status: TicketStatus;
  created_at: string;
  prediction?: RoutingResponse | null;
  trace?: PipelineTrace | null;
  final_category: string;
  final_priority: string;
  final_queue: string;
  reviewed_by_human: number;
  agent_comment?: string;
  agent_reply?: string;
  reply_channel?: string;
  replied_at?: string;
}

export interface HumanFeedback {
  ticket_id: string;
  text?: string;
  original_category: string;
  corrected_category: string;
  original_priority: string;
  corrected_priority: string;
  agent_comment: string;
  timestamp: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface PublicTicketView {
  id: string;
  customer_name: string;
  email: string;
  subject: string;
  body: string;
  order_id?: string;
  status: TicketStatus;
  created_at: string;
  final_queue: string;
  final_category: string;
  final_priority: string;
  agent_reply?: string;
  replied_at?: string;
  messages: TicketMessage[];
}

export interface DashboardStats {
  total_tickets: number;
  auto_routed_count: number;
  needs_review_count: number;
  reviewed_by_human_count: number;
  auto_routed_pct: number;
  needs_review_pct: number;
  by_queue: { name: string; count: number }[];
  by_priority: { name: string; count: number }[];
  by_category: { name: string; count: number }[];
  avg_inference_ms: number;
}

export interface ImportEvaluation {
  total_labeled: number;
  correct_count: number;
  accuracy: number;
  confusion_matrix: Record<string, Record<string, number>>;
  labels: string[];
}
