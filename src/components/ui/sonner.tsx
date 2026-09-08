"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-blue-600" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-red-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-slate-900" />,
      }}
      toastOptions={{
        classNames: {
          toast: "bg-white text-slate-900 border border-slate-200 shadow-lg rounded-xl p-4",
          title: "text-slate-900 font-bold text-sm",
          description: "!text-slate-900 font-medium text-xs !opacity-100 mt-1 leading-snug",
          actionButton: "bg-slate-900 text-white font-medium",
          cancelButton: "bg-slate-100 text-slate-700 font-medium",
          closeButton: "bg-white border-slate-200 text-slate-700 hover:text-slate-900",
        },
        style: {
          color: "#0f172a",
        }
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "#e2e8f0",
          "--description-color": "#0f172a",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
