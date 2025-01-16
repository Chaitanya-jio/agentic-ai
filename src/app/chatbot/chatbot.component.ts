import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OpenAiApiService } from '../services/open-ai-api.service';
import { AppComponent } from '../app.component';
import { SpeechService } from '../services/speech.service';
import { SseService } from '../services/sse.service';
import { Observable, Subscription } from 'rxjs';
import { SessionService } from '../services/session.service';

interface ChatMessage {
  role: string;
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  userMessage!: string;
  assistantReply!: string;
  chatMessages: ChatMessage[] = [];
  talkMessages: ChatMessage[] = [];
  isListening = false;
  isSpeechSupported = false;
  isTyping = false;
  private transcriptionSubscription?: Subscription;
  private listeningStateSubscription?: Subscription;
  private sseSubscription!: Subscription;
  private ws!: WebSocket;

  constructor(
    private http: HttpClient,
    private openAiApiService: OpenAiApiService,
    private appComponent: AppComponent,
    private speechService: SpeechService,
    private cd: ChangeDetectorRef,
    private sessionService: SessionService,
    private sseService: SseService
  ) {}

  connect(url: string, body: any): Observable<string> {
    return new Observable<string>((observer) => {
      // Send a POST request to initiate the stream
      this.http.post(url, body).subscribe({
        next: () => {
          // Open the SSE stream after POST succeeds
          const eventSource = new EventSource(url);
          eventSource.onmessage = (event) => observer.next(event.data);
          eventSource.onerror = (error) => {
            observer.error(error);
            eventSource.close();
          };

          return () => eventSource.close(); // Cleanup
        },
        error: (err) => observer.error(err),
      });
    });
  }

  
  ngOnInit() {
    this.isSpeechSupported = this.speechService.isRecognitionSupported();
    
    this.transcriptionSubscription = this.speechService.transcription$.subscribe(
      (transcript: string) => {
        if (transcript) {
          this.cd.detectChanges();
          this.talkMessage(transcript);
        }
      }
    );

    this.listeningStateSubscription = this.speechService.listeningState$.subscribe(
      (isListening: boolean) => {
        this.isListening = isListening;
      }
    );

    this.initializeWebSocketConnection();

    const payload = {
      prompt: 'i m looking for jio fibre postpaid',
      guidelines: '',
      o_collection_name: 'user-1736331955300-kfhqyz1i5g_JioAirFiber_Terms_Conditions_pdf',
      user_id: 'user-1736331955300-kfhqyz1i5g'
    };
  
    this.sseSubscription = this.sseService.connect('http://localhost:3000/sse')
      .subscribe({
        next: (message) => { 
          //return this.messages.push(message)
          console.log(message);
          //  this.chatMessages.push({ 
          //   role: 'assistant', 
          //   content: message,
          //   timestamp: new Date()
          // });
        },
        error: (error) => console.error('SSE error:', error),
      });
  }

  ngOnDestroy() {
    this.transcriptionSubscription?.unsubscribe();
    this.listeningStateSubscription?.unsubscribe();
    if (this.ws) {
      this.ws.close();
    }
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
    }
  }

  toggleVoiceInput() {
    if (this.isListening) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening();
    }
  }

  sendMessage(message?: string) {
    const userMessage = message || this.userMessage;
    this.userMessage = '';
    
    this.chatMessages.push({ 
      role: 'user', 
      content: userMessage,
      timestamp: new Date()
    });

    this.isTyping = true;
//uncommnent if we are using socket based implementation 
    // if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    //   this.ws.send(JSON.stringify({
    //     prompt: userMessage,
    //     guidelines: this.appComponent.textContent,
    //     o_collection_name: "user-173633195501-kfhqyz1234_JioFiber_User_Guide_pdf" || this.openAiApiService.collectionName,
    //     user_id: "user-173633195501-kfhqyz1234" || this.sessionService.getSessionId(),
    //     session_id: this.sessionService.getClientId()
    //   }));
    // }


    const payload = {
      prompt: userMessage,
      guidelines: '',
      o_collection_name: 'user-1736331955300-kfhqyz1i5g_JioAirFiber_Terms_Conditions_pdf',
      user_id: 'user-1736331955300-kfhqyz1i5g'
    };
    // this.sseSubscription = this.sseService.post('http://localhost:3000/sse', payload)
    //   .subscribe({
    //     next: (message) => { 
    //       console.log("logged response ", message);
    //       this.chatMessages.push({ 
    //         role: 'assistant', 
    //         content: message,
    //         timestamp: new Date()
    //       });
    //     },
    //     error: (error) => {
    //       console.error('SSE error:', error)
    //     }
    //   });

    this.openAiApiService.sendMessage(userMessage, this.appComponent.textContent)
      .subscribe(
        response => {
          this.assistantReply = response.reply;
          this.chatMessages.push({ 
            role: 'assistant', 
            content: this.assistantReply,
            timestamp: new Date()
          });
          this.isTyping = false;
        },
        error => {
          console.error('Error sending message:', error);
          this.chatMessages.push({ 
            role: 'assistant', 
            content: 'An error occurred while processing your request.',
            timestamp: new Date()
          });
          this.isTyping = false;
        }
      );
  }

  speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    var that = this;
    utterance.onend = () => {
      that.speechService.startListening();
        console.log('Utterance finished after ' + 5  + ' seconds.');
    };

    speechSynthesis.speak(utterance);
  }

  talkMessage(message?: string) {
    const userMessage = message || this.userMessage;
    this.userMessage = '';
    
    this.talkMessages.push({ 
      role: 'user', 
      content: userMessage,
      timestamp: new Date()
    });
    this.isListening = false;
    this.cd.detectChanges();
    this.openAiApiService.sendMessage(userMessage, this.appComponent.textContent)
      .subscribe(
        response => {
          this.assistantReply = response.reply;
          this.talkMessages.push({ 
            role: 'assistant', 
            content: this.assistantReply,
            timestamp: new Date()
          });

          this.speak(this.assistantReply);
        
          this.cd.detectChanges();
        },
        error => {
          console.error('Error sending message:', error);
          this.talkMessages.push({ 
            role: 'assistant', 
            content: 'An error occurred while processing your request.',
            timestamp: new Date()
          });
         // this.speechService.startListening();
          this.cd.detectChanges();
          
        }
      );
  }

  private initializeWebSocketConnection() {
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.onopen = () => {
      console.log('Connected to the WebSocket server');
    };

    this.ws.onmessage = (event) => {
      const message = event.data;
      console.log(event);
      this.chatMessages.push({
        role: 'server',
        content: message,
        timestamp: new Date()
      });
      this.cd.detectChanges();
    };

    this.ws.onclose = () => {
      console.log('Disconnected from the WebSocket server');
    };
  }
}
