import axios from 'axios';

export class AIClient {
  private apiKey: string;
  private apiEndpoint: string;
  private interviewContext: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.apiEndpoint = '/api/chat';
    console.log('Initialized AI client with endpoint:', this.apiEndpoint);

    this.interviewContext = `You are an experienced microfinance loan officer conducting interviews for group lending applications.
Your goal is to assess the creditworthiness and group dynamics of the applicants based on the Grameen Bank model.
Focus on:
1. Group solidarity and mutual support
2. Business viability and repayment capacity
3. Character and commitment
4. Use of loan proceeds
5. Risk assessment

Be professional but empathetic. Ask follow-up questions based on the applicant's responses.
Evaluate answers on a scale of 1-10 for each focus area.

You are a local AI model with strong reasoning abilities. Use your expertise to conduct thorough credit assessments.

IMPORTANT: Keep your responses focused and concise. Ask one question at a time.`;
  }

  private validateFormData(formData: Record<string, unknown>) {
    if (!formData) throw new Error('Form data is required');
    if (!formData.fullName) throw new Error('Full name is required');
    if (!formData.role) throw new Error('Role is required');
    if (!formData.loanPurpose) throw new Error('Loan purpose is required');
    if (!formData.loanAmount) throw new Error('Loan amount is required');
    if (!formData.skills) throw new Error('Skills are required');
    if (!Array.isArray(formData.teamMembers)) throw new Error('Team members must be an array');
  }

  async conductInterview(
    formData: Record<string, unknown>,
    currentQuestion: string,
    previousResponses: string[] = []
  ): Promise<{
    nextQuestion: string;
    analysis: string;
    scores: {
      groupSolidarity: number;
      businessViability: number;
      character: number;
      loanUse: number;
      riskLevel: number;
    };
  }> {
    try {
      this.validateFormData(formData);
    } catch (e) {
      throw new Error(`Invalid form data: ${e.message}`);
    }
    const conversation = [
      { role: 'system', content: this.interviewContext },
      { role: 'user', content: `Application Details:
Full Name: ${formData.fullName}
Role: ${formData.role}
Loan Purpose: ${formData.loanPurpose}
Loan Amount: ${formData.loanAmount}
Skills: ${formData.skills}
Team Members: ${formData.teamMembers.map(m => `${m.name} (${m.role})`).join(', ')}

Previous Questions and Responses:
${previousResponses.join('\n')}

Current Question: ${currentQuestion}

Please:
1. Analyze the response
2. Provide scores for each area (1-10)
3. Generate the next relevant question
Format your response as JSON:
{
  "analysis": "your analysis here",
  "scores": {
    "groupSolidarity": 0-10,
    "businessViability": 0-10,
    "character": 0-10,
    "loanUse": 0-10,
    "riskLevel": 0-10
  },
  "nextQuestion": "your next question here"
}`} 
    ];

    try {
      if (!this.apiKey) {
        throw new Error('API key is not configured');
      }

      console.log('Sending request to Qwen API:', {
        endpoint: this.apiEndpoint,
        model: 'qwen-max',
        messageCount: conversation.length
      });

      const formattedMessages = conversation.map(msg => {
        if (typeof msg === 'string') {
          return { role: 'user', content: msg };
        }
        return {
          role: msg.role || 'user',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        };
      });

      const requestBody = {
        model: 'qwen-max',
        input: {
          messages: formattedMessages
        },
        parameters: {
          temperature: 0.7,
          result_format: 'json',
          max_tokens: 1000,
          top_p: 0.8,
          enable_search: false
        }
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      try {
        const response = await axios.post(
          this.apiEndpoint,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-SSE': 'disable',
              'Accept': 'application/json'
            },
            timeout: 30000 // 30 seconds timeout
          }
        );

        console.log('Qwen API response:', response.data);
        return response;
      } catch (error) {
        console.error('Error in API call:', error);
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new Error(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
          } else if (error.request) {
            throw new Error('Network error: Unable to reach the API server. Please check your internet connection and try again.');
          }
          throw new Error(`Request error: ${error.message}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }

      if (!response?.data?.output?.text) {
        console.error('Invalid API response:', response?.data);
        throw new Error('Invalid response format from AI service');
      }

      let result;
      try {
        result = JSON.parse(response.data.output.text);
        console.log('Parsed result:', result);
      } catch (e) {
        console.error('Failed to parse API response:', response.data.output.text);
        throw new Error('Invalid JSON response from AI service');
      }

      if (!result.nextQuestion || !result.analysis || !result.scores) {
        throw new Error('Incomplete response from AI service');
      }

      if (!this.validateScores(result.scores)) {
        throw new Error('Invalid scores in AI response');
      }

      return {
        nextQuestion: result.nextQuestion,
        analysis: result.analysis,
        scores: result.scores,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key');
        } else if (error.response?.status === 429) {
          throw new Error('Too many requests');
        } else if (error.response?.status >= 500) {
          throw new Error('AI service is currently unavailable');
        }
      }

      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON response from AI service');
      }

      console.error('Error in AI interview:', error);
      throw error;
    }
  }

  async generateFinalReport(
    formData: Record<string, unknown>,
    allResponses: string[],
    scores: Array<{
      groupSolidarity: number;
      businessViability: number;
      character: number;
      loanUse: number;
      riskLevel: number;
    }>
  ): Promise<{
    recommendation: string;
    finalScore: number;
    riskAssessment: string;
  }> {
    const prompt = `Based on the following interview data, provide a final loan recommendation:

Application Details:
Full Name: ${formData.fullName}
Role: ${formData.role}
Loan Purpose: ${formData.loanPurpose}
Loan Amount: ${formData.loanAmount}
Team Members: ${formData.teamMembers.map(m => `${m.name} (${m.role})`).join(', ')}

Interview Responses:
${allResponses.join('\n')}

Average Scores:
Group Solidarity: ${this.calculateAverage(scores.map(s => s.groupSolidarity))}
Business Viability: ${this.calculateAverage(scores.map(s => s.businessViability))}
Character: ${this.calculateAverage(scores.map(s => s.character))}
Loan Use: ${this.calculateAverage(scores.map(s => s.loanUse))}
Risk Level: ${this.calculateAverage(scores.map(s => s.riskLevel))}

Provide your response as JSON:
{
  "recommendation": "Approve/Reject with detailed explanation",
  "finalScore": 0-100,
  "riskAssessment": "Detailed risk assessment"
}`;

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'deepseek-r1-chat',
          messages: [
            { role: 'system', content: this.interviewContext },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          response_format: { type: 'json_object' },
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return JSON.parse(response.data.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating final report:', error);
      throw new Error('Failed to generate final report');
    }
  }

  private validateScores(scores: any): boolean {
    if (!scores || typeof scores !== 'object') return false;

    const requiredScores = [
      'groupSolidarity',
      'businessViability',
      'character',
      'loanUse',
      'riskLevel'
    ];

    return requiredScores.every(score => {
      const value = scores[score];
      return typeof value === 'number' && value >= 0 && value <= 10;
    });
  }

  private calculateAverage(numbers: number[]): number {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      throw new Error('Invalid input for average calculation');
    }
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}
