import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getSkuByNumber } from '@/lib/db';
import { calculateRestock, getAllInventoryWithRestock } from '@/lib/restock';
import { searchKnowledge } from '@/lib/rag';
import { SYSTEM_PROMPT, FUNCTIONS } from '@/lib/prompts';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const MAX_FUNCTION_CALLS = 10; // Prevent infinite loops

async function executeFunction(
  functionName: string,
  functionArgs: Record<string, unknown>
): Promise<unknown> {
  switch (functionName) {
    case 'get_inventory':
      return getAllInventoryWithRestock();
    case 'get_sku':
      return getSkuByNumber(functionArgs.sku_number as string);
    case 'calculate_restock':
      return calculateRestock(functionArgs.sku_number as string, {
        lead_time_days: functionArgs.lead_time_days as number | undefined,
        safety_days: functionArgs.safety_days as number | undefined,
        restock_cadence_days: functionArgs.restock_cadence_days as number | undefined,
        daily_forecasted_sales: functionArgs.daily_forecasted_sales as number | undefined,
      });
    case 'search_knowledge':
      try {
        return await searchKnowledge(functionArgs.query as string);
      } catch {
        // ChromaDB might not be running, return empty results
        return [];
      }
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ];

    let functionCallCount = 0;

    // Loop to handle multiple function calls
    while (functionCallCount < MAX_FUNCTION_CALLS) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        functions: FUNCTIONS,
        function_call: 'auto',
      });

      const assistantMessage = response.choices[0].message;

      // If no function call, return the response
      if (!assistantMessage.function_call) {
        return NextResponse.json({
          response: assistantMessage.content,
        });
      }

      // Execute the function
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
      const functionResult = await executeFunction(functionName, functionArgs);

      // Add assistant message with function call to conversation
      messages.push({
        role: 'assistant',
        content: null,
        function_call: assistantMessage.function_call,
      });

      // Add function result to conversation
      messages.push({
        role: 'function',
        name: functionName,
        content: JSON.stringify(functionResult),
      });

      functionCallCount++;
    }

    // If we hit the limit, make one final call without function calling
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
    });

    return NextResponse.json({
      response: finalResponse.choices[0].message.content,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
