import apiClient from "./axiosConfig";

export interface CameraFrameSnapshot {
    image: string;
    timestamp: string;
}

export async function getLatestCameraFrame(
    locationId: number,
): Promise<CameraFrameSnapshot> {
    const { data } = await apiClient.get<CameraFrameSnapshot>(
        "/stream/latest-frame",
        { params: { locationId } },
    );
    return data;
}
