/**
 * Message Input Component
 * Handles message input, file upload, and voice recording
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, X } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type your message..."
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);
  
  // Handle send message
  const handleSend = () => {
    if (!value.trim() && selectedFiles.length === 0) return;
    onSend(value, selectedFiles);
    onChange('');
    setSelectedFiles([]);
    setShowFileUpload(false);
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    setShowFileUpload(true);
  };
  
  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length === 1) {
      setShowFileUpload(false);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Handle voice recording (placeholder)
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement actual voice recording
  };
  
  return (
    <div className="message-input-container">
      {/* File Upload Display */}
      {showFileUpload && selectedFiles.length > 0 && (
        <div className="file-upload-preview">
          <div className="file-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="remove-file-btn"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="input-wrapper">
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        />
        
        {/* Action Buttons */}
        <div className="input-actions">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="action-btn"
            type="button"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          
          <button
            onClick={toggleRecording}
            className={`action-btn ${isRecording ? 'recording' : ''}`}
            type="button"
            title={isRecording ? 'Stop recording' : 'Voice message'}
          >
            <Mic size={20} />
            {isRecording && <div className="recording-indicator" />}
          </button>
        </div>
        
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="message-input"
          disabled={disabled}
          rows={1}
        />
        
        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!value.trim() && selectedFiles.length === 0) || disabled}
          className="send-button"
          type="button"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}; 