import React, { useState, useEffect } from 'react';
import './TypingIndicator.css';

interface TypingIndicatorProps {
  agentName?: string;
  isVisible: boolean;
}

interface TypingStep {
  icon: string;
  text: string;
  duration: number;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  agentName = "System", 
  isVisible 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Typing sequence messages
  const typingSteps: TypingStep[] = [
    { icon: "💬", text: "typing", duration: 1000 },
    { icon: "🤔", text: "thinking", duration: 1200 },
    { icon: "🔍", text: "searching", duration: 1500 },
    { icon: "⚡", text: "processing", duration: 2000 },
    { icon: "🎯", text: "finalizing", duration: 1000 }
  ];

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = (prev + 1) % typingSteps.length;
        return nextStep;
      });
    }, typingSteps[currentStep]?.duration || 1500);

    return () => clearInterval(timer);
  }, [isVisible, currentStep]);

  if (!isVisible) return null;

  const currentTypingStep = typingSteps[currentStep];

  return (
    <div className={`typing-indicator ${isAnimating ? 'animate' : ''}`}>
      <div className="typing-bubble">
        <div className="typing-avatar">
          <span className="typing-icon">{currentTypingStep.icon}</span>
        </div>
        
        <div className="typing-content">
          <div className="typing-header">
            <span className="typing-agent-name">{agentName}</span>
                            <span className="typing-timestamp">now</span>
          </div>
          
          <div className="typing-message">
            <span className="typing-text">{currentTypingStep.text}</span>
            <div className="typing-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator; 