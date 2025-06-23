import React from 'react';
import { loadingContainerStyle, loadingTextStyle } from '../utils/styles';

export const LoadingState: React.FC = () => {
  return (
    <div style={loadingContainerStyle}>
      <div style={loadingTextStyle}>
        Loading agents...
      </div>
    </div>
  );
}; 