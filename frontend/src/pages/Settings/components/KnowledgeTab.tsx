import React from 'react';

const KnowledgeTab: React.FC = () => {
  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <h3>📚 Knowledge Base Management</h3>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Manage your personal knowledge base that works with all AI providers.
      </p>

      {/* Knowledge Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>0</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Knowledge Entries</div>
        </div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>0</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Files Uploaded</div>
        </div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>0</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Auto-Sync Sources</div>
        </div>
      </div>

      {/* Add Knowledge Entry */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '24px' 
      }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Add New Knowledge Entry</h4>
        
        <input 
          type="text" 
          placeholder="Enter a title for this knowledge..."
          style={{ 
            width: '100%', 
            padding: 12, 
            borderRadius: 6, 
            border: '1px solid #ccc', 
            marginBottom: 12 
          }} 
        />
        
        <select style={{ 
          width: '100%', 
          padding: 12, 
          borderRadius: 6, 
          border: '1px solid #ccc', 
          marginBottom: 12 
        }}>
          <option>📝 Text Knowledge</option>
          <option>📁 File Reference</option>
          <option>🌐 URL Reference</option>
        </select>
        
        <textarea 
          placeholder="Enter the knowledge content or description..."
          style={{ 
            width: '100%', 
            padding: 12, 
            borderRadius: 6, 
            border: '1px solid #ccc', 
            marginBottom: 12, 
            minHeight: 80, 
            resize: 'vertical' 
          }} 
        />
        
        <input 
          type="text" 
          placeholder="Tags (comma-separated): work, personal, coding"
          style={{ 
            width: '100%', 
            padding: 12, 
            borderRadius: 6, 
            border: '1px solid #ccc', 
            marginBottom: 12 
          }} 
        />
        
        <button style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600
        }}>
          Add to Knowledge Base
        </button>
      </div>

      {/* File Upload */}
      <div style={{ 
        border: '2px dashed #ddd', 
        borderRadius: '8px', 
        padding: '40px', 
        textAlign: 'center',
        marginBottom: '24px',
        background: '#fafafa'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📎</div>
        <h4 style={{ margin: '0 0 8px 0' }}>Upload Files</h4>
        <p style={{ margin: '0 0 16px 0', color: '#666' }}>
          Drag and drop files here or click to browse
        </p>
        <button style={{
          background: '#1976d2',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600
        }}>
          Choose Files
        </button>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Supported: PDF, TXT, DOC, DOCX, MD (Max 10MB each)
        </div>
      </div>

      {/* Auto-Sync Settings */}
      <div>
        <h4 style={{ margin: '0 0 16px 0' }}>Auto-Sync Settings</h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: 8 }} />
            Monitor local folders for changes
          </label>
          <input 
            type="text" 
            placeholder="e.g., C:\Users\Documents\Projects"
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #ccc', 
              marginTop: 8, 
              marginLeft: 24 
            }} 
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: 8 }} />
            Sync web sources and RSS feeds
          </label>
          <input 
            type="url" 
            placeholder="https://example.com/feed.rss"
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #ccc', 
              marginTop: 8, 
              marginLeft: 24 
            }} 
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />
            Enable automatic daily backups
          </label>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeTab; 