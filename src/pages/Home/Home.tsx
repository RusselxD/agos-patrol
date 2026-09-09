import { useEffect, useState } from "react";
import Page from "../../components/common/Page";
import { useWebSocket } from "../../context/WebsocketContext";
import BlockageStatusCard from "./components/BlockageStatusCard";
import ConnectionStatusBanner from "./components/ConnectionStatusBanner";
import FusionAnalysisCard from "./components/FusionAnalysisCard";
import LatestWaterwayFrame from "./components/LatestWaterwayFrame";
import WaterLevelStatusCard from "./components/WaterLevelStatusCard/WaterLevelStatusCard";
import WaterLevelSparkline from "./components/WaterLevelSparkline";
import WeatherConditionCard from "./components/WeatherConditionCard/WeatherConditionCard";

function getTimeSinceUpdate(date: Date | null): string {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

export default function Home() {
    const { connectionStatus, lastMessageAt } = useWebSocket();

    const [timeAgo, setTimeAgo] = useState("");
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        const update = () => {
            setTimeAgo(getTimeSinceUpdate(lastMessageAt));
            setIsStale(
                Boolean(
                    lastMessageAt &&
                        Date.now() - lastMessageAt.getTime() > 5 * 60 * 1000,
                ),
            );
        };
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [lastMessageAt]);

    return (
        <Page>
            <ConnectionStatusBanner status={connectionStatus} />
            <div className="flex items-center justify-between px-5 mb-2">
                {lastMessageAt && (
                    <span
                        className={`text-xs ${isStale ? "text-amber-500" : "text-gray-400 dark:text-gray-500"}`}
                    >
                        {isStale ? "\u26A0 " : ""}Last updated {timeAgo}
                    </span>
                )}
            </div>
            <FusionAnalysisCard />
            <BlockageStatusCard />
            <LatestWaterwayFrame />
            <WaterLevelStatusCard />
            <WaterLevelSparkline />
            <WeatherConditionCard />
        </Page>
    );
}
