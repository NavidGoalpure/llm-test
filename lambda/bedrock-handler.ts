import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Parsed body:', JSON.stringify(body, null, 2));

    const prompt = body.prompt || 'Hello, Bedrock!';
    console.log('Using prompt:', prompt);

    const client = new BedrockRuntimeClient({ region: 'ap-southeast-2' }); // Sydney region

    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-text-express-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 300,
          temperature: 0.7,
          topP: 1,
          stopSequences: [],
        },
      }),
    });

    console.log(
      'Sending request to Bedrock:',
      JSON.stringify(command.input, null, 2)
    );

    const response = await client.send(command);
    console.log(
      'Received response from Bedrock:',
      JSON.stringify(response, null, 2)
    );

    const responseBody = JSON.parse(Buffer.from(response.body).toString());
    console.log('Parsed response body:', JSON.stringify(responseBody, null, 2));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        response: responseBody.results[0].outputText,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      }),
    };
  }
};
