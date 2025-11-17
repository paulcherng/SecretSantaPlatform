// api/status.js (全新的、公开版本)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: '不支援的請求方法' });
    }

    try {
        const { eventId } = request.query;
        if (!eventId || typeof eventId !== 'string') {
            return response.status(400).json({ error: '缺少有效的活動 ID。' });
        }

        // 这个 API 只负责获取参与者数据
        const data = await kv.get(`event:${eventId}:data`);
        
        // 如果活动刚创建，data 可能是 null，这很正常
        const participants = Array.isArray(data) ? data : [];
        
        // 计算每个组的人数
        const groupStatus = participants.reduce((acc, p) => {
            acc[p.group_id] = (acc[p.group_id] || 0) + 1;
            return acc;
        }, {});

        // 回传公开所需的信息
        return response.status(200).json({
            count: participants.length,
            groupStatus: groupStatus,
        });

    } catch (error) {
        console.error("Public Status API Error:", error);
        return response.status(500).json({ error: '伺服器內部錯誤，無法獲取活動狀態。' });
    }
}
