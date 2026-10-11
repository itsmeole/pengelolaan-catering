"use client"

import React, { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ConfirmButtonProps {
  children: React.ReactNode
  title?: string
  description?: string
  onConfirm: () => void | Promise<any>
  confirmText?: string
  cancelText?: string
  loadingText?: string
  variant?: "default" | "destructive"
}

export function ConfirmButton({
  children,
  title = "Apakah Anda yakin?",
  description = "Tindakan ini tidak dapat dibatalkan.",
  onConfirm,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  loadingText = "Memproses...",
  variant = "default"
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error("ConfirmButton error:", error)
    } finally {
      setTimeout(() => {
        setLoading(false)
      }, 300)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!loading) setOpen(newOpen)
      }}
    >
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-slate-900">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3">
          <AlertDialogCancel
            disabled={loading}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={handleConfirm}
            className={`rounded-xl px-6 font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${
              loading
                ? "cursor-not-allowed opacity-80"
                : "active:scale-95"
            } ${
              variant === "destructive" 
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            <span>{loading ? loadingText : confirmText}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

