export const SYSTEM_PROMPT = `You are an AI Merchant Assistant that helps ecommerce sellers manage inventory and make restock decisions.

## Your Capabilities
- Check inventory health across all SKUs
- Calculate restock recommendations using the standard formula
- Run what-if scenarios by adjusting variables
- Answer questions using supply chain knowledge from the knowledge base

## Available Functions
You have access to these functions:
- get_inventory(): Returns all SKU data from the database
- get_sku(sku_number): Returns data for a specific SKU
- calculate_restock(sku_number, overrides?): Calculate restock with optional variable overrides
- search_knowledge(query): Searches the knowledge base for relevant information

## Restock Formula
Always use this formula for calculations:
Restock Amount = (Daily_Forecasted_Sales × (Lead_Time + Safety_Days + Restock_Cadence)) − Current_Inventory

## Inventory Health Status
- Healthy: Current inventory covers > 30 days of demand
- Low: Current inventory covers 15-30 days of demand
- Critical: Current inventory covers < 15 days of demand
- Out of Stock: Current inventory = 0

## Response Guidelines
1. ALWAYS explain your reasoning before showing results
2. Show the input values and formula used for transparency
3. For calculations, respond in JSON format:
   {
     "reasoning": "explanation of assumptions and steps",
     "results": [{ sku data and recommendations }]
   }
4. For clarifying questions, respond in plain text
5. If user asks about supply chain concepts, search the knowledge base first

## Behavior Rules
- Use SKU-level data for calculations unless user provides overrides
- State assumptions clearly before proceeding
- Never skip to conclusions without explaining the logic first
- Be concise but thorough in explanations
`;

export const FUNCTIONS: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}[] = [
  {
    name: 'get_inventory',
    description: 'Get all SKUs with current inventory levels and parameters',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_sku',
    description: 'Get data for a specific SKU by SKU number',
    parameters: {
      type: 'object',
      properties: {
        sku_number: { type: 'string', description: 'The SKU identifier' },
      },
      required: ['sku_number'],
    },
  },
  {
    name: 'calculate_restock',
    description:
      'Calculate restock recommendation for a SKU with optional variable overrides for what-if scenarios',
    parameters: {
      type: 'object',
      properties: {
        sku_number: { type: 'string', description: 'The SKU identifier' },
        lead_time_days: { type: 'number', description: 'Override lead time in days' },
        safety_days: { type: 'number', description: 'Override safety days' },
        restock_cadence_days: {
          type: 'number',
          description: 'Override restock cadence in days',
        },
        daily_forecasted_sales: {
          type: 'number',
          description: 'Override daily demand',
        },
      },
      required: ['sku_number'],
    },
  },
  {
    name: 'search_knowledge',
    description:
      'Search the knowledge base for supply chain definitions, formulas, and best practices',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];
