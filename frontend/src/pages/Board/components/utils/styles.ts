// Button style helper
export const buttonStyle = (theme: "light" | "dark") => ({
  background: "none",
  border: `1px solid ${theme === "dark" ? "#404040" : "#e0e0e0"}`,
  borderRadius: "4px",
  padding: "0.5rem 1rem",
  cursor: "pointer",
  fontSize: "0.875rem",
  color: theme === "dark" ? "#ffffff" : "#333333",
  backgroundColor: theme === "dark" ? "#2d2d2d" : "#ffffff",
});

// Toolbar styles
export const toolbarStyle = (theme: "light" | "dark") => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.75rem 1rem",
  backgroundColor: theme === "dark" ? "#2d2d2d" : "#ffffff",
  borderBottom: `1px solid ${theme === "dark" ? "#404040" : "#e0e0e0"}`,
  zIndex: 100,
});

// Main board styles
export const boardStyle = (theme: "light" | "dark") => ({
  flex: 1,
  position: "relative" as const,
  overflow: "hidden" as const,
  backgroundColor: theme === "dark" ? "#1a1a1a" : "#fafafa",
});

// Toast notification styles
export const toastStyle = {
  position: "fixed" as const,
  bottom: 32,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#222",
  color: "#fff",
  padding: "12px 32px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 17,
  boxShadow: "0 2px 12px #0005",
  zIndex: 9999,
};

// Separator line styles
export const separatorStyle = (theme: "light" | "dark") => ({
  width: "1px",
  height: "20px",
  backgroundColor: theme === "dark" ? "#404040" : "#e0e0e0",
});

// Container styles
export const containerStyle = {
  display: "flex",
  flexDirection: "column" as const,
  height: "100vh",
  width: "100vw",
  overflow: "hidden" as const,
};

export const mainContentStyle = {
  display: "flex",
  flex: 1,
  overflow: "hidden" as const,
  position: "relative" as const,
};

// Header section styles
export const headerSectionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

export const titleStyle = (theme: "light" | "dark") => ({
  margin: 0,
  fontSize: "1.25rem",
  color: theme === "dark" ? "#ffffff" : "#333333",
});

// Controls section styles
export const controlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

// Sidebar toggle button styles
export const sidebarToggleStyle = (theme: "light" | "dark") => ({
  background: "none",
  border: `1px solid ${theme === "dark" ? "#404040" : "#e0e0e0"}`,
  borderRadius: "4px",
  padding: "0.5rem",
  cursor: "pointer",
  color: theme === "dark" ? "#ffffff" : "#333333",
});

// File input label styles
export const fileInputLabelStyle = (theme: "light" | "dark") => ({
  ...buttonStyle(theme),
  cursor: "pointer",
});

// Hidden file input styles
export const hiddenFileInputStyle = {
  display: "none",
};
