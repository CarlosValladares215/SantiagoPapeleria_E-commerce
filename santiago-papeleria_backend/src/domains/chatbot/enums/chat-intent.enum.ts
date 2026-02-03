// src/domains/chatbot/enums/chat-intent.enum.ts

export enum ChatIntent {
    PRODUCT_SEARCH = 'product_search',
    ORDER_STATUS = 'order_status',
    PRICING_INFO = 'pricing_info',
    HUMAN_ESCALATION = 'human_escalation',
    GENERAL_HELP = 'general_help',
    VIEW_OFFERS = 'view_offers',
    GREETING = 'greeting',
    GRATITUDE = 'gratitude',
    OUT_OF_SCOPE = 'out_of_scope',
    UNCLEAR = 'unclear',
    NAVIGATION_HELP = 'navigation_help',
    RETURNS = 'returns',  // Product returns and refunds
    RETURN_POLICY = 'return_policy', // Information about returns
    ORDER_TRACKING = 'order_tracking', // Specific tracking inquiries
    ORDER_PROCESS = 'order_process', // Purchase process and notifications
}

export const VALID_INTENTS = Object.values(ChatIntent);
