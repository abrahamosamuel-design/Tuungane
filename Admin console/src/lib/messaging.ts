import { apiClient } from "./api";

/**
 * Open an existing conversation for this (request, customer, provider) tuple
 * or create one if it doesn't exist. Returns the conversation id.
 */
export async function startOrGetConversation(opts: {
  serviceRequestId: string;
  providerId: string;
  providerResponseId?: string | null;
}): Promise<string> {
  const payload: any = {
    _provider_id: opts.providerId,
  };
  if (opts.serviceRequestId) payload._service_request_id = opts.serviceRequestId;
  if (opts.providerResponseId) payload._provider_response_id = opts.providerResponseId;

  const { data: res } = await apiClient.post("/messages/start", payload);
  return res.data;
}

/**
 * Open or create a direct conversation (no service request) between the
 * signed-in customer and a provider. Returns the conversation id.
 */
export async function startDirectConversation(providerId: string): Promise<string> {
  const { data: res } = await apiClient.post("/messages/start-direct", { _provider_id: providerId });
  return res.data;
}

export async function markConversationRead(conversationId: string) {
  try {
    await apiClient.post(`/messages/${conversationId}/read`, {});
  } catch (error) {
    console.error("Failed to mark read:", error);
  }
}

export async function getUnreadMessageCount(): Promise<number> {
  try {
    const { data: res } = await apiClient("/messages/unread-count");
    return res.data || 0;
  } catch (error) {
    return 0;
  }
}
