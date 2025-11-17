// api/get-event-config.js (健壯版)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    // 確保只處理 GET 請求
    if (request.method !== 'GET') {
        return response.status(405).json({ error: '不支援的請求方法' });
    }

    try {
        const { eventId } = request.query;
        if (!eventId || typeof eventId !== 'string') {
            // 如果沒有 eventId，明確回傳錯誤 JSON
            return response.status(400).json({ error: '缺少有效的活動 ID。' });
        }

        const config = await kv.get(`event:${eventId}:config`);

        if (!config) {
            // 如果找不到 config，明確回傳錯誤 JSON
            return response.status(404).json({ error: '找不到指定的活動。' });
        }

        // 為了安全，只回傳頁面需要的公開資訊
        const publicConfig = {
            eventName: config.eventName,
            giftAmount: config.giftAmount,
            eventDate: config.eventDate,
            eventLocation: config.eventLocation,
            eventNotes: config.eventNotes,
            groups: config.groups,
        };

        // 確保回傳的是 JSON
        return response.status(200).json(publicConfig);

    } catch (error) {
        // 如果中間發生任何未知錯誤，也明確回傳錯誤 JSON
        console.error("Get Config API Error:", error);
        return response.status(500).json({ error: '伺服器內部發生錯誤，無法獲取活動設定。' });
    }
}
