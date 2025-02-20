import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

function generateScores() {
  // 生成7-9之间的随机分数
  return {
    groupSolidarity: Math.floor(Math.random() * 3) + 7,
    businessViability: Math.floor(Math.random() * 3) + 7,
    character: Math.floor(Math.random() * 3) + 7,
    loanUse: Math.floor(Math.random() * 3) + 7,
    riskLevel: Math.floor(Math.random() * 3) + 7
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('Forwarding request to local Ollama:', {
      model: 'mistral',
      messageCount: body.messages?.length
    });

    // 准备系统提示词
    const systemPrompt = {
      role: 'system',
      content: `You are an experienced microfinance loan officer conducting interviews. Keep responses focused and concise. Ask one clear question at a time about the applicant's business plan, team dynamics, or loan purpose. Avoid multiple questions in one response.`
    };

    // 准备用户消息
    const messages = [systemPrompt, ...body.messages];

    // 发送请求到Ollama
    const response = await axios.post(
      'http://localhost:11434/api/chat',
      {
        model: 'mistral',
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.8,
          num_ctx: 4096
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // 提取AI的响应
    const aiResponse = response.data.message.content;
    console.log('AI Response:', aiResponse);

    // 生成分析和分数
    const scores = generateScores();
    const analysis = `Based on the interaction, the applicant shows promise in their business plan and team dynamics.`;

    // 构建响应格式
    const result = {
      output: {
        text: JSON.stringify({
          nextQuestion: aiResponse,
          analysis: analysis,
          scores: scores
        })
      }
    };

    console.log('Local model response:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Local model error:', {
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
