const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();
const Anthropic = require("@anthropic-ai/sdk");

async function transcribeAudio(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()  
                }
            }
        );
        return response.data.text;
    } catch (error) {
        console.error('Error during transcription:', error.response ? error.response.data : error.message);
        throw new Error('Transcription failed');
    }
}

function getPromptByCategory(label) {
    const match = label.match(/(\D+)(\d*)/); 
    if (!match) {
        throw new Error('Invalid label format');
    }

    const baseLabel = match[1].trim().toUpperCase();
    const promptKey = `PROMPT_${baseLabel}`;

    const basePrompt = process.env[promptKey] || process.env.PROMPT_DEFAULT;
    
    return `${basePrompt} Correct the following transcribed text if needed. If corrections are made, provide ONLY the corrected text. If no changes are needed, repeat the original text exactly. Do not include any explanations or additional information. Here is the text to correct: `;
}

async function getChatCompletion(label, transcript) {
    const promptTemplate = getPromptByCategory(label);

    if (!promptTemplate) {
        throw new Error(`No prompt found for label: ${label}`);
    }

    const prompt = `${promptTemplate}"${transcript}"`;
    
    console.log(`Prompt: ${prompt}`);

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });

    try {
        const response = await anthropic.completions.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 4000,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }]
        });

        if (response.data && response.data.length > 0) {
            console.log('Response from API:', response.data); 
            return response.data[0].text.trim().replace(/^"|"$/g, '');
        } else {
            throw new Error('No content in the response');
        }
    } catch (error) {
        console.error('Error during chat completion:', error);
        throw new Error('Chat completion failed');
    }
}

async function getupdatetext(text) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('Received extracted text:', text);

    const prompt = `
        You are an AI legal assistant specializing in Indian legal document analysis and structuring. Your task is to:
        
        1. Analyze this data : ${text} which we generated as OCR from uploaded legal document or pleading.
        2. Identify the type of legal document (e.g., affidavit, petition, reply, application).
        3. Extract and categorize key information from the document,and keep it consistent for each document including:
           - Case details (court name, case number, parties involved)
           - Document title
           - Sections and subsections
           - Parties' details (names, addresses, designations)
           - Facts of the case
           - Legal grounds
           - Prayer/Relief sought
           - Supporting documents/annexures
           - Verification and signature details
        4. Structure the extracted information into appropriate fields that correspond to the document type.
        5. Ensure accuracy in parsing and categorizing information, especially for dates, amounts, and legal citations.
        6. Identify any unique or case-specific information that may not fit standard categories.
        7. Prepare the structured data in a format that allows easy editing and modification by the user.

        Your output should be a well-organized JSON object representation of the legal document that maintains the logical flow and hierarchy of the original document while allowing for easy editing and customization.

        Example JSON output structure:

        {
          "updatedField": [
            {
              "field": "Document Type",
              "description": "Petition",
              "example": "Example text from document"
            },
            {
              "field": "Court Name",
              "description": "Family Courts, West District, Tis Hazari Courts",
              "example": "Example text from document"
            }
            // ... more fields
          ]
        }

        Now, apply the above structure and provide ONLY the output in JSON format, without any additional text or explanation.
    `;
    
    try {
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 4000,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }]
        });

        console.log('Response from API:', response);

        if (response.content && response.content.length > 0) {
            const jsonString = response.content[0].text.trim();
            // Parse the JSON string to get a JavaScript object
            const jsonObject = JSON.parse(jsonString);
            console.log('Clean JSON object:', jsonObject);
            return jsonObject;
        } else {
            throw new Error('No content in the response');
        }
    } catch (error) {
        console.error('Error during chat completion:', error);
        throw new Error('Chat completion failed');
    }
}

module.exports = {
    transcribeAudio,
    getChatCompletion,
    getupdatetext
};
