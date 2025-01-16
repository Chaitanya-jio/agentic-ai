import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any;
  private isListening = false;
  private silenceTimer: any;
  private speechDetected = false;
  private readonly SILENCE_TIMEOUT = 5000;
  transcription$ = new Subject<string>();
  listeningState$ = new Subject<boolean>();

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.speechDetected = false;
        this.updateListeningState(true);
      };

      this.recognition.onresult = (event: any) => {
        this.speechDetected = true;
        const transcript = event.results[event.results.length - 1][0].transcript;
        
        if (event.results[event.results.length - 1].isFinal) {
          this.transcription$.next(transcript);
          // Auto stop after final result and update listening state
          setTimeout(() => {
            this.stopListening();
            this.updateListeningState(false);
          }, 1000);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.updateListeningState(false);
      };

      this.recognition.onend = () => {
        // If no speech was detected and we're still supposed to be listening, restart
        if (this.isListening && !this.speechDetected) {
          this.recognition.start();
        } else {
          this.updateListeningState(false);
        }
      };

      this.recognition.onspeechstart = () => {
        this.speechDetected = true;
        this.resetSilenceTimer();
      };

      this.recognition.onspeechend = () => {
        if (this.speechDetected) {
          setTimeout(() => {
            this.stopListening();
            this.updateListeningState(false);
          }, 1000);
        }
      };
    }
  }

  private updateListeningState(state: boolean) {
    this.isListening = state;
    this.listeningState$.next(state);
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    if (this.isListening) {
      this.silenceTimer = setTimeout(() => {
        if (this.speechDetected) {
          this.stopListening();
          this.updateListeningState(false);
        }
      }, this.SILENCE_TIMEOUT);
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  startListening() {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return;
    }

    if (!this.isListening) {
      this.speechDetected = false;
      this.updateListeningState(true);
      this.recognition.start();
      this.resetSilenceTimer();
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.clearSilenceTimer();
      this.updateListeningState(false);
    }
  }

  isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  getListeningState(): boolean {
    return this.isListening;
  }

  ngOnDestroy() {
    this.clearSilenceTimer();
  }
} 