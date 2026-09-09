import { useEffect } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { useI18n } from "../../../context/I18nContext";
import type { CameraFrameSnapshot } from "../../../lib/api/camera";

interface LatestFrameModalProps {
    isOpen: boolean;
    frame: CameraFrameSnapshot | null;
    isLoading: boolean;
    hasError: boolean;
    onClose: () => void;
}

export default function LatestFrameModal({
    isOpen,
    frame,
    isLoading,
    hasError,
    onClose,
}: LatestFrameModalProps) {
    const { t, locale } = useI18n();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const capturedAt = frame
        ? new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : "en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
          }).format(new Date(frame.timestamp))
        : null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-[2px]"
            onClick={onClose}
            role="presentation"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="latest-frame-title"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-slate-700">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Camera className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2
                            id="latest-frame-title"
                            className="text-sm font-semibold text-gray-950 dark:text-white"
                        >
                            {t("home.frame.title")}
                        </h2>
                        {capturedAt && (
                            <p className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-slate-400">
                                {t("home.frame.captured")} {capturedAt}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 active:bg-gray-100 dark:text-slate-300 dark:active:bg-slate-700"
                        aria-label={t("home.frame.close")}
                        autoFocus
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="bg-slate-950">
                    {frame ? (
                        <img
                            src={`data:image/jpeg;base64,${frame.image}`}
                            alt={t("home.frame.alt")}
                            className="max-h-[58dvh] min-h-52 w-full object-contain"
                        />
                    ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
                            {isLoading ? (
                                <>
                                    <Loader2
                                        className="h-8 w-8 animate-spin"
                                        aria-hidden="true"
                                    />
                                    <p className="text-sm">
                                        {t("home.frame.loading")}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Camera
                                        className="h-9 w-9 text-slate-500"
                                        aria-hidden="true"
                                    />
                                    <p className="text-sm">
                                        {t(
                                            hasError
                                                ? "home.frame.error"
                                                : "home.frame.empty",
                                        )}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <p className="px-4 py-3 text-[10px] leading-relaxed text-gray-500 dark:text-slate-400">
                    {t("home.frame.disclaimer")}
                </p>
            </section>
        </div>
    );
}
