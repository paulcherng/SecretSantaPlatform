// api/get-event-config.js (全新檔案)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') return response.status(405).end();

    try {
        const { eventId } = request.query;
        if (!eventId) {
            return response.status(400).json({ error: '缺少活動 ID。' });
        }

        const config = await kv.get(`event:${eventId}:config`);

        if (!config) {
            return response.status(404).json({ error: '找不到指定的活動。' });
        }

        // 為了安全，不回傳敏感資訊，只回傳頁面需要的
        const publicConfig = {
            eventName: config.eventName,
            groups: config.groups,
        };

        return response.status(200).json(publicConfig);

    } catch (error) {
        console.error("Get Config API Error:", error);
        return response.status(500).json({ error: '伺服器錯誤' });
    }
}