/**
 * Chat Input Component - OpenAI Style
 * Enhanced input area with voice recording and file attachment
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, Square } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  disabled: boolean;
  placeholder: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  disabled,
  placeholder
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Check for microphone permissions on mount
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => setIsVoiceEnabled(true))
      .catch(() => setIsVoiceEnabled(false));
  }, []);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Here you would typically send the audio to a speech-to-text service
        console.log('Audio recorded:', audioBlob);
        
        // For now, we'll just add a placeholder message
        setMessage(prev => prev + ' [Voice message recorded]');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Here you would typically upload the file and get a URL
      console.log('File selected:', file);
      
      // For now, we'll just add a placeholder in the message
      setMessage(prev => prev + `\n[File attached: ${file.name}]`);
      
      // Reset file input
      e.target.value = '';
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="openai-input-area">
      <div className="openai-input-container">
        <div className="openai-input-wrapper">
          {/* Top Actions */}
          <div className="openai-input-top">
            <div className="openai-input-actions">
              {/* File Attachment */}
              <button
                onClick={handleFileAttach}
                className="openai-input-btn"
                title="Attach file"
                disabled={disabled}
              >
                <Paperclip size={18} />
              </button>

              {/* Voice Recording */}
              {isVoiceEnabled && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`openai-input-btn ${isRecording ? 'active' : ''}`}
                  title={isRecording ? 'Stop recording' : 'Start voice recording'}
                  disabled={disabled}
                >
                  {isRecording ? <Square size={18} /> : <Mic size={18} />}
                </button>
              )}

              {!isVoiceEnabled && (
                <button
                  className="openai-input-btn opacity-50 cursor-not-allowed"
                  title="Microphone not available"
                  disabled
                >
                  <MicOff size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200">
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">
                  Recording... {formatRecordingTime(recordingTime)}
                </span>
              </div>
            </div>
          )}

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="openai-textarea"
            disabled={disabled || isRecording}
            rows={1}
          />

          {/* Bottom Actions */}
          <div className="openai-input-bottom">
            <div className="openai-input-hint">
              {isRecording 
                ? 'Recording voice message...' 
                : message.length > 0 
                ? `${message.length} characters` 
                : 'Type a message or use voice recording'
              }
            </div>

            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading || disabled || isRecording}
              className="openai-send-btn"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={16} />
              )}
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
        />
      </div>
    </div>
  );
};

export default ChatInput; 