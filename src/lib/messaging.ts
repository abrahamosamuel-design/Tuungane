import { supabase } from "@/integrations/supabase/client";

/**
 * Open an existing conversation for this (request, customer, provider) tuple
 * or create one if it doesn't exist. Returns the conversation id.
 */
export async function startOrGetConversation(opts: {
  serviceRequestId: string;
  providerId: string;
  providerResponseId?: string | null;
}): Promise<string> {
  const args: { _service_request_id: string; _provider_id: string; _provider_response_id?: string } = {
    _service_request_id: opts.serviceRequestId,
    _provider_id: opts.providerId,
  };
  if (opts.providerResponseId) args._provider_response_id = opts.providerResponseId;
  const { data, error } = await supabase.rpc("start_or_get_conversation", args);
  if (error) throw error;
  return data as unknown as string;
}

export async function markConversationRead(conversationId: string) {
  await supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
}

export async function getUnreadMessageCount(): Promise<number> {
  const { data } = await supabase.rpc("get_unread_message_count");
  return (data as unknown as number) ?? 0;
}
