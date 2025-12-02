import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getAllSkus, getSkuByNumber } from '@/lib/db';
import { calculateRestock } from '@/lib/restock';
import { searchKnowledge } from '@/lib/rag';
import { SYSTEM_PROMPT, FUNCTIONS } from '@/lib/prompts';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ];

    // Initial call to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      functions: FUNCTIONS,
      function_call: 'auto',
    });

    const assistantMessage = response.choices[0].message;

    // Check if function call is needed
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);

      // Execute function
      let functionResult: unknown;
      switch (functionName) {
        case 'get_inventory':
          functionResult = getAllSkus();
          break;
        case 'get_sku':
          functionResult = getSkuByNumber(functionArgs.sku_number);
          break;
        case 'calculate_restock':
          functionResult = calculateRestock(functionArgs.sku_number, {
            lead_time_days: functionArgs.lead_time_days,
            safety_days: functionArgs.safety_days,
            restock_cadence_days: functionArgs.restock_cadence_days,
            daily_forecasted_sales: functionArgs.daily_forecasted_sales,
          });
          break;
        case 'search_knowledge':
          try {
            functionResult = await searchKnowledge(functionArgs.query);
          } catch {
            // ChromaDB might not be running, return empty results
            functionResult = [];
          }
          break;
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      // Second call with function result
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: null,
            function_call: assistantMessage.function_call,
          },
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult),
          },
        ],
      });

      return NextResponse.json({
        response: finalResponse.choices[0].message.content,
      });
    }

    // No function call, return direct response
    return NextResponse.json({
      response: assistantMessage.content,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
