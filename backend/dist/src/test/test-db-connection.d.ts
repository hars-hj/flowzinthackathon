type ConversationInsert = {
    session_id: string;
    role: string;
    message: string;
    sentiment?: string;
    escalated?: boolean;
};
export declare function insertConversation({ session_id, role, message, sentiment, escalated }: ConversationInsert): Promise<any>;
export {};
