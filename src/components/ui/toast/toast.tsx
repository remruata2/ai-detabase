"use client";
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

// Toast variants
export type ToastVariant =
	| "default"
	| "success"
	| "error"
	| "destructive"
	| "warning"
	| "info";

// Toast data structure
export interface Toast {
	id: string;
	title?: string;
	description?: string;
	variant?: ToastVariant;
	duration?: number;
}

// Toast context type
interface ToastContextType {
	toasts: Toast[];
	toast: (toast: Omit<Toast, "id">) => void;
	dismiss: (id: string) => void;
	dismissAll: () => void;
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Default toast duration in milliseconds
const DEFAULT_TOAST_DURATION = 5000;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [toasts, setToasts] = useState<Toast[]>([]);

	// Add a new toast
	const toast = useCallback(
		({
			title,
			description,
			variant = "default",
			duration = DEFAULT_TOAST_DURATION,
		}: Omit<Toast, "id">) => {
			const id = Math.random().toString(36).substring(2, 9);
			const newToast = { id, title, description, variant, duration };

			setToasts((prevToasts) => [...prevToasts, newToast]);

			// Auto dismiss after duration
			if (duration !== Infinity) {
				setTimeout(() => {
					dismiss(id);
				}, duration);
			}

			return id;
		},
		[]
	);

	// Dismiss a toast by id
	const dismiss = useCallback((id: string) => {
		setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
	}, []);

	// Dismiss all toasts
	const dismissAll = useCallback(() => {
		setToasts([]);
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
			{children}
			<ToastContainer />
		</ToastContext.Provider>
	);
};

// Toast component
const ToastComponent: React.FC<{ toast: Toast; onDismiss: () => void }> = ({
	toast,
	onDismiss,
}) => {
	const { title, description, variant = "default" } = toast;

	// Determine the appropriate styles based on the variant
	const getVariantStyles = () => {
		switch (variant) {
			case "success":
				return "bg-green-50 border-green-500 text-green-800";
			case "error":
			case "destructive":
				return "bg-red-50 border-red-500 text-red-800";
			case "warning":
				return "bg-yellow-50 border-yellow-500 text-yellow-800";
			case "info":
				return "bg-blue-50 border-blue-500 text-blue-800";
			default:
				return "bg-white border-gray-300 text-gray-800";
		}
	};

	// Get the appropriate icon based on the variant
	const getIcon = () => {
		switch (variant) {
			case "success":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "error":
			case "destructive":
				return <AlertCircle className="h-5 w-5 text-red-500" />;
			case "warning":
				return <AlertCircle className="h-5 w-5 text-yellow-500" />;
			case "info":
				return <Info className="h-5 w-5 text-blue-500" />;
			default:
				return null;
		}
	};

	return (
		<div
			className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border-l-4 overflow-hidden ${getVariantStyles()}`}
		>
			<div className="p-4">
				<div className="flex items-start">
					{getIcon() && <div className="flex-shrink-0 mr-3">{getIcon()}</div>}
					<div className="flex-1">
						{title && <div className="text-sm font-medium">{title}</div>}
						{description && <div className="mt-1 text-sm">{description}</div>}
					</div>
					<div className="ml-4 flex-shrink-0 flex">
						<button
							onClick={onDismiss}
							className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<span className="sr-only">Close</span>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

// Toast container
const ToastContainer: React.FC = () => {
	const context = useContext(ToastContext);

	if (!context) {
		return null;
	}

	const { toasts, dismiss } = context;

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div className="fixed top-0 right-0 p-4 z-50 flex flex-col space-y-4 sm:items-end">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className="transform transition-all duration-500 ease-in-out"
				>
					<ToastComponent toast={toast} onDismiss={() => dismiss(toast.id)} />
				</div>
			))}
		</div>
	);
};

// Hook to use toast
export const useToast = () => {
	const context = useContext(ToastContext);

	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}

	return context;
};
