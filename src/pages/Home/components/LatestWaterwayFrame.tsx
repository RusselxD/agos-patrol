import { useState } from "react";
import { Camera, ChevronRight } from "lucide-react";

import { useCoreHook } from "../../../context/CoreContext";
import { useI18n } from "../../../context/I18nContext";
import { useWebSocketMessage } from "../../../context/WebsocketContext";
import {
    getLatestCameraFrame,
    type CameraFrameSnapshot,
} from "../../../lib/api/camera";
import LatestFrameModal from "./LatestFrameModal";

interface CameraUpdateWire {
    image: string;
    timestamp: string;
}

export default function LatestWaterwayFrame() {
    const { responder } = useCoreHook();
    const { t } = useI18n();
    const [latestFrame, setLatestFrame] =
        useState<CameraFrameSnapshot | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    const locationId = responder?.locationId;

    useWebSocketMessage<CameraUpdateWire>("camera_update", (data) => {
        if (!data?.image || !data.timestamp) return;
        setLatestFrame(data);
        setHasError(false);
    });

    const openLatestFrame = () => {
        setIsModalOpen(true);
        setIsLoading(true);
        setHasError(false);

        if (!locationId) {
            setIsLoading(false);
            setHasError(true);
            return;
        }

        getLatestCameraFrame(locationId)
            .then((frame) => setLatestFrame(frame))
            .catch(() => {
                if (!latestFrame) setHasError(true);
            })
            .finally(() => setIsLoading(false));
    };

    return (
        <>
            <button
                type="button"
                onClick={openLatestFrame}
                className="custom-shadow flex min-h-[66px] w-full items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-left transition-colors active:bg-gray-50 dark:border dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
                aria-label={t("home.frame.open")}
            >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white dark:bg-accent dark:text-slate-900">
                    <Camera className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-gray-950 dark:text-white">
                        {t("home.frame.title")}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-gray-500 dark:text-slate-400">
                        {t("home.frame.open")}
                    </span>
                </span>
                <ChevronRight
                    className="h-4 w-4 shrink-0 text-gray-400"
                    aria-hidden="true"
                />
            </button>

            <LatestFrameModal
                isOpen={isModalOpen}
                frame={latestFrame}
                isLoading={isLoading}
                hasError={hasError}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
