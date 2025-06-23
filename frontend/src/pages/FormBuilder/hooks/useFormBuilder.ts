import { useState, useCallback, useEffect } from "react";
import {
  FormConfiguration,
  FormField,
  FormBuilderState,
  FieldType,
} from "../types";
import { DEFAULT_FORM } from "../utils/constants";

export const useFormBuilder = (initialForm?: FormConfiguration) => {
  const [state, setState] = useState<FormBuilderState>({
    form: initialForm || DEFAULT_FORM,
    selectedFieldId: null,
    draggedField: null,
    previewMode: false,
    isLoading: false,
    hasUnsavedChanges: false,
  });

  // Generate unique field ID
  const generateFieldId = useCallback(() => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add field to form
  const addField = useCallback(
    (fieldType: FieldType, position?: number) => {
      const newField: FormField = {
        id: generateFieldId(),
        type: fieldType.id,
        title: fieldType.name,
        description: "",
        required: false,
        properties: { ...fieldType.defaultProperties },
        position: position ?? state.form.fields.length,
        conditional: undefined,
      };

      setState((prevState) => {
        const fields = [...prevState.form.fields];
        const insertPosition = position ?? fields.length;

        // Update positions for existing fields
        fields.forEach((field) => {
          if (field.position >= insertPosition) {
            field.position += 1;
          }
        });

        // Insert new field
        fields.splice(insertPosition, 0, newField);

        return {
          ...prevState,
          form: {
            ...prevState.form,
            fields,
          },
          selectedFieldId: newField.id,
          hasUnsavedChanges: true,
        };
      });
    },
    [state.form.fields, generateFieldId]
  );

  // Update field
  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormField>) => {
      setState((prevState) => ({
        ...prevState,
        form: {
          ...prevState.form,
          fields: prevState.form.fields.map((field) =>
            field.id === fieldId ? { ...field, ...updates } : field
          ),
        },
        hasUnsavedChanges: true,
      }));
    },
    []
  );

  // Delete field
  const deleteField = useCallback((fieldId: string) => {
    setState((prevState) => ({
      ...prevState,
      form: {
        ...prevState.form,
        fields: prevState.form.fields.filter((field) => field.id !== fieldId),
      },
      selectedFieldId:
        prevState.selectedFieldId === fieldId
          ? null
          : prevState.selectedFieldId,
      hasUnsavedChanges: true,
    }));
  }, []);

  // Duplicate field
  const duplicateField = useCallback(
    (fieldId: string) => {
      const fieldToDuplicate = state.form.fields.find(
        (field) => field.id === fieldId
      );
      if (!fieldToDuplicate) return;

      const duplicatedField: FormField = {
        ...fieldToDuplicate,
        id: generateFieldId(),
        title: `${fieldToDuplicate.title} (Copy)`,
        position: fieldToDuplicate.position + 1,
      };

      setState((prevState) => {
        const fields = [...prevState.form.fields];

        // Update positions for fields after the duplicated one
        fields.forEach((field) => {
          if (field.position > fieldToDuplicate.position) {
            field.position += 1;
          }
        });

        // Insert duplicated field
        fields.splice(fieldToDuplicate.position + 1, 0, duplicatedField);

        return {
          ...prevState,
          form: {
            ...prevState.form,
            fields,
          },
          selectedFieldId: duplicatedField.id,
          hasUnsavedChanges: true,
        };
      });
    },
    [state.form.fields, generateFieldId]
  );

  // Move field
  const moveField = useCallback((fieldId: string, newPosition: number) => {
    setState((prevState) => {
      const fields = [...prevState.form.fields];
      const fieldIndex = fields.findIndex((field) => field.id === fieldId);

      if (fieldIndex === -1) return prevState;

      const [movedField] = fields.splice(fieldIndex, 1);
      fields.splice(newPosition, 0, movedField);

      // Update positions
      fields.forEach((field, index) => {
        field.position = index;
      });

      return {
        ...prevState,
        form: {
          ...prevState.form,
          fields,
        },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // Select field
  const selectField = useCallback((fieldId: string | null) => {
    setState((prevState) => ({
      ...prevState,
      selectedFieldId: fieldId,
    }));
  }, []);

  // Update form settings
  const updateFormSettings = useCallback(
    (updates: Partial<FormConfiguration>) => {
      setState((prevState) => ({
        ...prevState,
        form: {
          ...prevState.form,
          ...updates,
        },
        hasUnsavedChanges: true,
      }));
    },
    []
  );

  // Toggle preview mode
  const togglePreview = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      previewMode: !prevState.previewMode,
      selectedFieldId: null,
    }));
  }, []);

  // Save form
  const saveForm = useCallback(async () => {
    setState((prevState) => ({ ...prevState, isLoading: true }));

    try {
      // TODO: Implement API call to save form
      console.log("Saving form:", state.form);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        hasUnsavedChanges: false,
      }));

      return { success: true };
    } catch (error) {
      setState((prevState) => ({ ...prevState, isLoading: false }));
      return { success: false, error };
    }
  }, [state.form]);

  // Publish form
  const publishForm = useCallback(async () => {
    setState((prevState) => ({ ...prevState, isLoading: true }));

    try {
      // TODO: Implement API call to publish form
      console.log("Publishing form:", state.form);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setState((prevState) => ({
        ...prevState,
        form: {
          ...prevState.form,
          // isPublished: true // This would be added to FormConfiguration type
        },
        isLoading: false,
      }));

      return { success: true };
    } catch (error) {
      setState((prevState) => ({ ...prevState, isLoading: false }));
      return { success: false, error };
    }
  }, [state.form]);

  // Export form
  const exportForm = useCallback(
    (format: "json" | "csv") => {
      if (format === "json") {
        const dataStr = JSON.stringify(state.form, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${state.form.title || "form"}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    },
    [state.form]
  );

  // Import form
  const importForm = useCallback((data: any) => {
    try {
      setState((prevState) => ({
        ...prevState,
        form: { ...DEFAULT_FORM, ...data },
        selectedFieldId: null,
        hasUnsavedChanges: true,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            saveForm();
            break;
          case "p":
            e.preventDefault();
            togglePreview();
            break;
          case "d":
            if (state.selectedFieldId) {
              e.preventDefault();
              duplicateField(state.selectedFieldId);
            }
            break;
        }
      } else if (e.key === "Delete" && state.selectedFieldId) {
        deleteField(state.selectedFieldId);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    state.selectedFieldId,
    saveForm,
    togglePreview,
    duplicateField,
    deleteField,
  ]);

  return {
    // State
    form: state.form,
    selectedFieldId: state.selectedFieldId,
    previewMode: state.previewMode,
    isLoading: state.isLoading,
    hasUnsavedChanges: state.hasUnsavedChanges,

    // Actions
    addField,
    updateField,
    deleteField,
    duplicateField,
    moveField,
    selectField,
    updateFormSettings,
    togglePreview,
    saveForm,
    publishForm,
    exportForm,
    importForm,
  };
};
