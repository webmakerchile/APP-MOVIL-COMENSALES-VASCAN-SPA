import React, { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const styles = {
    success: "bg-green-500/15 border-green-500/30 text-green-400",
    error: "bg-red-500/15 border-red-500/30 text-red-400",
    warning: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
  };

  const Icon = type === "success" ? CheckCircle : XCircle;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${styles[type]}`}>
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="flex-1 text-sm leading-relaxed">{message}</p>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
