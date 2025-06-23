// Page layout styles - Fixed to work with sidebar
export const pageContainerStyle = {
  position: "relative" as const,
  display: "flex",
  flexDirection: "column" as const,
  backgroundColor: "#f8f8f8",
  minHeight: "100vh",
  overflow: "hidden",
};

export const pageContentStyle = {
  padding: "24px 32px 0 32px",
  backgroundColor: "#f8f8f8",
  flex: 1,
  overflowY: "auto" as const,
};

// Header styles
export const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

export const titleSectionStyle = {
  display: "flex",
  flexDirection: "column" as const,
};

export const titleStyle = {
  margin: 0,
  color: "#111",
  fontSize: "1.5rem",
  fontWeight: "600",
};

export const subtitleStyle = {
  color: "#888",
  margin: "4px 0 16px 0",
  fontSize: "15px",
};

export const refreshButtonStyle = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "#1976d2",
  color: "#fff",
  border: "none",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

// Filter styles
export const filtersContainerStyle = {
  display: "flex",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap" as const,
};

export const filterButtonsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

export const filterButtonStyle = (isActive: boolean) => ({
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: isActive ? "#1976d2" : "#fff",
  color: isActive ? "#fff" : "#333",
  cursor: "pointer",
  fontSize: "14px",
  textTransform: "capitalize" as const,
});

export const searchInputStyle = {
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "14px",
  minWidth: "200px",
  outline: "none",
};

// Form styles
export const formStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "24px",
  gap: "8px",
};

export const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px",
  flex: 1,
  outline: "none",
};

export const addButtonStyle = {
  padding: "10px 24px",
  borderRadius: "8px",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  fontWeight: "600",
  fontSize: "16px",
  cursor: "pointer",
};

// Task list styles
export const taskListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

export const taskItemStyle = {
  display: "flex",
  alignItems: "center",
  padding: "12px",
  background: "#fff",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  justifyContent: "space-between",
};

export const taskContentStyle = {
  display: "flex",
  alignItems: "center",
  flex: 1,
};

export const checkboxStyle = {
  marginRight: "12px",
};

export const taskDetailsStyle = {
  flex: 1,
};

export const taskTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

export const taskTitleStyle = (isCompleted: boolean) => ({
  textDecoration: isCompleted ? "line-through" : "none",
  color: isCompleted ? "#888" : "#333",
  fontSize: "16px",
  fontWeight: "500",
});

export const taskDescriptionStyle = {
  fontSize: "14px",
  color: "#666",
  marginTop: "4px",
};

export const taskMetaStyle = {
  fontSize: "12px",
  color: "#888",
  marginTop: "4px",
};

// Actions styles
export const taskActionsStyle = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

export const progressBarContainerStyle = {
  width: "60px",
  height: "6px",
  background: "#eee",
  borderRadius: "3px",
  overflow: "hidden",
};

export const progressBarStyle = (progress: number) => ({
  width: `${progress}%`,
  height: "100%",
  background: "#42a5f5",
  transition: "width 0.3s ease",
});

export const deleteButtonStyle = {
  padding: "4px 8px",
  borderRadius: "4px",
  background: "#ef5350",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: "12px",
};

// Empty state styles
export const emptyStateStyle = {
  textAlign: "center" as const,
  padding: "40px",
  color: "#888",
};

export const emptyStateIconStyle = {
  fontSize: "2rem",
  marginBottom: "16px",
};

export const emptyStateTitleStyle = {
  fontSize: "1.25rem",
  fontWeight: "600",
  marginBottom: "8px",
  color: "#333",
};

export const emptyStateDescriptionStyle = {
  fontSize: "14px",
  color: "#666",
  marginBottom: "16px",
};

// Loading overlay styles
export const loadingOverlayStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#f8f8f8",
  zIndex: 9999,
};

export const loadingCardStyle = {
  padding: "20px",
  backgroundColor: "#fff",
  borderRadius: "8px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

// Error styles
export const errorMessageStyle = {
  color: "#ef5350",
  fontSize: "14px",
  marginTop: "8px",
  padding: "8px 12px",
  backgroundColor: "#ffebee",
  border: "1px solid #ffcdd2",
  borderRadius: "4px",
};

// Stats styles
export const statsContainerStyle = {
  display: "flex",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap" as const,
};

export const statItemStyle = {
  background: "#fff",
  padding: "12px 16px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  minWidth: "80px",
  textAlign: "center" as const,
};

export const statValueStyle = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1976d2",
};

export const statLabelStyle = {
  fontSize: "12px",
  color: "#666",
  textTransform: "uppercase" as const,
  marginTop: "4px",
};

// Responsive styles
export const BREAKPOINTS = {
  mobile: "768px",
  tablet: "1024px",
};

// Animation styles
export const fadeInStyle = {
  animation: "fadeIn 0.3s ease-in-out",
};

export const slideInStyle = {
  animation: "slideInUp 0.3s ease-out",
};

// Priority indicator styles
export const priorityIndicatorStyle = (color: string) => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  marginRight: "8px",
});

// Utility styles
export const flexCenterStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const flexBetweenStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

export const flexStartStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
};

// Hover effects
export const hoverEffectStyle = {
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
  },
};
