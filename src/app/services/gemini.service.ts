import { Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
@Injectable({
  providedIn: 'root'
})
export class GeminiService {


  private endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  async generateText(prompt: string): Promise<string>{

    const url = this.endpoint + '?key=' + environment.geminiApiKey;

    const body = {
      contents:[{
        parts: [{text: prompt}]
      }]
    };

    const response = await fetch(url, {
      method:'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }
    );

    const data = await response.json();
    console.log(data);
    const text = data.candidates[0].content.parts[0].text;
    return text || '(no response)';

  }
}
