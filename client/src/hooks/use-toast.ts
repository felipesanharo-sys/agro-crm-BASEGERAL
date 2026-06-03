import { useCallback } from "react";

export interface Toast {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = useCallback((props: Toast) => {
    const message = props.title ? `${props.title}: ${props.description || ""}` : props.description;
    if (props.variant === "destructive") {
      console.error(message);
    } else {
      console.log(message);
    }
  }, []);

  return { toast };
}
