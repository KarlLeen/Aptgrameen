import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('Forwarding request to Qwen API:', {
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      model: body.model,
      messageCount: body.input?.messages?.length
    });

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-max',
        input: {
          messages: body.input.messages
        },
        parameters: {
          temperature: 0.7,
          result_format: 'json',
          max_tokens: body.parameters?.max_tokens || 1000,
          top_p: 0.8,
          enable_search: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('Qwen API response:', response.data);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('API proxy error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    return NextResponse.json(
      { 
        error: error.response?.data?.message || error.message,
        details: error.response?.data || null
      },
      { status: error.response?.status || 500 }
    );
  }
}
