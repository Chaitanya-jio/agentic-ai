import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core'; 
import { SessionService } from './session.service';

interface ChatPayload {
  prompt: string;        // userMessage as prompt
  guidelines: string;     // textContent from app component
  o_collection_name: string;  // collection_name from file upload response
  user_id: string;       // session id
}

interface ChatResponse {
  reply: string;
  // add other response properties if needed
}

interface UploadResponse {
  collection_name: string;
  // Add other response properties if needed
}

@Injectable({
  providedIn: 'root'
})
export class OpenAiApiService {
  private apiUrl = 'http://localhost:3000';
  public collectionName: string = '';

  constructor(
    private http: HttpClient,
    private sessionService: SessionService
  ) { }

  setCollectionName(name: string) {
    this.collectionName = name;
  }

  public sendMessage(message: string, guidelines: string) {
    const payload: ChatPayload = {
      prompt: message,
      guidelines: guidelines,
      o_collection_name: this.collectionName,
      user_id: this.sessionService.getSessionId()
    };

    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, payload);
  }

  public uploadPdf(file: File, userId: string, additionalText: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('additional_text', additionalText);

    return this.http.post<UploadResponse>(`${this.apiUrl}/upload_pdf`, formData, {
      headers: {
        'Accept': 'application/json'
      }
    });
  }
}
